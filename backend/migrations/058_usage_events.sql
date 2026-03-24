CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    count INTEGER DEFAULT 1,
    day TIMESTAMPTZ DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage_events(feature);
CREATE INDEX IF NOT EXISTS idx_usage_day ON usage_events(day);
