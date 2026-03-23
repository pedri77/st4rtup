-- 035: Migration tracking table
-- Records which migrations have been applied to prevent partial/duplicate runs

CREATE TABLE IF NOT EXISTS applied_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record all previously applied migrations
INSERT INTO applied_migrations (migration_name) VALUES
    ('017_marketing_hub_core'),
    ('024_marketing_webhooks'),
    ('025_cost_control'),
    ('026_system_settings_missing_columns'),
    ('027_consolidate_all_columns'),
    ('028_gtm_modules'),
    ('029_gtm_interconnections'),
    ('030_gtm_budget'),
    ('031_media_trifecta'),
    ('032_competitors_extended'),
    ('033_ad_campaigns_planning'),
    ('034_kpi_targets'),
    ('035_migration_tracking')
ON CONFLICT (migration_name) DO NOTHING;
