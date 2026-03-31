-- St4rtup — Fix missing tables (2026-03-31)
-- Execute in Supabase SQL Editor for project dszhaxyzrnsgjlabtvqx

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  sector VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'starter',
  logo_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMPTZ,
  max_users INTEGER DEFAULT 1,
  max_leads INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Org Members
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 3. Service Catalog
CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price FLOAT DEFAULT 0,
  currency VARCHAR(5) DEFAULT 'EUR',
  billing_type VARCHAR(20) DEFAULT 'one_time',
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment Plans
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_eur FLOAT NOT NULL,
  interval VARCHAR(20) DEFAULT 'month',
  stripe_price_id VARCHAR(255),
  paypal_plan_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_users INTEGER,
  max_leads INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID,
  plan_id UUID,
  provider VARCHAR(20) NOT NULL,
  provider_payment_id VARCHAR(255),
  provider_subscription_id VARCHAR(255),
  provider_customer_id VARCHAR(255),
  provider_invoice_id VARCHAR(255),
  amount_eur FLOAT NOT NULL,
  currency VARCHAR(5) DEFAULT 'EUR',
  status VARCHAR(30) NOT NULL,
  payment_type VARCHAR(20) DEFAULT 'one_time',
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  description TEXT,
  invoice_url VARCHAR(1000),
  receipt_url VARCHAR(1000),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID,
  lead_id UUID,
  invoice_number VARCHAR(50) UNIQUE,
  provider VARCHAR(20),
  provider_invoice_id VARCHAR(255),
  amount_eur FLOAT NOT NULL,
  tax_rate FLOAT DEFAULT 21.0,
  tax_amount FLOAT,
  total_eur FLOAT,
  status VARCHAR(30) DEFAULT 'draft',
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_tax_id VARCHAR(50),
  customer_address TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url VARCHAR(1000),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WA Conversations
CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone VARCHAR(30) NOT NULL,
  lead_id UUID,
  lead_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  bot_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WA Messages
CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES wa_conversations(id) ON DELETE CASCADE NOT NULL,
  direction VARCHAR(10) NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT,
  wa_message_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent',
  sender_phone VARCHAR(30),
  sender_name VARCHAR(255),
  media_url VARCHAR(1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_org ON service_catalog(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_org ON wa_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON wa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- Also add org_id to Payment model (the query uses it but column didn't exist)
-- Already added in CREATE TABLE above
