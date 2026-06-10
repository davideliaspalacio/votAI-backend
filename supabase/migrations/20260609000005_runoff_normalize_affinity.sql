-- =============================================================
-- SEGUNDA VUELTA: normalizar la afinidad de resultados YA calculados.
--
-- El score de cada plan se calcula por distancia de forma independiente (cada
-- uno 0-100), así que los dos planes podían sumar >100 y, con el voto en blanco
-- aparte, el total en pantalla superaba el 100%. getResult ya normaliza al leer;
-- esta migración además deja consistentes las filas históricas de
-- sv_match_result_candidates para inspección directa de la BD / analítica.
--
-- Reparto (idéntico a getResult): el voto en blanco conserva su % real de temas
-- neutrales (value = 4) y el espacio restante (100 - blank_pct) se divide entre
-- los dos planes respetando la razón de afinidad original. El plan de mayor
-- afinidad (rank 1) se redondea y el rank 2 recibe el resto, de modo que
-- score(rank1) + score(rank2) + blank_pct = 100 exacto.
--
-- No es destructivo: los scores crudos son recomputables desde sv_answers +
-- sv_candidate_positions. Idempotente: re-ejecutar da el mismo resultado.
-- =============================================================

WITH blank AS (
  SELECT
    session_id,
    ROUND(100.0 * COUNT(*) FILTER (WHERE value = 4) / NULLIF(COUNT(*), 0))::int
      AS blank_pct
  FROM sv_answers
  GROUP BY session_id
),
agg AS (
  SELECT
    c.session_id,
    SUM(c.score)::numeric                         AS raw_total,
    MAX(c.score) FILTER (WHERE c.rank = 1)         AS raw_rank1,
    GREATEST(0, 100 - COALESCE(b.blank_pct, 0))    AS decided
  FROM sv_match_result_candidates c
  JOIN sv_sessions s ON s.id = c.session_id AND s.status = 'done'
  LEFT JOIN blank b ON b.session_id = c.session_id
  GROUP BY c.session_id, b.blank_pct
  HAVING COUNT(*) = 2          -- solo sesiones de segunda vuelta (2 planes)
),
shares AS (
  SELECT
    session_id,
    decided,
    CASE WHEN raw_total > 0
         THEN ROUND(decided * raw_rank1 / raw_total)::int
         ELSE ROUND(decided / 2.0)::int
    END AS rank1_share
  FROM agg
)
UPDATE sv_match_result_candidates c
SET score = CASE
              WHEN c.rank = 1 THEN s.rank1_share
              ELSE s.decided - s.rank1_share
            END
FROM shares s
WHERE c.session_id = s.session_id;
