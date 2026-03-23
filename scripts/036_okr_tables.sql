-- 036: OKR tables
CREATE TABLE IF NOT EXISTS okr_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    quarter VARCHAR(10) NOT NULL,
    category VARCHAR(50),
    owner VARCHAR(255),
    progress DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS okr_key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    kpi_id VARCHAR(50),
    target_value DOUBLE PRECISION,
    current_value DOUBLE PRECISION DEFAULT 0,
    unit VARCHAR(20),
    progress DOUBLE PRECISION DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_okr_kr_objective ON okr_key_results(objective_id);
