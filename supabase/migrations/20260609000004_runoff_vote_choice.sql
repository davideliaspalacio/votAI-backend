-- La pregunta post-resultado cambia de enfoque: ya no es "¿reconsiderarías tu
-- voto? (sí/no)", sino "a la hora de votar, ¿te vas por tu AFINIDAD programática
-- o por tu INTENCIÓN de voto?".
--
-- Reemplaza la columna would_change_vote ('yes'|'no') por vote_choice
-- ('affinity'|'intention'). Nullable (sigue siendo opcional).
ALTER TABLE sv_sessions DROP COLUMN IF EXISTS would_change_vote;

ALTER TABLE sv_sessions ADD COLUMN IF NOT EXISTS vote_choice TEXT
  CHECK (vote_choice IN ('affinity', 'intention'));
