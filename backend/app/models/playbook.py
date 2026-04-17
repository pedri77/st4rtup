"""Sales Playbook — tácticas de venta activables por deal."""
from sqlalchemy import Column, ForeignKey, String, Float, Text, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class SalesTactic(BaseModel):
    """Táctica de venta del playbook."""
    __tablename__ = "sales_tactics"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # inbound, outbound, relacional, transaccional
    channel = Column(String(100))  # blog, seo, email, linkedin, retell, events, etc.
    description = Column(Text)
    status = Column(String(20), default="planned")  # active, planned, paused
    responsible = Column(String(255))
    metrics_target = Column(JSON)  # {"leads_month": 5, "conversion": 30}
    metrics_actual = Column(JSON)  # {"leads_month": 3, "conversion": 25}
    budget_monthly = Column(Float, default=0)  # Presupuesto mensual asignado
    budget_spent = Column(Float, default=0)  # Gasto acumulado
    notes = Column(Text)  # Notas libres
    checklist = Column(JSON)  # [{"text": "...", "done": true/false}]
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
