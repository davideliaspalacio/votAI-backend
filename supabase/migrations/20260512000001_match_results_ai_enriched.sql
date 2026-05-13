-- Agrega flag de caché para enriquecimiento IA bajo demanda
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS ai_enriched_at TIMESTAMPTZ;
