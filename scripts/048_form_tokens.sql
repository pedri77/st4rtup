-- 048: Form tokens for secure public form access
CREATE TABLE IF NOT EXISTS form_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) NOT NULL UNIQUE,
    form_id VARCHAR(50) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER DEFAULT 1,
    uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sent_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_by VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_form_tokens_token ON form_tokens(token);
CREATE INDEX IF NOT EXISTS ix_form_tokens_form ON form_tokens(form_id);
