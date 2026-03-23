-- 027: CONSOLIDATION — Verify ALL columns exist in production
-- This migration is idempotent (IF NOT EXISTS everywhere)
-- Run this to fix any missing columns from previous partial migrations

-- ═══════════════════════════════════════════════════════════════
-- 1. SYSTEM_SETTINGS — all JSON config columns
-- ═══════════════════════════════════════════════════════════════

-- Email
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS email_provider VARCHAR(50) DEFAULT 'resend';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS email_from VARCHAR(255) DEFAULT 'sales@riskitera.com';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS email_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gmail_oauth_config JSON;

-- Automatizaciones
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS telegram_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS n8n_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS apollo_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS webhook_config JSON;

-- Prospección
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS clearbit_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hunter_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lusha_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoominfo_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS phantombuster_config JSON;

-- Comunicación
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gcalendar_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS outlook_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS calendly_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoom_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS whatsapp_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS slack_config JSON;

-- Marketing
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_ads_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_ads_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ga4_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gsc_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS youtube_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hubspot_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS typeform_config JSON;

-- Encuestas
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS surveymonkey_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tally_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS jotform_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS survicate_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hotjar_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_forms_config JSON;

-- Documentos
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS pandadoc_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS docusign_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS yousign_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gdrive_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS onedrive_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notion_config JSON;

-- Datos y Compliance
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS einforma_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cnae_config JSON;

-- Facturación
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS stripe_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS holded_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS facturama_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS intercom_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS freshdesk_config JSON;

-- AI & General
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ai_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS general_config JSON;

-- ═══════════════════════════════════════════════════════════════
-- 2. COST CONTROL TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(50) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(5) DEFAULT 'EUR',
    category VARCHAR(50),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cost_events_tool_id ON cost_events(tool_id);
CREATE INDEX IF NOT EXISTS ix_cost_events_created_at ON cost_events(created_at);

CREATE TABLE IF NOT EXISTS budget_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(50) NOT NULL UNIQUE,
    tool_name VARCHAR(100) NOT NULL,
    monthly_cap DOUBLE PRECISION NOT NULL,
    warn_pct INTEGER DEFAULT 70,
    cut_pct INTEGER DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    icon VARCHAR(50),
    color VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_guardrail_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    current_spend DOUBLE PRECISION NOT NULL,
    cap_amount DOUBLE PRECISION NOT NULL,
    percentage DOUBLE PRECISION NOT NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cgl_tool_id ON cost_guardrail_log(tool_id);
CREATE INDEX IF NOT EXISTS ix_cgl_created_at ON cost_guardrail_log(created_at);

-- Seed default caps
INSERT INTO budget_caps (tool_id, tool_name, monthly_cap, warn_pct, cut_pct)
VALUES
    ('retell_ai', 'Retell AI', 50, 70, 90),
    ('hetzner_gpu', 'Hetzner GPU', 98, 80, 95),
    ('n8n_cloud', 'n8n Cloud', 20, 75, 90),
    ('microsoft_graph', 'Microsoft Graph', 12, 70, 90),
    ('cal_com', 'Cal.com', 12, 70, 90),
    ('supabase', 'Supabase', 25, 70, 90),
    ('lemlist', 'Lemlist', 30, 70, 90),
    ('brevo', 'Brevo', 7, 70, 90)
ON CONFLICT (tool_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. MARKETING WEBHOOK TABLES (024)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    webhook_type VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    payload JSONB,
    result JSONB,
    entities_affected INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error TEXT,
    processing_ms INTEGER,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mwl_event_id ON marketing_webhook_logs(event_id);

CREATE TABLE IF NOT EXISTS lead_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    channel VARCHAR(50),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    landing_page VARCHAR(500),
    country VARCHAR(10),
    region VARCHAR(100),
    touchpoint_at TIMESTAMPTZ,
    attribution_model VARCHAR(30) DEFAULT 'last_touch',
    is_converting BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_la_lead_id ON lead_attributions(lead_id);

CREATE TABLE IF NOT EXISTS marketing_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    source VARCHAR(50) NOT NULL,
    country_code VARCHAR(10) DEFAULT 'ES',
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_metrics_cache UNIQUE (date, source, country_code)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. CAMPAIGNS extra columns (024)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS actual_budget FLOAT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metrics JSONB;

-- Marketing assets extra columns
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS target_keywords TEXT[];

-- Marketing alerts extra columns
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS recommended_action TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 5. VERIFICATION — count columns to confirm
-- ═══════════════════════════════════════════════════════════════

SELECT 'system_settings columns: ' || count(*) FROM information_schema.columns WHERE table_name = 'system_settings';
SELECT 'cost tables: ' || count(*) FROM information_schema.tables WHERE table_name IN ('cost_events', 'budget_caps', 'cost_guardrail_log');
SELECT 'budget_caps rows: ' || count(*) FROM budget_caps;
