-- Migration 052: Backlinks table (SEO off-site tracking)

CREATE TABLE IF NOT EXISTS backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url VARCHAR(1000) NOT NULL,
    source_domain VARCHAR(255) NOT NULL,
    target_url VARCHAR(1000) NOT NULL,
    anchor_text VARCHAR(500),
    link_type VARCHAR(20) DEFAULT 'dofollow',
    domain_authority INTEGER,
    page_authority INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_checked TIMESTAMPTZ,
    category VARCHAR(100),
    contact_email VARCHAR(255),
    outreach_status VARCHAR(30),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backlinks_domain ON backlinks(source_domain);
CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status);
