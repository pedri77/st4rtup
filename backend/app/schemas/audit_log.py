"""Audit log schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    changes: Optional[dict] = None
    ip_address: Optional[str] = None
    module: str = "marketing"
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    changes: Optional[dict] = None
    module: str = "marketing"
