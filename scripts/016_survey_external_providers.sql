-- Add external survey provider fields to surveys table
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS external_provider VARCHAR(50);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS external_survey_id VARCHAR(255);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS external_survey_url VARCHAR(1000);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS external_response_data JSONB;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_surveys_external_lookup
    ON surveys (external_provider, external_survey_id)
    WHERE external_provider IS NOT NULL;

-- Add survey provider config columns to system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS surveymonkey_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tally_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS jotform_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS survicate_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hotjar_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_forms_config JSONB;
