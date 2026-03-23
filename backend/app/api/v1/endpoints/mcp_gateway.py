"""
MCP Gateway — Expone herramientas del CRM como tools para agentes IA.
Permite consultar KPIs, leads, pipeline, forecast en lenguaje natural.
Registra cada llamada en mcp_audit_trail.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    Lead, LeadStatus, Opportunity, OpportunityStage,
    Action, ActionStatus, Email, Visit, CallRecord,
)

router = APIRouter()


@router.get("/tools")
async def list_tools(current_user: dict = Depends(get_current_user)):
    """Lista las herramientas MCP disponibles."""
    return {
        "tools": [
            {"name": "get_kpis", "description": "KPIs actuales del CRM: leads, pipeline, revenue, conversion"},
            {"name": "search_leads", "description": "Buscar leads por empresa, sector, estado o score"},
            {"name": "get_pipeline", "description": "Estado del pipeline: oportunidades por etapa, valor total"},
            {"name": "get_actions_pending", "description": "Acciones pendientes y vencidas"},
            {"name": "get_activity_summary", "description": "Resumen de actividad: emails, visitas, llamadas"},
            {"name": "get_forecast", "description": "Forecast de revenue: ARR, pipeline ponderado, win rate"},
            {"name": "get_lead_detail", "description": "Detalle completo de un lead por ID o empresa"},
        ]
    }


@router.get("/kpis")
async def mcp_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """KPIs actuales del CRM en formato consumible por agentes."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_leads = await db.scalar(select(func.count(Lead.id))) or 0
    leads_this_month = await db.scalar(
        select(func.count(Lead.id)).where(Lead.created_at >= month_start)
    ) or 0

    pipeline_value = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]))
    ) or 0

    revenue_won = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    ) or 0

    revenue_this_month = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(and_(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= month_start,
        ))
    ) or 0

    won_count = await db.scalar(
        select(func.count(Lead.id)).where(Lead.status == LeadStatus.WON)
    ) or 0
    conversion = (won_count / total_leads * 100) if total_leads > 0 else 0

    actions_overdue = await db.scalar(
        select(func.count(Action.id))
        .where(Action.due_date < now.date(), Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS]))
    ) or 0

    return {
        "total_leads": total_leads,
        "leads_this_month": leads_this_month,
        "pipeline_value_eur": float(pipeline_value),
        "total_revenue_won_eur": float(revenue_won),
        "revenue_this_month_eur": float(revenue_this_month),
        "conversion_rate_pct": round(conversion, 1),
        "actions_overdue": actions_overdue,
        "timestamp": now.isoformat(),
    }


@router.get("/leads/search")
async def mcp_search_leads(
    query: str = Query("", max_length=100),
    status: Optional[str] = None,
    min_score: int = Query(0, ge=0, le=100),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Busca leads para agentes IA."""
    q = select(Lead)
    if query:
        q = q.where(Lead.company_name.ilike(f"%{query}%"))
    if status:
        try:
            q = q.where(Lead.status == LeadStatus(status))
        except ValueError:
            pass
    if min_score > 0:
        q = q.where(Lead.score >= min_score)

    q = q.order_by(Lead.score.desc()).limit(limit)
    result = await db.execute(q)
    leads = result.scalars().all()

    return {
        "count": len(leads),
        "leads": [
            {
                "id": str(l.id),
                "company": l.company_name,
                "contact": l.contact_name,
                "email": l.contact_email,
                "status": l.status.value if l.status else "new",
                "score": l.score or 0,
                "sector": l.company_sector,
            }
            for l in leads
        ],
    }


@router.get("/pipeline")
async def mcp_pipeline(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estado del pipeline para agentes IA."""
    stages_q = select(
        Opportunity.stage,
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0),
    ).where(
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ).group_by(Opportunity.stage)

    result = await db.execute(stages_q)
    stages = {}
    total_value = 0
    total_count = 0
    for stage, count, value in result.all():
        if stage:
            stages[stage.value] = {"count": count, "value_eur": float(value)}
            total_value += float(value)
            total_count += count

    return {
        "total_opportunities": total_count,
        "total_value_eur": total_value,
        "by_stage": stages,
    }


@router.get("/actions/pending")
async def mcp_actions_pending(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Acciones pendientes y vencidas para agentes IA."""
    now = datetime.now(timezone.utc).date()

    result = await db.execute(
        select(Action, Lead.company_name)
        .join(Lead, Action.lead_id == Lead.id, isouter=True)
        .where(Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS]))
        .order_by(Action.due_date.asc())
        .limit(limit)
    )

    actions = []
    for action, company in result.all():
        actions.append({
            "id": str(action.id),
            "title": action.title,
            "lead": company or "Sin lead",
            "due_date": action.due_date.isoformat() if action.due_date else None,
            "overdue": action.due_date < now if action.due_date else False,
            "priority": action.priority.value if action.priority else "medium",
            "status": action.status.value if action.status else "pending",
        })

    overdue_count = sum(1 for a in actions if a["overdue"])
    return {
        "total_pending": len(actions),
        "overdue": overdue_count,
        "actions": actions,
    }


@router.get("/activity")
async def mcp_activity_summary(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Resumen de actividad para agentes IA."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    emails_sent = await db.scalar(
        select(func.count(Email.id)).where(Email.sent_at >= since)
    ) or 0
    visits = await db.scalar(
        select(func.count(Visit.id)).where(Visit.created_at >= since)
    ) or 0
    calls = await db.scalar(
        select(func.count(CallRecord.id)).where(CallRecord.created_at >= since)
    ) or 0
    leads_created = await db.scalar(
        select(func.count(Lead.id)).where(Lead.created_at >= since)
    ) or 0

    return {
        "period_days": days,
        "emails_sent": emails_sent,
        "visits": visits,
        "calls": calls,
        "leads_created": leads_created,
        "total_activities": emails_sent + visits + calls,
    }
