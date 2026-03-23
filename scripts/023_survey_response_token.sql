-- Add response_token to surveys for public anonymous links
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS response_token VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_surveys_response_token ON surveys (response_token) WHERE response_token IS NOT NULL;

-- Generate tokens for existing surveys
UPDATE surveys SET response_token = encode(gen_random_bytes(32), 'hex') WHERE response_token IS NULL;
