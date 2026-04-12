"""Sprint B — Chat Context Builder.

Construye un contexto de negocio del usuario para inyectar en el system prompt
del chat. El asistente conoce los leads, pipeline, metricas y actividad reciente.
"""
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case

from app.models.lead import Lead
from app.models.pipeline import Opportunity
from app.models.crm import Visit, Email, Action
from app.models.contact import Contact

logger = logging.getLogger(__name__)


async def build_business_context(db: AsyncSession, user_id: UUID) -> str:
    """Construye contexto de negocio completo para el system prompt del chat."""
    sections = []

    try:
        sections.append(await _pipeline_summary(db))
    except Exception as e:
        logger.debug("Pipeline context error: %s", e)

    try:
        sections.append(await _leads_summary(db))
    except Exception as e:
        logger.debug("Leads context error: %s", e)

    try:
        sections.append(await _recent_activity(db))
    except Exception as e:
        logger.debug("Activity context error: %s", e)

    try:
        sections.append(await _top_deals(db))
    except Exception as e:
        logger.debug("Deals context error: %s", e)

    try:
        sections.append(await _stalled_deals(db))
    except Exception as e:
        logger.debug("Stalled deals error: %s", e)

    context = "\n\n".join([s for s in sections if s])

    if not context:
        return ""

    return (
        "\n\n--- CONTEXTO DE NEGOCIO DEL USUARIO (datos reales de su CRM) ---\n\n"
        f"{context}\n\n"
        "--- FIN CONTEXTO ---\n\n"
        "Usa estos datos para responder preguntas sobre leads, pipeline, oportunidades y actividad. "
        "Cuando el usuario pregunte por un deal o lead concreto, busca en los datos anteriores. "
        "Si no tienes datos suficientes, dilo. Nunca inventes datos."
    )


async def _pipeline_summary(db: AsyncSession) -> str:
    """Resumen del pipeline: oportunidades por stage + valor total."""
    q = select(
        Opportunity.stage,
        func.count(Opportunity.id).label("count"),
        func.coalesce(func.sum(Opportunity.value), 0).label("total_value"),
    ).where(
        Opportunity.stage.notin_(["closed_won", "closed_lost"]),
    ).group_by(Opportunity.stage)

    rows = (await db.execute(q)).all()
    if not rows:
        return ""

    total_value = sum(float(r.total_value) for r in rows)
    total_deals = sum(r.count for r in rows)

    lines = [f"PIPELINE: {total_deals} oportunidades abiertas, valor total {total_value:,.0f} EUR"]
    for r in rows:
        lines.append(f"  - {r.stage}: {r.count} deals ({float(r.total_value):,.0f} EUR)")

    # Win rate
    won = (await db.execute(
        select(func.count(Opportunity.id)).where(Opportunity.stage == "closed_won")
    )).scalar() or 0
    lost = (await db.execute(
        select(func.count(Opportunity.id)).where(Opportunity.stage == "closed_lost")
    )).scalar() or 0
    total_closed = won + lost
    if total_closed > 0:
        lines.append(f"  Win rate: {won}/{total_closed} ({won/total_closed*100:.0f}%)")

    return "\n".join(lines)


async def _leads_summary(db: AsyncSession) -> str:
    """Resumen de leads por status."""
    q = select(
        Lead.status,
        func.count(Lead.id).label("count"),
    ).group_by(Lead.status)

    rows = (await db.execute(q)).all()
    if not rows:
        return ""

    total = sum(r.count for r in rows)
    lines = [f"LEADS: {total} leads totales"]
    for r in sorted(rows, key=lambda x: x.count, reverse=True):
        lines.append(f"  - {r.status}: {r.count}")

    # Average score
    avg = (await db.execute(
        select(func.avg(Lead.score)).where(Lead.score > 0)
    )).scalar()
    if avg:
        lines.append(f"  Score medio: {avg:.0f}/100")

    return "\n".join(lines)


async def _recent_activity(db: AsyncSession) -> str:
    """Actividad de los ultimos 7 dias."""
    since = datetime.now(timezone.utc) - timedelta(days=7)

    visits = (await db.execute(
        select(func.count(Visit.id)).where(Visit.created_at >= since)
    )).scalar() or 0
    emails = (await db.execute(
        select(func.count(Email.id)).where(Email.created_at >= since)
    )).scalar() or 0
    actions = (await db.execute(
        select(func.count(Action.id)).where(Action.created_at >= since)
    )).scalar() or 0
    new_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= since)
    )).scalar() or 0

    if not any([visits, emails, actions, new_leads]):
        return ""

    return (
        f"ACTIVIDAD ULTIMOS 7 DIAS: "
        f"{new_leads} leads nuevos, {visits} visitas, {emails} emails, {actions} acciones"
    )


async def _top_deals(db: AsyncSession) -> str:
    """Top 5 deals abiertos por valor."""
    q = select(Opportunity).where(
        Opportunity.stage.notin_(["closed_won", "closed_lost"]),
    ).order_by(desc(Opportunity.value)).limit(5)

    rows = (await db.execute(q)).scalars().all()
    if not rows:
        return ""

    lines = ["TOP DEALS ABIERTOS:"]
    for opp in rows:
        lead_name = ""
        if opp.lead_id:
            lead = (await db.execute(
                select(Lead.company_name).where(Lead.id == opp.lead_id)
            )).scalar()
            lead_name = lead or "?"
        lines.append(
            f"  - {lead_name}: {float(opp.value or 0):,.0f} EUR "
            f"({opp.stage}, prob {opp.probability or 0}%)"
        )

    return "\n".join(lines)


async def _stalled_deals(db: AsyncSession) -> str:
    """Deals sin actividad en 14+ dias."""
    threshold = datetime.now(timezone.utc) - timedelta(days=14)

    q = select(Opportunity).where(
        Opportunity.stage.notin_(["closed_won", "closed_lost"]),
        Opportunity.updated_at < threshold,
    ).order_by(Opportunity.updated_at).limit(5)

    rows = (await db.execute(q)).scalars().all()
    if not rows:
        return ""

    lines = ["DEALS ESTANCADOS (>14 dias sin actividad):"]
    for opp in rows:
        lead_name = ""
        if opp.lead_id:
            lead = (await db.execute(
                select(Lead.company_name).where(Lead.id == opp.lead_id)
            )).scalar()
            lead_name = lead or "?"
        days_stalled = (datetime.now(timezone.utc) - opp.updated_at).days if opp.updated_at else 0
        lines.append(
            f"  - {lead_name}: {float(opp.value or 0):,.0f} EUR "
            f"({opp.stage}, {days_stalled} dias sin actividad)"
        )

    return "\n".join(lines)


async def get_lead_context_for_chat(db: AsyncSession, lead_id: UUID) -> str:
    """Contexto detallado de un lead especifico para el chat."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        return ""

    lines = [
        f"LEAD: {lead.company_name}",
        f"  Contacto: {lead.contact_name} ({lead.contact_email})",
        f"  Status: {lead.status} | Score: {lead.score or 0}/100",
        f"  Sector: {lead.sector or '?'} | Tamano: {lead.company_size or '?'}",
        f"  Fuente: {lead.source or '?'}",
    ]

    if lead.enrichment_data and isinstance(lead.enrichment_data, dict):
        scoring = lead.enrichment_data.get("agent_scoring", {})
        if scoring:
            lines.append(f"  ICP Tier: {scoring.get('tier', '?')} | Accion: {scoring.get('recommended_action', '?')}")
            lines.append(f"  Razonamiento: {scoring.get('reasoning', '')[:200]}")

    # Opportunities
    opps = (await db.execute(
        select(Opportunity).where(Opportunity.lead_id == lead_id)
    )).scalars().all()
    if opps:
        lines.append(f"  Oportunidades: {len(opps)}")
        for o in opps:
            lines.append(f"    - {o.stage}: {float(o.value or 0):,.0f} EUR (prob {o.probability or 0}%)")

    # Recent emails
    recent_emails = (await db.execute(
        select(Email.subject, Email.status, Email.created_at)
        .where(Email.lead_id == lead_id)
        .order_by(desc(Email.created_at)).limit(3)
    )).all()
    if recent_emails:
        lines.append(f"  Emails recientes:")
        for e in recent_emails:
            lines.append(f"    - {e.subject or '(sin asunto)'} [{e.status}]")

    # Recent visits
    recent_visits = (await db.execute(
        select(Visit.visit_type, Visit.result, Visit.created_at)
        .where(Visit.lead_id == lead_id)
        .order_by(desc(Visit.created_at)).limit(3)
    )).all()
    if recent_visits:
        lines.append(f"  Visitas recientes:")
        for v in recent_visits:
            lines.append(f"    - {v.visit_type}: {v.result}")

    return "\n".join(lines)
