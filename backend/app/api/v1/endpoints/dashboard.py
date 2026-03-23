from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models import Lead, LeadStatus, Action, ActionStatus, Opportunity, OpportunityStage, Email, Visit, User
from app.models.models import Offer, OfferStatus
from app.schemas import DashboardStats
from app.schemas.dashboard import DashboardConfigUpdate, DashboardConfigResponse, DashboardWidgetConfig

router = APIRouter()

DEFAULT_WIDGETS = [
    {"id": "kpis", "label": "KPIs Principales", "visible": True, "position": 0, "size": "md"},
    {"id": "pipeline", "label": "Pipeline Resumen", "visible": True, "position": 1, "size": "md"},
    {"id": "activity", "label": "Actividad Reciente", "visible": True, "position": 2, "size": "md"},
    {"id": "charts", "label": "Gráficos", "visible": True, "position": 3, "size": "md"},
    {"id": "marketing", "label": "Marketing Summary", "visible": True, "position": 4, "size": "md"},
    {"id": "automations", "label": "Automatizaciones", "visible": True, "position": 5, "size": "md"},
    {"id": "agents", "label": "Agentes IA", "visible": True, "position": 6, "size": "md"},
    {"id": "onboarding", "label": "Onboarding", "visible": True, "position": 7, "size": "md"},
]


@router.get("/config", response_model=DashboardConfigResponse)
async def get_dashboard_config(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene la configuración de widgets del dashboard del usuario."""
    user = await db.get(User, current_user["user_id"])
    if not user:
        return DashboardConfigResponse(widgets=[DashboardWidgetConfig(**w) for w in DEFAULT_WIDGETS])

    prefs = user.preferences or {}
    widgets_data = prefs.get("dashboard_widgets", DEFAULT_WIDGETS)
    return DashboardConfigResponse(widgets=[DashboardWidgetConfig(**w) for w in widgets_data])


@router.put("/config", response_model=DashboardConfigResponse)
async def update_dashboard_config(
    payload: DashboardConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Guarda la configuración de widgets del dashboard del usuario."""
    user = await db.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    prefs = dict(user.preferences or {})
    prefs["dashboard_widgets"] = [w.model_dump() for w in payload.widgets]
    user.preferences = prefs
    await db.commit()
    return DashboardConfigResponse(widgets=payload.widgets)


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas del dashboard - optimizado para mínimas queries."""
    now = datetime.now(timezone.utc)
    seven_days_ago = now.date() - timedelta(days=6)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ─── Query 1: Lead stats (total + by status) ──────────────────
    status_query = select(Lead.status, func.count(Lead.id)).group_by(Lead.status)
    status_result = await db.execute(status_query)
    leads_by_status = {}
    total_leads = 0
    for row in status_result.all():
        if row[0] is not None:
            leads_by_status[str(row[0].value)] = row[1]
        total_leads += row[1]

    # ─── Query 2: Opportunity aggregates (all in one) ─────────────
    opp_query = select(
        func.count(Opportunity.id),
        func.coalesce(func.sum(
            case((Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]), Opportunity.value), else_=0)
        ), 0),
        func.coalesce(func.sum(
            case((Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
                  Opportunity.value * Opportunity.probability / 100), else_=0)
        ), 0),
    )
    opp_result = (await db.execute(opp_query)).one()
    total_opps = opp_result[0]
    pipeline_value = float(opp_result[1])
    weighted = float(opp_result[2])

    # ─── Query 3: Action counts (overdue + due today) ─────────────
    action_query = select(
        func.count(case((Action.due_date < now.date(), Action.id))),
        func.count(case((Action.due_date == now.date(), Action.id))),
    ).where(Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS]))
    action_result = (await db.execute(action_query)).one()
    overdue = action_result[0]
    due_today = action_result[1]

    # ─── Query 4: Emails + Visits this month ──────────────────────
    emails_month = (await db.execute(
        select(func.count(Email.id))
        .where(Email.sent_at >= month_start)
    )).scalar() or 0

    visits_month = (await db.execute(
        select(func.count(Visit.id))
        .where(Visit.visit_date >= month_start.date())
    )).scalar() or 0

    # Conversion rate
    won = leads_by_status.get("won", 0)
    conversion = (won / total_leads * 100) if total_leads > 0 else 0.0

    # ─── Query 5: Pipeline by stage ───────────────────────────────
    pipeline_stages_query = select(
        Opportunity.stage,
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0)
    ).where(
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ).group_by(Opportunity.stage)

    pipeline_stages_result = await db.execute(pipeline_stages_query)
    pipeline_by_stage = {
        str(row[0].value): {"count": row[1], "value": float(row[2])}
        for row in pipeline_stages_result.all()
        if row[0] is not None
    }

    # ─── Query 6: Activity last 7 days (single query with date_trunc) ─
    activity_emails = select(
        func.date(Email.sent_at).label('day'),
        func.count(Email.id).label('cnt')
    ).where(func.date(Email.sent_at) >= seven_days_ago).group_by(func.date(Email.sent_at))
    emails_by_day = {row[0]: row[1] for row in (await db.execute(activity_emails)).all()}

    activity_visits = select(
        Visit.visit_date.label('day'),
        func.count(Visit.id).label('cnt')
    ).where(Visit.visit_date >= seven_days_ago).group_by(Visit.visit_date)
    visits_by_day = {row[0]: row[1] for row in (await db.execute(activity_visits)).all()}

    activity_actions = select(
        func.date(Action.created_at).label('day'),
        func.count(Action.id).label('cnt')
    ).where(func.date(Action.created_at) >= seven_days_ago).group_by(func.date(Action.created_at))
    actions_by_day = {row[0]: row[1] for row in (await db.execute(activity_actions)).all()}

    activity_last_7_days = []
    for i in range(6, -1, -1):
        day = now.date() - timedelta(days=i)
        activity_last_7_days.append({
            "date": day.isoformat(),
            "emails": emails_by_day.get(day, 0),
            "visits": visits_by_day.get(day, 0),
            "actions": actions_by_day.get(day, 0),
        })

    # ─── Query 7: Upcoming visits with lead JOIN ──────────────────
    upcoming_visits_query = (
        select(Visit, Lead)
        .join(Lead, Visit.lead_id == Lead.id, isouter=True)
        .where(and_(
            Visit.visit_date >= now.date(),
            Visit.visit_date <= now.date() + timedelta(days=7)
        ))
        .order_by(Visit.visit_date.asc())
        .limit(5)
    )
    upcoming_visits_result = await db.execute(upcoming_visits_query)
    upcoming_visits = []
    for visit, lead in upcoming_visits_result:
        upcoming_visits.append({
            "id": str(visit.id),
            "company": lead.company_name if lead else "Unknown",
            "date": visit.visit_date.isoformat(),
            "attendees": visit.attendees_internal or [],
        })

    # ─── Query 8: Stale opportunities ─────────────────────────────
    two_weeks_ago = now - timedelta(days=14)
    stale_opps = (await db.execute(
        select(func.count(Opportunity.id))
        .where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]))
        .where(Opportunity.updated_at < two_weeks_ago)
    )).scalar() or 0

    # ─── Conversion funnel (from already-fetched data) ────────────
    funnel_stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won']
    conversion_funnel = []
    for stage in funnel_stages:
        count = leads_by_status.get(stage, 0)
        percentage = (count / total_leads * 100) if total_leads > 0 else 0
        conversion_funnel.append({
            "stage": stage,
            "count": count,
            "percentage": round(percentage, 1),
        })

    # ─── Query 9: Top leads by score ──────────────────────────────
    top_leads_query = select(Lead).where(
        Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST])
    ).order_by(Lead.score.desc()).limit(5)
    top_leads_result = await db.execute(top_leads_query)
    top_leads_by_score = [
        {
            "id": str(lead.id),
            "company": lead.company_name,
            "score": lead.score or 0,
            "status": lead.status.value if lead.status else "new",
        }
        for lead in top_leads_result.scalars()
    ]

    # ─── Query 10: Leads by sector ────────────────────────────────
    sector_query = select(
        Lead.company_sector, func.count(Lead.id)
    ).where(Lead.company_sector.isnot(None)).group_by(Lead.company_sector)
    sector_result = await db.execute(sector_query)
    leads_by_sector = {row[0]: row[1] for row in sector_result.all() if row[0]}

    # ─── Query 11: Recent activity (emails + visits with JOINs) ───
    recent_activity = []

    recent_emails = await db.execute(
        select(Email, Lead).join(Lead, Email.lead_id == Lead.id)
        .where(Email.sent_at.isnot(None))
        .order_by(Email.sent_at.desc())
        .limit(5)
    )
    for email, lead in recent_emails:
        recent_activity.append({
            "type": "email",
            "description": f"Email enviado: {email.subject}",
            "timestamp": email.sent_at.isoformat() if email.sent_at else None,
            "lead": lead.company_name,
        })

    recent_visits = await db.execute(
        select(Visit, Lead).join(Lead, Visit.lead_id == Lead.id)
        .order_by(Visit.visit_date.desc())
        .limit(5)
    )
    for visit, lead in recent_visits:
        recent_activity.append({
            "type": "visit",
            "description": f"Visita realizada - {visit.summary or 'Sin resumen'}",
            "timestamp": visit.created_at.isoformat() if visit.created_at else None,
            "lead": lead.company_name,
        })

    recent_activity.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    recent_activity = recent_activity[:10]

    # ─── Query 12: Trends ─────────────────────────────────────────
    last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
    last_month_end = now.replace(day=1) - timedelta(days=1)

    trend_query = select(
        func.count(case((Lead.created_at >= month_start, Lead.id))),
        func.count(case((and_(Lead.created_at >= last_month_start, Lead.created_at <= last_month_end), Lead.id))),
    )
    trend_result = (await db.execute(trend_query)).one()
    leads_this_month = trend_result[0]
    leads_last_month = trend_result[1]

    leads_trend = ((leads_this_month - leads_last_month) / leads_last_month * 100) if leads_last_month > 0 else 0.0

    # Pipeline trend: compare current vs last month pipeline
    last_month_pipeline = (await db.execute(
        select(func.coalesce(func.sum(
            case((and_(
                Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
                Opportunity.created_at >= last_month_start,
                Opportunity.created_at <= last_month_end,
            ), Opportunity.value), else_=0)
        ), 0))
    )).scalar() or 0
    pipeline_trend = ((pipeline_value - float(last_month_pipeline)) / float(last_month_pipeline) * 100) if last_month_pipeline > 0 else 0.0

    # Conversion trend
    won_last_month = (await db.execute(
        select(func.count(Lead.id)).where(
            and_(Lead.status == LeadStatus.WON, Lead.updated_at >= last_month_start, Lead.updated_at <= last_month_end)
        )
    )).scalar() or 0
    last_month_conversion = (won_last_month / leads_last_month * 100) if leads_last_month > 0 else 0.0
    conversion_trend = (conversion - last_month_conversion) if last_month_conversion > 0 else 0.0

    # ─── Query 13: Offers this month ────────────────────────────
    offers_month_query = select(
        func.count(Offer.id),
        func.count(case((Offer.status == OfferStatus.ACCEPTED, Offer.id))),
    ).where(Offer.created_at >= month_start)
    offers_month_result = (await db.execute(offers_month_query)).one()
    offers_this_month = offers_month_result[0]
    offers_accepted_this_month = offers_month_result[1]

    # ─── Query 14: Revenue won this month and quarter ───────────
    revenue_won_month = (await db.execute(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(and_(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= month_start,
        ))
    )).scalar() or 0

    quarter_month = ((now.month - 1) // 3) * 3 + 1
    quarter_start = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    revenue_won_quarter = (await db.execute(
        select(func.coalesce(func.sum(Opportunity.value), 0))
        .where(and_(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= quarter_start,
        ))
    )).scalar() or 0

    # ─── Query 15: Deals closing soon (next 14 days) ────────────
    closing_soon_query = (
        select(Opportunity, Lead)
        .join(Lead, Opportunity.lead_id == Lead.id, isouter=True)
        .where(and_(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
            Opportunity.expected_close_date.isnot(None),
            Opportunity.expected_close_date >= now.date(),
            Opportunity.expected_close_date <= now.date() + timedelta(days=14),
        ))
        .order_by(Opportunity.expected_close_date.asc())
        .limit(5)
    )
    closing_soon_result = await db.execute(closing_soon_query)
    deals_closing_soon = []
    for opp, lead in closing_soon_result:
        deals_closing_soon.append({
            "id": str(opp.id),
            "name": opp.name,
            "value": float(opp.value or 0),
            "stage": opp.stage.value if opp.stage else "unknown",
            "close_date": opp.expected_close_date.isoformat() if opp.expected_close_date else None,
            "lead": lead.company_name if lead else "Unknown",
        })

    return DashboardStats(
        total_leads=total_leads,
        leads_by_status=leads_by_status,
        total_opportunities=total_opps,
        pipeline_value=pipeline_value,
        weighted_pipeline=weighted,
        actions_overdue=overdue,
        actions_due_today=due_today,
        emails_sent_this_month=emails_month,
        visits_this_month=visits_month,
        conversion_rate=round(conversion, 2),
        pipeline_by_stage=pipeline_by_stage,
        activity_last_7_days=activity_last_7_days,
        upcoming_visits=upcoming_visits,
        stale_opportunities=stale_opps,
        leads_trend=round(leads_trend, 1),
        pipeline_trend=round(pipeline_trend, 1),
        conversion_trend=round(conversion_trend, 1),
        conversion_funnel=conversion_funnel,
        top_leads_by_score=top_leads_by_score,
        leads_by_sector=leads_by_sector,
        recent_activity=recent_activity,
        offers_this_month=offers_this_month,
        offers_accepted_this_month=offers_accepted_this_month,
        revenue_won_this_month=float(revenue_won_month),
        revenue_won_this_quarter=float(revenue_won_quarter),
        deals_closing_soon=deals_closing_soon,
    )


@router.get("/heatmap")
async def get_activity_heatmap(
    months: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Activity heatmap estilo GitHub — ultimos N meses.
    Returns {date: count} para emails, visits, actions, leads."""
    start_date = datetime.now(timezone.utc).date() - timedelta(days=months * 30)

    # Emails sent
    eq = select(func.date(Email.sent_at), func.count(Email.id)).where(
        Email.sent_at.isnot(None), func.date(Email.sent_at) >= start_date
    ).group_by(func.date(Email.sent_at))
    emails = {str(r[0]): r[1] for r in (await db.execute(eq)).all()}

    # Visits
    vq = select(func.date(Visit.visit_date), func.count(Visit.id)).where(
        func.date(Visit.visit_date) >= start_date
    ).group_by(func.date(Visit.visit_date))
    visits = {str(r[0]): r[1] for r in (await db.execute(vq)).all()}

    # Actions created
    aq = select(func.date(Action.created_at), func.count(Action.id)).where(
        func.date(Action.created_at) >= start_date
    ).group_by(func.date(Action.created_at))
    actions = {str(r[0]): r[1] for r in (await db.execute(aq)).all()}

    # Leads created
    lq = select(func.date(Lead.created_at), func.count(Lead.id)).where(
        func.date(Lead.created_at) >= start_date
    ).group_by(func.date(Lead.created_at))
    leads = {str(r[0]): r[1] for r in (await db.execute(lq)).all()}

    # Merge all dates
    all_dates = set(emails.keys()) | set(visits.keys()) | set(actions.keys()) | set(leads.keys())
    heatmap = {}
    for d in all_dates:
        heatmap[d] = emails.get(d, 0) + visits.get(d, 0) + actions.get(d, 0) + leads.get(d, 0)

    return {
        "heatmap": heatmap,
        "breakdown": {
            "emails": emails,
            "visits": visits,
            "actions": actions,
            "leads": leads,
        },
        "start_date": start_date.isoformat(),
        "total_days": len(heatmap),
        "max_activity": max(heatmap.values()) if heatmap else 0,
    }


@router.get("/calendar")
async def get_calendar_events(
    start: date = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    end: date = Query(..., description="Fecha fin (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Eventos del calendario: visitas, acciones y oportunidades en un rango de fechas."""
    events = []

    # Visitas
    visits_query = (
        select(Visit, Lead)
        .join(Lead, Visit.lead_id == Lead.id, isouter=True)
        .where(and_(
            func.date(Visit.visit_date) >= start,
            func.date(Visit.visit_date) <= end,
        ))
        .order_by(Visit.visit_date.asc())
    )
    for visit, lead in (await db.execute(visits_query)):
        events.append({
            "id": str(visit.id),
            "type": "visit",
            "title": f"Visita - {lead.company_name if lead else 'Sin empresa'}",
            "date": visit.visit_date.isoformat() if visit.visit_date else None,
            "lead": lead.company_name if lead else None,
            "lead_id": str(visit.lead_id) if visit.lead_id else None,
            "status": visit.status.value if hasattr(visit, 'status') and visit.status else None,
        })

    # Acciones (por due_date)
    actions_query = (
        select(Action, Lead)
        .join(Lead, Action.lead_id == Lead.id, isouter=True)
        .where(and_(
            Action.due_date >= start,
            Action.due_date <= end,
        ))
        .order_by(Action.due_date.asc())
    )
    for action, lead in (await db.execute(actions_query)):
        events.append({
            "id": str(action.id),
            "type": "action",
            "title": action.title,
            "date": action.due_date.isoformat() if action.due_date else None,
            "lead": lead.company_name if lead else None,
            "lead_id": str(action.lead_id) if action.lead_id else None,
            "status": action.status.value if action.status else None,
            "priority": action.priority.value if action.priority else None,
        })

    # Oportunidades (por expected_close_date)
    opps_query = (
        select(Opportunity, Lead)
        .join(Lead, Opportunity.lead_id == Lead.id, isouter=True)
        .where(and_(
            Opportunity.expected_close_date >= start,
            Opportunity.expected_close_date <= end,
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
        ))
        .order_by(Opportunity.expected_close_date.asc())
    )
    for opp, lead in (await db.execute(opps_query)):
        events.append({
            "id": str(opp.id),
            "type": "opportunity",
            "title": opp.name,
            "date": opp.expected_close_date.isoformat() if opp.expected_close_date else None,
            "lead": lead.company_name if lead else None,
            "lead_id": str(opp.lead_id) if opp.lead_id else None,
            "value": float(opp.value or 0),
            "stage": opp.stage.value if opp.stage else None,
        })

    # Marketing calendar events
    try:
        from app.models.marketing import MarketingCalendarEvent
        mkt_query = (
            select(MarketingCalendarEvent)
            .where(and_(
                func.date(MarketingCalendarEvent.start_date) >= start,
                func.date(MarketingCalendarEvent.start_date) <= end,
            ))
            .order_by(MarketingCalendarEvent.start_date.asc())
        )
        for mkt_ev in (await db.execute(mkt_query)).scalars():
            events.append({
                "id": str(mkt_ev.id),
                "type": "marketing",
                "title": mkt_ev.title,
                "date": mkt_ev.start_date.isoformat() if mkt_ev.start_date else None,
                "end_date": mkt_ev.end_date.isoformat() if mkt_ev.end_date else None,
                "event_type": mkt_ev.event_type.value if hasattr(mkt_ev.event_type, 'value') else str(mkt_ev.event_type),
                "channel": mkt_ev.channel,
                "status": mkt_ev.event_status,
                "color": mkt_ev.color,
                "budget": float(mkt_ev.budget or 0),
            })
    except Exception:
        import logging
        logging.getLogger(__name__).debug("Marketing calendar query skipped", exc_info=True)

    return events


@router.post("/calendar/sync")
async def sync_google_calendar(
    days_ahead: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Sincroniza visitas del CRM con Google Calendar (bidireccional)."""
    try:
        from app.services.gcalendar_service import create_calendar_event, list_calendar_events

        # Get upcoming visits from CRM
        now = datetime.now(timezone.utc)
        visits_q = (
            select(Visit, Lead)
            .join(Lead, Visit.lead_id == Lead.id, isouter=True)
            .where(and_(
                Visit.visit_date >= now.date(),
                Visit.visit_date <= now.date() + timedelta(days=days_ahead),
            ))
        )
        result = await db.execute(visits_q)
        synced = 0
        errors = 0

        for visit, lead in result.all():
            company = lead.company_name if lead else "Sin empresa"
            # Skip if already synced (has gcal_event_id in metadata)
            meta = visit.metadata_ if isinstance(visit.metadata_, dict) else {}
            if meta.get("gcal_event_id"):
                continue
            try:
                gcal = await create_calendar_event(
                    db=db,
                    summary=f"Visita — {company}",
                    description=f"Visita comercial con {company}.\n{visit.summary or ''}",
                    start_dt=visit.visit_date if hasattr(visit.visit_date, 'hour') else datetime.combine(visit.visit_date, datetime.min.time()),
                    location=visit.location if hasattr(visit, 'location') else "",
                )
                # Save gcal event ID
                meta["gcal_event_id"] = gcal.get("id", "")
                meta["gcal_link"] = gcal.get("htmlLink", "")
                visit.metadata_ = meta
                synced += 1
            except Exception:
                errors += 1

        await db.commit()
        return {"synced": synced, "errors": errors, "message": f"{synced} visitas sincronizadas con Google Calendar"}

    except ValueError as e:
        return {"synced": 0, "errors": 0, "message": str(e)}
    except Exception as e:
        return {"synced": 0, "errors": 0, "message": f"Error: {str(e)}"}


@router.get("/ai-summary")
async def ai_daily_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Genera resumen diario del CRM con IA."""
    now = datetime.now(timezone.utc)
    today = now.date()

    # Gather key metrics
    actions_overdue = (await db.execute(select(func.count(Action.id)).where(
        Action.due_date < today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
    ))).scalar() or 0

    actions_today = (await db.execute(select(func.count(Action.id)).where(
        Action.due_date == today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
    ))).scalar() or 0

    deals_closing = (await db.execute(select(func.count(Opportunity.id)).where(
        Opportunity.expected_close_date <= today + timedelta(days=7),
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ))).scalar() or 0

    deals_closing_value = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.expected_close_date <= today + timedelta(days=7),
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ))).scalar() or 0

    new_leads_today = (await db.execute(select(func.count(Lead.id)).where(
        func.date(Lead.created_at) == today
    ))).scalar() or 0

    emails_today = (await db.execute(select(func.count(Email.id)).where(
        func.date(Email.sent_at) == today
    ))).scalar() or 0

    hot_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.score >= 70))).scalar() or 0

    context = f"""Estado del CRM hoy {today.strftime('%d/%m/%Y')}:
- {actions_overdue} acciones vencidas
- {actions_today} acciones para hoy
- {deals_closing} deals cerrando esta semana (valor: {deals_closing_value:,.0f} EUR)
- {new_leads_today} leads nuevos hoy
- {emails_today} emails enviados hoy
- {hot_leads} leads calientes (score >= 70)"""

    try:
        from app.services.ai_chat_service import AIChatService
        service = AIChatService()
        result = await service.chat(
            provider=settings.AI_DEFAULT_PROVIDER,
            messages=[{"role": "user", "content": f"Genera un briefing ejecutivo de 3-5 frases sobre este estado del CRM. Destaca prioridades y riesgos. Sé directo y accionable.\n\n{context}"}],
            system_prompt="Eres el asistente de ventas de St4rtup. Generas briefings ejecutivos concisos en español.",
        )
        summary = result.get("content", "")
    except Exception:
        summary = f"Hoy: {actions_today} acciones pendientes, {actions_overdue} vencidas, {deals_closing} deals cerrando esta semana ({deals_closing_value:,.0f} EUR)."

    return {
        "summary": summary,
        "metrics": {
            "actions_overdue": actions_overdue,
            "actions_today": actions_today,
            "deals_closing": deals_closing,
            "deals_closing_value": float(deals_closing_value),
            "new_leads_today": new_leads_today,
            "emails_today": emails_today,
            "hot_leads": hot_leads,
        },
        "date": today.isoformat(),
    }


@router.get("/suggestions")
async def proactive_suggestions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Genera sugerencias proactivas basadas en el estado del CRM."""
    now = datetime.now(timezone.utc)
    suggestions = []

    # Leads sin actividad en 15+ días
    stale_leads = await db.execute(
        select(Lead.id, Lead.company_name, Lead.updated_at)
        .where(Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]))
        .where(Lead.updated_at < now - timedelta(days=15))
        .order_by(Lead.score.desc())
        .limit(5)
    )
    for lid, name, updated in stale_leads.all():
        days = (now - updated).days if updated else 30
        suggestions.append({
            "type": "stale_lead",
            "severity": "warning",
            "title": f"{name} sin actividad ({days} días)",
            "action": "Enviar follow-up o programar llamada",
            "link": f"/leads/{lid}",
        })

    # Acciones vencidas > 3 días
    overdue_actions = await db.execute(
        select(Action.id, Action.title, Action.due_date)
        .where(Action.due_date < now.date() - timedelta(days=3))
        .where(Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS]))
        .limit(5)
    )
    for aid, title, due in overdue_actions.all():
        days = (now.date() - due).days if due else 0
        suggestions.append({
            "type": "overdue_action",
            "severity": "high",
            "title": f"Acción vencida: {title} ({days}d)",
            "action": "Completar o reprogramar",
            "link": "/actions",
        })

    # Deals sin actividad
    stale_deals = await db.execute(
        select(Opportunity.id, Opportunity.name, Opportunity.value, Opportunity.updated_at)
        .where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]))
        .where(Opportunity.updated_at < now - timedelta(days=14))
        .limit(3)
    )
    for oid, name, value, updated in stale_deals.all():
        suggestions.append({
            "type": "stale_deal",
            "severity": "high",
            "title": f"Deal estancado: {name} ({value:,.0f} EUR)",
            "action": "Contactar o actualizar etapa",
            "link": "/pipeline",
        })

    return {"suggestions": suggestions, "total": len(suggestions)}


@router.get("/comparison")
async def period_comparison(
    period: str = Query("month", regex="^(week|month|quarter)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Compara periodo actual vs anterior."""
    now = datetime.now(timezone.utc)

    if period == "week":
        current_start = now - timedelta(days=now.weekday())
        current_start = current_start.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = current_start - timedelta(days=7)
        prev_end = current_start
    elif period == "month":
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_end = current_start
        prev_start = (current_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # quarter
        q_month = ((now.month - 1) // 3) * 3 + 1
        current_start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_end = current_start
        prev_start = (current_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = prev_start.replace(month=((prev_start.month - 1) // 3) * 3 + 1)

    # Current period metrics
    curr_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= current_start)
    )).scalar() or 0
    prev_leads = (await db.execute(
        select(func.count(Lead.id)).where(and_(Lead.created_at >= prev_start, Lead.created_at < prev_end))
    )).scalar() or 0

    curr_revenue = (await db.execute(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(and_(
            Opportunity.stage == OpportunityStage.CLOSED_WON, Opportunity.updated_at >= current_start
        ))
    )).scalar() or 0
    prev_revenue = (await db.execute(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(and_(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= prev_start, Opportunity.updated_at < prev_end
        ))
    )).scalar() or 0

    curr_emails = (await db.execute(
        select(func.count(Email.id)).where(Email.sent_at >= current_start)
    )).scalar() or 0
    prev_emails = (await db.execute(
        select(func.count(Email.id)).where(and_(Email.sent_at >= prev_start, Email.sent_at < prev_end))
    )).scalar() or 0

    def delta(curr, prev):
        if prev == 0:
            return 100.0 if curr > 0 else 0.0
        return round((curr - prev) / prev * 100, 1)

    return {
        "period": period,
        "current": {"leads": curr_leads, "revenue": float(curr_revenue), "emails": curr_emails},
        "previous": {"leads": prev_leads, "revenue": float(prev_revenue), "emails": prev_emails},
        "delta": {
            "leads": delta(curr_leads, prev_leads),
            "revenue": delta(float(curr_revenue), float(prev_revenue)),
            "emails": delta(curr_emails, prev_emails),
        },
    }


@router.get("/embed/{widget_type}")
async def embeddable_widget(
    widget_type: str,
    api_key: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Public embeddable widget data (auth via API key)."""
    valid_keys = [k.strip() for k in (settings.PUBLIC_API_KEYS or "").split(",") if k.strip()]
    if api_key not in valid_keys:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if widget_type == "pipeline":
        total = (await db.execute(
            select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
            )
        )).scalar() or 0
        return {"widget": "pipeline", "value": float(total), "label": "Pipeline activo", "currency": "EUR"}

    elif widget_type == "leads":
        total = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
        return {"widget": "leads", "value": total, "label": "Total leads"}

    elif widget_type == "revenue":
        total = (await db.execute(
            select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON
            )
        )).scalar() or 0
        return {"widget": "revenue", "value": float(total), "label": "Revenue total", "currency": "EUR"}

    elif widget_type == "conversion":
        total_leads = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
        won = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == LeadStatus.WON)
        )).scalar() or 0
        rate = round(won / total_leads * 100, 1) if total_leads else 0
        return {"widget": "conversion", "value": rate, "label": "Tasa conversión", "unit": "%"}

    raise HTTPException(status_code=404, detail=f"Widget '{widget_type}' no encontrado")


@router.get("/waterfall")
async def revenue_waterfall(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Revenue waterfall: pipeline start → new → won → lost → current."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Pipeline at start of month (created before this month, still open)
    pipeline_start = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.created_at < month_start,
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ))).scalar() or 0

    # New deals this month
    new_deals = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.created_at >= month_start
    ))).scalar() or 0

    # Won this month
    won = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.stage == OpportunityStage.CLOSED_WON,
        Opportunity.updated_at >= month_start
    ))).scalar() or 0

    # Lost this month
    lost = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.stage == OpportunityStage.CLOSED_LOST,
        Opportunity.updated_at >= month_start
    ))).scalar() or 0

    # Current pipeline
    current_pipeline = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
        Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
    ))).scalar() or 0

    return {
        "bars": [
            {"label": "Pipeline inicio mes", "value": float(pipeline_start), "type": "total"},
            {"label": "Nuevos deals", "value": float(new_deals), "type": "increase"},
            {"label": "Won", "value": float(won), "type": "decrease"},
            {"label": "Lost", "value": float(lost), "type": "decrease"},
            {"label": "Pipeline actual", "value": float(current_pipeline), "type": "total"},
        ]
    }


@router.get("/funnel")
async def pipeline_funnel(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Funnel de conversión: % entre cada etapa del pipeline."""
    stages = [
        ("new", LeadStatus.NEW),
        ("contacted", LeadStatus.CONTACTED),
        ("qualified", LeadStatus.QUALIFIED),
        ("proposal", LeadStatus.PROPOSAL),
        ("negotiation", LeadStatus.NEGOTIATION),
        ("won", LeadStatus.WON),
    ]

    funnel = []
    prev_count = 0
    for name, status in stages:
        count = (await db.execute(select(func.count(Lead.id)).where(Lead.status == status))).scalar() or 0
        conversion = round(count / prev_count * 100, 1) if prev_count > 0 else 100.0
        funnel.append({"stage": name, "count": count, "conversion_from_prev": conversion})
        prev_count = count if count > 0 else prev_count

    total = funnel[0]["count"] if funnel else 0
    won = funnel[-1]["count"] if funnel else 0
    overall_conversion = round(won / total * 100, 1) if total > 0 else 0

    return {"funnel": funnel, "overall_conversion": overall_conversion}


@router.get("/activity-radar")
async def activity_radar(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Radar chart data: emails, visits, calls, actions, deals by period."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    emails = (await db.execute(select(func.count(Email.id)).where(Email.sent_at >= since))).scalar() or 0
    visits_count = (await db.execute(select(func.count(Visit.id)).where(Visit.created_at >= since))).scalar() or 0

    from app.models.call import CallRecord
    calls = (await db.execute(select(func.count(CallRecord.id)).where(CallRecord.created_at >= since))).scalar() or 0

    actions_completed = (await db.execute(select(func.count(Action.id)).where(
        Action.status == ActionStatus.COMPLETED, Action.updated_at >= since
    ))).scalar() or 0

    deals = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.created_at >= since))).scalar() or 0

    leads_created = (await db.execute(select(func.count(Lead.id)).where(Lead.created_at >= since))).scalar() or 0

    return {
        "period_days": days,
        "axes": [
            {"axis": "Emails", "value": emails},
            {"axis": "Visitas", "value": visits_count},
            {"axis": "Llamadas", "value": calls},
            {"axis": "Acciones", "value": actions_completed},
            {"axis": "Deals", "value": deals},
            {"axis": "Leads", "value": leads_created},
        ],
    }


@router.get("/sankey")
async def pipeline_sankey(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Sankey diagram data: lead flow through pipeline stages."""
    stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]

    # Count transitions: how many leads are in each status
    nodes = []
    for i, stage in enumerate(stages):
        try:
            count = (await db.execute(
                select(func.count(Lead.id)).where(Lead.status == LeadStatus(stage))
            )).scalar() or 0
        except ValueError:
            count = 0
        nodes.append({"id": i, "name": stage, "count": count})

    # Build links between consecutive stages (simplified: all leads in stage N came from N-1)
    links = []
    for i in range(len(stages) - 1):
        source_count = nodes[i]["count"]
        target_count = nodes[i + 1]["count"]
        if source_count > 0 or target_count > 0:
            # Estimate flow as min of source/target or target count
            value = target_count if target_count > 0 else 0
            if value > 0:
                links.append({"source": i, "target": i + 1, "value": value})

    return {"nodes": nodes, "links": links}


@router.get("/attribution")
async def channel_attribution(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Treemap: fuentes de leads por cantidad."""
    from app.models.enums import LeadSource

    result = await db.execute(
        select(Lead.source, func.count(Lead.id))
        .where(Lead.source.isnot(None))
        .group_by(Lead.source)
    )

    sources = []
    for source, count in result.all():
        name = source.value if hasattr(source, 'value') else str(source)
        sources.append({"name": name, "value": count})

    # Sort by value descending
    sources.sort(key=lambda x: x["value"], reverse=True)

    return {"sources": sources, "total": sum(s["value"] for s in sources)}


@router.get("/campaign-roi")
async def campaign_roi_bubble(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Bubble chart: campaigns by budget, leads, ROI."""
    from app.models.marketing import Campaign

    campaigns = await db.execute(select(Campaign).limit(30))

    bubbles = []
    for c in campaigns.scalars().all():
        budget = float(c.budget_total or 0)
        actual = float(c.actual_budget or 0)
        leads_goal = c.leads_goal or 0
        if budget > 0 or leads_goal > 0:
            roi = round((actual / budget - 1) * 100, 1) if budget > 0 and actual > 0 else 0
            bubbles.append({
                "name": c.name,
                "budget": budget,
                "actual_budget": actual,
                "leads_goal": leads_goal,
                "roi": roi,
                "status": c.status.value if c.status else "draft",
                "channel": c.channel.value if hasattr(c, 'channel') and c.channel else "",
            })

    return {"campaigns": bubbles}
