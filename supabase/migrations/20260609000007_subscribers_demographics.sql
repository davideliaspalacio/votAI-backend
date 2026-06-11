-- =============================================================
-- SUSCRIPTORES: datos demográficos opt-in del test (para segmentar el newsletter).
--
-- Al suscribirse desde los resultados, el frontend adjunta los datos demográficos
-- que la persona ya llenó en el test (edad, región, género, estrato, nivel
-- educativo). Se guardan SOLO los demográficos: nunca el voto, ni las respuestas
-- del quiz, ni el session_id → el anonimato de las RESPUESTAS políticas queda
-- intacto (igual que el diseño original de la tabla).
--
-- age_range ya existe (del paso 2 manual); se reutiliza. El resto se agrega como
-- TEXT (se guarda el valor del enum del test, sin acoplar a sus tipos).
-- =============================================================

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS region         TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS gender         TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS estrato        TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS academic_level TEXT;
