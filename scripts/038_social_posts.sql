-- 038: Social Media posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    media_url VARCHAR(1000),
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    external_id VARCHAR(255),
    external_url VARCHAR(1000),
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate INTEGER DEFAULT 0,
    campaign_id VARCHAR(36),
    tags JSON,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS ix_social_posts_status ON social_posts(status);
