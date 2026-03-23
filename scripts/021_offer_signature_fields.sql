-- Add e-signature fields to offers table
-- Migration: 021_offer_signature_fields.sql

ALTER TABLE offers ADD COLUMN IF NOT EXISTS signature_provider VARCHAR(20);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS signature_request_id VARCHAR(255);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS signature_url VARCHAR(1000);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS signature_status VARCHAR(20);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_offers_signature_status ON offers(signature_status);
