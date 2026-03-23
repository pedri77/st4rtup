-- 028: GTM Modules — Brand, Pricing, Competitors, Playbook, Calendar budget
-- Ejecutar manualmente en Fly.io Postgres

-- ─── 1. Brand Config ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) DEFAULT 'Riskitera',
    domain VARCHAR(255) DEFAULT 'riskitera.com',
    slogan VARCHAR(500),
    mission TEXT,
    vision TEXT,
    "values" TEXT,
    segment VARCHAR(50) DEFAULT 'enterprise',
    regulatory_frameworks JSON,
    logo_url VARCHAR(500),
    primary_color VARCHAR(20) DEFAULT '#0891b2',
    metadata JSON,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Pricing Tiers ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    base_price DOUBLE PRECISION NOT NULL,
    price_unit VARCHAR(20) DEFAULT 'year',
    duration_days INTEGER,
    min_price DOUBLE PRECISION,
    max_price DOUBLE PRECISION,
    modules_included JSON,
    modules_available JSON,
    infra_cost_monthly DOUBLE PRECISION DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Competitors ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    price_range VARCHAR(100),
    nis2_support VARCHAR(5) DEFAULT '✗',
    dora_support VARCHAR(5) DEFAULT '✗',
    auto_evidence VARCHAR(5) DEFAULT '✗',
    ux_midmarket VARCHAR(5) DEFAULT '✗',
    differentiators TEXT,
    strengths JSON,
    weaknesses JSON,
    battle_card_md TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Sales Tactics (Playbook) ────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_tactics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    channel VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'planned',
    responsible VARCHAR(255),
    metrics_target JSON,
    metrics_actual JSON,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. Marketing Calendar extra columns ────────────────────────

ALTER TABLE marketing_calendar_events ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION DEFAULT 0;
ALTER TABLE marketing_calendar_events ADD COLUMN IF NOT EXISTS event_status VARCHAR(20) DEFAULT 'planned';

-- ─── 6. Triggers ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TRIGGER update_brand_config_updated_at BEFORE UPDATE ON brand_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_competitors_updated_at BEFORE UPDATE ON competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_sales_tactics_updated_at BEFORE UPDATE ON sales_tactics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
