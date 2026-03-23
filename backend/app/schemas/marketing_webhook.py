"""Schemas para webhooks de marketing n8n."""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ─── Request schemas ──────────────────────────────────────────────

class CampaignMetric(BaseModel):
    campaign_name: str
    campaign_external_id: Optional[str] = None
    impressions: int = 0
    clicks: int = 0
    cost: float = 0.0
    conversions: int = 0
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    conversion_rate: Optional[float] = None


class CampaignMetricsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    source: str
    date: str
    metrics: List[CampaignMetric]


class SocialPost(BaseModel):
    post_id: Optional[str] = None
    title: Optional[str] = None
    impressions: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    engagement_rate: Optional[float] = None
    url: Optional[str] = None


class SocialEngagementPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    source: str
    period: Optional[str] = None
    posts: List[SocialPost] = []
    summary: Optional[Dict[str, Any]] = None


class ContentPublishedPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    source: str
    content: Dict[str, Any]


class Touchpoint(BaseModel):
    channel: str
    campaign_name: Optional[str] = None
    campaign_id: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    landing_page: Optional[str] = None
    timestamp: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None


class LeadAttributionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    lead_id: str
    touchpoints: List[Touchpoint]
    attribution_model: str = "last_touch"


class ExternalAlertPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    alert: Dict[str, Any]


class MetricsSyncPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    date: str
    source: str = "consolidated"
    metrics: Dict[str, Any]


# ─── Response schemas ─────────────────────────────────────────────

class WebhookResponse(BaseModel):
    status: str
    event_id: str
    entities_affected: int = 0
    details: Optional[Dict[str, Any]] = None


class MarketingWebhookLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: str
    webhook_type: str
    source: Optional[str] = None
    entities_affected: int = 0
    success: bool = True
    error: Optional[str] = None
    processing_ms: Optional[int] = None
    created_at: datetime
