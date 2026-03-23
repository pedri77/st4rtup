-- ================================================================
-- RLS (Row Level Security) Policies
-- Execute in: Supabase Dashboard → SQL Editor
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- ─── LEADS POLICIES ─────────────────────────────────────────────

-- Allow authenticated users to SELECT all leads
CREATE POLICY "Allow authenticated users to read leads"
ON leads FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT leads
CREATE POLICY "Allow authenticated users to create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE leads
CREATE POLICY "Allow authenticated users to update leads"
ON leads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE leads
CREATE POLICY "Allow authenticated users to delete leads"
ON leads FOR DELETE
TO authenticated
USING (true);

-- ─── VISITS POLICIES ────────────────────────────────────────────

CREATE POLICY "Allow authenticated users to read visits"
ON visits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create visits"
ON visits FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update visits"
ON visits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete visits"
ON visits FOR DELETE TO authenticated USING (true);

-- ─── EMAILS POLICIES ────────────────────────────────────────────

CREATE POLICY "Allow authenticated users to read emails"
ON emails FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create emails"
ON emails FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update emails"
ON emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete emails"
ON emails FOR DELETE TO authenticated USING (true);

-- ─── ACCOUNT PLANS POLICIES ─────────────────────────────────────

CREATE POLICY "Allow authenticated users to read account_plans"
ON account_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create account_plans"
ON account_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update account_plans"
ON account_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete account_plans"
ON account_plans FOR DELETE TO authenticated USING (true);

-- ─── ACTIONS POLICIES ───────────────────────────────────────────

CREATE POLICY "Allow authenticated users to read actions"
ON actions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create actions"
ON actions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update actions"
ON actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete actions"
ON actions FOR DELETE TO authenticated USING (true);

-- ─── OPPORTUNITIES POLICIES ─────────────────────────────────────

CREATE POLICY "Allow authenticated users to read opportunities"
ON opportunities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create opportunities"
ON opportunities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update opportunities"
ON opportunities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete opportunities"
ON opportunities FOR DELETE TO authenticated USING (true);

-- ─── MONTHLY REVIEWS POLICIES ───────────────────────────────────

CREATE POLICY "Allow authenticated users to read monthly_reviews"
ON monthly_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create monthly_reviews"
ON monthly_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update monthly_reviews"
ON monthly_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete monthly_reviews"
ON monthly_reviews FOR DELETE TO authenticated USING (true);

-- ─── SURVEYS POLICIES ───────────────────────────────────────────

CREATE POLICY "Allow authenticated users to read surveys"
ON surveys FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create surveys"
ON surveys FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update surveys"
ON surveys FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete surveys"
ON surveys FOR DELETE TO authenticated USING (true);

-- ─── EMAIL TEMPLATES POLICIES ───────────────────────────────────

CREATE POLICY "Allow authenticated users to read email_templates"
ON email_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create email_templates"
ON email_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update email_templates"
ON email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete email_templates"
ON email_templates FOR DELETE TO authenticated USING (true);

-- ─── AUTOMATIONS POLICIES ───────────────────────────────────────

CREATE POLICY "Allow authenticated users to read automations"
ON automations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create automations"
ON automations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update automations"
ON automations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete automations"
ON automations FOR DELETE TO authenticated USING (true);

-- ─── AUTOMATION EXECUTIONS POLICIES ─────────────────────────────

CREATE POLICY "Allow authenticated users to read automation_executions"
ON automation_executions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create automation_executions"
ON automation_executions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update automation_executions"
ON automation_executions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete automation_executions"
ON automation_executions FOR DELETE TO authenticated USING (true);

-- ─── VERIFY ─────────────────────────────────────────────────────

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
