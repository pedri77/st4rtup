-- 045: Add metadata JSONB to visits (for Google Calendar sync event IDs)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS metadata JSONB;
