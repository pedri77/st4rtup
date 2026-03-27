"""Affiliate links — CRUD (admin) + public click tracking + dashboard."""
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.affiliate import AffiliateLink, AffiliateClick

logger = logging.getLogger(__name__)
router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin" and current_user.get("user_metadata", {}).get("role") != "admin":
        raise HTTPException(403, "Admin required")
    return current_user


# ─── PUBLIC: List active links (for integrations page) ──────

@router.get("/")
async def list_affiliate_links(
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List active affiliate links (public, no auth)."""
    query = select(AffiliateLink).where(AffiliateLink.is_active == True)
    if category:
        query = query.where(AffiliateLink.category == category)
    query = query.order_by(AffiliateLink.display_name)
    result = await db.execute(query)
    links = result.scalars().all()
    return {"items": [{
        "id": str(l.id), "provider": l.provider, "display_name": l.display_name,
        "affiliate_url": l.affiliate_url, "logo_url": l.logo_url,
        "category": l.category, "commission_percent": l.commission_percent,
    } for l in links]}


# ─── PUBLIC: Track click ─────────────────────────────────────

@router.post("/{link_id}/click")
async def track_click(
    link_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Track affiliate link click (public, no auth)."""
    link = await db.get(AffiliateLink, link_id)
    if not link:
        raise HTTPException(404)

    # Hash IP for privacy
    client_ip = request.client.host if request.client else ""
    ip_hash = hashlib.sha256(f"{client_ip}:st4rtup_aff".encode()).hexdigest()[:64]

    click = AffiliateClick(
        link_id=link_id,
        ip_hash=ip_hash,
        referrer=request.headers.get("referer", ""),
    )
    db.add(click)

    # Increment counter
    link.clicks = (link.clicks or 0) + 1
    await db.commit()

    return {"redirect_url": link.affiliate_url}


# ─── ADMIN: CRUD ─────────────────────────────────────────────

@router.get("/admin/all")
async def admin_list_all(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all affiliate links with stats (admin)."""
    result = await db.execute(select(AffiliateLink).order_by(desc(AffiliateLink.clicks)))
    links = result.scalars().all()
    return {"items": [{
        "id": str(l.id), "provider": l.provider, "display_name": l.display_name,
        "affiliate_url": l.affiliate_url, "logo_url": l.logo_url,
        "category": l.category, "commission_percent": l.commission_percent,
        "commission_type": l.commission_type, "clicks": l.clicks or 0,
        "conversions": l.conversions or 0, "revenue_eur": l.revenue_eur or 0,
        "is_active": l.is_active, "notes": l.notes,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in links], "total": len(links)}


@router.post("/admin/create")
async def admin_create_link(
    provider: str = Query(...),
    display_name: str = Query(...),
    affiliate_url: str = Query(...),
    logo_url: str = Query(""),
    category: str = Query("integration"),
    commission_percent: float = Query(0),
    commission_type: str = Query("one_time"),
    notes: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create new affiliate link (admin)."""
    link = AffiliateLink(
        provider=provider, display_name=display_name, affiliate_url=affiliate_url,
        logo_url=logo_url, category=category, commission_percent=commission_percent,
        commission_type=commission_type, notes=notes,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return {"id": str(link.id), "created": True}


@router.put("/admin/{link_id}")
async def admin_update_link(
    link_id: UUID,
    provider: str = Query(None),
    display_name: str = Query(None),
    affiliate_url: str = Query(None),
    commission_percent: float = Query(None),
    is_active: bool = Query(None),
    conversions: int = Query(None),
    revenue_eur: float = Query(None),
    notes: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Update affiliate link (admin)."""
    link = await db.get(AffiliateLink, link_id)
    if not link:
        raise HTTPException(404)
    if provider is not None: link.provider = provider
    if display_name is not None: link.display_name = display_name
    if affiliate_url is not None: link.affiliate_url = affiliate_url
    if commission_percent is not None: link.commission_percent = commission_percent
    if is_active is not None: link.is_active = is_active
    if conversions is not None: link.conversions = conversions
    if revenue_eur is not None: link.revenue_eur = revenue_eur
    if notes is not None: link.notes = notes
    await db.commit()
    return {"updated": True}


@router.delete("/admin/{link_id}")
async def admin_delete_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Delete affiliate link (admin)."""
    link = await db.get(AffiliateLink, link_id)
    if not link:
        raise HTTPException(404)
    await db.delete(link)
    await db.commit()
    return {"deleted": True}


# ─── ADMIN: Dashboard stats ──────────────────────────────────

@router.get("/admin/dashboard")
async def admin_affiliate_dashboard(
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Affiliate dashboard — stats by provider."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total stats
    total_clicks = (await db.execute(select(func.sum(AffiliateLink.clicks)))).scalar() or 0
    total_conversions = (await db.execute(select(func.sum(AffiliateLink.conversions)))).scalar() or 0
    total_revenue = (await db.execute(select(func.sum(AffiliateLink.revenue_eur)))).scalar() or 0

    # Per-provider stats
    result = await db.execute(
        select(AffiliateLink.provider, AffiliateLink.display_name,
               AffiliateLink.clicks, AffiliateLink.conversions,
               AffiliateLink.revenue_eur, AffiliateLink.commission_percent)
        .where(AffiliateLink.is_active == True)
        .order_by(desc(AffiliateLink.revenue_eur))
    )
    providers = [{
        "provider": r[0], "name": r[1], "clicks": r[2] or 0,
        "conversions": r[3] or 0, "revenue": float(r[4] or 0),
        "commission": r[5] or 0,
    } for r in result.all()]

    # Clicks by day (last N days)
    daily = await db.execute(
        select(func.date(AffiliateClick.created_at), func.count(AffiliateClick.id))
        .where(AffiliateClick.created_at >= since)
        .group_by(func.date(AffiliateClick.created_at))
        .order_by(func.date(AffiliateClick.created_at))
    )
    clicks_by_day = [{"date": str(r[0]), "clicks": r[1]} for r in daily.all()]

    return {
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_revenue": float(total_revenue),
        "conversion_rate": round(total_conversions / total_clicks * 100, 1) if total_clicks else 0,
        "providers": providers,
        "clicks_by_day": clicks_by_day,
        "period_days": days,
    }
