-- ================================================================
-- TEMPORARY: Disable RLS for testing
-- ⚠️ WARNING: Only use in development/testing
-- ⚠️ Re-enable RLS in production with proper policies
-- ================================================================

-- Disable RLS on all tables (TEMPORARY)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE automations DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
