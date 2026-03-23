from app.schemas.base import BaseSchema, TimestampSchema, PaginatedResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListItem
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadDetail
from app.schemas.crm import (
    VisitCreate, VisitUpdate, VisitResponse,
    EmailCreate, EmailResponse,
    ActionCreate, ActionUpdate, ActionResponse,
    AccountPlanCreate, AccountPlanResponse,
    MonthlyReviewCreate, MonthlyReviewResponse,
)
from app.schemas.pipeline import (
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OfferCreate, OfferUpdate, OfferResponse,
)
from app.schemas.survey import SurveyCreate, SurveyUpdate, SurveyResponse
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.schemas.dashboard import DashboardStats
from app.schemas.automation import (
    AutomationCreate, AutomationUpdate, AutomationResponse, AutomationDetail,
    AutomationExecutionCreate, AutomationExecutionResponse, AutomationStats,
)
from app.schemas.marketing import (
    CampaignCreate, CampaignUpdate, CampaignResponse,
    FunnelCreate, FunnelUpdate, FunnelResponse,
    MarketingAssetCreate, MarketingAssetUpdate, MarketingAssetResponse,
    UTMCodeCreate, UTMCodeResponse,
    MarketingCalendarEventCreate, MarketingCalendarEventUpdate, MarketingCalendarEventResponse,
    MarketingAlertCreate, MarketingAlertUpdate, MarketingAlertResponse,
)

__all__ = [
    "BaseSchema", "TimestampSchema", "PaginatedResponse",
    "UserCreate", "UserUpdate", "UserResponse", "UserListItem",
    "LeadCreate", "LeadUpdate", "LeadResponse", "LeadDetail",
    "VisitCreate", "VisitUpdate", "VisitResponse",
    "EmailCreate", "EmailResponse",
    "ActionCreate", "ActionUpdate", "ActionResponse",
    "AccountPlanCreate", "AccountPlanResponse",
    "MonthlyReviewCreate", "MonthlyReviewResponse",
    "OpportunityCreate", "OpportunityUpdate", "OpportunityResponse",
    "OfferCreate", "OfferUpdate", "OfferResponse",
    "SurveyCreate", "SurveyUpdate", "SurveyResponse",
    "ContactCreate", "ContactUpdate", "ContactResponse",
    "DashboardStats",
    "AutomationCreate", "AutomationUpdate", "AutomationResponse", "AutomationDetail",
    "AutomationExecutionCreate", "AutomationExecutionResponse", "AutomationStats",
    "CampaignCreate", "CampaignUpdate", "CampaignResponse",
    "FunnelCreate", "FunnelUpdate", "FunnelResponse",
    "MarketingAssetCreate", "MarketingAssetUpdate", "MarketingAssetResponse",
    "UTMCodeCreate", "UTMCodeResponse",
    "MarketingCalendarEventCreate", "MarketingCalendarEventUpdate", "MarketingCalendarEventResponse",
    "MarketingAlertCreate", "MarketingAlertUpdate", "MarketingAlertResponse",
]
