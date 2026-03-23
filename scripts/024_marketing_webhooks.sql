-- 024: Marketing Webhooks — Nuevas tablas + columnas para n8n webhooks
-- Ejecutar manualmente en Fly.io Postgres

-- ─── 1. Nuevas tablas ────────────────────────────────────────────

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
CREATE INDEX IF NOT EXISTS ix_mwl_webhook_type ON marketing_webhook_logs(webhook_type);

CREATE TABLE IF NOT EXISTS lead_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS ix_mmc_date ON marketing_metrics_cache(date);

-- ─── 2. Nuevas columnas en campaigns ────────────────────────────

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS actual_budget FLOAT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metrics JSONB;

-- ─── 3. Nuevas columnas en marketing_assets ─────────────────────

ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS target_keywords TEXT[];

-- ─── 4. Nuevas columnas en marketing_alerts ─────────────────────

ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE marketing_alerts ADD COLUMN IF NOT EXISTS recommended_action TEXT;

-- ─── 5. Nuevos valores de enum ──────────────────────────────────

-- MarketingAssetType
ALTER TYPE marketingassettype ADD VALUE IF NOT EXISTS 'blog_post';
ALTER TYPE marketingassettype ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE marketingassettype ADD VALUE IF NOT EXISTS 'whitepaper';
ALTER TYPE marketingassettype ADD VALUE IF NOT EXISTS 'case_study';

-- MarketingAssetStatus
ALTER TYPE marketingassetstatus ADD VALUE IF NOT EXISTS 'published';

-- CalendarEventType
ALTER TYPE calendareventtype ADD VALUE IF NOT EXISTS 'content_publish';

-- ─── 6. Triggers updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_webhook_logs_updated_at
    BEFORE UPDATE ON marketing_webhook_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_attributions_updated_at
    BEFORE UPDATE ON lead_attributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_metrics_cache_updated_at
    BEFORE UPDATE ON marketing_metrics_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
