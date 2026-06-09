-- =============================================================
-- SEGUNDA VUELTA (Voto Loco): test de afinidad programática
-- entre el plan de Iván Cepeda (c1) y el de Abelardo de la Espriella (c2).
--
-- Funcionalidad NUEVA e independiente. Todo vive en tablas con prefijo sv_.
-- NO modifica el test de primera vuelta (sessions, answers, questions,
-- candidate_positions, match_*) que se mantiene tal cual.
--
-- Se reutilizan los candidatos c1/c2 de la tabla `candidates` existente y se
-- siembran las preguntas/posiciones desde el banco actual (INSERT ... SELECT)
-- para garantizar la misma escala (1-7) y modalidad.
-- =============================================================

-- ----------------------- Enums nuevos -----------------------
-- Estrato socioeconómico colombiano (1-6) + 'na' (prefiero no decir).
CREATE TYPE estrato_enum AS ENUM ('1', '2', '3', '4', '5', '6', 'na');

-- Nivel académico + 'na' (prefiero no decir).
CREATE TYPE academic_level_enum AS ENUM (
  'primaria', 'bachillerato', 'tecnico', 'pregrado', 'posgrado', 'na'
);

-- Estado de sesión propio de segunda vuelta (incluye 'failed' para el
-- cleanup cron, a diferencia del enum compartido del test de primera vuelta).
CREATE TYPE sv_session_status_enum AS ENUM (
  'created', 'answering', 'processing', 'done', 'failed'
);

-- Reutiliza: age_range_enum, region_enum, gender_enum, axis_enum.

-- ----------------------- sv_questions -----------------------
CREATE TABLE sv_questions (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  axis        axis_enum NOT NULL,
  context     TEXT,
  options     JSONB,
  sort_order  INT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sv_questions_active_sort ON sv_questions(active, sort_order);

-- ------------------ sv_candidate_positions ------------------
-- Solo Cepeda (c1) y Abelardo (c2). stance_score en escala 1-7.
CREATE TABLE sv_candidate_positions (
  id            SERIAL PRIMARY KEY,
  candidate_id  TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  axis          axis_enum NOT NULL,
  summary       TEXT NOT NULL,
  quote         TEXT NOT NULL,
  program_page  INT,
  stance_score  INT NOT NULL CHECK (stance_score BETWEEN 1 AND 7),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, axis)
);

-- ----------------------- sv_sessions ------------------------
CREATE TABLE sv_sessions (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  age_range           age_range_enum NOT NULL,
  region              region_enum NOT NULL,
  gender              gender_enum DEFAULT 'na',
  estrato             estrato_enum NOT NULL DEFAULT 'na',
  academic_level      academic_level_enum NOT NULL DEFAULT 'na',
  -- candidateId (c1..c6) o valores especiales: 'blank', 'no_vote', 'na'
  first_round_vote    TEXT NOT NULL,
  -- 'c1' | 'c2' o valores especiales: 'blank', 'undecided', 'na'
  runoff_intention    TEXT NOT NULL,
  status              sv_session_status_enum NOT NULL DEFAULT 'created',
  assigned_questions  TEXT[],
  device_hash         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_sv_sessions_status ON sv_sessions(status);
CREATE INDEX idx_sv_sessions_created ON sv_sessions(created_at);
CREATE INDEX idx_sv_sessions_device_hash ON sv_sessions(device_hash, created_at);

-- ----------------------- sv_answers -------------------------
CREATE TABLE sv_answers (
  id           SERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sv_sessions(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES sv_questions(id),
  value        INT NOT NULL CHECK (value BETWEEN 1 AND 7),
  weight       INT NOT NULL DEFAULT 2 CHECK (weight BETWEEN 1 AND 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_sv_answers_session ON sv_answers(session_id);

-- -------------------- sv_match_results ----------------------
CREATE TABLE sv_match_results (
  id               SERIAL PRIMARY KEY,
  session_id       TEXT UNIQUE NOT NULL REFERENCES sv_sessions(id) ON DELETE CASCADE,
  preference_match BOOLEAN NOT NULL,
  ai_enriched_at   TIMESTAMPTZ,
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------- sv_match_result_candidates -----------------
CREATE TABLE sv_match_result_candidates (
  id            SERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sv_sessions(id) ON DELETE CASCADE,
  candidate_id  TEXT NOT NULL REFERENCES candidates(id),
  score         INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  rank          INT NOT NULL,
  summary       TEXT NOT NULL,
  UNIQUE(session_id, candidate_id)
);

CREATE INDEX idx_sv_mrc_session ON sv_match_result_candidates(session_id);
CREATE INDEX idx_sv_mrc_rank ON sv_match_result_candidates(rank);

-- ------------------ sv_match_result_axes --------------------
CREATE TABLE sv_match_result_axes (
  id                SERIAL PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sv_sessions(id) ON DELETE CASCADE,
  candidate_id      TEXT NOT NULL REFERENCES candidates(id),
  axis              axis_enum NOT NULL,
  user_stance       TEXT NOT NULL,
  candidate_stance  TEXT NOT NULL,
  quote             TEXT NOT NULL,
  program_page      INT,
  UNIQUE(session_id, candidate_id, axis)
);

-- ======================== SEED ========================
-- Preguntas: las 10 base (una por eje, q1-q10) con sus 7 opciones.
INSERT INTO sv_questions (id, text, axis, context, options, sort_order, active)
SELECT id, text, axis, context, options, sort_order, active
FROM questions
WHERE id IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10');

-- Posiciones: solo Cepeda (c1) y Abelardo (c2), copiadas del test actual.
INSERT INTO sv_candidate_positions (candidate_id, axis, summary, quote, program_page, stance_score)
SELECT candidate_id, axis, summary, quote, program_page, stance_score
FROM candidate_positions
WHERE candidate_id IN ('c1', 'c2');

-- ======================== RLS ========================
ALTER TABLE sv_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_candidate_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_match_result_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_match_result_axes ENABLE ROW LEVEL SECURITY;

-- Lectura pública de catálogos (igual que en el test de primera vuelta).
CREATE POLICY "sv_questions_public_read" ON sv_questions
  FOR SELECT USING (active = true);

CREATE POLICY "sv_candidate_positions_public_read" ON sv_candidate_positions
  FOR SELECT USING (true);

-- El resto de tablas sv_ solo son accesibles con service_role (el backend).
-- Sin políticas adicionales → denegado por defecto con RLS activo.
