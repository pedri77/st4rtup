-- Migration 050: Call Queues (MOD-AICALLS-001 Fase 2)
-- Batch calling, scheduling, queue management

CREATE TABLE IF NOT EXISTS call_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    prompt_id UUID REFERENCES call_prompts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_leads INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    estimated_cost_eur FLOAT DEFAULT 0.0,
    actual_cost_eur FLOAT DEFAULT 0.0,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    concurrency_limit INTEGER DEFAULT 1,
    delay_between_calls_s INTEGER DEFAULT 30,
    max_retries INTEGER DEFAULT 2,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_queues_status ON call_queues(status);
CREATE INDEX IF NOT EXISTS idx_call_queues_scheduled ON call_queues(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS call_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES call_queues(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    call_record_id UUID REFERENCES call_records(id) ON DELETE SET NULL,
    position INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_queue_items_queue ON call_queue_items(queue_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_items_status ON call_queue_items(status);
