"""Endpoint de reportes avanzados para el CRM."""
from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    Lead, LeadStatus, Action, ActionStatus,
    Opportunity, Email, Visit, Offer, OfferStatus, OpportunityStage,
)

router = APIRouter()


@router.get("/sales-performance")
async def sales_performance(
    period: str = Query("last_30", pattern="^(last_7|last_30|last_90|this_month|last_month|this_year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rendimiento de ventas: ofertas, pipeline, conversion, ingresos."""
    now = datetime.now(timezone.utc)
    start, end = _get_date_range(period, now)

    # Offers stats
    offers_q = select(
        func.count(Offer.id).label("total"),
        func.sum(case((Offer.status == OfferStatus.ACCEPTED, 1), else_=0)).label("accepted"),
        func.sum(case((Offer.status == OfferStatus.REJECTED, 1), else_=0)).label("rejected"),
        func.sum(case((Offer.status == OfferStatus.SENT, 1), else_=0)).label("sent"),
        func.sum(Offer.total).label("total_value"),
        func.sum(case((Offer.status == OfferStatus.ACCEPTED, Offer.total), else_=0)).label("won_value"),
    ).where(Offer.created_at >= start, Offer.created_at <= end)
    offers_result = (await db.execute(offers_q)).one()

    # Pipeline stats
    pipeline_q = select(
        Opportunity.stage,
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0),
    ).group_by(Opportunity.stage)
    pipeline_result = (await db.execute(pipeline_q)).all()
    pipeline_by_stage = [
        {"stage": str(row[0].value) if row[0] else "unknown", "count": row[1], "value": float(row[2])}
        for row in pipeline_result
    ]

    # Leads stats in period
    leads_q = select(
        func.count(Lead.id),
        func.sum(case((Lead.status == LeadStatus.QUALIFIED, 1), else_=0)),
    ).where(Lead.created_at >= start, Lead.created_at <= end)
    leads_result = (await db.execute(leads_q)).one()

    total_offers = offers_result[0] or 0
    accepted = offers_result[1] or 0
    conversion_rate = round((accepted / total_offers * 100) if total_offers > 0 else 0, 1)

    return {
        "period": period,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "offers": {
            "total": total_offers,
            "accepted": accepted,
            "rejected": offers_result[2] or 0,
            "sent": offers_result[3] or 0,
            "total_value": float(offers_result[4] or 0),
            "won_value": float(offers_result[5] or 0),
            "conversion_rate": conversion_rate,
        },
        "pipeline": {
            "by_stage": pipeline_by_stage,
            "total_value": sum(s["value"] for s in pipeline_by_stage),
        },
        "leads": {
            "new": leads_result[0] or 0,
            "qualified": leads_result[1] or 0,
        },
    }


@router.get("/conversion-funnel")
async def conversion_funnel(
    period: str = Query("last_30", pattern="^(last_7|last_30|last_90|this_month|last_month|this_year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Embudo de conversion: leads → qualified → opportunity → offer → won."""
    now = datetime.now(timezone.utc)
    start, end = _get_date_range(period, now)

    # Total leads
    total_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= start, Lead.created_at <= end)
    )).scalar() or 0

    # Qualified leads
    qualified = (await db.execute(
        select(func.count(Lead.id)).where(
            Lead.created_at >= start, Lead.created_at <= end,
            Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION, LeadStatus.WON])
        )
    )).scalar() or 0

    # Opportunities
    opportunities = (await db.execute(
        select(func.count(Opportunity.id)).where(Opportunity.created_at >= start, Opportunity.created_at <= end)
    )).scalar() or 0

    # Offers sent
    offers_sent = (await db.execute(
        select(func.count(Offer.id)).where(
            Offer.created_at >= start, Offer.created_at <= end,
            Offer.status.in_([OfferStatus.SENT, OfferStatus.ACCEPTED, OfferStatus.REJECTED])
        )
    )).scalar() or 0

    # Won
    won = (await db.execute(
        select(func.count(Offer.id)).where(
            Offer.created_at >= start, Offer.created_at <= end,
            Offer.status == OfferStatus.ACCEPTED,
        )
    )).scalar() or 0

    funnel = [
        {"stage": "Leads", "count": total_leads, "rate": 100},
        {"stage": "Cualificados", "count": qualified, "rate": round(qualified / total_leads * 100, 1) if total_leads else 0},
        {"stage": "Oportunidades", "count": opportunities, "rate": round(opportunities / total_leads * 100, 1) if total_leads else 0},
        {"stage": "Ofertas enviadas", "count": offers_sent, "rate": round(offers_sent / total_leads * 100, 1) if total_leads else 0},
        {"stage": "Ganadas", "count": won, "rate": round(won / total_leads * 100, 1) if total_leads else 0},
    ]

    return {"period": period, "funnel": funnel}


@router.get("/activity")
async def activity_report(
    period: str = Query("last_30", pattern="^(last_7|last_30|last_90|this_month|last_month|this_year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actividad comercial: emails, visitas, acciones por dia."""
    now = datetime.now(timezone.utc)
    start, end = _get_date_range(period, now)

    # Emails by day
    emails_q = select(
        func.date(Email.created_at).label("day"),
        func.count(Email.id),
    ).where(Email.created_at >= start, Email.created_at <= end).group_by("day").order_by("day")
    emails_result = (await db.execute(emails_q)).all()

    # Visits by day
    visits_q = select(
        func.date(Visit.visit_date).label("day"),
        func.count(Visit.id),
    ).where(Visit.visit_date >= start, Visit.visit_date <= end).group_by("day").order_by("day")
    visits_result = (await db.execute(visits_q)).all()

    # Actions completed by day
    actions_q = select(
        func.date(Action.updated_at).label("day"),
        func.count(Action.id),
    ).where(
        Action.updated_at >= start, Action.updated_at <= end,
        Action.status == ActionStatus.COMPLETED,
    ).group_by("day").order_by("day")
    actions_result = (await db.execute(actions_q)).all()

    # Totals
    total_emails = (await db.execute(
        select(func.count(Email.id)).where(Email.created_at >= start, Email.created_at <= end)
    )).scalar() or 0
    total_visits = (await db.execute(
        select(func.count(Visit.id)).where(Visit.visit_date >= start, Visit.visit_date <= end)
    )).scalar() or 0
    total_actions = (await db.execute(
        select(func.count(Action.id)).where(Action.created_at >= start, Action.created_at <= end)
    )).scalar() or 0
    actions_completed = (await db.execute(
        select(func.count(Action.id)).where(
            Action.updated_at >= start, Action.updated_at <= end,
            Action.status == ActionStatus.COMPLETED,
        )
    )).scalar() or 0

    return {
        "period": period,
        "totals": {
            "emails": total_emails,
            "visits": total_visits,
            "actions": total_actions,
            "actions_completed": actions_completed,
        },
        "daily": {
            "emails": [{"date": str(r[0]), "count": r[1]} for r in emails_result],
            "visits": [{"date": str(r[0]), "count": r[1]} for r in visits_result],
            "actions_completed": [{"date": str(r[0]), "count": r[1]} for r in actions_result],
        },
    }


@router.get("/top-accounts")
async def top_accounts(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Top cuentas por valor de pipeline y ofertas."""
    # Subquery for offer stats (avoids N+1 loop)
    offer_sub = select(
        Offer.lead_id,
        func.count(Offer.id).label("offer_count"),
        func.coalesce(func.sum(case((Offer.status == OfferStatus.ACCEPTED, Offer.total), else_=0)), 0).label("won_value"),
    ).group_by(Offer.lead_id).subquery()

    q = select(
        Lead.id,
        Lead.company_name,
        Lead.status,
        Lead.score,
        func.coalesce(func.sum(Opportunity.value), 0).label("pipeline_value"),
        func.count(Opportunity.id).label("opportunity_count"),
        func.coalesce(offer_sub.c.offer_count, 0),
        func.coalesce(offer_sub.c.won_value, 0),
    ).outerjoin(Opportunity, Opportunity.lead_id == Lead.id
    ).outerjoin(offer_sub, offer_sub.c.lead_id == Lead.id
    ).group_by(
        Lead.id, Lead.company_name, Lead.status, Lead.score,
        offer_sub.c.offer_count, offer_sub.c.won_value,
    ).order_by(func.sum(Opportunity.value).desc().nullslast()).limit(limit)

    result = (await db.execute(q)).all()

    accounts = [
        {
            "id": str(row[0]),
            "company_name": row[1],
            "status": str(row[2].value) if row[2] else "new",
            "score": row[3] or 0,
            "pipeline_value": float(row[4]),
            "opportunity_count": row[5],
            "offer_count": row[6],
            "won_value": float(row[7]),
        }
        for row in result
    ]

    return {"accounts": accounts}


@router.get("/leads-by-source")
async def leads_by_source(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Distribucion de leads por fuente de captacion."""
    q = select(
        Lead.source,
        func.count(Lead.id).label("count"),
        func.sum(case((Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION, LeadStatus.WON]), 1), else_=0)).label("qualified"),
    ).group_by(Lead.source).order_by(func.count(Lead.id).desc())

    result = (await db.execute(q)).all()

    return {
        "sources": [
            {
                "source": str(row[0].value) if row[0] else "unknown",
                "count": row[1],
                "qualified": row[2] or 0,
                "conversion_rate": round((row[2] or 0) / row[1] * 100, 1) if row[1] > 0 else 0,
            }
            for row in result
        ]
    }


@router.get("/export-csv")
async def export_crm_csv(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Exporta todos los leads + oportunidades como CSV."""
    from fastapi.responses import Response
    import io
    import csv

    leads_result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = leads_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Empresa', 'Contacto', 'Email', 'Cargo', 'Estado', 'Score', 'Sector', 'País', 'Fuente', 'Canal', 'Creado'])

    for lead in leads:
        writer.writerow([
            str(lead.id), lead.company_name, lead.contact_name, lead.contact_email,
            lead.contact_title, lead.status.value if lead.status else '', lead.score or 0,
            lead.company_sector, lead.company_country, lead.source.value if lead.source else '',
            lead.acquisition_channel or '', lead.created_at.strftime('%Y-%m-%d') if lead.created_at else '',
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content.encode('utf-8-sig'),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="st4rtup_crm_export_{datetime.now(timezone.utc).strftime("%Y%m%d")}.csv"'},
    )


@router.get("/roi-by-channel")
async def roi_by_channel(
    period: str = Query("last_90", pattern="^(last_30|last_90|this_year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """ROI por canal de captación — leads, oportunidades y valor por fuente."""
    now = datetime.now(timezone.utc)
    start, end = _get_date_range(period, now)

    # Leads by source with opportunity values
    q = select(
        Lead.source,
        func.count(Lead.id).label("leads"),
        func.sum(case((Lead.status == LeadStatus.WON, 1), else_=0)).label("won"),
    ).where(Lead.created_at >= start).group_by(Lead.source)

    result = (await db.execute(q)).all()

    # Opportunity values by lead source
    opp_q = select(
        Lead.source,
        func.coalesce(func.sum(Opportunity.value), 0).label("pipeline_value"),
        func.sum(case(
            (Opportunity.stage == OpportunityStage.CLOSED_WON, Opportunity.value),
            else_=0,
        )).label("won_value"),
    ).join(Opportunity, Opportunity.lead_id == Lead.id).where(
        Lead.created_at >= start
    ).group_by(Lead.source)

    opp_result = (await db.execute(opp_q)).all()
    opp_map = {str(r[0].value) if r[0] else "unknown": {"pipeline": float(r[1]), "won": float(r[2])} for r in opp_result}

    channels = []
    for row in result:
        source = str(row[0].value) if row[0] else "unknown"
        leads = row[1]
        won = row[2] or 0
        opp_data = opp_map.get(source, {"pipeline": 0, "won": 0})
        conv_rate = round(won / leads * 100, 1) if leads > 0 else 0

        channels.append({
            "channel": source,
            "leads": leads,
            "won": won,
            "conversion_rate": conv_rate,
            "pipeline_value": round(opp_data["pipeline"], 2),
            "won_value": round(opp_data["won"], 2),
            "cpl": 0,  # Requires cost data from MOD-COST-001
        })

    channels.sort(key=lambda x: x["won_value"], reverse=True)
    return {"channels": channels, "period": period}


@router.get("/pipeline-velocity")
async def pipeline_velocity(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Pipeline velocity — tiempo medio por etapa y velocidad de cierre."""
    # Average deal cycle (created → won)
    won_q = select(
        func.avg(
            func.extract('epoch', Opportunity.updated_at) - func.extract('epoch', Opportunity.created_at)
        ).label("avg_cycle_seconds"),
        func.count(Opportunity.id).label("total_won"),
        func.coalesce(func.avg(Opportunity.value), 0).label("avg_deal_value"),
    ).where(Opportunity.stage == OpportunityStage.CLOSED_WON)

    won_result = (await db.execute(won_q)).one()
    avg_cycle_days = round(float(won_result[0] or 0) / 86400, 1)
    total_won = won_result[1]
    avg_deal_value = round(float(won_result[2]), 2)

    # Active pipeline
    active_q = select(
        func.count(Opportunity.id).label("active_deals"),
        func.coalesce(func.sum(Opportunity.value), 0).label("active_value"),
    ).where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]))

    active_result = (await db.execute(active_q)).one()

    # Pipeline velocity = (deals * avg_value * win_rate) / cycle_time
    total_opps = await db.scalar(select(func.count()).select_from(Opportunity)) or 1
    win_rate = round(total_won / total_opps * 100, 1) if total_opps > 0 else 0
    velocity = round((active_result[0] * avg_deal_value * (win_rate / 100)) / max(avg_cycle_days, 1), 2)

    return {
        "avg_cycle_days": avg_cycle_days,
        "total_won": total_won,
        "avg_deal_value": avg_deal_value,
        "win_rate": win_rate,
        "active_deals": active_result[0],
        "active_pipeline_value": round(float(active_result[1]), 2),
        "velocity_per_day": velocity,
    }


@router.get("/lead-cohorts")
async def lead_cohorts(
    months: int = Query(6, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Análisis de cohortes — leads agrupados por mes de captación con evolución de estado."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=months * 30)

    q = select(
        func.date_trunc('month', Lead.created_at).label("cohort"),
        Lead.status,
        func.count(Lead.id).label("count"),
    ).where(Lead.created_at >= start).group_by(
        func.date_trunc('month', Lead.created_at), Lead.status
    ).order_by(func.date_trunc('month', Lead.created_at))

    result = (await db.execute(q)).all()

    cohorts = {}
    for row in result:
        month_str = row[0].strftime("%Y-%m") if row[0] else "unknown"
        status = row[1].value if row[1] else "unknown"
        if month_str not in cohorts:
            cohorts[month_str] = {"month": month_str, "total": 0, "statuses": {}}
        cohorts[month_str]["statuses"][status] = row[2]
        cohorts[month_str]["total"] += row[2]

    return {"cohorts": list(cohorts.values()), "months": months}


def _get_date_range(period: str, now: datetime) -> tuple:
    """Calcula rango de fechas segun periodo."""
    if period == "last_7":
        start = now - timedelta(days=7)
    elif period == "last_30":
        start = now - timedelta(days=30)
    elif period == "last_90":
        start = now - timedelta(days=90)
    elif period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "last_month":
        first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start = (first_this_month - timedelta(days=1)).replace(day=1)
        now = first_this_month - timedelta(seconds=1)
    elif period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=30)

    return start, now


# ═══════════════════════════════════════════════════════════════
# PDF Report Downloads
# ═══════════════════════════════════════════════════════════════


@router.get("/pipeline/pdf")
async def download_pipeline_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Descarga reporte de pipeline en PDF."""
    from fastapi.responses import Response as FastResponse
    from app.services.pdf_report_generator import generate_pipeline_report

    # Gather data
    open_q = select(
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0),
    ).where(Opportunity.stage.notin_(["closed_won", "closed_lost"]))
    open_row = (await db.execute(open_q)).one()

    weighted_q = select(
        func.coalesce(func.sum(Opportunity.value * Opportunity.probability / 100), 0),
    ).where(Opportunity.stage.notin_(["closed_won", "closed_lost"]))
    weighted = (await db.execute(weighted_q)).scalar() or 0

    won_count = (await db.execute(
        select(func.count(Opportunity.id)).where(Opportunity.stage == "closed_won")
    )).scalar() or 0
    lost_count = (await db.execute(
        select(func.count(Opportunity.id)).where(Opportunity.stage == "closed_lost")
    )).scalar() or 0
    total_closed = won_count + lost_count
    win_rate = (won_count / total_closed * 100) if total_closed > 0 else 0

    avg_deal = float(open_row[1]) / max(open_row[0], 1)

    # By stage
    stage_q = select(
        Opportunity.stage,
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0),
        func.coalesce(func.avg(Opportunity.probability), 0),
    ).where(
        Opportunity.stage.notin_(["closed_won", "closed_lost"]),
    ).group_by(Opportunity.stage)
    stage_rows = (await db.execute(stage_q)).all()

    # Top deals
    top_q = select(Opportunity, Lead.company_name).outerjoin(
        Lead, Opportunity.lead_id == Lead.id
    ).where(
        Opportunity.stage.notin_(["closed_won", "closed_lost"]),
    ).order_by(Opportunity.value.desc()).limit(10)
    top_rows = (await db.execute(top_q)).all()

    report_data = {
        "open_deals": open_row[0],
        "total_value": float(open_row[1]),
        "weighted_value": float(weighted),
        "win_rate": win_rate,
        "avg_deal_size": avg_deal,
        "by_stage": [
            {"stage": r[0], "count": r[1], "value": float(r[2]), "avg_probability": float(r[3])}
            for r in stage_rows
        ],
        "top_deals": [
            {"company": r[1] or "?", "value": float(r[0].value or 0), "stage": r[0].stage, "probability": r[0].probability or 0}
            for r in top_rows
        ],
    }

    pdf_bytes = generate_pipeline_report(report_data)
    filename = f"pipeline_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/activity/pdf")
async def download_activity_pdf(
    period: str = Query("last_30", pattern="^(last_7|last_30|last_90)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Descarga reporte de actividad en PDF."""
    from fastapi.responses import Response as FastResponse
    from app.services.pdf_report_generator import generate_activity_report

    now = datetime.now(timezone.utc)
    start, end = _get_date_range(period, now)

    new_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= start, Lead.created_at <= end)
    )).scalar() or 0

    visits_count = (await db.execute(
        select(func.count(Visit.id)).where(Visit.created_at >= start, Visit.created_at <= end)
    )).scalar() or 0

    emails_count = (await db.execute(
        select(func.count(Email.id)).where(Email.created_at >= start, Email.created_at <= end)
    )).scalar() or 0

    actions_done = (await db.execute(
        select(func.count(Action.id)).where(
            Action.status == ActionStatus.COMPLETED,
            Action.created_at >= start, Action.created_at <= end,
        )
    )).scalar() or 0

    deals_won = (await db.execute(
        select(func.count(Opportunity.id)).where(
            Opportunity.stage == "closed_won",
            Opportunity.updated_at >= start, Opportunity.updated_at <= end,
        )
    )).scalar() or 0

    revenue = (await db.execute(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage == "closed_won",
            Opportunity.updated_at >= start, Opportunity.updated_at <= end,
        )
    )).scalar() or 0

    period_labels = {"last_7": "Últimos 7 días", "last_30": "Últimos 30 días", "last_90": "Últimos 90 días"}

    report_data = {
        "period": period_labels.get(period, period),
        "new_leads": new_leads,
        "visits": visits_count,
        "emails_sent": emails_count,
        "actions_completed": actions_done,
        "deals_won": deals_won,
        "revenue": float(revenue),
    }

    pdf_bytes = generate_activity_report(report_data)
    filename = f"activity_report_{period}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════
# Activity Feed (timeline de un lead)
# ═══════════════════════════════════════════════════════════════


@router.get("/lead/{lead_id}/activity-feed")
async def lead_activity_feed(
    lead_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Timeline unificado de toda la actividad de un lead."""
    from sqlalchemy import union_all, literal_column, cast, String
    from uuid import UUID as PyUUID

    events = []

    # Emails
    email_rows = (await db.execute(
        select(Email.id, Email.subject, Email.status, Email.created_at)
        .where(Email.lead_id == lead_id)
        .order_by(Email.created_at.desc()).limit(limit)
    )).all()
    for e in email_rows:
        events.append({
            "type": "email", "id": str(e[0]),
            "title": e[1] or "(sin asunto)",
            "detail": e[2],
            "timestamp": e[3].isoformat() if e[3] else None,
            "icon": "mail",
        })

    # Visits
    visit_rows = (await db.execute(
        select(Visit.id, Visit.visit_type, Visit.result, Visit.summary, Visit.created_at)
        .where(Visit.lead_id == lead_id)
        .order_by(Visit.created_at.desc()).limit(limit)
    )).all()
    for v in visit_rows:
        events.append({
            "type": "visit", "id": str(v[0]),
            "title": f"Visita: {v[1]}",
            "detail": v[2] or "",
            "notes": (v[3] or "")[:200],
            "timestamp": v[4].isoformat() if v[4] else None,
            "icon": "calendar",
        })

    # Actions
    action_rows = (await db.execute(
        select(Action.id, Action.description, Action.status, Action.priority, Action.created_at)
        .where(Action.lead_id == lead_id)
        .order_by(Action.created_at.desc()).limit(limit)
    )).all()
    for a in action_rows:
        events.append({
            "type": "action", "id": str(a[0]),
            "title": (a[1] or "")[:100],
            "detail": f"{a[2]} · {a[3]}",
            "timestamp": a[4].isoformat() if a[4] else None,
            "icon": "check",
        })

    # Opportunities
    opp_rows = (await db.execute(
        select(Opportunity.id, Opportunity.stage, Opportunity.value, Opportunity.probability, Opportunity.created_at)
        .where(Opportunity.lead_id == lead_id)
        .order_by(Opportunity.created_at.desc()).limit(limit)
    )).all()
    for o in opp_rows:
        events.append({
            "type": "opportunity", "id": str(o[0]),
            "title": f"Oportunidad: {float(o[2] or 0):,.0f} EUR",
            "detail": f"{o[1]} · {o[3] or 0}% prob",
            "timestamp": o[4].isoformat() if o[4] else None,
            "icon": "trending-up",
        })

    # Offers
    offer_rows = (await db.execute(
        select(Offer.id, Offer.title, Offer.status, Offer.total_amount, Offer.created_at)
        .where(Offer.lead_id == lead_id)
        .order_by(Offer.created_at.desc()).limit(limit)
    )).all()
    for of in offer_rows:
        events.append({
            "type": "offer", "id": str(of[0]),
            "title": of[1] or "Oferta",
            "detail": f"{of[2]} · {float(of[3] or 0):,.0f} EUR",
            "timestamp": of[4].isoformat() if of[4] else None,
            "icon": "file-text",
        })

    # Sort all by timestamp desc
    events.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    return {
        "lead_id": str(lead_id),
        "events": events[:limit],
        "total": len(events),
    }
