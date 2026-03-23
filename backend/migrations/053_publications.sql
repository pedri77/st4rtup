-- Migration 053: Publications table (Content Tracker)

CREATE TYPE publication_platform AS ENUM ('blog', 'linkedin', 'medium', 'devto', 'youtube', 'twitter', 'instagram', 'github', 'substack', 'other');
CREATE TYPE publication_status AS ENUM ('active', 'archived', 'deleted');

CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(1000) NOT NULL,
    title VARCHAR(500) NOT NULL,
    platform publication_platform NOT NULL,
    status publication_status DEFAULT 'active',
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    author VARCHAR(255),
    published_at TIMESTAMPTZ,
    description TEXT,
    thumbnail_url VARCHAR(1000),
    keywords JSONB,
    tags JSONB,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0.0,
    last_checked TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publications_platform ON publications(platform);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
