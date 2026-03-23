"""Schemas para webhooks."""
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WebhookLogResponse(BaseModel):
    id: UUID
    provider: str
    event_type: Optional[str] = None
    form_id: Optional[str] = None
    form_name: Optional[str] = None
    submission_id: Optional[str] = None
    parsed_data: Optional[dict] = None
    lead_created: bool
    lead_id: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
