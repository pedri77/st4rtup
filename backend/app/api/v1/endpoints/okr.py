"""OKR endpoints — Objectives and Key Results."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.okr import Objective, KeyResult

router = APIRouter()


class ObjectiveCreate(BaseModel):
    title: str
    description: str = ""
    quarter: str
    category: str = ""
    owner: str = ""


class KeyResultCreate(BaseModel):
    objective_id: str
    title: str
    kpi_id: Optional[str] = None
    target_value: Optional[float] = None
    unit: str = "count"


class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    progress: Optional[float] = None


@router.get("/")
async def list_objectives(
    quarter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    q = select(Objective).order_by(Objective.sort_order)
    if quarter:
        q = q.where(Objective.quarter == quarter)
    result = await db.execute(q)
    objectives = result.scalars().all()

    # Auto-sync: get current KPI values
    kpi_values = {}
    try:
        from app.api.v1.endpoints.gtm_dashboard import gtm_dashboard
        gtm_data = await gtm_dashboard(db=db, _current_user=_current_user)
        for kpi in gtm_data.get("kpis", []):
            if kpi["actual"] is not None:
                kpi_values[kpi["id"]] = kpi["actual"]
    except Exception as e:
        import logging; logging.getLogger(__name__).debug("GTM KPI fetch for OKR failed: %s", e)

    obj_list = []
    for obj in objectives:
        kr_result = await db.execute(
            select(KeyResult).where(KeyResult.objective_id == str(obj.id)).order_by(KeyResult.sort_order)
        )
        krs = kr_result.scalars().all()

        # Auto-update KRs linked to KPIs
        for kr in krs:
            if kr.kpi_id and kr.kpi_id in kpi_values and kr.target_value:
                kr.current_value = kpi_values[kr.kpi_id]
                kr.progress = round(min(kr.current_value / kr.target_value * 100, 100), 1)
        await db.commit()

        if krs:
            avg_progress = sum(kr.progress or 0 for kr in krs) / len(krs)
        else:
            avg_progress = 0

        obj_list.append({
            "id": str(obj.id), "title": obj.title, "description": obj.description,
            "quarter": obj.quarter, "category": obj.category, "owner": obj.owner,
            "progress": round(avg_progress, 1), "status": obj.status,
            "key_results": [
                {
                    "id": str(kr.id), "title": kr.title, "kpi_id": kr.kpi_id,
                    "target_value": kr.target_value, "current_value": kr.current_value,
                    "unit": kr.unit, "progress": kr.progress or 0,
                }
                for kr in krs
            ],
        })

    return {"objectives": obj_list}


@router.post("/", status_code=201)
async def create_objective(
    data: ObjectiveCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    obj = Objective(**data.model_dump())
    db.add(obj)
    await db.commit()
    return {"created": True, "id": str(obj.id)}


@router.post("/key-results", status_code=201)
async def create_key_result(
    data: KeyResultCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    kr = KeyResult(**data.model_dump())
    db.add(kr)
    await db.commit()
    return {"created": True, "id": str(kr.id)}


@router.put("/key-results/{kr_id}")
async def update_key_result(
    kr_id: UUID,
    data: KeyResultUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(KeyResult).where(KeyResult.id == kr_id))
    kr = result.scalar_one_or_none()
    if not kr:
        raise HTTPException(status_code=404, detail="Key Result no encontrado")
    if data.current_value is not None:
        kr.current_value = data.current_value
        if kr.target_value and kr.target_value > 0:
            kr.progress = round(min(kr.current_value / kr.target_value * 100, 100), 1)
    if data.progress is not None:
        kr.progress = data.progress
    await db.commit()
    return {"updated": True}


@router.post("/seed")
async def seed_okrs(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Precarga OKRs Q2 2026 vinculados a KPIs."""
    objectives = [
        {"title": "Cerrar 3 PoC piloto", "quarter": "2026-Q2", "category": "pipeline", "owner": "CTO",
         "key_results": [
             {"title": "Pipeline activo >€300k", "kpi_id": "active_pipeline", "target_value": 300000, "unit": "eur"},
             {"title": "Win rate >25%", "kpi_id": "win_rate", "target_value": 25, "unit": "pct"},
             {"title": "Ciclo venta <90 días", "kpi_id": "sales_cycle_days", "target_value": 90, "unit": "days"},
         ]},
        {"title": "Alcanzar €100k ARR", "quarter": "2026-Q2", "category": "revenue", "owner": "CTO",
         "key_results": [
             {"title": "ARR total €100k", "kpi_id": "arr", "target_value": 100000, "unit": "eur"},
             {"title": "ACV medio >€40k", "kpi_id": "acv", "target_value": 40000, "unit": "eur"},
             {"title": "MRR growth >15%/mes", "kpi_id": "mrr_growth", "target_value": 15, "unit": "pct"},
         ]},
        {"title": "Pipeline marketing >30% del total", "quarter": "2026-Q2", "category": "marketing", "owner": "Marketing",
         "key_results": [
             {"title": "15 MQL/mes", "kpi_id": "mql_month", "target_value": 15, "unit": "count"},
             {"title": "Conversión MQL→SQL >25%", "kpi_id": "mql_to_sql", "target_value": 25, "unit": "pct"},
             {"title": "3 SQLs/semana", "kpi_id": "sqls_per_week", "target_value": 3, "unit": "count"},
         ]},
    ]

    created = 0
    for obj_data in objectives:
        existing = await db.scalar(select(Objective).where(Objective.title == obj_data["title"]))
        if existing:
            continue
        krs_data = obj_data.pop("key_results")
        obj = Objective(**obj_data)
        db.add(obj)
        await db.flush()
        for kr_data in krs_data:
            kr_data["objective_id"] = str(obj.id)
            db.add(KeyResult(**kr_data))
        created += 1
    await db.commit()
    return {"seeded": created}
