"""Servicio de integración con Airtable — sync bidireccional de leads y pipeline."""
import logging
from typing import Optional
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.models.lead import Lead
from app.models.pipeline import Opportunity

logger = logging.getLogger(__name__)

AIRTABLE_API = "https://api.airtable.com/v0"


def is_configured() -> bool:
    return bool(settings.AIRTABLE_API_KEY and settings.AIRTABLE_BASE_ID)


def _headers():
    return {
        "Authorization": f"Bearer {settings.AIRTABLE_API_KEY}",
        "Content-Type": "application/json",
    }


async def _request(method: str, path: str, json_data: dict = None) -> dict:
    """Generic Airtable API request."""
    url = f"{AIRTABLE_API}/{settings.AIRTABLE_BASE_ID}/{path}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.request(method, url, headers=_headers(), json=json_data)
        resp.raise_for_status()
        return resp.json()


# ─── Schema / Base Discovery ─────────────────────────────────

async def list_bases() -> list:
    """Lista las bases disponibles en la cuenta."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.airtable.com/v0/meta/bases",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json().get("bases", [])


async def list_tables() -> list:
    """Lista las tablas de la base configurada."""
    if not settings.AIRTABLE_BASE_ID:
        return []
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"https://api.airtable.com/v0/meta/bases/{settings.AIRTABLE_BASE_ID}/tables",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json().get("tables", [])


# ─── Sync Leads → Airtable ──────────────────────────────────

def _lead_to_record(lead: Lead) -> dict:
    """Convierte un Lead SQLAlchemy a un record de Airtable."""
    return {
        "fields": {
            "CRM_ID": str(lead.id),
            "Empresa": lead.company_name or "",
            "Contacto": lead.contact_name or "",
            "Email": lead.contact_email or "",
            "Telefono": lead.contact_phone or "",
            "Cargo": lead.contact_title or "",
            "Sector": lead.company_sector or "",
            "Estado": lead.status.value if lead.status else "new",
            "Score": lead.score or 0,
            "Fuente": lead.source.value if lead.source else "",
            "Pais": lead.country or "",
            "Tamano": lead.company_size or "",
            "Ultima actualizacion": lead.updated_at.isoformat() if lead.updated_at else "",
        }
    }


async def sync_leads_to_airtable(
    db: AsyncSession,
    table_name: str = "Leads",
    limit: int = 100,
) -> dict:
    """Sincroniza leads del CRM → Airtable (upsert por CRM_ID)."""
    if not is_configured():
        return {"error": "Airtable no configurado"}

    # Get existing Airtable records to find CRM_IDs already synced
    existing = {}
    try:
        data = await _request("GET", f"{table_name}?fields[]=CRM_ID&pageSize=100")
        for rec in data.get("records", []):
            crm_id = rec.get("fields", {}).get("CRM_ID")
            if crm_id:
                existing[crm_id] = rec["id"]
    except Exception:
        pass  # Table may not exist yet or be empty

    # Get leads from DB
    result = await db.execute(
        select(Lead).order_by(Lead.updated_at.desc()).limit(limit)
    )
    leads = result.scalars().all()

    created = 0
    updated = 0
    errors = 0

    for lead in leads:
        record = _lead_to_record(lead)
        lead_id_str = str(lead.id)

        try:
            if lead_id_str in existing:
                # Update
                await _request("PATCH", f"{table_name}/{existing[lead_id_str]}", record)
                updated += 1
            else:
                # Create
                await _request("POST", f"{table_name}", {"records": [record]})
                created += 1
        except Exception as e:
            logger.warning("Airtable sync error for lead %s: %s", lead_id_str, e)
            errors += 1

    return {"created": created, "updated": updated, "errors": errors, "total": len(leads)}


# ─── Sync Pipeline → Airtable ───────────────────────────────

def _opportunity_to_record(opp: Opportunity, lead_name: str = "") -> dict:
    return {
        "fields": {
            "CRM_ID": str(opp.id),
            "Nombre": opp.name or "",
            "Lead": lead_name,
            "Etapa": opp.stage.value if opp.stage else "",
            "Valor": float(opp.value or 0),
            "Probabilidad": opp.probability or 0,
            "Valor Ponderado": float((opp.value or 0) * (opp.probability or 0) / 100),
            "Fecha Cierre": opp.expected_close_date.isoformat() if opp.expected_close_date else "",
            "Ultima actualizacion": opp.updated_at.isoformat() if opp.updated_at else "",
        }
    }


async def sync_pipeline_to_airtable(
    db: AsyncSession,
    table_name: str = "Pipeline",
    limit: int = 100,
) -> dict:
    """Sincroniza oportunidades del CRM → Airtable."""
    if not is_configured():
        return {"error": "Airtable no configurado"}

    # Get opportunities with lead names
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(Opportunity, Lead.company_name)
        .join(Lead, Opportunity.lead_id == Lead.id, isouter=True)
        .order_by(Opportunity.updated_at.desc())
        .limit(limit)
    )
    rows = result.all()

    existing = {}
    try:
        data = await _request("GET", f"{table_name}?fields[]=CRM_ID&pageSize=100")
        for rec in data.get("records", []):
            crm_id = rec.get("fields", {}).get("CRM_ID")
            if crm_id:
                existing[crm_id] = rec["id"]
    except Exception:
        pass

    created = 0
    updated = 0
    errors = 0

    for opp, lead_name in rows:
        record = _opportunity_to_record(opp, lead_name or "")
        opp_id_str = str(opp.id)

        try:
            if opp_id_str in existing:
                await _request("PATCH", f"{table_name}/{existing[opp_id_str]}", record)
                updated += 1
            else:
                await _request("POST", f"{table_name}", {"records": [record]})
                created += 1
        except Exception as e:
            logger.warning("Airtable sync error for opp %s: %s", opp_id_str, e)
            errors += 1

    return {"created": created, "updated": updated, "errors": errors, "total": len(rows)}


# ─── KPIs Summary → Airtable ────────────────────────────────

async def sync_kpis_to_airtable(
    db: AsyncSession,
    table_name: str = "KPIs",
) -> dict:
    """Escribe un snapshot de KPIs en Airtable."""
    if not is_configured():
        return {"error": "Airtable no configurado"}

    from app.models import Opportunity, OpportunityStage

    total_leads = await db.scalar(select(func.count(Lead.id))) or 0
    total_opps = await db.scalar(select(func.count(Opportunity.id))) or 0
    pipeline_value = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]))
    ) or 0
    won_value = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    ) or 0

    record = {
        "records": [{
            "fields": {
                "Fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "Total Leads": total_leads,
                "Total Oportunidades": total_opps,
                "Pipeline Activo EUR": float(pipeline_value),
                "Revenue Won EUR": float(won_value),
                "Snapshot": datetime.now(timezone.utc).isoformat(),
            }
        }]
    }

    try:
        await _request("POST", table_name, record)
        return {"synced": True, "leads": total_leads, "pipeline": float(pipeline_value)}
    except Exception as e:
        return {"error": str(e)}
