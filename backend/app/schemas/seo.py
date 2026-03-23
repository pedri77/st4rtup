"""Schemas Pydantic para SEO y Geo-SEO."""
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


# ─── SEO Keywords ─────────────────────────────────────────────

class SEOKeywordCreate(BaseModel):
    keyword: str
    language: str = "es"
    location: str = "Spain"
    search_volume: Optional[int] = None
    difficulty: Optional[float] = None
    cpc: Optional[float] = None
    category: Optional[str] = None
    target_url: Optional[str] = None
    campaign_id: Optional[UUID] = None
    notes: Optional[str] = None

class SEOKeywordUpdate(BaseModel):
    keyword: Optional[str] = None
    language: Optional[str] = None
    location: Optional[str] = None
    search_volume: Optional[int] = None
    difficulty: Optional[float] = None
    cpc: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    target_url: Optional[str] = None
    campaign_id: Optional[UUID] = None
    notes: Optional[str] = None

class SEOKeywordResponse(BaseModel):
    id: UUID
    keyword: str
    language: str
    location: str
    search_volume: Optional[int] = None
    difficulty: Optional[float] = None
    cpc: Optional[float] = None
    category: Optional[str] = None
    is_active: bool
    target_url: Optional[str] = None
    campaign_id: Optional[UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ─── SEO Rankings ─────────────────────────────────────────────

class SEORankingCreate(BaseModel):
    keyword_id: UUID
    check_date: date
    position: Optional[int] = None
    url_found: Optional[str] = None
    provider: str = "manual"
    country: str = "ES"
    device: str = "desktop"
    previous_position: Optional[int] = None
    serp_features: Optional[dict] = None

class SEORankingResponse(BaseModel):
    id: UUID
    keyword_id: UUID
    check_date: date
    position: Optional[int] = None
    url_found: Optional[str] = None
    provider: str
    country: str
    device: str
    previous_position: Optional[int] = None
    serp_features: Optional[dict] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Geo Pages ────────────────────────────────────────────────

class GeoPageCreate(BaseModel):
    title: str
    url: str
    country: str = "ES"
    region: Optional[str] = None
    city: Optional[str] = None
    language: str = "es"
    hreflang_tags: Optional[list] = None
    target_keywords: Optional[list[str]] = None
    status: str = "active"
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    schema_markup: Optional[dict] = None
    notes: Optional[str] = None

class GeoPageUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    language: Optional[str] = None
    hreflang_tags: Optional[list] = None
    target_keywords: Optional[list[str]] = None
    status: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    schema_markup: Optional[dict] = None
    notes: Optional[str] = None

class GeoPageResponse(BaseModel):
    id: UUID
    title: str
    url: str
    country: str
    region: Optional[str] = None
    city: Optional[str] = None
    language: str
    hreflang_tags: Optional[list] = None
    target_keywords: Optional[list[str]] = None
    status: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    schema_markup: Optional[dict] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── NAP Audits ───────────────────────────────────────────────

class NAPAuditCreate(BaseModel):
    source: str
    source_url: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_consistent: Optional[bool] = None
    inconsistencies: Optional[dict] = None
    check_date: date
    country: str = "ES"
    notes: Optional[str] = None

class NAPAuditResponse(BaseModel):
    id: UUID
    source: str
    source_url: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_consistent: Optional[bool] = None
    inconsistencies: Optional[dict] = None
    check_date: date
    country: str
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Geo Keyword Rankings ────────────────────────────────────

class GeoKeywordRankingCreate(BaseModel):
    keyword: str
    location: str
    country: str = "ES"
    check_date: date
    position: Optional[int] = None
    url_found: Optional[str] = None
    local_pack_position: Optional[int] = None
    provider: str = "manual"
    device: str = "desktop"

class GeoKeywordRankingResponse(BaseModel):
    id: UUID
    keyword: str
    location: str
    country: str
    check_date: date
    position: Optional[int] = None
    url_found: Optional[str] = None
    local_pack_position: Optional[int] = None
    provider: str
    device: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
