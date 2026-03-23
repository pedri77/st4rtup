-- 026: Add missing columns to system_settings
-- URGENT: Backend is crashing because ORM expects these columns

-- Marketing & Captación
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ga4_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gsc_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS youtube_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_ads_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_ads_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_config JSON;

-- Prospección
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS clearbit_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hunter_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lusha_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoominfo_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS phantombuster_config JSON;

-- Comunicación
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gcalendar_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS outlook_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS calendly_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoom_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS whatsapp_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS slack_config JSON;

-- Encuestas
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS surveymonkey_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tally_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS jotform_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS survicate_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hotjar_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_forms_config JSON;

-- Documentos
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS pandadoc_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS docusign_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS yousign_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gdrive_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS onedrive_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notion_config JSON;

-- Datos y Compliance
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS einforma_config JSON;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cnae_config JSON;
