"""Modelos del módulo Marketing Hub."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date,
    DateTime, JSON, ForeignKey,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import (
    CampaignObjective, CampaignChannel, CampaignStatus,
    FunnelStatus,
    MarketingAssetType, MarketingAssetStatus, AssetLanguage,
    CalendarEventType,
    AlertSeverity,
)


class Campaign(BaseModel):
    """Campaña de marketing."""
    __tablename__ = "campaigns"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False, index=True)
    objective = Column(SAEnum(CampaignObjective), nullable=False)
    channel = Column(SAEnum(CampaignChannel), nullable=False)
    status = Column(
        SAEnum(CampaignStatus),
        default=CampaignStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Presupuesto
    budget_total = Column(Float, default=0)
    budget_monthly = Column(JSON)  # {"2026-04": 5000, "2026-05": 3000}

    # Targeting
    persona_target = Column(String(100))  # CEO / DPO / CTO / Compliance Officer / MSSP
    regulatory_focus = Column(String(100))  # ENS / NIS2 / DORA / SaaS Best Practices / Mixto
    geo_target = Column(ARRAY(String))  # ["ES", "PT", "EU"]

    # Fechas y objetivos
    start_date = Column(Date)
    end_date = Column(Date)
    leads_goal = Column(Integer, default=0)
    mqls_goal = Column(Integer, default=0)

    # Gasto real y métricas externas (n8n webhooks)
    actual_budget = Column(Float, default=0)  # Gasto acumulado real
    metrics = Column(JSON)  # Métricas por fuente: {"google_ads": {...}, "linkedin": {...}}

    # Umbrales de alerta
    max_cpl = Column(Float)  # CPL máximo aceptable
    days_without_leads_alert = Column(Integer)  # Días sin leads antes de alerta

    # Auditoría
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    funnels = relationship("Funnel", back_populates="campaign")
    assets = relationship("MarketingAsset", back_populates="campaign")
    utm_codes = relationship("UTMCode", back_populates="campaign")
    calendar_events = relationship("MarketingCalendarEvent", back_populates="campaign")


class Funnel(BaseModel):
    """Funnel de marketing con etapas configurables."""
    __tablename__ = "funnels"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(
        SAEnum(FunnelStatus),
        default=FunnelStatus.DRAFT,
        nullable=False,
        index=True,
    )
    stages = Column(JSON)  # [{name, channel, asset, cta, trigger_score}]

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    campaign = relationship("Campaign", back_populates="funnels")
    assets = relationship("MarketingAsset", back_populates="funnel")


class MarketingAsset(BaseModel):
    """Landing pages, CTAs y otros assets de marketing."""
    __tablename__ = "marketing_assets"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    type = Column(SAEnum(MarketingAssetType), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(500))
    status = Column(
        SAEnum(MarketingAssetStatus),
        default=MarketingAssetStatus.DRAFT,
        nullable=False,
        index=True,
    )
    language = Column(SAEnum(AssetLanguage), default=AssetLanguage.ES)
    has_hreflang = Column(Boolean, default=False)

    # Métricas
    visits = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)

    # SEO y contenido externo (n8n webhooks)
    external_url = Column(String(500))  # URL en plataforma externa
    seo_title = Column(String(255))
    seo_description = Column(Text)
    target_keywords = Column(ARRAY(String))  # Keywords objetivo

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    funnel_id = Column(
        UUID(as_uuid=True),
        ForeignKey("funnels.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    campaign = relationship("Campaign", back_populates="assets")
    funnel = relationship("Funnel", back_populates="assets")


class UTMCode(BaseModel):
    """Códigos UTM generados para tracking de campañas."""
    __tablename__ = "utm_codes"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    base_url = Column(String(500), nullable=False)
    utm_source = Column(String(100), nullable=False)
    utm_medium = Column(String(100), nullable=False)
    utm_campaign = Column(String(255), nullable=False)
    utm_content = Column(String(255))
    utm_term = Column(String(255))
    full_url = Column(String(2000), nullable=False)

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    campaign = relationship("Campaign", back_populates="utm_codes")


class MarketingCalendarEvent(BaseModel):
    """Evento en el calendario de marketing."""
    __tablename__ = "marketing_calendar_events"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    title = Column(String(255), nullable=False)
    event_type = Column(SAEnum(CalendarEventType), nullable=False)
    channel = Column(String(50))
    description = Column(Text)
    geo_target = Column(ARRAY(String))
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    all_day = Column(Boolean, default=False)
    color = Column(String(20))  # Hex color
    budget = Column(Float, default=0)  # Coste estimado/real del evento
    event_status = Column(String(20), default="planned")  # planned, in_progress, completed

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    responsible_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    campaign = relationship("Campaign", back_populates="calendar_events")


class MarketingAlert(BaseModel):
    """Alerta del sistema de marketing."""
    __tablename__ = "marketing_alerts"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    alert_type = Column(String(100), nullable=False)  # Flexible, no enum
    severity = Column(SAEnum(AlertSeverity), nullable=False, index=True)
    title = Column(String(255))  # Título corto de la alerta
    entity_type = Column(String(50))  # campaign | keyword | integration | document
    entity_id = Column(UUID(as_uuid=True))
    entity_name = Column(String(255))
    message = Column(Text, nullable=False)
    threshold_value = Column(Float)
    actual_value = Column(Float)
    geo_context = Column(String(100))  # País/región afectada
    source = Column(String(100))  # Origen: n8n, manual, system
    data = Column(JSON)  # Datos adicionales del payload
    recommended_action = Column(Text)  # Acción recomendada
    is_read = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime(timezone=True))

    # FK
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
