-- Add Gmail OAuth2 config column to system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gmail_oauth_config JSONB;
