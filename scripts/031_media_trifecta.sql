-- 031: Media Trifecta — Paid + Earned Media tables

CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    objective VARCHAR(100),
    target_audience TEXT,
    start_date DATE,
    end_date DATE,
    budget_total DOUBLE PRECISION DEFAULT 0,
    budget_daily DOUBLE PRECISION DEFAULT 0,
    spend_total DOUBLE PRECISION DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    ctr DOUBLE PRECISION DEFAULT 0,
    cpc DOUBLE PRECISION DEFAULT 0,
    cpl DOUBLE PRECISION DEFAULT 0,
    cpa DOUBLE PRECISION DEFAULT 0,
    roas DOUBLE PRECISION DEFAULT 0,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earned_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    platform VARCHAR(100),
    title VARCHAR(500),
    url VARCHAR(1000),
    author VARCHAR(255),
    content_snippet TEXT,
    sentiment VARCHAR(20),
    rating DOUBLE PRECISION,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    date_published DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(10) NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    channel VARCHAR(50),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    spend DOUBLE PRECISION DEFAULT 0,
    revenue_attributed DOUBLE PRECISION DEFAULT 0,
    roi DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
