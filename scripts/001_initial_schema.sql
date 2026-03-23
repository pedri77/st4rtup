-- Riskitera Sales - Initial Schema
-- Execute in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant');
CREATE TYPE lead_source AS ENUM ('website', 'referral', 'linkedin', 'cold_outreach', 'event', 'apollo', 'scraping', 'other');
CREATE TYPE visit_type AS ENUM ('presencial', 'virtual', 'telefonica');
CREATE TYPE visit_result AS ENUM ('positive', 'neutral', 'negative', 'follow_up', 'no_show');
CREATE TYPE email_status AS ENUM ('draft', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed');
CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'overdue');
CREATE TYPE action_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE opportunity_stage AS ENUM ('discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE survey_status AS ENUM ('draft', 'sent', 'completed', 'expired');

-- Tables
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_cif VARCHAR(20) UNIQUE,
    company_website VARCHAR(500),
    company_sector VARCHAR(100),
    company_size VARCHAR(50),
    company_revenue VARCHAR(100),
    company_address TEXT,
    company_city VARCHAR(100),
    company_province VARCHAR(100),
    company_country VARCHAR(100) DEFAULT 'España',
    contact_name VARCHAR(255),
    contact_title VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_linkedin VARCHAR(500),
    status lead_status DEFAULT 'new' NOT NULL,
    source lead_source DEFAULT 'other',
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    assigned_to VARCHAR(255),
    regulatory_frameworks JSONB,
    is_critical_infrastructure BOOLEAN DEFAULT FALSE,
    is_public_sector BOOLEAN DEFAULT FALSE,
    notes TEXT,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ NOT NULL,
    visit_type visit_type NOT NULL,
    duration_minutes INTEGER,
    location VARCHAR(500),
    attendees_internal JSONB,
    attendees_external JSONB,
    result visit_result NOT NULL,
    summary TEXT,
    key_findings JSONB,
    pain_points JSONB,
    next_steps JSONB,
    follow_up_date DATE,
    follow_up_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_id VARCHAR(100),
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255),
    cc JSONB,
    status email_status DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    resend_id VARCHAR(255),
    is_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_sequence INTEGER,
    parent_email_id UUID REFERENCES emails(id),
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE account_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
    objective TEXT,
    value_proposition TEXT,
    target_products JSONB,
    estimated_deal_value FLOAT,
    estimated_close_date DATE,
    decision_makers JSONB,
    champions JSONB,
    blockers JSONB,
    competitive_landscape TEXT,
    strengths JSONB,
    weaknesses JSONB,
    opportunities_list JSONB,
    threats JSONB,
    milestones JSONB,
    notes TEXT,
    last_reviewed DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    action_type VARCHAR(100),
    status action_status DEFAULT 'pending',
    priority action_priority DEFAULT 'medium',
    due_date DATE NOT NULL,
    completed_date DATE,
    assigned_to VARCHAR(255),
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    stage opportunity_stage DEFAULT 'discovery',
    probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
    value FLOAT,
    currency VARCHAR(3) DEFAULT 'EUR',
    recurring_revenue FLOAT,
    expected_close_date DATE,
    actual_close_date DATE,
    products JSONB,
    win_reason TEXT,
    loss_reason TEXT,
    competitor VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE monthly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    review_month INTEGER NOT NULL CHECK (review_month >= 1 AND review_month <= 12),
    review_year INTEGER NOT NULL,
    project_status VARCHAR(50),
    health_score INTEGER CHECK (health_score >= 1 AND health_score <= 10),
    summary TEXT,
    conversations_held JSONB,
    emails_sent INTEGER DEFAULT 0,
    emails_received INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    actions_completed JSONB,
    actions_pending JSONB,
    actions_planned JSONB,
    improvements_identified JSONB,
    client_feedback TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    survey_type VARCHAR(100),
    status survey_status DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    responses JSONB,
    nps_score INTEGER,
    overall_score FLOAT,
    improvements_suggested JSONB,
    follow_up_actions JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_company_name ON leads(company_name);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_visits_lead_id ON visits(lead_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_emails_lead_id ON emails(lead_id);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_actions_lead_id ON actions(lead_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_due_date ON actions(due_date);
CREATE INDEX idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_monthly_reviews_lead_id ON monthly_reviews(lead_id);
CREATE INDEX idx_surveys_lead_id ON surveys(lead_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['leads','visits','emails','account_plans','actions','opportunities','monthly_reviews','surveys','email_templates'])
    LOOP
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    END LOOP;
END;
$$;
