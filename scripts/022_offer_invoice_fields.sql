-- Add invoice fields to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoice_provider VARCHAR(20);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(255);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(1000);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_offers_invoice_status ON offers(invoice_status);
