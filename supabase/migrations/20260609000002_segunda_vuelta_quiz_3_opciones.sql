-- =============================================================
-- SEGUNDA VUELTA: quiz a 3 opciones por pregunta.
--
-- El quiz se había sembrado reusando el banco de primera vuelta (7 opciones
-- que correspondían a los 6 candidatos de primera vuelta). En segunda vuelta
-- solo hay 2 planes, así que cada pregunta queda con 3 opciones, A CIEGAS:
--   1) la postura del plan de Iván Cepeda (c1)
--   2) la postura del plan de Abelardo de la Espriella (c2)
--   3) voto en blanco (neutral)
--
-- El "value" de cada opción = stance_score real del candidato en ese eje
-- (de sv_candidate_positions), de modo que elegir un plan da 100% de afinidad
-- con ese plan en ese eje — el scoring por distancia ya existente lo calcula
-- sin cambios. El voto en blanco usa 4 (neutro = punto medio de la escala 1-7).
-- El orden de las dos posturas se alterna por pregunta para no inducir sesgo.
--
-- Idempotente vía UPDATE por id: corrige tanto instalaciones nuevas como las
-- que ya aplicaron la migración 20260609000001 (con las 7 opciones viejas).
-- =============================================================

-- q1 · Economía  (Cepeda=1, Abelardo=7)
UPDATE sv_questions SET
  text = '¿Qué debería hacer el Estado con la economía?',
  context = NULL,
  options = '[
    {"label": "Reforma tributaria progresiva, banca pública fuerte y redistribuir la riqueza.", "value": 1},
    {"label": "Reducir el Estado y los impuestos, y desregular para atraer inversión privada.", "value": 7},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q1';

-- q2 · Salud  (Abelardo=6, Cepeda=1)
UPDATE sv_questions SET
  text = '¿Cómo debería funcionar el sistema de salud?',
  context = NULL,
  options = '[
    {"label": "Más competencia entre prestadores y subsidios focalizados a quien lo necesita.", "value": 6},
    {"label": "Sistema público universal sin EPS, con atención primaria en los territorios.", "value": 1},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q2';

-- q3 · Educación  (Cepeda=1, Abelardo=6)
UPDATE sv_questions SET
  text = '¿Cuál debería ser el modelo de educación?',
  context = NULL,
  options = '[
    {"label": "Gratuidad total en la educación superior pública y mejores salarios docentes.", "value": 1},
    {"label": "Vouchers y libertad de elegir colegio, con fuerte apuesta por la educación técnica.", "value": 6},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q3';

-- q4 · Seguridad  (Abelardo=7, Cepeda=1)
UPDATE sv_questions SET
  text = '¿Cuál debería ser la política de seguridad?',
  context = NULL,
  options = '[
    {"label": "Mano dura: más fuerza pública, régimen de excepción y cárceles de máxima seguridad.", "value": 7},
    {"label": "Paz total: cumplir los acuerdos e invertir en lo social en los territorios.", "value": 1},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q4';

-- q5 · Ambiente  (Cepeda=7, Abelardo=1)
UPDATE sv_questions SET
  text = '¿Qué hacer en ambiente y energía?',
  context = NULL,
  options = '[
    {"label": "Prohibir la minería en páramos y acelerar la transición a energías limpias.", "value": 7},
    {"label": "Aprovechar los recursos con minería responsable como motor de la economía.", "value": 1},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q5';

-- q6 · Política social  (Abelardo=1, Cepeda=7)
UPDATE sv_questions SET
  text = '¿Cómo deberían ser los programas sociales?',
  context = NULL,
  options = '[
    {"label": "Subsidios temporales y condicionados; el empleo formal como la verdadera ayuda social.", "value": 1},
    {"label": "Renta básica para los más vulnerables, reforma agraria y economía del cuidado.", "value": 7},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q6';

-- q7 · Política exterior  (Cepeda=6, Abelardo=1)
UPDATE sv_questions SET
  text = '¿Hacia dónde orientar la política exterior?',
  context = NULL,
  options = '[
    {"label": "Integración latinoamericana y diplomacia de paz, más allá de EE.UU.", "value": 6},
    {"label": "Alianza firme con EE.UU. e Israel y línea dura con Venezuela.", "value": 1},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q7';

-- q8 · Reforma política  (Abelardo=1, Cepeda=7)
UPDATE sv_questions SET
  text = '¿Qué reforma política necesita el país?',
  context = NULL,
  options = '[
    {"label": "Reducir el Congreso a la mitad y revocatoria de mandato exprés.", "value": 1},
    {"label": "Reforma profunda: listas cerradas paritarias y financiación estatal de campañas.", "value": 7},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q8';

-- q9 · Empleo  (Cepeda=7, Abelardo=1)
UPDATE sv_questions SET
  text = '¿Cómo generar empleo?',
  context = NULL,
  options = '[
    {"label": "Empleos verdes, economía del cuidado remunerada y formalizar la economía popular.", "value": 7},
    {"label": "Flexibilizar la contratación, bajar costos laborales y crear zonas francas de empleo.", "value": 1},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q9';

-- q10 · Tecnología  (Abelardo=6, Cepeda=2)
UPDATE sv_questions SET
  text = '¿Qué papel debe tener la tecnología?',
  context = NULL,
  options = '[
    {"label": "Colombia como hub tech con cero impuestos a startups y vigilancia con IA.", "value": 6},
    {"label": "Soberanía digital e internet como servicio público en las zonas rurales.", "value": 2},
    {"label": "Ninguna me convence — voto en blanco.", "value": 4}
  ]'::jsonb
WHERE id = 'q10';
