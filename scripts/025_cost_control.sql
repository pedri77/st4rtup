-- 025: MOD-COST-001 — Cost Control tables
-- Ejecutar manualmente en Fly.io Postgres

-- ─── 1. Cost Events ─────────────────────────────────────────────

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

-- ─── 2. Budget Caps ─────────────────────────────────────────────

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

-- ─── 3. Guardrail Log ──────────────────────────────────────────

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

-- ─── 4. Seed default budget caps ────────────────────────────────

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

-- ─── 5. Triggers ────────────────────────────────────────────────

CREATE TRIGGER update_budget_caps_updated_at
    BEFORE UPDATE ON budget_caps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
