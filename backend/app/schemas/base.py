"""Schemas base y paginación."""
from datetime import datetime
from typing import List, Any
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampSchema(BaseSchema):
    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
