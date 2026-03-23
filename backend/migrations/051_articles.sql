-- Migration 051: Articles table (SEO Command Center)

CREATE TYPE article_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE article_type AS ENUM ('blog', 'case_study', 'whitepaper', 'guide', 'normativa', 'comparativa', 'news');

CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    content_html TEXT,
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    canonical_url VARCHAR(500),
    og_image VARCHAR(500),
    schema_markup JSONB,
    article_type article_type DEFAULT 'blog',
    status article_status DEFAULT 'draft',
    category VARCHAR(100),
    tags TEXT[],
    regulatory_focus TEXT[],
    primary_keyword VARCHAR(200),
    secondary_keywords TEXT[],
    keyword_density FLOAT,
    seo_score INTEGER,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    word_count INTEGER DEFAULT 0,
    reading_time_min INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    avg_time_on_page_s INTEGER DEFAULT 0,
    bounce_rate FLOAT DEFAULT 0.0,
    pipeline_output JSONB,
    repurposed JSONB,
    last_audit_at TIMESTAMPTZ,
    audit_score INTEGER,
    audit_issues JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(article_type);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
