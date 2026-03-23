-- 040: Landing pages + Workflow audit log + tawk.to support
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(1000) NOT NULL,
    name VARCHAR(255),
    campaign_id VARCHAR(36),
    clarity_project_id VARCHAR(100),
    visits INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    ctr DOUBLE PRECISION DEFAULT 0,
    conv_rate DOUBLE PRECISION DEFAULT 0,
    bounce_rate DOUBLE PRECISION DEFAULT 0,
    avg_time_seconds INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    trigger_type VARCHAR(50),
    entity_id VARCHAR(36),
    entity_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    payload JSONB,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_wal_workflow ON workflow_audit_log(workflow_id);
CREATE INDEX IF NOT EXISTS ix_wal_module ON workflow_audit_log(module);
