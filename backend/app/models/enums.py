"""Enumeraciones compartidas por todos los modelos del CRM."""
import enum


# ─── User ────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    """Roles de usuario en el sistema."""
    ADMIN = "admin"
    COMERCIAL = "comercial"
    VIEWER = "viewer"


# ─── Lead ────────────────────────────────────────────────────────

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"
    DORMANT = "dormant"


class LeadSource(str, enum.Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    COLD_OUTREACH = "cold_outreach"
    EVENT = "event"
    APOLLO = "apollo"
    SCRAPING = "scraping"
    OTHER = "other"


# ─── Visit ───────────────────────────────────────────────────────

class VisitType(str, enum.Enum):
    PRESENCIAL = "presencial"
    VIRTUAL = "virtual"
    TELEFONICA = "telefonica"


class VisitResult(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FOLLOW_UP = "follow_up"
    NO_SHOW = "no_show"


# ─── Email ───────────────────────────────────────────────────────

class EmailStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"


# ─── Action ──────────────────────────────────────────────────────

class ActionStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class ActionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ─── Opportunity ─────────────────────────────────────────────────

class OpportunityStage(str, enum.Enum):
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


# ─── Offer ───────────────────────────────────────────────────────

class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    REVISION = "revision"


# ─── Contact ─────────────────────────────────────────────────────

class ContactRoleType(str, enum.Enum):
    CEO = "ceo"
    CTO = "cto"
    CISO = "ciso"
    DPO = "dpo"
    CFO = "cfo"
    CIO = "cio"
    CCO = "cco"
    COO = "coo"
    IT_DIRECTOR = "it_director"
    IT_MANAGER = "it_manager"
    SECURITY_MANAGER = "security_manager"
    COMPLIANCE_MANAGER = "compliance_manager"
    LEGAL = "legal"
    PROCUREMENT = "procurement"
    OTHER = "other"


class ContactInfluenceLevel(str, enum.Enum):
    DECISION_MAKER = "decision_maker"
    INFLUENCER = "influencer"
    GATEKEEPER = "gatekeeper"
    CHAMPION = "champion"
    USER = "user"
    UNKNOWN = "unknown"


class ContactRelationship(str, enum.Enum):
    CHAMPION = "champion"
    SUPPORTER = "supporter"
    NEUTRAL = "neutral"
    BLOCKER = "blocker"
    UNKNOWN = "unknown"


# ─── Survey ──────────────────────────────────────────────────────

class SurveyStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    COMPLETED = "completed"
    EXPIRED = "expired"


# ─── Automation ──────────────────────────────────────────────────

class AutomationStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DRAFT = "draft"
    ERROR = "error"
    DISABLED = "disabled"


class AutomationCategory(str, enum.Enum):
    EMAIL_AUTOMATION = "email_automation"
    LEADS_CAPTACION = "leads_captacion"
    VISITAS = "visitas"
    ACCIONES_ALERTAS = "acciones_alertas"
    PIPELINE = "pipeline"
    SEGUIMIENTO_MENSUAL = "seguimiento_mensual"
    ENCUESTAS = "encuestas"
    INTEGRACIONES = "integraciones"


class AutomationPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AutomationComplexity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AutomationTriggerType(str, enum.Enum):
    WEBHOOK = "webhook"
    CRON = "cron"
    EVENT = "event"
    MANUAL = "manual"


class AutomationPhase(str, enum.Enum):
    PHASE_1 = "phase_1"
    PHASE_2 = "phase_2"
    PHASE_3 = "phase_3"
    PHASE_4 = "phase_4"


class AutomationImplStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    TESTING = "testing"
    DEPLOYED = "deployed"
    FAILED = "failed"


# ─── Marketing ──────────────────────────────────────────────────

class CampaignObjective(str, enum.Enum):
    """Objetivo de la campaña de marketing."""
    LEAD_GEN = "lead_gen"
    BRAND = "brand"
    NURTURING = "nurturing"
    REACTIVATION = "reactivation"


class CampaignChannel(str, enum.Enum):
    """Canal principal de la campaña."""
    LINKEDIN_ADS = "linkedin_ads"
    GOOGLE_ADS = "google_ads"
    SEO = "seo"
    EMAIL = "email"
    YOUTUBE = "youtube"
    WEBINAR = "webinar"
    EVENT = "event"


class CampaignStatus(str, enum.Enum):
    """Estado de la campaña."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"


class FunnelStatus(str, enum.Enum):
    """Estado del funnel de marketing."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class MarketingAssetType(str, enum.Enum):
    """Tipo de asset de marketing."""
    LANDING_PAGE = "landing_page"
    CTA_BUTTON = "cta_button"
    CTA_BANNER = "cta_banner"
    CTA_POPUP = "cta_popup"
    CTA_FORM = "cta_form"
    BLOG_POST = "blog_post"
    VIDEO = "video"
    WHITEPAPER = "whitepaper"
    CASE_STUDY = "case_study"


class MarketingAssetStatus(str, enum.Enum):
    """Estado del asset."""
    ACTIVE = "active"
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CalendarEventType(str, enum.Enum):
    """Tipo de evento en el calendario de marketing."""
    SEO_ARTICLE = "seo_article"
    CAMPAIGN_LAUNCH = "campaign_launch"
    EMAIL_NEWSLETTER = "email_newsletter"
    YOUTUBE_VIDEO = "youtube_video"
    WEBINAR_EVENT = "webinar_event"
    SOCIAL_POST = "social_post"
    CONTENT_PUBLISH = "content_publish"


class AlertSeverity(str, enum.Enum):
    """Severidad de alerta de marketing."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AssetLanguage(str, enum.Enum):
    """Idioma del asset de marketing."""
    ES = "es"
    EN = "en"
    PT = "pt"


# ─── Marketing Documents ─────────────────────────────────────────

class DocumentFolder(str, enum.Enum):
    """Carpeta del documento de marketing."""
    TEMPLATES = "templates"
    CAMPAIGNS = "campaigns"
    CONTENT = "content"
    BATTLECARDS = "battlecards"
    LEGAL = "legal"


class DocumentStatus(str, enum.Enum):
    """Estado del documento de marketing."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
