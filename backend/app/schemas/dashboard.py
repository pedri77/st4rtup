"""Schemas de dashboard y estadísticas."""
from typing import List, Optional

from pydantic import Field
from app.schemas.base import BaseSchema


class DashboardWidgetConfig(BaseSchema):
    id: str
    label: str
    visible: bool = True
    position: int = 0
    size: str = Field(default="md", pattern="^(sm|md|lg)$")


class DashboardConfigUpdate(BaseSchema):
    widgets: List[DashboardWidgetConfig]


class DashboardConfigResponse(BaseSchema):
    widgets: List[DashboardWidgetConfig]


class DashboardStats(BaseSchema):
    total_leads: int = 0
    leads_by_status: dict = {}
    total_opportunities: int = 0
    pipeline_value: float = 0.0
    weighted_pipeline: float = 0.0
    actions_overdue: int = 0
    actions_due_today: int = 0
    emails_sent_this_month: int = 0
    visits_this_month: int = 0
    conversion_rate: float = 0.0

    # Extended stats for charts and trends
    pipeline_by_stage: dict = {}
    activity_last_7_days: List[dict] = []
    upcoming_visits: List[dict] = []
    stale_opportunities: int = 0

    # Trends (comparison with previous period)
    leads_trend: float = 0.0
    pipeline_trend: float = 0.0
    conversion_trend: float = 0.0

    # Offers & Revenue
    offers_this_month: int = 0
    offers_accepted_this_month: int = 0
    revenue_won_this_month: float = 0.0
    revenue_won_this_quarter: float = 0.0
    deals_closing_soon: List[dict] = []

    # Additional charts
    conversion_funnel: List[dict] = []
    top_leads_by_score: List[dict] = []
    leads_by_sector: dict = {}
    recent_activity: List[dict] = []
