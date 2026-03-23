-- 044: Add metadata JSONB to leads and emails (needed for Hunter verification + tracking pixel)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS metadata JSONB;
