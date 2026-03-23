"""Schemas del módulo Marketing Hub."""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import Field

from app.models.enums import (
    CampaignObjective, CampaignChannel, CampaignStatus,
    FunnelStatus,
    MarketingAssetType, MarketingAssetStatus, AssetLanguage,
    CalendarEventType,
    AlertSeverity,
)
from app.schemas.base import BaseSchema, TimestampSchema


# ─── Campaign Schemas ──────────────────────────────────────────

class CampaignCreate(BaseSchema):
    name: str = Field(..., max_length=255)
    objective: CampaignObjective
    channel: CampaignChannel
    status: CampaignStatus = CampaignStatus.DRAFT
    budget_total: Optional[float] = 0
    budget_monthly: Optional[dict] = None
    persona_target: Optional[str] = None
    regulatory_focus: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    leads_goal: Optional[int] = 0
    mqls_goal: Optional[int] = 0
    max_cpl: Optional[float] = None
    days_without_leads_alert: Optional[int] = None


class CampaignUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=255)
    objective: Optional[CampaignObjective] = None
    channel: Optional[CampaignChannel] = None
    status: Optional[CampaignStatus] = None
    budget_total: Optional[float] = None
    budget_monthly: Optional[dict] = None
    persona_target: Optional[str] = None
    regulatory_focus: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    leads_goal: Optional[int] = None
    mqls_goal: Optional[int] = None
    max_cpl: Optional[float] = None
    days_without_leads_alert: Optional[int] = None


class CampaignResponse(TimestampSchema):
    id: UUID
    name: str
    objective: CampaignObjective
    channel: CampaignChannel
    status: CampaignStatus
    budget_total: Optional[float] = 0
    budget_monthly: Optional[dict] = None
    persona_target: Optional[str] = None
    regulatory_focus: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    leads_goal: Optional[int] = 0
    mqls_goal: Optional[int] = 0
    actual_budget: Optional[float] = 0
    metrics: Optional[dict] = None
    max_cpl: Optional[float] = None
    days_without_leads_alert: Optional[int] = None
    created_by: Optional[UUID] = None


# ─── Funnel Schemas ────────────────────────────────────────────

class FunnelCreate(BaseSchema):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: FunnelStatus = FunnelStatus.DRAFT
    stages: Optional[List[dict]] = None
    campaign_id: Optional[UUID] = None


class FunnelUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[FunnelStatus] = None
    stages: Optional[List[dict]] = None
    campaign_id: Optional[UUID] = None


class FunnelResponse(TimestampSchema):
    id: UUID
    name: str
    description: Optional[str] = None
    status: FunnelStatus
    stages: Optional[List[dict]] = None
    campaign_id: Optional[UUID] = None
    created_by: Optional[UUID] = None


# ─── MarketingAsset Schemas ────────────────────────────────────

class MarketingAssetCreate(BaseSchema):
    type: MarketingAssetType
    name: str = Field(..., max_length=255)
    url: Optional[str] = None
    status: MarketingAssetStatus = MarketingAssetStatus.DRAFT
    language: AssetLanguage = AssetLanguage.ES
    has_hreflang: bool = False
    campaign_id: Optional[UUID] = None
    funnel_id: Optional[UUID] = None


class MarketingAssetUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=255)
    url: Optional[str] = None
    status: Optional[MarketingAssetStatus] = None
    language: Optional[AssetLanguage] = None
    has_hreflang: Optional[bool] = None
    visits: Optional[int] = None
    conversions: Optional[int] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    campaign_id: Optional[UUID] = None
    funnel_id: Optional[UUID] = None


class MarketingAssetResponse(TimestampSchema):
    id: UUID
    type: MarketingAssetType
    name: str
    url: Optional[str] = None
    status: MarketingAssetStatus
    language: AssetLanguage
    has_hreflang: bool
    visits: int = 0
    conversions: int = 0
    impressions: int = 0
    clicks: int = 0
    campaign_id: Optional[UUID] = None
    funnel_id: Optional[UUID] = None
    created_by: Optional[UUID] = None


# ─── UTMCode Schemas ───────────────────────────────────────────

class UTMCodeCreate(BaseSchema):
    base_url: str = Field(..., max_length=500)
    utm_source: str = Field(..., max_length=100)
    utm_medium: str = Field(..., max_length=100)
    utm_campaign: str = Field(..., max_length=255)
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    campaign_id: Optional[UUID] = None


class UTMCodeResponse(TimestampSchema):
    id: UUID
    base_url: str
    utm_source: str
    utm_medium: str
    utm_campaign: str
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    full_url: str
    campaign_id: Optional[UUID] = None
    created_by: Optional[UUID] = None


# ─── MarketingCalendarEvent Schemas ────────────────────────────

class MarketingCalendarEventCreate(BaseSchema):
    title: str = Field(..., max_length=255)
    event_type: CalendarEventType
    channel: Optional[str] = None
    description: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    all_day: bool = False
    color: Optional[str] = None
    campaign_id: Optional[UUID] = None
    responsible_id: Optional[UUID] = None


class MarketingCalendarEventUpdate(BaseSchema):
    title: Optional[str] = Field(None, max_length=255)
    event_type: Optional[CalendarEventType] = None
    channel: Optional[str] = None
    description: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    campaign_id: Optional[UUID] = None
    responsible_id: Optional[UUID] = None


class MarketingCalendarEventResponse(TimestampSchema):
    id: UUID
    title: str
    event_type: CalendarEventType
    channel: Optional[str] = None
    description: Optional[str] = None
    geo_target: Optional[List[str]] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    all_day: bool
    color: Optional[str] = None
    campaign_id: Optional[UUID] = None
    responsible_id: Optional[UUID] = None
    created_by: Optional[UUID] = None


# ─── MarketingAlert Schemas ────────────────────────────────────

class MarketingAlertCreate(BaseSchema):
    alert_type: str = Field(..., max_length=100)
    severity: AlertSeverity
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    message: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    geo_context: Optional[str] = None


class MarketingAlertUpdate(BaseSchema):
    is_read: Optional[bool] = None
    resolved_at: Optional[datetime] = None


class MarketingAlertResponse(TimestampSchema):
    id: UUID
    alert_type: str
    severity: AlertSeverity
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    message: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    geo_context: Optional[str] = None
    is_read: bool
    resolved_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
