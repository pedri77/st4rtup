"""
API Publica — endpoints documentados para integradores externos.
Trigger: first integration partner.
Auth: API Key en header X-API-Key (separado de JWT interno).
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import Lead, LeadStatus, Opportunity
from app.schemas import LeadResponse, PaginatedResponse

router = APIRouter()


async def verify_api_key_and_org(x_api_key: str = Header(None)) -> dict:
    """Verifica API key y devuelve la org_id asociada.

    Format esperado en PUBLIC_API_KEYS: "org_uuid:key,org_uuid:key,..."
    Esto evita el cross-tenant leak: cada API key está vinculada a una organización.
    """
    import hmac
    from app.core.config import settings

    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    raw = getattr(settings, "PUBLIC_API_KEYS", "") or ""
    if not raw:
        raise HTTPException(status_code=503, detail="Public API not configured")

    for entry in raw.split(","):
        entry = entry.strip()
        if not entry or ":" not in entry:
            continue
        org_id, key = entry.split(":", 1)
        if hmac.compare_digest(x_api_key, key.strip()):
            return {"api_key": x_api_key, "org_id": org_id.strip()}

    raise HTTPException(status_code=401, detail="Invalid API key")


# Backwards-compat alias for any other endpoints that might import the old name
verify_api_key = verify_api_key_and_org


# ─── Leads (read-only) ──────────────────────────────────────────

@router.get("/leads")
@limiter.limit("60/minute")
async def public_list_leads(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(verify_api_key_and_org),
):
    """Lista leads (API publica, read-only).

    **Auth:** Header `X-API-Key`
    **Paginacion:** `?page=1&page_size=20`
    Solo devuelve leads de la organización asociada a la API key.
    """
    q = select(Lead).where(Lead.org_id == UUID(auth["org_id"]))
    if status:
        q = q.where(Lead.status == status)
    total = await db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    return {
        "data": [
            {
                "id": str(l.id),
                "company_name": l.company_name,
                "contact_email": l.contact_email,
                "status": l.status.value if l.status else None,
                "score": l.score,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in result.scalars().all()
        ],
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, (total + page_size - 1) // page_size),
        },
    }


@router.get("/leads/{lead_id}")
async def public_get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(verify_api_key_and_org),
):
    """Obtiene un lead por ID (API publica). Solo si pertenece a la org."""
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.org_id == UUID(auth["org_id"]))
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {
        "id": str(lead.id),
        "company_name": lead.company_name,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "status": lead.status.value if lead.status else None,
        "source": lead.source.value if lead.source else None,
        "score": lead.score,
        "company_sector": lead.company_sector,
        "company_city": lead.company_city,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


# ─── Create Lead (write) ────────────────────────────────────────

@router.post("/leads", status_code=201)
@limiter.limit("20/minute")
async def public_create_lead(
    request: Request,
    company_name: str = Query(...),
    contact_email: Optional[str] = None,
    contact_name: Optional[str] = None,
    contact_phone: Optional[str] = None,
    source: str = "api",
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(verify_api_key_and_org),
):
    """Crea un lead via API publica. Asignado a la org de la API key.

    **Auth:** Header `X-API-Key`
    **Campos requeridos:** `company_name`
    """
    from app.models.enums import LeadSource
    lead = Lead(
        org_id=UUID(auth["org_id"]),
        company_name=company_name,
        contact_email=contact_email,
        contact_name=contact_name,
        contact_phone=contact_phone,
        status=LeadStatus.NEW,
        source=LeadSource.API if hasattr(LeadSource, 'API') else LeadSource.OTHER,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    return {"id": str(lead.id), "company_name": lead.company_name, "status": "created"}


# ─── Pipeline (read-only) ───────────────────────────────────────

@router.get("/pipeline/summary")
async def public_pipeline_summary(
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(verify_api_key_and_org),
):
    """Resumen del pipeline (API publica). Solo de la org de la API key."""
    from app.models.enums import OpportunityStage
    org_uuid = UUID(auth["org_id"])

    total = await db.scalar(
        select(func.count(Opportunity.id)).where(Opportunity.org_id == org_uuid)
    ) or 0
    total_value = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(Opportunity.org_id == org_uuid)
    ) or 0

    return {
        "total_opportunities": total,
        "total_pipeline_value": float(total_value),
    }


# ─── Public API Documentation ─────────────────────────────────

@router.get("/docs")
async def public_api_docs():
    """Documentación de la API pública de St4rtup."""
    return {
        "name": "St4rtup CRM API",
        "version": "1.0",
        "base_url": "https://api.st4rtup.com/api/v1",
        "auth": "Header X-API-Key or Bearer JWT",
        "rate_limit": "100 requests/minute per API key",
        "endpoints": [
            {"method": "GET", "path": "/public/docs", "auth": "none", "description": "Esta documentación"},
            {"method": "GET", "path": "/dashboard/embed/{type}", "auth": "api_key", "description": "Widget embebible (pipeline, leads, revenue, conversion)"},
            {"method": "GET", "path": "/mcp/kpis", "auth": "jwt", "description": "KPIs del CRM para agentes IA"},
            {"method": "GET", "path": "/mcp/leads/search", "auth": "jwt", "description": "Buscar leads"},
            {"method": "GET", "path": "/mcp/pipeline", "auth": "jwt", "description": "Estado del pipeline"},
            {"method": "GET", "path": "/mcp/activity", "auth": "jwt", "description": "Resumen de actividad"},
            {"method": "GET", "path": "/youtube/channel", "auth": "jwt", "description": "Info del canal YouTube"},
            {"method": "GET", "path": "/youtube/videos", "auth": "jwt", "description": "Vídeos recientes"},
            {"method": "GET", "path": "/airtable/sync/leads", "auth": "jwt", "description": "Sync leads a Airtable"},
            {"method": "POST", "path": "/calls/initiate", "auth": "jwt", "description": "Iniciar llamada IA"},
        ],
        "webhook_events": [
            "lead.created", "lead.updated", "opportunity.stage_changed",
            "opportunity.won", "opportunity.lost", "email.opened",
            "email.clicked", "form.submitted", "call.completed",
        ],
    }
