"""Endpoints de integración Airtable — sync bidireccional + discovery."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.services import airtable_service

router = APIRouter()


@router.get("/status")
async def airtable_status(current_user: dict = Depends(get_current_user)):
    """Estado de configuración Airtable."""
    return {
        "configured": airtable_service.is_configured(),
        "has_api_key": bool(airtable_service.settings.AIRTABLE_API_KEY),
        "has_base_id": bool(airtable_service.settings.AIRTABLE_BASE_ID),
    }


@router.get("/bases")
async def list_bases(current_user: dict = Depends(get_current_user)):
    """Lista bases disponibles en la cuenta Airtable."""
    if not airtable_service.settings.AIRTABLE_API_KEY:
        raise HTTPException(status_code=400, detail="AIRTABLE_API_KEY no configurada")
    try:
        bases = await airtable_service.list_bases()
        return {"bases": bases}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Airtable: {str(e)}")


@router.get("/tables")
async def list_tables(current_user: dict = Depends(get_current_user)):
    """Lista tablas de la base configurada."""
    if not airtable_service.is_configured():
        raise HTTPException(status_code=400, detail="Airtable no configurado (falta BASE_ID)")
    try:
        tables = await airtable_service.list_tables()
        return {"tables": [{"id": t["id"], "name": t["name"], "fields": len(t.get("fields", []))} for t in tables]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Airtable: {str(e)}")


@router.post("/sync/leads")
async def sync_leads(
    table_name: str = Query("Leads", max_length=100),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sincroniza leads del CRM → Airtable."""
    result = await airtable_service.sync_leads_to_airtable(db, table_name, limit)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/sync/pipeline")
async def sync_pipeline(
    table_name: str = Query("Pipeline", max_length=100),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sincroniza oportunidades del CRM → Airtable."""
    result = await airtable_service.sync_pipeline_to_airtable(db, table_name, limit)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/sync/kpis")
async def sync_kpis(
    table_name: str = Query("KPIs", max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Escribe snapshot de KPIs en Airtable."""
    result = await airtable_service.sync_kpis_to_airtable(db, table_name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
