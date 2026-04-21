-- Activar RLS en todas las tablas
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_positions_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_result_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_result_axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_cache ENABLE ROW LEVEL SECURITY;

-- Lectura publica de catalogos
CREATE POLICY "candidates_public_read" ON candidates
  FOR SELECT USING (active = true);

CREATE POLICY "candidate_positions_public_read" ON candidate_positions
  FOR SELECT USING (true);

CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (active = true);

CREATE POLICY "stats_cache_public_read" ON stats_cache
  FOR SELECT USING (true);

-- Todo lo demas solo accesible con service_role (el backend).
-- Sin politicas adicionales → denegado por defecto con RLS activo.
