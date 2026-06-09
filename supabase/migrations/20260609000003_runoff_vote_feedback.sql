-- Campo OPCIONAL post-resultado de segunda vuelta:
-- si la intención de voto no coincide con la mayor afinidad programática,
-- ¿reconsideraría su voto? Se llena desde la pantalla de resultados.
-- Nullable: la persona puede no responder.
ALTER TABLE sv_sessions
  ADD COLUMN IF NOT EXISTS would_change_vote TEXT
  CHECK (would_change_vote IN ('yes', 'no'));
