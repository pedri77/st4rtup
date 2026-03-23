-- 042: Outgoing webhook subscriptions (Zapier, Make, n8n, custom)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    headers JSONB,
    last_status VARCHAR(20),
    last_error TEXT,
    total_sent VARCHAR(20) DEFAULT '0',
    total_errors VARCHAR(20) DEFAULT '0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ws_active ON webhook_subscriptions(is_active);
