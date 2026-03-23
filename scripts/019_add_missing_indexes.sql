-- Add missing indexes on foreign keys for query performance
-- These FK columns are frequently used in JOINs and WHERE clauses

CREATE INDEX IF NOT EXISTS idx_visits_lead_id ON visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_parent_email_id ON emails(parent_email_id);
CREATE INDEX IF NOT EXISTS idx_actions_lead_id ON actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_lead_id ON monthly_reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_surveys_lead_id ON surveys(lead_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
