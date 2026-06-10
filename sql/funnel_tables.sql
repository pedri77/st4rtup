-- Funnel Kit: Tablas para st4rtup
-- Ejecutar en Supabase proyecto dszhaxyz

-- 1. Leads capturados por el quiz de ventas
CREATE TABLE IF NOT EXISTS quiz_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL DEFAULT 'st4rtup',
  answers JSONB NOT NULL DEFAULT '{}',
  segments TEXT[] NOT NULL DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  recommended_plan TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_st4rtup_quiz_leads_created ON quiz_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st4rtup_quiz_leads_plan ON quiz_leads(recommended_plan);

-- 2. Tiers con stock (para countdown/escasez futura)
CREATE TABLE IF NOT EXISTS funnel_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current_price_cents INTEGER,
  current_stock INTEGER,
  phase INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, tier_id)
);

-- RLS
ALTER TABLE quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_leads_insert_anon"
  ON quiz_leads FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "quiz_leads_read_service"
  ON quiz_leads FOR SELECT
  USING (auth.role() = 'service_role');

ALTER TABLE funnel_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_tiers_read_public"
  ON funnel_tiers FOR SELECT
  USING (active = TRUE);

CREATE POLICY "funnel_tiers_write_service"
  ON funnel_tiers FOR ALL
  USING (auth.role() = 'service_role');

-- Seed: tiers st4rtup
INSERT INTO funnel_tiers (project_id, tier_id, name, current_price_cents, current_stock, phase)
VALUES
  ('st4rtup', 'starter', 'Starter', 0, NULL, 1),
  ('st4rtup', 'growth', 'Growth', 1900, NULL, 1),
  ('st4rtup', 'scale', 'Scale', 4900, NULL, 1),
  ('st4rtup', 'enterprise', 'Enterprise', NULL, NULL, 1)
ON CONFLICT (project_id, tier_id) DO NOTHING;
