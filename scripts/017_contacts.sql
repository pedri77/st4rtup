-- Create contact enums
DO $$ BEGIN
    CREATE TYPE contactroletype AS ENUM (
        'ceo', 'cto', 'ciso', 'dpo', 'cfo', 'cio', 'cco', 'coo',
        'it_director', 'it_manager', 'security_manager', 'compliance_manager',
        'legal', 'procurement', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contactinfluencelevel AS ENUM (
        'decision_maker', 'influencer', 'gatekeeper', 'champion', 'user', 'unknown'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contactrelationship AS ENUM (
        'champion', 'supporter', 'neutral', 'blocker', 'unknown'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    -- Personal info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    linkedin_url VARCHAR(500),

    -- Professional info
    job_title VARCHAR(255),
    department VARCHAR(100),
    role_type contactroletype DEFAULT 'other',

    -- Sales mapping (power map)
    influence_level contactinfluencelevel DEFAULT 'unknown',
    relationship_status contactrelationship DEFAULT 'unknown',
    is_primary BOOLEAN DEFAULT FALSE,
    is_budget_holder BOOLEAN DEFAULT FALSE,
    is_technical_evaluator BOOLEAN DEFAULT FALSE,
    reports_to UUID,  -- Self-reference for org chart

    -- Engagement
    last_contacted_at TIMESTAMPTZ,
    last_interaction_type VARCHAR(50),
    engagement_score INTEGER DEFAULT 0,

    -- Enrichment data
    linkedin_data JSONB,
    enrichment_data JSONB,
    avatar_url VARCHAR(500),

    -- Notes
    notes TEXT,
    tags JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_role_type ON contacts(role_type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_influence ON contacts(influence_level);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(relationship_status);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(lead_id, is_primary) WHERE is_primary = TRUE;

-- Auto-update updated_at trigger
CREATE OR REPLACE TRIGGER set_updated_at_contacts
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
