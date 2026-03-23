-- 049: Form submissions tracking
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id VARCHAR(50) NOT NULL,
    token_id UUID REFERENCES form_tokens(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    submitted_by VARCHAR(255),
    submitted_email VARCHAR(255),
    data JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_form_sub_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS ix_form_sub_created ON form_submissions(created_at);
