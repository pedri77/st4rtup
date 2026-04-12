"""Pipeline automation rules — trigger actions on stage changes."""
from sqlalchemy import Column, String, Text, Boolean, Integer, JSON

from app.models.base import BaseModel


class PipelineRule(BaseModel):
    """Regla de automatizacion del pipeline.

    Cuando una oportunidad cambia de stage, ejecuta acciones configuradas.
    """
    __tablename__ = "pipeline_rules"

    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)

    # Trigger
    trigger_stage = Column(String(50), nullable=False)  # Stage que dispara la regla
    trigger_condition = Column(String(20), default="enters")  # enters, leaves, any

    # Conditions (optional filters)
    conditions = Column(JSON, default=dict)  # {"min_value": 10000, "sector": "fintech", ...}

    # Actions (list of actions to execute)
    actions = Column(JSON, default=list)
    # Each action: {"type": "create_action"|"send_email"|"notify"|"update_field"|"score", "config": {...}}

    # Stats
    times_triggered = Column(Integer, default=0)
