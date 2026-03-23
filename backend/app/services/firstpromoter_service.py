"""FirstPromoter service — canal MSSP (Managed Security Service Providers).

Partners: Telefónica Tech, T-Systems, Indra, etc.
Deal closed → webhook → rs_deals (canal: mssp, partner: nombre)
Comisiones automáticas.

API Docs: https://docs.firstpromoter.com/
"""
import logging

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://firstpromoter.com/api/v1"


def _get_api_key() -> str | None:
    return getattr(settings, "FIRSTPROMOTER_API_KEY", "") or None


def _headers(api_key: str) -> dict:
    return {"x-api-key": api_key, "Content-Type": "application/json"}


# ─── Promoters (Partners MSSP) ───────────────────────────────────

async def list_promoters() -> dict:
    """Lista todos los partners/promoters registrados."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/promoters/list",
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code != 200:
        return {"error": f"FirstPromoter API error: {resp.status_code}"}

    promoters = resp.json()
    return {
        "promoters": [
            {
                "id": p.get("id"),
                "email": p.get("email"),
                "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
                "ref_id": p.get("ref_id"),
                "referral_link": p.get("default_ref_link"),
                "visitors": p.get("visitors_count", 0),
                "leads": p.get("leads_count", 0),
                "customers": p.get("customers_count", 0),
                "revenue": p.get("current_revenue", 0),
                "commission_earned": p.get("current_commission", 0),
                "status": "active" if p.get("cust_id") else "pending",
            }
            for p in promoters
        ]
    }


async def get_promoter(promoter_id: int) -> dict:
    """Obtiene detalles de un partner."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/promoters/show",
            params={"id": promoter_id},
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code != 200:
        return {"error": f"FirstPromoter API error: {resp.status_code}"}

    return {"promoter": resp.json()}


async def create_promoter(
    email: str,
    first_name: str = "",
    last_name: str = "",
    company: str = "",
) -> dict:
    """Registra un nuevo partner MSSP."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/promoters/create",
            json={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
            },
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code in (200, 201):
        return {"created": True, "promoter": resp.json()}
    return {"error": f"FirstPromoter API error: {resp.status_code}"}


# ─── Referrals & Commissions ─────────────────────────────────────

async def list_referrals(promoter_id: int | None = None) -> dict:
    """Lista referidos (leads/deals traídos por partners)."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    params = {}
    if promoter_id:
        params["promoter_id"] = promoter_id

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/referrals/list",
            params=params,
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code != 200:
        return {"error": f"FirstPromoter API error: {resp.status_code}"}

    referrals = resp.json()
    return {
        "referrals": [
            {
                "id": r.get("id"),
                "email": r.get("lead", {}).get("email"),
                "status": r.get("state"),
                "promoter_id": r.get("promoter_id"),
                "plan": r.get("plan"),
                "mrr": r.get("mrr", 0),
                "created_at": r.get("created_at"),
            }
            for r in referrals
        ]
    }


async def track_referral_sale(
    email: str,
    amount: float,
    plan: str = "grc_annual",
    currency: str = "EUR",
) -> dict:
    """Registra una venta referida (deal closed por partner)."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/track/sale",
            json={
                "email": email,
                "amount": int(amount * 100),  # cents
                "plan": plan,
                "currency": currency.lower(),
            },
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code in (200, 201):
        return {"tracked": True, "sale": resp.json()}
    return {"error": f"FirstPromoter API error: {resp.status_code}"}


async def get_dashboard_stats() -> dict:
    """Resumen de stats del programa de partners."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "FirstPromoter API key not configured"}

    promoters = await list_promoters()
    if "error" in promoters:
        return promoters

    total_partners = len(promoters.get("promoters", []))
    total_revenue = sum(p.get("revenue", 0) for p in promoters.get("promoters", []))
    total_commission = sum(p.get("commission_earned", 0) for p in promoters.get("promoters", []))
    total_customers = sum(p.get("customers", 0) for p in promoters.get("promoters", []))

    return {
        "total_partners": total_partners,
        "total_revenue": round(total_revenue / 100, 2),  # cents → EUR
        "total_commission": round(total_commission / 100, 2),
        "total_customers": total_customers,
        "top_partners": sorted(
            promoters.get("promoters", []),
            key=lambda p: p.get("revenue", 0),
            reverse=True,
        )[:5],
    }
