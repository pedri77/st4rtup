-- 025: Social OAuth — Nuevas columnas para GSC y YouTube OAuth config
-- Ejecutar manualmente en Fly.io Postgres

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gsc_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS youtube_config JSONB;
