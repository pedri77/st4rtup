-- 017_marketing_hub_core.sql
-- Marketing Hub: 6 tablas core + 9 enums PostgreSQL
-- Ejecutar contra Fly.io Postgres: fly postgres connect -a riskitera-postgres

-- ═══════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE campaignobjective AS ENUM ('lead_gen', 'brand', 'nurturing', 'reactivation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaignchannel AS ENUM ('linkedin_ads', 'google_ads', 'seo', 'email', 'youtube', 'webinar', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaignstatus AS ENUM ('draft', 'active', 'paused', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE funnelstatus AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE marketingassettype AS ENUM ('landing_page', 'cta_button', 'cta_banner', 'cta_popup', 'cta_form');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE marketingassetstatus AS ENUM ('active', 'draft', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assetlanguage AS ENUM ('es', 'en', 'pt');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE calendareventtype AS ENUM ('seo_article', 'campaign_launch', 'email_newsletter', 'youtube_video', 'webinar_event', 'social_post');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alertseverity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaigns (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     VARCHAR(255) NOT NULL,
  objective                campaignobjective NOT NULL,
  channel                  campaignchannel NOT NULL,
  status                   campaignstatus NOT NULL DEFAULT 'draft',
  budget_total             DOUBLE PRECISION DEFAULT 0,
  budget_monthly           JSONB,
  persona_target           VARCHAR(100),
  regulatory_focus         VARCHAR(100),
  geo_target               TEXT[],
  start_date               DATE,
  end_date                 DATE,
  leads_goal               INTEGER DEFAULT 0,
  mqls_goal                INTEGER DEFAULT 0,
  max_cpl                  DOUBLE PRECISION,
  days_without_leads_alert INTEGER,
  created_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_campaigns_name ON campaigns(name);
CREATE INDEX IF NOT EXISTS ix_campaigns_status ON campaigns(status);

-- ═══════════════════════════════════════════════════════════════
-- 2. FUNNELS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS funnels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  status       funnelstatus NOT NULL DEFAULT 'draft',
  stages       JSONB,
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_funnels_status ON funnels(status);
CREATE INDEX IF NOT EXISTS ix_funnels_campaign_id ON funnels(campaign_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. MARKETING ASSETS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         marketingassettype NOT NULL,
  name         VARCHAR(255) NOT NULL,
  url          VARCHAR(500),
  status       marketingassetstatus NOT NULL DEFAULT 'draft',
  language     assetlanguage DEFAULT 'es',
  has_hreflang BOOLEAN DEFAULT FALSE,
  visits       INTEGER DEFAULT 0,
  conversions  INTEGER DEFAULT 0,
  impressions  INTEGER DEFAULT 0,
  clicks       INTEGER DEFAULT 0,
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  funnel_id    UUID REFERENCES funnels(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_marketing_assets_status ON marketing_assets(status);
CREATE INDEX IF NOT EXISTS ix_marketing_assets_campaign_id ON marketing_assets(campaign_id);
CREATE INDEX IF NOT EXISTS ix_marketing_assets_funnel_id ON marketing_assets(funnel_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. UTM CODES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS utm_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_url     VARCHAR(500) NOT NULL,
  utm_source   VARCHAR(100) NOT NULL,
  utm_medium   VARCHAR(100) NOT NULL,
  utm_campaign VARCHAR(255) NOT NULL,
  utm_content  VARCHAR(255),
  utm_term     VARCHAR(255),
  full_url     VARCHAR(2000) NOT NULL,
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_utm_codes_campaign_id ON utm_codes(campaign_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. MARKETING CALENDAR EVENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  event_type      calendareventtype NOT NULL,
  channel         VARCHAR(50),
  description     TEXT,
  geo_target      TEXT[],
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  all_day         BOOLEAN DEFAULT FALSE,
  color           VARCHAR(20),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  responsible_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_mkt_cal_events_campaign_id ON marketing_calendar_events(campaign_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. MARKETING ALERTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type      VARCHAR(100) NOT NULL,
  severity        alertseverity NOT NULL,
  entity_type     VARCHAR(50),
  entity_id       UUID,
  entity_name     VARCHAR(255),
  message         TEXT NOT NULL,
  threshold_value DOUBLE PRECISION,
  actual_value    DOUBLE PRECISION,
  geo_context     VARCHAR(100),
  is_read         BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_marketing_alerts_severity ON marketing_alerts(severity);
CREATE INDEX IF NOT EXISTS ix_marketing_alerts_is_read ON marketing_alerts(is_read);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS updated_at (reutiliza función existente)
-- ═══════════════════════════════════════════════════════════════

-- Crear función si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON funnels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_marketing_assets_updated_at BEFORE UPDATE ON marketing_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_utm_codes_updated_at BEFORE UPDATE ON utm_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_mkt_calendar_events_updated_at BEFORE UPDATE ON marketing_calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_marketing_alerts_updated_at BEFORE UPDATE ON marketing_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
