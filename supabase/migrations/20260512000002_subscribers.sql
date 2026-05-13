-- Suscriptores opt-in para notificaciones de nuevos tests electorales
-- No vinculado a sessions (anonimato del test intacto)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  source TEXT,
  -- Campos opcionales del paso 2 (todos nullable)
  name TEXT,
  age_range TEXT,
  city TEXT,
  occupation TEXT,
  heard_from TEXT,
  details_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub_token ON subscribers(unsubscribe_token);
