-- 047: Formularios operativos — campos nuevos + tablas nuevas

-- FORM-LEAD-001: campos faltantes en leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_revenue VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_postal_code VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_lastname VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_language VARCHAR(10) DEFAULT 'es';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_role VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_origin VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ens_level VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS compliance_deadline DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_grc_tool VARCHAR(255);

-- FORM-LEAD-002: BANT qualification
CREATE TABLE IF NOT EXISTS lead_bant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    qualification_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Budget
    has_budget VARCHAR(50),
    budget_range VARCHAR(50),
    budget_approver VARCHAR(255),
    budget_approval_period VARCHAR(20),
    budget_notes TEXT,
    score_budget INTEGER DEFAULT 0,
    -- Authority
    is_contact_decision_maker VARCHAR(50),
    decision_maker_name VARCHAR(255),
    decision_maker_title VARCHAR(255),
    contacted_decision_maker VARCHAR(50),
    stakeholder_map TEXT,
    score_authority INTEGER DEFAULT 0,
    -- Need
    pain_point VARCHAR(255),
    regulatory_urgency VARCHAR(100),
    current_situation TEXT,
    desired_situation TEXT,
    competitors_evaluated TEXT,
    score_need INTEGER DEFAULT 0,
    -- Timeline
    has_implementation_deadline VARCHAR(100),
    regulatory_deadline DATE,
    decision_timeframe VARCHAR(50),
    buying_phase VARCHAR(50),
    next_milestone VARCHAR(255),
    score_timeline INTEGER DEFAULT 0,
    -- Total
    score_total INTEGER DEFAULT 0,
    recommendation VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_bant_lead ON lead_bant(lead_id);

-- FORM-VISIT-002: Demo report fields on visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_modules JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_type VARCHAR(50);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_environment VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_product_version VARCHAR(20);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_positive_reactions TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_technical_questions TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_gaps TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_score INTEGER;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS demo_poc_requested VARCHAR(50);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS objections TEXT;

-- FORM-DEAL-002: Proposal briefing fields on opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS proposal_deadline DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS modules_requested JSONB;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS regulatory_frameworks JSONB;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS num_licenses INTEGER;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS integrations_required TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deployment_env VARCHAR(100);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sla_required VARCHAR(50);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS security_requirements TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(100);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS discount_pct INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS include_poc BOOLEAN DEFAULT FALSE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS include_roi BOOLEAN DEFAULT FALSE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS include_competitor_comparison BOOLEAN DEFAULT FALSE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS delivery_format VARCHAR(50);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competitors_in_evaluation TEXT;

-- FORM-PARTNER-001: Partners
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    agreement_type VARCHAR(100),
    commission_pct DOUBLE PRECISION DEFAULT 0,
    territory VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORM-ONBOARD-001: Onboarding checklists
CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    start_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    kickoff_date DATE,
    kickoff_completed BOOLEAN DEFAULT FALSE,
    access_provisioned BOOLEAN DEFAULT FALSE,
    data_migration_done BOOLEAN DEFAULT FALSE,
    training_scheduled BOOLEAN DEFAULT FALSE,
    training_completed BOOLEAN DEFAULT FALSE,
    go_live_date DATE,
    go_live_completed BOOLEAN DEFAULT FALSE,
    csm_assigned VARCHAR(255),
    checklist_items JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORM-CHURN-001: Churn analysis
CREATE TABLE IF NOT EXISTS churn_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    churn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    churn_reason VARCHAR(100) NOT NULL,
    churn_category VARCHAR(50),
    previous_arr DOUBLE PRECISION DEFAULT 0,
    contract_duration_months INTEGER,
    last_nps INTEGER,
    warning_signals TEXT,
    retention_attempts TEXT,
    competitor_switched_to VARCHAR(255),
    win_back_possible VARCHAR(50),
    lessons_learned TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORM-ROI-001: ROI calculations
CREATE TABLE IF NOT EXISTS roi_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Costs without Riskitera
    current_fte_cost DOUBLE PRECISION DEFAULT 0,
    current_tools_cost DOUBLE PRECISION DEFAULT 0,
    current_audit_cost DOUBLE PRECISION DEFAULT 0,
    current_incident_cost DOUBLE PRECISION DEFAULT 0,
    current_penalty_risk DOUBLE PRECISION DEFAULT 0,
    total_current_cost DOUBLE PRECISION DEFAULT 0,
    -- Costs with Riskitera
    riskitera_license_cost DOUBLE PRECISION DEFAULT 0,
    riskitera_implementation_cost DOUBLE PRECISION DEFAULT 0,
    riskitera_training_cost DOUBLE PRECISION DEFAULT 0,
    total_riskitera_cost DOUBLE PRECISION DEFAULT 0,
    -- Savings
    fte_savings DOUBLE PRECISION DEFAULT 0,
    tools_savings DOUBLE PRECISION DEFAULT 0,
    audit_savings DOUBLE PRECISION DEFAULT 0,
    risk_reduction DOUBLE PRECISION DEFAULT 0,
    total_savings DOUBLE PRECISION DEFAULT 0,
    -- ROI
    roi_pct DOUBLE PRECISION DEFAULT 0,
    payback_months INTEGER DEFAULT 0,
    three_year_value DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORM-EMAIL-001: Email briefing fields
ALTER TABLE emails ADD COLUMN IF NOT EXISTS email_type VARCHAR(50);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS objective VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS segment VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS persona_icp VARCHAR(100);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS exclusions TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS copy_notes TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ab_variant VARCHAR(10);
