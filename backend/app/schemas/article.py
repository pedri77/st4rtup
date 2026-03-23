"""Schemas Pydantic para el SEO Command Center — Articles."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ArticleCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: str
    content_html: Optional[str] = None
    meta_title: Optional[str] = Field(None, max_length=70)
    meta_description: Optional[str] = Field(None, max_length=160)
    canonical_url: Optional[str] = None
    og_image: Optional[str] = None
    article_type: str = "blog"
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    regulatory_focus: Optional[List[str]] = None
    primary_keyword: Optional[str] = None
    secondary_keywords: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    pipeline_output: Optional[dict] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    meta_title: Optional[str] = Field(None, max_length=70)
    meta_description: Optional[str] = Field(None, max_length=160)
    canonical_url: Optional[str] = None
    og_image: Optional[str] = None
    article_type: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    regulatory_focus: Optional[List[str]] = None
    primary_keyword: Optional[str] = None
    secondary_keywords: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    seo_score: Optional[int] = None
    keyword_density: Optional[float] = None


class ArticleResponse(BaseModel):
    id: UUID
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: str
    content_html: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    canonical_url: Optional[str] = None
    og_image: Optional[str] = None
    article_type: str
    status: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    regulatory_focus: Optional[List[str]] = None
    primary_keyword: Optional[str] = None
    secondary_keywords: Optional[List[str]] = None
    keyword_density: Optional[float] = None
    seo_score: Optional[int] = None
    author_id: Optional[UUID] = None
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    word_count: int = 0
    reading_time_min: int = 0
    views: int = 0
    clicks: int = 0
    pipeline_output: Optional[dict] = None
    repurposed: Optional[dict] = None
    audit_score: Optional[int] = None
    audit_issues: Optional[list] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
