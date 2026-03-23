"""Schemas de visitas, emails, acciones, planes de cuenta y reviews mensuales."""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import EmailStr, Field

from app.models.enums import (
    VisitType, VisitResult,
    EmailStatus,
    ActionStatus, ActionPriority,
)
from app.schemas.base import BaseSchema, TimestampSchema


# ─── Visit Schemas ────────────────────────────────────────────────

class VisitCreate(BaseSchema):
    lead_id: UUID
    visit_date: datetime
    visit_type: VisitType
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    attendees_internal: Optional[List[str]] = None
    attendees_external: Optional[List[dict]] = None
    result: VisitResult
    summary: Optional[str] = None
    key_findings: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    next_steps: Optional[List[str]] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None


class VisitUpdate(BaseSchema):
    visit_date: Optional[datetime] = None
    visit_type: Optional[VisitType] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    attendees_internal: Optional[List[str]] = None
    attendees_external: Optional[List[dict]] = None
    result: Optional[VisitResult] = None
    summary: Optional[str] = None
    key_findings: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    next_steps: Optional[List[str]] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None


class VisitResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    lead_name: Optional[str] = None
    visit_date: datetime
    visit_type: VisitType
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    attendees_internal: Optional[List[str]] = None
    attendees_external: Optional[List[dict]] = None
    result: VisitResult
    summary: Optional[str] = None
    key_findings: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    next_steps: Optional[List[str]] = None
    follow_up_date: Optional[date] = None


# ─── Email Schemas ────────────────────────────────────────────────

class EmailCreate(BaseSchema):
    lead_id: UUID
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    template_id: Optional[str] = None
    to_email: EmailStr
    from_email: Optional[EmailStr] = None
    cc: Optional[List[str]] = None
    is_follow_up: bool = False
    follow_up_sequence: Optional[int] = None
    parent_email_id: Optional[UUID] = None
    scheduled_at: Optional[datetime] = None


class EmailResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    lead_name: Optional[str] = None
    subject: str
    to_email: str
    status: EmailStatus
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    is_follow_up: bool
    follow_up_sequence: Optional[int] = None


# ─── Action Schemas ───────────────────────────────────────────────

class ActionCreate(BaseSchema):
    lead_id: UUID
    title: str
    description: Optional[str] = None
    action_type: Optional[str] = None
    priority: ActionPriority = ActionPriority.MEDIUM
    due_date: date
    assigned_to: Optional[str] = None


class ActionUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    action_type: Optional[str] = None
    status: Optional[ActionStatus] = None
    priority: Optional[ActionPriority] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None
    assigned_to: Optional[str] = None
    result: Optional[str] = None


class ActionResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    title: str
    description: Optional[str] = None
    action_type: Optional[str] = None
    status: ActionStatus
    priority: ActionPriority
    due_date: date
    completed_date: Optional[date] = None
    assigned_to: Optional[str] = None
    result: Optional[str] = None


# ─── Account Plan Schemas ─────────────────────────────────────────

class AccountPlanCreate(BaseSchema):
    lead_id: UUID
    objective: Optional[str] = None
    value_proposition: Optional[str] = None
    target_products: Optional[List[str]] = None
    estimated_deal_value: Optional[float] = None
    estimated_close_date: Optional[date] = None
    decision_makers: Optional[List[dict]] = None
    champions: Optional[List[dict]] = None
    blockers: Optional[List[dict]] = None
    competitive_landscape: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    opportunities_list: Optional[List[str]] = None
    threats: Optional[List[str]] = None
    milestones: Optional[List[dict]] = None
    notes: Optional[str] = None


class AccountPlanResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    objective: Optional[str] = None
    value_proposition: Optional[str] = None
    target_products: Optional[List[str]] = None
    estimated_deal_value: Optional[float] = None
    estimated_close_date: Optional[date] = None
    decision_makers: Optional[List[dict]] = None
    milestones: Optional[List[dict]] = None
    last_reviewed: Optional[date] = None


# ─── Monthly Review Schemas ───────────────────────────────────────

class MonthlyReviewCreate(BaseSchema):
    lead_id: UUID
    review_month: int = Field(ge=1, le=12)
    review_year: int
    project_status: Optional[str] = None
    health_score: Optional[int] = Field(default=None, ge=1, le=10)
    summary: Optional[str] = None
    conversations_held: Optional[List[dict]] = None
    emails_sent: int = 0
    emails_received: int = 0
    meetings_held: int = 0
    actions_completed: Optional[List[dict]] = None
    actions_pending: Optional[List[dict]] = None
    actions_planned: Optional[List[dict]] = None
    improvements_identified: Optional[List[dict]] = None
    client_feedback: Optional[str] = None
    notes: Optional[str] = None


class MonthlyReviewResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    lead_name: Optional[str] = None
    review_month: int
    review_year: int
    project_status: Optional[str] = None
    health_score: Optional[int] = None
    summary: Optional[str] = None
    conversations_held: Optional[List[dict]] = None
    emails_sent: int
    emails_received: int = 0
    meetings_held: int
    actions_completed: Optional[List[dict]] = None
    actions_pending: Optional[List[dict]] = None
    actions_planned: Optional[List[dict]] = None
    improvements_identified: Optional[List[dict]] = None
    client_feedback: Optional[str] = None
    notes: Optional[str] = None
