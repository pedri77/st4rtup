-- Offers (Propuestas comerciales)
-- Migration: 020_offers_table.sql

-- Enum for offer status
DO $$ BEGIN
    CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'revision');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,

    -- Identification
    reference VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Status
    status offer_status NOT NULL DEFAULT 'draft',

    -- Line items (JSON array)
    items JSONB,

    -- Financial
    subtotal FLOAT DEFAULT 0,
    tax_rate FLOAT DEFAULT 21,
    tax_amount FLOAT DEFAULT 0,
    discount_percent FLOAT DEFAULT 0,
    discount_amount FLOAT DEFAULT 0,
    total FLOAT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Terms
    valid_until DATE,
    payment_terms VARCHAR(500),
    terms_conditions TEXT,

    -- Tracking
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Ownership
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,
    tags JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_lead_id ON offers(lead_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_reference ON offers(reference);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON offers;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
