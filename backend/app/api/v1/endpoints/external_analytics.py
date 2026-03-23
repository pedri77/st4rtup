"""Endpoints para consultar datos de GA4 y GSC via OAuth."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import ga4_service, gsc_service, clarity_service, lemlist_service, brevo_service, firstpromoter_service

router = APIRouter()


# ─── GA4 ──────────────────────────────────────────────────────────

@router.get("/ga4/traffic")
async def ga4_traffic_overview(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Métricas de tráfico GA4: sessions, users, pageviews, bounce rate."""
    return await ga4_service.get_traffic_overview(db, start_date, end_date)


@router.get("/ga4/sources")
async def ga4_traffic_by_source(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Tráfico por fuente/medio (organic, direct, referral, social, etc.)."""
    return await ga4_service.get_traffic_by_source(db, start_date, end_date)


@router.get("/ga4/countries")
async def ga4_traffic_by_country(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Tráfico por país (geo-marketing)."""
    return await ga4_service.get_traffic_by_country(db, start_date, end_date)


# ─── GSC ──────────────────────────────────────────────────────────

@router.get("/gsc/performance")
async def gsc_search_performance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Rendimiento SEO global: clicks, impressions, CTR, posición media + daily."""
    return await gsc_service.get_search_performance(db, start_date, end_date)


@router.get("/gsc/queries")
async def gsc_top_queries(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    country: Optional[str] = Query(None, description="ISO country code (ES, DE, FR...)"),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Top queries de búsqueda con clicks, impressions, CTR, posición."""
    return await gsc_service.get_top_queries(db, start_date, end_date, country, limit)


@router.get("/gsc/pages")
async def gsc_top_pages(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Top páginas con métricas de búsqueda."""
    return await gsc_service.get_top_pages(db, start_date, end_date, limit)


@router.get("/gsc/countries")
async def gsc_performance_by_country(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Rendimiento SEO por país (geo-SEO)."""
    return await gsc_service.get_performance_by_country(db, start_date, end_date)


# ─── Clarity ──────────────────────────────────────────────────────

@router.get("/clarity/summary")
async def clarity_summary(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Resumen de Microsoft Clarity: sessions, scroll depth, rage clicks."""
    return await clarity_service.get_project_summary(db, days)


# ─── Lemlist ──────────────────────────────────────────────────────

@router.get("/lemlist/campaigns")
async def lemlist_campaigns(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Lista campañas de Lemlist con estadísticas."""
    return await lemlist_service.list_campaigns(db)


@router.get("/lemlist/campaigns/{campaign_id}")
async def lemlist_campaign_stats(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Estadísticas detalladas de una campaña de Lemlist."""
    return await lemlist_service.get_campaign_stats(db, campaign_id)


@router.post("/lemlist/campaigns/{campaign_id}/leads")
async def lemlist_add_lead(
    campaign_id: str,
    email: str = Query(...),
    first_name: str = Query(""),
    last_name: str = Query(""),
    company_name: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Añade un lead del CRM a una campaña de Lemlist."""
    return await lemlist_service.add_lead_to_campaign(
        db, campaign_id, email, first_name, last_name, company_name
    )


@router.get("/lemlist/campaigns/{campaign_id}/leads/{email}")
async def lemlist_lead_activity(
    campaign_id: str,
    email: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Actividad de un lead en una campaña (opens, clicks, replies)."""
    return await lemlist_service.sync_lead_activity(db, campaign_id, email)


@router.get("/lemlist/team")
async def lemlist_team_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Estadísticas globales del equipo en Lemlist."""
    return await lemlist_service.get_team_stats(db)


# ─── Brevo ────────────────────────────────────────────────────────

@router.get("/brevo/lists")
async def brevo_lists(
    _current_user: dict = Depends(get_current_user),
):
    """Lista las listas de contactos en Brevo."""
    return await brevo_service.get_lists()


@router.post("/brevo/nurturing")
async def brevo_add_to_nurturing(
    email: str = Query(...),
    first_name: str = Query(""),
    company: str = Query(""),
    icp_score: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Añade un lead frío al pipeline de nurturing en Brevo."""
    return await brevo_service.add_lead_to_nurturing(db, email, first_name, company, "crm_cold", icp_score)


@router.get("/brevo/reactivation/{email}")
async def brevo_check_reactivation(
    email: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Verifica si un lead en nurturing debería reactivarse (2+ opens en 7 días)."""
    return await brevo_service.check_reactivation(db, email)


# ─── FirstPromoter (MSSP Partners) ───────────────────────────────

@router.get("/partners/dashboard")
async def partners_dashboard(
    _current_user: dict = Depends(get_current_user),
):
    """Dashboard del programa de partners MSSP."""
    return await firstpromoter_service.get_dashboard_stats()


@router.get("/partners")
async def list_partners(
    _current_user: dict = Depends(get_current_user),
):
    """Lista todos los partners MSSP registrados."""
    return await firstpromoter_service.list_promoters()


@router.post("/partners")
async def create_partner(
    email: str = Query(...),
    first_name: str = Query(""),
    last_name: str = Query(""),
    company: str = Query(""),
    _current_user: dict = Depends(get_current_user),
):
    """Registra un nuevo partner MSSP."""
    return await firstpromoter_service.create_promoter(email, first_name, last_name, company)


@router.get("/partners/referrals")
async def list_referrals(
    promoter_id: Optional[int] = Query(None),
    _current_user: dict = Depends(get_current_user),
):
    """Lista referidos de partners."""
    return await firstpromoter_service.list_referrals(promoter_id)


@router.post("/partners/track-sale")
async def track_partner_sale(
    email: str = Query(...),
    amount: float = Query(...),
    plan: str = Query("grc_annual"),
    _current_user: dict = Depends(get_current_user),
):
    """Registra una venta referida por un partner MSSP."""
    return await firstpromoter_service.track_referral_sale(email, amount, plan)
