-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE age_range_enum AS ENUM ('18-24','25-34','35-49','50-64','65+');
CREATE TYPE region_enum AS ENUM ('caribe','andina','pacifica','orinoquia','amazonia','insular');
CREATE TYPE gender_enum AS ENUM ('m','f','nb','na');
CREATE TYPE session_status_enum AS ENUM ('created','answering','processing','done');
CREATE TYPE axis_enum AS ENUM (
  'economia','salud','educacion','seguridad','ambiente',
  'politica_social','politica_exterior','reforma_politica','empleo','tecnologia'
);

-- candidates
CREATE TABLE candidates (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  party       TEXT NOT NULL,
  color       TEXT NOT NULL,
  bio         TEXT NOT NULL,
  program_pdf TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- candidate_positions
CREATE TABLE candidate_positions (
  id            SERIAL PRIMARY KEY,
  candidate_id  TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  axis          axis_enum NOT NULL,
  summary       TEXT NOT NULL,
  quote         TEXT NOT NULL,
  program_page  INT,
  stance_score  INT NOT NULL CHECK (stance_score BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, axis)
);

-- candidate_positions_draft (staging table para el pipeline de ingestion)
CREATE TABLE candidate_positions_draft (
  id             SERIAL PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  axis           axis_enum NOT NULL,
  summary        TEXT NOT NULL,
  quote          TEXT NOT NULL,
  program_page   INT,
  stance_score   INT NOT NULL CHECK (stance_score BETWEEN 1 AND 5),
  confidence     NUMERIC(3,2),
  reviewed       BOOLEAN NOT NULL DEFAULT false,
  reviewer_note  TEXT,
  source_chunks  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, axis)
);

CREATE INDEX idx_cpdraft_reviewed ON candidate_positions_draft(candidate_id, reviewed);

-- questions
CREATE TABLE questions (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  axis        axis_enum NOT NULL,
  context     TEXT,
  sort_order  INT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_active_sort ON questions(active, sort_order);

-- sessions
CREATE TABLE sessions (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  age_range           age_range_enum NOT NULL,
  region              region_enum NOT NULL,
  gender              gender_enum DEFAULT 'na',
  initial_preference  TEXT NOT NULL,
  status              session_status_enum NOT NULL DEFAULT 'created',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created ON sessions(created_at);

-- answers
CREATE TABLE answers (
  id           SERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES questions(id),
  value        INT NOT NULL CHECK (value BETWEEN 1 AND 5),
  weight       INT NOT NULL DEFAULT 2 CHECK (weight BETWEEN 1 AND 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_answers_session ON answers(session_id);

-- match_results
CREATE TABLE match_results (
  id               SERIAL PRIMARY KEY,
  session_id       TEXT UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  preference_match BOOLEAN NOT NULL,
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- match_result_candidates
CREATE TABLE match_result_candidates (
  id            SERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id  TEXT NOT NULL REFERENCES candidates(id),
  score         INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  rank          INT NOT NULL,
  summary       TEXT NOT NULL,
  UNIQUE(session_id, candidate_id)
);

CREATE INDEX idx_mrc_session ON match_result_candidates(session_id);
CREATE INDEX idx_mrc_rank ON match_result_candidates(rank);

-- match_result_axes
CREATE TABLE match_result_axes (
  id                SERIAL PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id      TEXT NOT NULL REFERENCES candidates(id),
  axis              axis_enum NOT NULL,
  user_stance       TEXT NOT NULL,
  candidate_stance  TEXT NOT NULL,
  quote             TEXT NOT NULL,
  program_page      INT,
  UNIQUE(session_id, candidate_id, axis)
);

-- stats_cache
CREATE TABLE stats_cache (
  key         TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at en candidates
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
