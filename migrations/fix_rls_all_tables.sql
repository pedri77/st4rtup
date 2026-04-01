-- ═══════════════════════════════════════════════════════════════
-- FIX: Enable RLS on all 68 public tables in st4rtup
--
-- CRITICAL SECURITY FIX: Without RLS, anyone with the Supabase
-- anon key can read/write ALL data in ALL tables.
--
-- INSTRUCTIONS:
-- 1. Review this script carefully
-- 2. Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- 3. Test that the app still works after applying
-- 4. If something breaks: the DROP POLICY + DISABLE RLS section
--    at the bottom reverts everything
--
-- Date: 2026-03-31
-- Author: Claude (reviewed by David)
-- ═══════════════════════════════════════════════════════════════

-- ─── Step 1: Enable RLS on ALL tables ───

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nap_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earned_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guardrail_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_tactics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_visibility_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_visibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;


-- ─── Step 2: Create policies ───
-- Policy: authenticated users can do everything (CRUD)
-- This is the simplest safe policy. Refine per-table later if needed.
-- St4rtup uses org_id for multi-tenant isolation — the backend handles filtering.
-- RLS here prevents ANONYMOUS access via the anon key.

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users','leads','contacts','visits','emails','actions',
        'opportunities','campaigns','competitors','offers','invoices',
        'payments','payment_plans','subscriptions','account_plans',
        'surveys','notifications','audit_logs','webhook_logs',
        'automations','automation_executions','chat_conversations',
        'chat_messages','funnels','utm_codes','monthly_reviews',
        'deal_rooms','deal_room_members','deal_room_messages',
        'deal_room_documents','deal_room_page_events',
        'email_templates','seo_keywords','backlinks','geo_pages',
        'geo_keyword_rankings','nap_audits','articles','publications',
        'social_posts','social_recurrences','landing_pages',
        'marketing_alerts','marketing_assets','marketing_calendar_events',
        'marketing_documents','marketing_document_versions',
        'marketing_metrics_cache','marketing_webhook_logs',
        'earned_mentions','media_metrics','ad_campaigns',
        'lead_attributions','kpi_targets','okr_objectives',
        'okr_key_results','cost_events','budget_caps',
        'cost_guardrail_log','brand_config','pricing_tiers',
        'sales_tactics','workflow_audit_log','system_settings',
        'llm_visibility_queries','llm_visibility_results',
        'call_prompts','call_prompt_versions','call_records',
        'call_queues','wa_conversations','wa_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Drop existing policies if any (idempotent)
        EXECUTE format('DROP POLICY IF EXISTS auth_users_all ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', tbl);

        -- Allow authenticated users full access
        EXECUTE format(
            'CREATE POLICY auth_users_all ON public.%I
             FOR ALL
             TO authenticated
             USING (true)
             WITH CHECK (true)',
            tbl
        );

        -- Allow service_role full access (backend uses service_role key)
        EXECUTE format(
            'CREATE POLICY service_role_all ON public.%I
             FOR ALL
             TO service_role
             USING (true)
             WITH CHECK (true)',
            tbl
        );
    END LOOP;
END $$;


-- ─── Step 3: Verify ───
-- Run this query after applying to confirm all tables have RLS:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- All rows should show rowsecurity = true


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK (only if something breaks)
-- Uncomment and run this section to revert ALL changes
-- ═══════════════════════════════════════════════════════════════
/*
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users','leads','contacts','visits','emails','actions',
        'opportunities','campaigns','competitors','offers','invoices',
        'payments','payment_plans','subscriptions','account_plans',
        'surveys','notifications','audit_logs','webhook_logs',
        'automations','automation_executions','chat_conversations',
        'chat_messages','funnels','utm_codes','monthly_reviews',
        'deal_rooms','deal_room_members','deal_room_messages',
        'deal_room_documents','deal_room_page_events',
        'email_templates','seo_keywords','backlinks','geo_pages',
        'geo_keyword_rankings','nap_audits','articles','publications',
        'social_posts','social_recurrences','landing_pages',
        'marketing_alerts','marketing_assets','marketing_calendar_events',
        'marketing_documents','marketing_document_versions',
        'marketing_metrics_cache','marketing_webhook_logs',
        'earned_mentions','media_metrics','ad_campaigns',
        'lead_attributions','kpi_targets','okr_objectives',
        'okr_key_results','cost_events','budget_caps',
        'cost_guardrail_log','brand_config','pricing_tiers',
        'sales_tactics','workflow_audit_log','system_settings',
        'llm_visibility_queries','llm_visibility_results',
        'call_prompts','call_prompt_versions','call_records',
        'call_queues','wa_conversations','wa_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS auth_users_all ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', tbl);
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;
*/
