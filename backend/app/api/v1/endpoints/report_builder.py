"""Report Builder — generacion de reportes personalizables."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models import Lead, LeadStatus, Action, ActionStatus, Opportunity, OpportunityStage, Email, Visit

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ReportConfig(BaseModel):
    name: str
    report_type: str  # pipeline, activity, leads, custom
    date_range: str = "month"  # week, month, quarter, year, custom
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    filters: dict = {}  # {status: "qualified", source: "website", ...}
    columns: list[str] = []  # Columns to include
    group_by: Optional[str] = None  # field to group by
    sort_by: str = "created_at"
    sort_dir: str = "desc"


REPORT_TYPES = {
    "pipeline": {
        "name": "Pipeline Report",
        "columns": ["name", "lead", "stage", "value", "probability", "expected_close_date", "created_at"],
    },
    "activity": {
        "name": "Activity Report",
        "columns": ["date", "emails_sent", "visits", "actions_created", "actions_completed", "leads_created"],
    },
    "leads": {
        "name": "Leads Report",
        "columns": ["company_name", "contact_name", "contact_email", "status", "source", "score", "created_at"],
    },
    "revenue": {
        "name": "Revenue Report",
        "columns": ["month", "deals_won", "revenue", "avg_deal_size", "conversion_rate"],
    },
}


def _get_date_range(date_range: str, date_from: str = None, date_to: str = None):
    now = datetime.now(timezone.utc)
    if date_range == "week":
        start = now - timedelta(days=7)
    elif date_range == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif date_range == "quarter":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif date_range == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif date_range == "custom" and date_from:
        start = datetime.fromisoformat(date_from)
    else:
        start = now - timedelta(days=30)

    end = datetime.fromisoformat(date_to) if date_to else now
    return start, end


@router.get("/types")
async def list_report_types(current_user: dict = Depends(get_current_user)):
    """Lista tipos de reportes disponibles."""
    return {"types": REPORT_TYPES}


@router.post("/generate")
async def generate_report(
    config: ReportConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Genera un reporte personalizado."""
    start, end = _get_date_range(config.date_range, config.date_from, config.date_to)

    if config.report_type == "pipeline":
        return await _report_pipeline(db, start, end, config)
    elif config.report_type == "activity":
        return await _report_activity(db, start, end, config)
    elif config.report_type == "leads":
        return await _report_leads(db, start, end, config)
    elif config.report_type == "revenue":
        return await _report_revenue(db, start, end, config)
    else:
        raise HTTPException(status_code=400, detail=f"Report type '{config.report_type}' not supported")


async def _report_pipeline(db, start, end, config):
    q = (
        select(Opportunity, Lead)
        .join(Lead, Opportunity.lead_id == Lead.id, isouter=True)
        .where(Opportunity.created_at >= start, Opportunity.created_at <= end)
    )
    if config.filters.get("stage"):
        q = q.where(Opportunity.stage == config.filters["stage"])
    q = q.order_by(desc(Opportunity.value))

    result = await db.execute(q)
    rows = []
    total_value = 0
    for opp, lead in result.all():
        val = float(opp.value or 0)
        total_value += val
        rows.append({
            "name": opp.name,
            "lead": lead.company_name if lead else "N/A",
            "stage": opp.stage.value if opp.stage else "",
            "value": val,
            "probability": opp.probability or 0,
            "weighted": round(val * (opp.probability or 0) / 100, 2),
            "expected_close_date": opp.expected_close_date.isoformat() if opp.expected_close_date else None,
            "created_at": opp.created_at.isoformat() if opp.created_at else None,
        })

    return {
        "report_type": "pipeline",
        "date_range": f"{start.date()} — {end.date()}",
        "rows": rows,
        "summary": {
            "total_opportunities": len(rows),
            "total_value": round(total_value, 2),
            "avg_value": round(total_value / max(len(rows), 1), 2),
        },
    }


async def _report_activity(db, start, end, config):
    # 4 GROUP BY queries instead of N*4 per-day queries
    email_q = await db.execute(
        select(func.date(Email.sent_at), func.count(Email.id))
        .where(Email.sent_at >= start, Email.sent_at <= end)
        .group_by(func.date(Email.sent_at))
    )
    emails_by_day = {str(r[0]): r[1] for r in email_q.all()}

    visit_q = await db.execute(
        select(func.date(Visit.visit_date), func.count(Visit.id))
        .where(Visit.visit_date >= start.date(), Visit.visit_date <= end.date())
        .group_by(func.date(Visit.visit_date))
    )
    visits_by_day = {str(r[0]): r[1] for r in visit_q.all()}

    action_q = await db.execute(
        select(func.date(Action.created_at), func.count(Action.id))
        .where(Action.created_at >= start, Action.created_at <= end)
        .group_by(func.date(Action.created_at))
    )
    actions_by_day = {str(r[0]): r[1] for r in action_q.all()}

    lead_q = await db.execute(
        select(func.date(Lead.created_at), func.count(Lead.id))
        .where(Lead.created_at >= start, Lead.created_at <= end)
        .group_by(func.date(Lead.created_at))
    )
    leads_by_day = {str(r[0]): r[1] for r in lead_q.all()}

    all_dates = set(emails_by_day) | set(visits_by_day) | set(actions_by_day) | set(leads_by_day)
    rows = []
    totals = {"emails": 0, "visits": 0, "actions_created": 0, "leads_created": 0}

    for d in sorted(all_dates):
        e = emails_by_day.get(d, 0)
        v = visits_by_day.get(d, 0)
        a = actions_by_day.get(d, 0)
        l = leads_by_day.get(d, 0)
        totals["emails"] += e
        totals["visits"] += v
        totals["actions_created"] += a
        totals["leads_created"] += l
        rows.append({
            "date": d, "emails_sent": e, "visits": v,
            "actions_created": a, "leads_created": l, "total": e + v + a + l,
        })

    return {
        "report_type": "activity",
        "date_range": f"{start.date()} — {end.date()}",
        "rows": rows,
        "summary": totals,
    }


async def _report_leads(db, start, end, config):
    q = select(Lead).where(Lead.created_at >= start, Lead.created_at <= end)
    if config.filters.get("status"):
        q = q.where(Lead.status == config.filters["status"])
    if config.filters.get("source"):
        q = q.where(Lead.source == config.filters["source"])
    q = q.order_by(desc(Lead.score))

    result = await db.execute(q)
    rows = []
    for lead in result.scalars().all():
        rows.append({
            "id": str(lead.id),
            "company_name": lead.company_name,
            "contact_name": lead.contact_name,
            "contact_email": lead.contact_email,
            "status": lead.status.value if lead.status else "",
            "source": lead.source.value if lead.source else "",
            "score": lead.score or 0,
            "sector": lead.company_sector or "",
            "city": lead.company_city or "",
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        })

    # Group by status
    by_status = {}
    for r in rows:
        s = r["status"]
        by_status[s] = by_status.get(s, 0) + 1

    return {
        "report_type": "leads",
        "date_range": f"{start.date()} — {end.date()}",
        "rows": rows,
        "summary": {
            "total": len(rows),
            "by_status": by_status,
            "avg_score": round(sum(r["score"] for r in rows) / max(len(rows), 1), 1),
        },
    }


async def _report_revenue(db, start, end, config):
    # Monthly revenue from closed_won opportunities
    rows = []
    total_revenue = 0
    total_deals = 0

    current = start.replace(day=1)
    while current <= end:
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        m_end = min(next_month, end)

        deals = await db.scalar(
            select(func.count(Opportunity.id)).where(and_(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.updated_at >= current,
                Opportunity.updated_at < m_end,
            ))
        ) or 0

        revenue = await db.scalar(
            select(func.coalesce(func.sum(Opportunity.value), 0)).where(and_(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.updated_at >= current,
                Opportunity.updated_at < m_end,
            ))
        ) or 0

        total_revenue += float(revenue)
        total_deals += deals

        rows.append({
            "month": current.strftime("%Y-%m"),
            "deals_won": deals,
            "revenue": round(float(revenue), 2),
            "avg_deal_size": round(float(revenue) / max(deals, 1), 2),
        })

        current = next_month

    return {
        "report_type": "revenue",
        "date_range": f"{start.date()} — {end.date()}",
        "rows": rows,
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_deals": total_deals,
            "avg_deal_size": round(total_revenue / max(total_deals, 1), 2),
        },
    }


@router.post("/export-csv")
async def export_report_csv(
    config: ReportConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Genera reporte y devuelve como CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    start, end = _get_date_range(config.date_range, config.date_from, config.date_to)

    if config.report_type == "pipeline":
        report = await _report_pipeline(db, start, end, config)
    elif config.report_type == "activity":
        report = await _report_activity(db, start, end, config)
    elif config.report_type == "leads":
        report = await _report_leads(db, start, end, config)
    elif config.report_type == "revenue":
        report = await _report_revenue(db, start, end, config)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    rows = report.get("rows", [])
    if not rows:
        raise HTTPException(status_code=404, detail="No data for this report")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    filename = f"st4rtup_{config.report_type}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export-pdf")
async def export_report_pdf(
    config: ReportConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Genera reporte y devuelve como PDF corporativo."""
    from fastapi.responses import Response

    start, end = _get_date_range(config.date_range, config.date_from, config.date_to)

    if config.report_type == "pipeline":
        report = await _report_pipeline(db, start, end, config)
    elif config.report_type == "activity":
        report = await _report_activity(db, start, end, config)
    elif config.report_type == "leads":
        report = await _report_leads(db, start, end, config)
    elif config.report_type == "revenue":
        report = await _report_revenue(db, start, end, config)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    rows = report.get("rows", [])
    summary = report.get("summary", {})
    title = REPORT_TYPES.get(config.report_type, {}).get("name", "Reporte")

    # Build markdown for PDF
    md = f"# {title}\n\n"
    md += f"**Periodo:** {report.get('date_range', '')}\n\n"

    # Summary
    md += "## Resumen\n\n"
    for k, v in summary.items():
        if not isinstance(v, dict):
            md += f"- **{k.replace('_', ' ').title()}:** {v:,.2f if isinstance(v, float) else v}\n"
    md += "\n"

    # Table
    if rows:
        md += "## Datos\n\n"
        headers = list(rows[0].keys())
        md += "| " + " | ".join(h.replace("_", " ").title() for h in headers) + " |\n"
        md += "| " + " | ".join("---" for _ in headers) + " |\n"
        for row in rows[:100]:
            md += "| " + " | ".join(str(row.get(h, "")) for h in headers) + " |\n"

    from app.services.pdf_service import markdown_to_pdf
    pdf_bytes = markdown_to_pdf(md, f"St4rtup CRM — {title}")

    filename = f"st4rtup_{config.report_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ExportSheetsRequest(BaseModel):
    report_type: str = "leads"
    date_range: str = "month"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    filters: dict = {}


@router.post("/{report_id}/export-sheets")
async def export_to_sheets(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Export report data to Google Sheets."""
    try:
        import httpx

        # Get Google OAuth credentials from system settings
        from sqlalchemy import select as sa_select
        from app.models.system import SystemSettings
        import time

        result = await db.execute(sa_select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if not sys_settings or not sys_settings.gdrive_config:
            raise HTTPException(status_code=400, detail="Google OAuth no configurado")

        from app.core.credential_store import credential_store, SENSITIVE_KEYS
        cfg = credential_store.decrypt_config(
            sys_settings.gdrive_config, SENSITIVE_KEYS.get("gdrive_config", [])
        )
        access_token = cfg.get("access_token")
        refresh_token = cfg.get("refresh_token")

        if not access_token and not refresh_token:
            raise HTTPException(status_code=400, detail="Google OAuth no configurado — sin tokens")

        # Refresh token if expired
        expires_at = cfg.get("expires_at", 0)
        if time.time() > expires_at and refresh_token:
            from app.core.config import settings as app_settings
            client_id = getattr(app_settings, "GOOGLE_CLIENT_ID", "")
            client_secret = getattr(app_settings, "GOOGLE_CLIENT_SECRET", "")
            if client_id and client_secret:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    r = await client.post("https://oauth2.googleapis.com/token", data={
                        "client_id": client_id, "client_secret": client_secret,
                        "refresh_token": refresh_token, "grant_type": "refresh_token",
                    })
                    if r.status_code == 200:
                        data = r.json()
                        access_token = data["access_token"]
                        cfg["access_token"] = access_token
                        cfg["expires_at"] = time.time() + data.get("expires_in", 3600)
                        sys_settings.gdrive_config = credential_store.encrypt_config(
                            cfg, SENSITIVE_KEYS.get("gdrive_config", [])
                        )
                        await db.commit()
                    else:
                        raise HTTPException(status_code=502, detail="Error refreshing Google token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Google OAuth token no disponible")

        # Create spreadsheet via Sheets API
        async with httpx.AsyncClient(timeout=15.0) as client:
            sheet_title = f"St4rtup Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            resp = await client.post(
                "https://sheets.googleapis.com/v4/spreadsheets",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={
                    "properties": {"title": sheet_title},
                    "sheets": [{"properties": {"title": "Datos"}}]
                }
            )

            if resp.status_code not in (200, 201):
                logger.error("Google Sheets API error: %s", resp.text[:500])
                raise HTTPException(status_code=502, detail=f"Error creando spreadsheet: {resp.text[:200]}")

            sheet_data = resp.json()
            spreadsheet_id = sheet_data["spreadsheetId"]
            spreadsheet_url = sheet_data["spreadsheetUrl"]

            return {
                "spreadsheet_id": spreadsheet_id,
                "url": spreadsheet_url,
                "message": "Spreadsheet creado",
                "report_id": str(report_id),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error exporting to Google Sheets: %s", str(e))
        raise HTTPException(status_code=502, detail=f"Error: {str(e)}")
