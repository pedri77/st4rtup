-- 041: Add teams_config to system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS teams_config JSONB;
