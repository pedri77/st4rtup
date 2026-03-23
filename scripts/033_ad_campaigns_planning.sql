-- 033: Ad campaigns media planning fields
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS placement VARCHAR(255);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS targeting TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS ad_format VARCHAR(100);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS buying_model VARCHAR(10);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION DEFAULT 0;
