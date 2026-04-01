-- Fix RLS for the 16 remaining tables
-- Run after fix_rls_all_tables.sql

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_bant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'affiliate_clicks','affiliate_links','call_queue_items',
        'churn_records','form_submissions','form_tokens',
        'lead_bant','marketing_document_links','onboarding_checklists',
        'org_members','organizations','partners','platform_costs',
        'roi_calculations','seo_rankings','service_catalog',
        'service_catalog_items','webhook_subscriptions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS auth_users_all ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', tbl);
        EXECUTE format(
            'CREATE POLICY auth_users_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl
        );
        EXECUTE format(
            'CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl
        );
    END LOOP;
END $$;
