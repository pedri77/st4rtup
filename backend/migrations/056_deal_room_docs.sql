-- 056_deal_room_docs.sql — Deal Room Documents + Page Analytics
-- Run manually on Fly.io Postgres: fly postgres connect -a riskitera-postgres

-- Deal Rooms (parent table for documents)
CREATE TABLE IF NOT EXISTS deal_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    name VARCHAR(500),
    company_name VARCHAR(255),
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Room Documents
CREATE TABLE IF NOT EXISTS deal_room_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
    original_name VARCHAR(500) NOT NULL,
    storage_path TEXT,
    watermarked BOOLEAN DEFAULT TRUE,
    recipient_email VARCHAR(255),
    file_size_bytes INTEGER,
    page_count INTEGER,
    uploaded_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Room Page Events (analytics)
CREATE TABLE IF NOT EXISTS deal_room_page_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES deal_room_documents(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
    visitor_email VARCHAR(255),
    visitor_token VARCHAR(64) NOT NULL,
    page_number INTEGER NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL,
    exited_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    session_id VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_rooms_opportunity_id ON deal_rooms(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_documents_room_id ON deal_room_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_documents_is_active ON deal_room_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_deal_room_page_events_document_id ON deal_room_page_events(document_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_page_events_room_id ON deal_room_page_events(room_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_page_events_session_id ON deal_room_page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_page_events_entered_at ON deal_room_page_events(entered_at);

-- Updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_deal_rooms') THEN
        CREATE TRIGGER set_updated_at_deal_rooms
            BEFORE UPDATE ON deal_rooms
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_deal_room_documents') THEN
        CREATE TRIGGER set_updated_at_deal_room_documents
            BEFORE UPDATE ON deal_room_documents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_deal_room_page_events') THEN
        CREATE TRIGGER set_updated_at_deal_room_page_events
            BEFORE UPDATE ON deal_room_page_events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
