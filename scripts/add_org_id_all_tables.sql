-- ============================================================
-- Migration: Add org_id to all business tables
-- Purpose: Complete multi-tenancy isolation
-- Run: psql $DATABASE_URL < scripts/add_org_id_all_tables.sql
-- ============================================================

-- Get the default org ID (first org, which is Riskitera)
-- All existing data will be assigned to this org
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM organizations LIMIT 1;

    IF default_org_id IS NULL THEN
        -- Create default org if none exists
        INSERT INTO organizations (name, slug, plan, max_users, max_leads, is_active, onboarding_completed)
        VALUES ('Riskitera S.L.U.', 'riskitera', 'enterprise', 999, 999999, true, true)
        RETURNING id INTO default_org_id;
        RAISE NOTICE 'Created default org: %', default_org_id;
    END IF;

    RAISE NOTICE 'Default org_id: %', default_org_id;

    -- ─── Marketing Hub ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'org_id') THEN
        ALTER TABLE campaigns ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE campaigns SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_campaigns_org ON campaigns(org_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnels' AND column_name = 'org_id') THEN
        ALTER TABLE funnels ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE funnels SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_funnels_org ON funnels(org_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_assets' AND column_name = 'org_id') THEN
        ALTER TABLE marketing_assets ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE marketing_assets SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_marketing_assets_org ON marketing_assets(org_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'utm_codes' AND column_name = 'org_id') THEN
        ALTER TABLE utm_codes ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE utm_codes SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_calendar_events' AND column_name = 'org_id') THEN
        ALTER TABLE marketing_calendar_events ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE marketing_calendar_events SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_alerts' AND column_name = 'org_id') THEN
        ALTER TABLE marketing_alerts ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE marketing_alerts SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_documents' AND column_name = 'org_id') THEN
        ALTER TABLE marketing_documents ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE marketing_documents SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_webhook_logs' AND column_name = 'org_id') THEN
        ALTER TABLE marketing_webhook_logs ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE marketing_webhook_logs SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── GTM ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brand_configs' AND column_name = 'org_id') THEN
        ALTER TABLE brand_configs ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE brand_configs SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_tiers' AND column_name = 'org_id') THEN
        ALTER TABLE pricing_tiers ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE pricing_tiers SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'org_id') THEN
        ALTER TABLE competitors ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE competitors SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_competitors_org ON competitors(org_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_tactics' AND column_name = 'org_id') THEN
        ALTER TABLE sales_tactics ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE sales_tactics SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'org_id') THEN
        ALTER TABLE objectives ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE objectives SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_results' AND column_name = 'org_id') THEN
        ALTER TABLE key_results ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE key_results SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── Social & Content ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_posts' AND column_name = 'org_id') THEN
        ALTER TABLE social_posts ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE social_posts SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_social_posts_org ON social_posts(org_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_recurrences' AND column_name = 'org_id') THEN
        ALTER TABLE social_recurrences ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE social_recurrences SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_pages' AND column_name = 'org_id') THEN
        ALTER TABLE landing_pages ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE landing_pages SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_campaigns' AND column_name = 'org_id') THEN
        ALTER TABLE ad_campaigns ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE ad_campaigns SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'earned_mentions' AND column_name = 'org_id') THEN
        ALTER TABLE earned_mentions ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE earned_mentions SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── Cost Control ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_events' AND column_name = 'org_id') THEN
        ALTER TABLE cost_events ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE cost_events SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_caps' AND column_name = 'org_id') THEN
        ALTER TABLE budget_caps ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE budget_caps SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── Pipeline Rules ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_rules' AND column_name = 'org_id') THEN
        ALTER TABLE pipeline_rules ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE pipeline_rules SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── SEO ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_keywords' AND column_name = 'org_id') THEN
        ALTER TABLE seo_keywords ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE seo_keywords SET org_id = default_org_id WHERE org_id IS NULL;
        CREATE INDEX IF NOT EXISTS ix_seo_keywords_org ON seo_keywords(org_id);
    END IF;

    -- ─── Backlinks ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backlinks' AND column_name = 'org_id') THEN
        ALTER TABLE backlinks ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE backlinks SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── KPI ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_targets' AND column_name = 'org_id') THEN
        ALTER TABLE kpi_targets ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE kpi_targets SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── LLM Visibility ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_visibility_queries' AND column_name = 'org_id') THEN
        ALTER TABLE llm_visibility_queries ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE llm_visibility_queries SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── RSS Feeds ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rss_feeds' AND column_name = 'org_id') THEN
        ALTER TABLE rss_feeds ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE rss_feeds SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    -- ─── Publications ───
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'publications' AND column_name = 'org_id') THEN
        ALTER TABLE publications ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        UPDATE publications SET org_id = default_org_id WHERE org_id IS NULL;
    END IF;

    RAISE NOTICE 'Migration complete. All tables now have org_id.';
END $$;
