"""Sales Playbook endpoints."""
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
from app.models.playbook import SalesTactic

router = APIRouter()


class TacticCreate(BaseModel):
    name: str
    category: str
    channel: str = ""
    description: str = ""
    status: str = "planned"
    responsible: str = ""
    metrics_target: Optional[dict] = None


class TacticUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    responsible: Optional[str] = None
    metrics_target: Optional[dict] = None
    metrics_actual: Optional[dict] = None
    budget_monthly: Optional[float] = None
    budget_spent: Optional[float] = None
    notes: Optional[str] = None
    checklist: Optional[list] = None


@router.get("/")
async def list_tactics(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    q = select(SalesTactic).where(SalesTactic.is_active == True).order_by(SalesTactic.sort_order)  # noqa: E712
    if category:
        q = q.where(SalesTactic.category == category)
    if status:
        q = q.where(SalesTactic.status == status)
    result = await db.execute(q)
    return {"tactics": [
        {
            "id": str(t.id), "name": t.name, "category": t.category, "channel": t.channel,
            "description": t.description, "status": t.status, "responsible": t.responsible,
            "metrics_target": t.metrics_target or {}, "metrics_actual": t.metrics_actual or {},
            "budget_monthly": t.budget_monthly or 0, "budget_spent": t.budget_spent or 0,
            "notes": t.notes or "", "checklist": t.checklist or [],
        }
        for t in result.scalars().all()
    ]}


@router.post("/", status_code=201)
async def create_tactic(data: TacticCreate, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    tactic = SalesTactic(**data.model_dump())
    db.add(tactic)
    await db.commit()
    return {"created": True, "id": str(tactic.id)}


@router.get("/stats")
async def playbook_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Métricas reales por táctica — cruza con leads y oportunidades."""
    from app.models.lead import Lead
    from sqlalchemy import func

    result = await db.execute(select(SalesTactic).where(SalesTactic.is_active == True).order_by(SalesTactic.sort_order))  # noqa: E712
    tactics = result.scalars().all()

    stats = []
    for tactic in tactics:
        leads_count = 0
        if tactic.channel:
            leads_count = await db.scalar(
                select(func.count()).select_from(Lead).where(Lead.acquisition_channel == tactic.channel)
            ) or 0

        stats.append({
            "id": str(tactic.id),
            "name": tactic.name,
            "category": tactic.category,
            "channel": tactic.channel,
            "status": tactic.status,
            "leads_generated": leads_count,
            "metrics_target": tactic.metrics_target or {},
            "metrics_actual": tactic.metrics_actual or {},
        })

    return {"stats": stats}


@router.put("/{tactic_id}")
async def update_tactic(tactic_id: UUID, data: TacticUpdate, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    result = await db.execute(select(SalesTactic).where(SalesTactic.id == tactic_id))
    tactic = result.scalar_one_or_none()
    if not tactic:
        raise HTTPException(status_code=404, detail="Táctica no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tactic, field, value)
    await db.commit()
    return {"updated": True}


@router.get("/export-pdf")
async def export_playbook_pdf(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Exporta el Sales Playbook completo como PDF."""
    from fastapi.responses import Response

    result = await db.execute(select(SalesTactic).where(SalesTactic.is_active == True).order_by(SalesTactic.sort_order))  # noqa: E712
    tactics = result.scalars().all()

    status_labels = {"active": "✅ Activa", "planned": "📋 Planificada", "paused": "⏸️ Pausada"}
    md = "# Sales Playbook — St4rtup\n\n"
    md += f"**Total tácticas:** {len(tactics)} · **Activas:** {len([t for t in tactics if t.status == 'active'])}\n\n"
    md += "| # | Táctica | Categoría | Canal | Estado | Responsable | Budget/mes |\n"
    md += "|---|---------|-----------|-------|--------|-------------|------------|\n"
    for i, t in enumerate(tactics, 1):
        md += f"| {i} | {t.name} | {t.category} | {t.channel or '—'} | {status_labels.get(t.status, t.status)} | {t.responsible or '—'} | €{t.budget_monthly or 0} |\n"

    md += "\n---\n\n"
    for t in tactics:
        md += f"## {t.name}\n\n"
        md += f"**Categoría:** {t.category} · **Canal:** {t.channel or '—'} · **Estado:** {status_labels.get(t.status, t.status)}\n\n"
        if t.description:
            md += f"{t.description}\n\n"
        if t.responsible:
            md += f"**Responsable:** {t.responsible}\n\n"
        if t.notes:
            md += f"**Notas:** {t.notes}\n\n"

    from app.services.pdf_service import markdown_to_pdf
    pdf = markdown_to_pdf(md, "Sales Playbook — St4rtup")
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="st4rtup_sales_playbook.pdf"'})


@router.post("/seed")
async def seed_tactics(db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    """Precarga las 14 tácticas del GTM."""
    defaults = [
        {"name": "Marketing de contenido", "category": "inbound", "channel": "blog_youtube", "description": "YouTube + Blog SEO, 48 art/año, pipeline n8n", "sort_order": 1},
        {"name": "SEO orgánico", "category": "inbound", "channel": "seo", "description": "44 keywords ENS/NIS2/DORA, meta top 3 España", "sort_order": 2},
        {"name": "Lead magnets", "category": "inbound", "channel": "landing", "description": "Ebook Enterprise, webinar NIS2/DORA, demo, calculadora ROI", "sort_order": 3},
        {"name": "Email marketing", "category": "inbound", "channel": "email", "description": "Nurturing + newsletter quincenal CEOs", "sort_order": 4},
        {"name": "Llamadas en frío ABM", "category": "outbound", "channel": "retell_ai", "description": "15 cuentas Tier-1, MOD-AICALLS-001 Retell AI", "sort_order": 5},
        {"name": "Emails en frío ABM", "category": "outbound", "channel": "lemlist", "description": "3 touchpoints/cuenta, personalización por vertical", "sort_order": 6},
        {"name": "Elevator pitch", "category": "outbound", "channel": "direct", "description": "Versiones CEO/CTO/CFO/CEO, 30s/2min/10min", "sort_order": 7},
        {"name": "Ventas por solución", "category": "relacional", "channel": "direct", "description": "PoC 90 días €19.500, dolor NIS2/DORA/ENS", "sort_order": 8},
        {"name": "Retención/fidelización", "category": "relacional", "channel": "cs", "description": "CSM, QBRs, KPIs SOC-CMM, upsell modular", "sort_order": 9},
        {"name": "Referrals y eventos", "category": "relacional", "channel": "events", "description": "RootedCON, Cybercamp, ENISE, partners", "sort_order": 10},
        {"name": "Post-venta y seguimiento", "category": "relacional", "channel": "cs", "description": "Onboarding 30/60/90, Looker Studio, alertas", "sort_order": 11},
        {"name": "Venta directa SMB", "category": "transaccional", "channel": "self_service", "description": "Self-service desde €1.200/mes", "sort_order": 12},
        {"name": "Redes sociales", "category": "transaccional", "channel": "linkedin", "description": "LinkedIn CEOs/CTOs + YouTube B2B", "sort_order": 13},
        {"name": "Cierre por urgencia regulatoria", "category": "transaccional", "channel": "direct", "description": "NIS2/DORA/ENS deadlines como trigger", "sort_order": 14},
    ]
    created = 0
    for d in defaults:
        existing = await db.scalar(select(SalesTactic).where(SalesTactic.name == d["name"]))
        if not existing:
            db.add(SalesTactic(**d))
            created += 1
    await db.commit()
    return {"seeded": created}
