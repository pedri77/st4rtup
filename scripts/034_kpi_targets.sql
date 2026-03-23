-- 034: KPI Targets table
CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id VARCHAR(50) NOT NULL UNIQUE,
    target_value DOUBLE PRECISION NOT NULL,
    target_label VARCHAR(100),
    period VARCHAR(20) DEFAULT 'year_1',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER update_kpi_targets_updated_at BEFORE UPDATE ON kpi_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
