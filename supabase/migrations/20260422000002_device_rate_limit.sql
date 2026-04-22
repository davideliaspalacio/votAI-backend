-- Agregar device_hash para rate limiting por dispositivo
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_device_hash ON sessions(device_hash, created_at);
