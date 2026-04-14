"""Enable Row Level Security on all public tables.

Supabase flagged tables without RLS as CRITICAL. This migration:
1. Enables RLS on every public table
2. Creates a permissive policy for the service_role (backend connection)
3. Creates a permissive policy for the postgres role (migrations)

The backend connects via service_role, so all queries pass through.
The anon role (public) is blocked by default — no anonymous access.

Revision ID: 011_rls_all
Revises: 010_webhook_idempotency
"""
from alembic import op

revision = "011_rls_all"
down_revision = "010_webhook_idempotency"
branch_labels = None
depends_on = None

TABLES = [
    "account_plans", "actions", "ad_campaigns", "affiliate_clicks",
    "affiliate_links", "articles", "audit_logs", "automation_executions",
    "automations", "backlinks", "brand_config", "budget_caps",
    "call_prompt_versions", "call_prompts", "call_queue_items", "call_queues",
    "call_records", "campaigns", "chat_conversations", "chat_messages",
    "churn_records", "competitors", "contacts", "cost_events",
    "cost_guardrail_log", "deal_room_documents", "deal_room_page_events",
    "deal_rooms", "earned_mentions", "email_templates", "emails",
    "form_submissions", "form_tokens", "funnels", "geo_keyword_rankings",
    "geo_pages", "invoices", "kpi_targets", "landing_pages",
    "lead_attributions", "lead_bant", "leads", "llm_visibility_queries",
    "llm_visibility_results", "marketing_alerts", "marketing_assets",
    "marketing_calendar_events", "marketing_document_links",
    "marketing_document_versions", "marketing_documents",
    "marketing_metrics_cache", "marketing_webhook_logs", "media_metrics",
    "monthly_reviews", "nap_audits", "notifications", "offers",
    "okr_key_results", "okr_objectives", "onboarding_checklists",
    "opportunities", "org_members", "organizations", "partners",
    "payment_plans", "payments", "pipeline_rules", "pricing_tiers",
    "publications", "roi_calculations", "rss_feeds", "sales_tactics",
    "seo_keywords", "seo_rankings", "service_catalog", "social_posts",
    "social_recurrences", "subscriptions", "surveys", "system_settings",
    "usage_events", "user_sessions", "users", "utm_codes", "visits",
    "wa_conversations", "wa_messages", "webhook_logs",
    "webhook_subscriptions", "workflow_audit_log",
]


def upgrade():
    for table in TABLES:
        # Enable RLS (idempotent — no error if already enabled)
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        # Allow service_role full access (this is how the backend connects)
        op.execute(
            f"CREATE POLICY IF NOT EXISTS service_role_all ON public.{table} "
            f"FOR ALL TO service_role USING (true) WITH CHECK (true)"
        )
        # Allow postgres role full access (migrations, admin)
        op.execute(
            f"CREATE POLICY IF NOT EXISTS postgres_all ON public.{table} "
            f"FOR ALL TO postgres USING (true) WITH CHECK (true)"
        )


def downgrade():
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS service_role_all ON public.{table}")
        op.execute(f"DROP POLICY IF EXISTS postgres_all ON public.{table}")
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
