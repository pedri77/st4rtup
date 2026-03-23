-- 054: WhatsApp Business conversations & messages
-- Run on Fly.io Postgres: riskitera_sales_backend

CREATE TABLE IF NOT EXISTS wa_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(30) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    bot_enabled BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_lead_id ON wa_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON wa_conversations(status);

CREATE TABLE IF NOT EXISTS wa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    content TEXT,
    wa_message_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent',
    sender_phone VARCHAR(30),
    sender_name VARCHAR(255),
    media_url VARCHAR(1000),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON wa_messages(conversation_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wa_conversations_updated_at ON wa_conversations;
CREATE TRIGGER update_wa_conversations_updated_at
    BEFORE UPDATE ON wa_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wa_messages_updated_at ON wa_messages;
CREATE TRIGGER update_wa_messages_updated_at
    BEFORE UPDATE ON wa_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
