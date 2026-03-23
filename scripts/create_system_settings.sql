-- Create system_settings table for app-wide configuration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Email provider config
    email_provider VARCHAR(50) DEFAULT 'resend',
    email_from VARCHAR(255) DEFAULT 'sales@riskitera.com',
    email_config JSONB DEFAULT '{}',

    -- Integration configs
    telegram_config JSONB DEFAULT '{}',
    n8n_config JSONB DEFAULT '{}',
    apollo_config JSONB DEFAULT '{}',
    webhook_config JSONB DEFAULT '{}',

    -- General settings
    general_config JSONB DEFAULT '{}'
);

-- Insert default row
INSERT INTO system_settings (email_provider, email_from, general_config)
VALUES ('resend', 'sales@riskitera.com', '{"company_name": "Riskitera", "timezone": "Europe/Madrid", "language": "es"}')
ON CONFLICT DO NOTHING;

-- Auto-update trigger
CREATE OR REPLACE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
