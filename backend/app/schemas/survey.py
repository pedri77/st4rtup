"""Schemas de encuestas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.models.enums import SurveyStatus
from app.schemas.base import BaseSchema, TimestampSchema


class SurveyCreate(BaseSchema):
    lead_id: UUID
    title: str
    survey_type: Optional[str] = None
    responses: Optional[List[dict]] = None
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    external_provider: Optional[str] = None
    external_survey_id: Optional[str] = None
    external_survey_url: Optional[str] = None


class SurveyUpdate(BaseSchema):
    title: Optional[str] = None
    survey_type: Optional[str] = None
    status: Optional[SurveyStatus] = None
    responses: Optional[List[dict]] = None
    nps_score: Optional[int] = None
    overall_score: Optional[float] = None
    improvements_suggested: Optional[List[dict]] = None
    follow_up_actions: Optional[List[dict]] = None
    notes: Optional[str] = None
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    external_provider: Optional[str] = None
    external_survey_id: Optional[str] = None
    external_survey_url: Optional[str] = None
    external_response_data: Optional[dict] = None


class SurveyResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    title: str
    survey_type: Optional[str] = None
    status: SurveyStatus
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    responses: Optional[List[dict]] = None
    nps_score: Optional[int] = None
    overall_score: Optional[float] = None
    improvements_suggested: Optional[List[dict]] = None
    follow_up_actions: Optional[List[dict]] = None
    notes: Optional[str] = None
    response_token: Optional[str] = None
    external_provider: Optional[str] = None
    external_survey_id: Optional[str] = None
    external_survey_url: Optional[str] = None
    external_response_data: Optional[dict] = None
