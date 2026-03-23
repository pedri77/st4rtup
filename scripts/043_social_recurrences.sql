-- 043: Social media recurrence auto-scheduling
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS recurrence_id VARCHAR(36);

CREATE TABLE IF NOT EXISTS social_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    content_template TEXT NOT NULL,
    media_url VARCHAR(1000),
    tags JSONB DEFAULT '[]',
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    time_of_day VARCHAR(5) DEFAULT '10:00',
    is_active BOOLEAN DEFAULT TRUE,
    next_run TIMESTAMPTZ,
    total_generated INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
