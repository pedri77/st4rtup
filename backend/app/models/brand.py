"""Brand & Positioning — configuración de marca de la empresa."""
from sqlalchemy import Column, ForeignKey, String, Float, Text, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class BrandConfig(BaseModel):
    """Configuración de marca y posicionamiento (singleton)."""
    __tablename__ = "brand_config"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    company_name = Column(String(255), default="St4rtup")
    domain = Column(String(255), default="st4rtup.app")
    slogan = Column(String(500))
    mission = Column(Text)
    vision = Column(Text)
    values = Column(Text)
    segment = Column(String(50), default="enterprise")  # enterprise, smb, both
    regulatory_frameworks = Column(JSON, default=list)  # ["Enterprise", "NIS2", "DORA", "SaaS Best Practices"]
    logo_url = Column(String(500))
    primary_color = Column(String(20), default="#0891b2")
    gtm_budget_annual = Column(Float, default=0)  # Presupuesto GTM anual total
    gtm_budget_q1 = Column(Float, default=2600)  # Q1: €800+€600+€1200
    gtm_budget_q2 = Column(Float, default=0)
    gtm_budget_q3 = Column(Float, default=0)
    gtm_budget_q4 = Column(Float, default=0)
    metadata_ = Column("metadata", JSON)
