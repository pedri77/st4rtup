-- Subscriptions table for plan gating
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan                    VARCHAR(20) NOT NULL DEFAULT 'starter',
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    stripe_customer_id      VARCHAR(255),
    stripe_subscription_id  VARCHAR(255),
    stripe_price_id         VARCHAR(255),
    billing_cycle           VARCHAR(10) DEFAULT 'monthly',
    amount_eur              FLOAT DEFAULT 0,
    trial_ends_at           TIMESTAMPTZ,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_plan ON subscriptions(plan);
