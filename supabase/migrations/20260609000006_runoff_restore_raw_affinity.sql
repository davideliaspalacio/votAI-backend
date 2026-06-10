-- =============================================================
-- SEGUNDA VUELTA: restaurar la afinidad CRUDA de los resultados.
--
-- La migración 20260609000005 había reescalado los scores para que los dos
-- planes + el voto en blanco sumaran 100. Decisión de producto revertida:
-- cada plan debe mostrar su afinidad REAL por distancia (0-100), medida de
-- forma independiente, sin forzar ninguna suma. El voto en blanco es un dato
-- aparte (% de temas) y los tres pueden sumar más de 100.
--
-- Esta migración recomputa el score crudo desde las respuestas, idéntico a
-- MatchScoringService.calculate():
--   similarity = 1 - |value - stance_score| / 6      (0-1)
--   score      = ROUND( Σ(similarity * weight) / Σ(weight) * 100 )   (0-100)
--
-- Idempotente: recomputar sobre datos ya crudos da el mismo resultado. No toca
-- el rank (la normalización preservaba el orden, así que sigue siendo válido).
-- =============================================================

UPDATE sv_match_result_candidates mrc
SET score = sub.raw_score
FROM (
  SELECT
    a.session_id,
    p.candidate_id,
    ROUND(
      SUM((1 - ABS(a.value - p.stance_score) / 6.0) * a.weight)
      / NULLIF(SUM(a.weight), 0) * 100
    )::int AS raw_score
  FROM sv_answers a
  JOIN sv_questions q           ON q.id = a.question_id
  JOIN sv_candidate_positions p ON p.axis = q.axis
  GROUP BY a.session_id, p.candidate_id
) sub
WHERE mrc.session_id = sub.session_id
  AND mrc.candidate_id = sub.candidate_id;
