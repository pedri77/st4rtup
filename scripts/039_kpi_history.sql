-- 039: KPI history snapshots table
CREATE TABLE IF NOT EXISTS kpi_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id VARCHAR(50) NOT NULL,
    period VARCHAR(10) NOT NULL,
    value DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_kpi_history_kpi ON kpi_history(kpi_id);
CREATE INDEX IF NOT EXISTS ix_kpi_history_period ON kpi_history(period);
