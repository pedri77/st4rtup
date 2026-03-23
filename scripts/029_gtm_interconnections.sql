-- 029: GTM Interconnections — campos que vinculan módulos GTM con CRM
-- Ejecutar manualmente en Fly.io Postgres

-- Opportunities ← Pricing + Competitor + Playbook
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(50);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_modules JSON;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_discount_pct DOUBLE PRECISION DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_duration_months INTEGER DEFAULT 12;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_calculated DOUBLE PRECISION;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_margin_pct DOUBLE PRECISION;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tactics_applied JSON;

-- Leads ← Playbook acquisition channel
ALTER TABLE leads ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tactics_applied JSON;
