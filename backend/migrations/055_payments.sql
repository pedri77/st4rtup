-- 055_payments.sql — Stripe + PayPal payment tables
-- Run manually on Fly.io Postgres: fly postgres connect -a riskitera-postgres

-- Payment Plans
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_eur DOUBLE PRECISION NOT NULL,
    interval VARCHAR(20) DEFAULT 'month',
    stripe_price_id VARCHAR(255),
    paypal_plan_id VARCHAR(255),
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    trial_days INTEGER DEFAULT 0,
    max_users INTEGER,
    max_leads INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,

    provider VARCHAR(20) NOT NULL,
    provider_payment_id VARCHAR(255),
    provider_subscription_id VARCHAR(255),
    provider_customer_id VARCHAR(255),
    provider_invoice_id VARCHAR(255),

    amount_eur DOUBLE PRECISION NOT NULL,
    currency VARCHAR(5) DEFAULT 'EUR',
    status VARCHAR(30) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'one_time',

    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    description TEXT,
    invoice_url VARCHAR(1000),
    receipt_url VARCHAR(1000),

    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    invoice_number VARCHAR(50) UNIQUE,
    provider VARCHAR(20),
    provider_invoice_id VARCHAR(255),

    amount_eur DOUBLE PRECISION NOT NULL,
    tax_rate DOUBLE PRECISION DEFAULT 21.0,
    tax_amount DOUBLE PRECISION,
    total_eur DOUBLE PRECISION,

    status VARCHAR(30) DEFAULT 'draft',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_tax_id VARCHAR(50),
    customer_address TEXT,

    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    pdf_url VARCHAR(1000),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id ON invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_payment_plans') THEN
        CREATE TRIGGER set_updated_at_payment_plans
            BEFORE UPDATE ON payment_plans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_payments') THEN
        CREATE TRIGGER set_updated_at_payments
            BEFORE UPDATE ON payments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_invoices') THEN
        CREATE TRIGGER set_updated_at_invoices
            BEFORE UPDATE ON invoices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
