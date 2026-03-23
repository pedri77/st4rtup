-- Add integration config columns to system_settings table
-- Run on Fly.io Postgres: fly ssh console -a riskitera-postgres -C "psql"

-- Prospección y Enriquecimiento
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS clearbit_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hunter_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lusha_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoominfo_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS phantombuster_config JSONB;

-- Comunicación y Reuniones
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gcalendar_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS outlook_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS calendly_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS zoom_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS whatsapp_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS slack_config JSONB;

-- Marketing y Captación
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS google_ads_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS linkedin_ads_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ga4_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hubspot_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS typeform_config JSONB;

-- Documentos y Propuestas
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS pandadoc_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS docusign_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS yousign_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gdrive_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS onedrive_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notion_config JSONB;

-- Datos y Compliance
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS einforma_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cnae_config JSONB;

-- Facturación y Post-venta
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS stripe_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS holded_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS facturama_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS intercom_config JSONB;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS freshdesk_config JSONB;
