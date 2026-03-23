"""Audit log global — registro de acciones en todo el CRM."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get("/")
async def get_audit_log(
    entity_type: Optional[str] = Query(None, description="lead, opportunity, action, email..."),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Audit log global: últimas modificaciones en todas las entidades del CRM."""
    # Query across multiple tables for recent activity
    queries = []

    # Leads
    try:
        from app.models.lead import Lead
        leads = (await db.execute(
            select(Lead.id, Lead.company_name, Lead.status, Lead.created_at, Lead.updated_at)
            .order_by(desc(Lead.updated_at)).limit(limit)
        )).all()
        for row in leads:
            queries.append({
                "entity_type": "lead", "entity_id": str(row[0]),
                "entity_name": row[1] or "", "action": row[2].value if row[2] else "created",
                "timestamp": row[4].isoformat() if row[4] else row[3].isoformat() if row[3] else "",
            })
    except Exception as e:
        import logging; logging.getLogger(__name__).warning("Audit query failed: %s", e)

    # Opportunities
    try:
        from app.models.pipeline import Opportunity
        opps = (await db.execute(
            select(Opportunity.id, Opportunity.name, Opportunity.stage, Opportunity.created_at, Opportunity.updated_at)
            .order_by(desc(Opportunity.updated_at)).limit(limit)
        )).all()
        for o in opps:
            queries.append({
                "entity_type": "opportunity", "entity_id": str(o[0]),
                "entity_name": o[1] or "", "action": o[2].value if o[2] else "created",
                "timestamp": o[4].isoformat() if o[4] else o[3].isoformat() if o[3] else "",
            })
    except Exception as e:
        import logging; logging.getLogger(__name__).warning("Audit query failed: %s", e)

    # Sort all by timestamp desc
    queries.sort(key=lambda x: x["timestamp"], reverse=True)

    if entity_type:
        queries = [q for q in queries if q["entity_type"] == entity_type]

    return {"entries": queries[:limit], "total": len(queries)}


@router.get("/export-csv")
async def export_audit_csv(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Exporta audit log como CSV (compliance ENS)."""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    data = await get_audit_log(entity_type=entity_type, limit=limit, db=db, _current_user=_current_user)
    entries = data.get("entries", [])

    output = io.StringIO()
    if entries:
        writer = csv.DictWriter(output, fieldnames=entries[0].keys())
        writer.writeheader()
        writer.writerows(entries)

    output.seek(0)
    filename = f"st4rtup_audit_log_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export-pdf")
async def export_audit_pdf(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Exporta audit log como PDF corporativo (compliance ENS)."""
    from fastapi.responses import Response
    from datetime import datetime

    data = await get_audit_log(entity_type=entity_type, limit=limit, db=db, _current_user=_current_user)
    entries = data.get("entries", [])

    md = "# Audit Log — St4rtup CRM\n\n"
    md += f"**Exportado:** {datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
    md += f"**Registros:** {len(entries)}\n\n"
    md += "| Tipo | Entidad | Accion | Fecha |\n"
    md += "| --- | --- | --- | --- |\n"
    for e in entries:
        md += f"| {e['entity_type']} | {e['entity_name']} | {e['action']} | {e['timestamp'][:19]} |\n"

    from app.services.pdf_service import markdown_to_pdf
    pdf_bytes = markdown_to_pdf(md, "Audit Log — St4rtup CRM")

    filename = f"st4rtup_audit_log_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
