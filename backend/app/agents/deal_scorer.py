"""AGENT-DEAL-001 — Deal Quality Scorer.

Evalua la calidad de una oportunidad combinando ICP score del lead,
historial de interacciones, y datos del deal para generar un deal_score
y recomendaciones.
"""
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.agents.registry import AgentDefinition, agent_registry
from app.agents.audit import audit_trail

logger = logging.getLogger(__name__)

AGENT_DEF = AgentDefinition(
    id="AGENT-DEAL-001",
    name="Deal Quality Scorer",
    model="auto",
    description="Evalua calidad de oportunidades combinando ICP, BANT, interacciones y datos del deal",
    version="1.0.0",
    cost_per_run=0.001,
    metadata={"scoring_method": "weighted_composite"},
)

agent_registry.register(AGENT_DEF)


async def score_deal(db: AsyncSession, opportunity_id: UUID) -> dict:
    """Calcula deal_score para una oportunidad.

    Scoring formula (100 puntos max):
    - ICP score del lead (0-30 pts)
    - Interacciones (0-25 pts): visitas, emails, acciones
    - Deal data (0-25 pts): valor, stage progression, probability
    - Engagement recency (0-20 pts): actividad reciente
    """
    from app.models.pipeline import Opportunity
    from app.models.lead import Lead
    from app.models.crm import Visit, Email, Action
    from datetime import datetime, timedelta, timezone

    import time
    start = time.time()

    opp = (await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )).scalar_one_or_none()

    if not opp:
        return {"error": "Opportunity not found"}

    lead = None
    if opp.lead_id:
        lead = (await db.execute(
            select(Lead).where(Lead.id == opp.lead_id)
        )).scalar_one_or_none()

    # ─── 1. ICP Score (0-30 pts) ────────────────────────
    icp_raw = lead.score if lead and lead.score else 0
    icp_pts = min(30, int(icp_raw * 0.3))

    # ─── 2. Interactions (0-25 pts) ─────────────────────
    interaction_pts = 0
    if lead:
        lead_id = lead.id
        visits = (await db.execute(
            select(func.count(Visit.id)).where(Visit.lead_id == lead_id)
        )).scalar() or 0
        emails = (await db.execute(
            select(func.count(Email.id)).where(Email.lead_id == lead_id)
        )).scalar() or 0
        actions = (await db.execute(
            select(func.count(Action.id)).where(Action.lead_id == lead_id)
        )).scalar() or 0

        # More interactions = higher score, diminishing returns
        total_interactions = visits + emails + actions
        if total_interactions >= 10:
            interaction_pts = 25
        elif total_interactions >= 5:
            interaction_pts = 20
        elif total_interactions >= 3:
            interaction_pts = 15
        elif total_interactions >= 1:
            interaction_pts = 8
    else:
        visits = emails = actions = total_interactions = 0

    # ─── 3. Deal Data (0-25 pts) ────────────────────────
    deal_pts = 0

    # Value scoring (0-10)
    value = float(opp.value or 0)
    if value >= 50000:
        deal_pts += 10
    elif value >= 20000:
        deal_pts += 8
    elif value >= 10000:
        deal_pts += 5
    elif value > 0:
        deal_pts += 3

    # Stage progression (0-10)
    stage_weights = {
        "discovery": 2, "qualification": 4, "proposal": 6,
        "negotiation": 8, "closed_won": 10, "closed_lost": 0,
    }
    deal_pts += stage_weights.get(opp.stage, 0)

    # Probability (0-5)
    prob = opp.probability or 0
    deal_pts += min(5, int(prob * 0.05))

    # ─── 4. Engagement Recency (0-20 pts) ───────────────
    recency_pts = 0
    if lead:
        now = datetime.now(timezone.utc)
        # Most recent interaction
        last_visit = (await db.execute(
            select(func.max(Visit.created_at)).where(Visit.lead_id == lead.id)
        )).scalar()
        last_email = (await db.execute(
            select(func.max(Email.created_at)).where(Email.lead_id == lead.id)
        )).scalar()

        last_touch = max(filter(None, [last_visit, last_email]), default=None)
        if last_touch:
            days_since = (now - last_touch).days
            if days_since <= 3:
                recency_pts = 20
            elif days_since <= 7:
                recency_pts = 15
            elif days_since <= 14:
                recency_pts = 10
            elif days_since <= 30:
                recency_pts = 5
        days_since_touch = (now - last_touch).days if last_touch else None
    else:
        days_since_touch = None

    # ─── Total ──────────────────────────────────────────
    total_score = icp_pts + interaction_pts + deal_pts + recency_pts

    # Tier
    if total_score >= 80:
        tier = "A"
        risk = "low"
    elif total_score >= 60:
        tier = "B"
        risk = "medium"
    elif total_score >= 40:
        tier = "C"
        risk = "high"
    else:
        tier = "D"
        risk = "critical"

    # Recommendations
    recommendations = []
    if recency_pts < 10:
        recommendations.append("Contactar al lead — sin actividad reciente")
    if interaction_pts < 15:
        recommendations.append("Aumentar interacciones (visitas, emails)")
    if icp_pts < 15:
        recommendations.append("Verificar ICP fit — score bajo")
    if prob < 50 and opp.stage in ("proposal", "negotiation"):
        recommendations.append("Stage avanzado pero probabilidad baja — revisar objeciones")
    if value == 0:
        recommendations.append("Asignar valor al deal")

    duration_ms = int((time.time() - start) * 1000)

    result = {
        "deal_score": total_score,
        "tier": tier,
        "risk_level": risk,
        "breakdown": {
            "icp_score": {"points": icp_pts, "max": 30, "raw": icp_raw},
            "interactions": {
                "points": interaction_pts, "max": 25,
                "visits": visits, "emails": emails, "actions": actions,
            },
            "deal_data": {"points": deal_pts, "max": 25, "value": value, "stage": opp.stage, "probability": prob},
            "recency": {"points": recency_pts, "max": 20, "days_since_touch": days_since_touch},
        },
        "recommendations": recommendations,
        "duration_ms": duration_ms,
    }

    # Audit trail
    try:
        await audit_trail.log(
            db=db,
            agent_id="AGENT-DEAL-001",
            model="deal-scorer-v1",
            input_data={"opportunity_id": str(opportunity_id)},
            output_data=result,
            tokens_in=0,
            tokens_out=0,
            duration_ms=duration_ms,
            cost_estimate=0,
        )
    except Exception:
        pass

    return result


async def score_all_open_deals(db: AsyncSession) -> list[dict]:
    """Score all open opportunities."""
    from app.models.pipeline import Opportunity

    result = await db.execute(
        select(Opportunity.id).where(
            Opportunity.stage.notin_(["closed_won", "closed_lost"]),
        )
    )
    opp_ids = [row[0] for row in result.all()]

    results = []
    for opp_id in opp_ids:
        score_result = await score_deal(db, opp_id)
        score_result["opportunity_id"] = str(opp_id)
        results.append(score_result)

    return results
