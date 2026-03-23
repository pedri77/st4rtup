-- Riskitera Sales - Automations Schema
-- Execute in Supabase SQL Editor AFTER 001_initial_schema.sql

-- Enum types
CREATE TYPE automation_status AS ENUM ('active', 'paused', 'draft', 'error', 'disabled');
CREATE TYPE automation_category AS ENUM ('email_automation', 'leads_captacion', 'visitas', 'acciones_alertas', 'pipeline', 'seguimiento_mensual', 'encuestas', 'integraciones');
CREATE TYPE automation_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE automation_complexity AS ENUM ('low', 'medium', 'high');
CREATE TYPE automation_trigger_type AS ENUM ('webhook', 'cron', 'event', 'manual');
CREATE TYPE automation_phase AS ENUM ('phase_1', 'phase_2', 'phase_3', 'phase_4');
CREATE TYPE automation_impl_status AS ENUM ('pending', 'in_progress', 'testing', 'deployed', 'failed');

-- Automations table
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category automation_category NOT NULL,
    trigger_type automation_trigger_type NOT NULL,
    trigger_config JSONB,
    actions_description TEXT,
    actions_config JSONB,
    api_endpoints JSONB,
    integrations JSONB,
    priority automation_priority DEFAULT 'medium',
    complexity automation_complexity DEFAULT 'medium',
    impact VARCHAR(255),
    phase automation_phase,
    sprint VARCHAR(50),
    estimated_hours FLOAT,
    dependencies JSONB,
    status automation_status DEFAULT 'draft',
    impl_status automation_impl_status DEFAULT 'pending',
    is_enabled BOOLEAN DEFAULT FALSE,
    n8n_workflow_id VARCHAR(100),
    n8n_workflow_url VARCHAR(500),
    n8n_webhook_url VARCHAR(500),
    notes TEXT,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automation executions table
CREATE TABLE automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(100),
    items_processed INTEGER DEFAULT 0,
    items_succeeded INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    input_data JSONB,
    output_data JSONB,
    n8n_execution_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_automations_code ON automations(code);
CREATE INDEX idx_automations_category ON automations(category);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_automations_priority ON automations(priority);
CREATE INDEX idx_automations_impl_status ON automations(impl_status);
CREATE INDEX idx_automations_phase ON automations(phase);
CREATE INDEX idx_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);
CREATE INDEX idx_automation_executions_started_at ON automation_executions(started_at);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
