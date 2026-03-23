"""Backward-compatible re-exports from domain files.

All schemas are now defined in their own domain files.
This file re-exports everything so existing imports continue to work.
"""
from app.schemas.base import BaseSchema, TimestampSchema, PaginatedResponse  # noqa: F401
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListItem  # noqa: F401
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadDetail  # noqa: F401
from app.schemas.crm import (  # noqa: F401
    VisitCreate, VisitUpdate, VisitResponse,
    EmailCreate, EmailResponse,
    ActionCreate, ActionUpdate, ActionResponse,
    AccountPlanCreate, AccountPlanResponse,
    MonthlyReviewCreate, MonthlyReviewResponse,
)
from app.schemas.pipeline import (  # noqa: F401
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OfferCreate, OfferUpdate, OfferResponse,
)
from app.schemas.survey import SurveyCreate, SurveyUpdate, SurveyResponse  # noqa: F401
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse  # noqa: F401
from app.schemas.dashboard import DashboardStats  # noqa: F401
from app.schemas.automation import (  # noqa: F401
    AutomationCreate, AutomationUpdate, AutomationResponse, AutomationDetail,
    AutomationExecutionCreate, AutomationExecutionResponse, AutomationStats,
)
