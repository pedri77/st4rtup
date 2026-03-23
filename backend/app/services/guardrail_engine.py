"""GuardrailEngine — evaluador de costes en tiempo real.

Niveles:
- OK: < warn_pct → pipeline normal
- WARN: ≥ warn_pct → notificación
- CUT: ≥ cut_pct → bloqueo automático
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract

from app.models.cost import CostEvent, BudgetCap, GuardrailLog

logger = logging.getLogger(__name__)


class GuardrailResult:
    OK = "ok"
    WARN = "warn"
    CUT = "cut"


async def evaluate(
    db: AsyncSession,
    tool_id: str,
    estimated_cost: float = 0,
) -> dict:
    """Evalúa si una operación debe proceder según el presupuesto.

    Returns:
        {"result": "ok"|"warn"|"cut", "current": float, "cap": float, "pct": float}
    """
    # Get budget cap
    cap_row = await db.scalar(
        select(BudgetCap).where(BudgetCap.tool_id == tool_id, BudgetCap.is_active == True)  # noqa: E712
    )
    if not cap_row:
        return {"result": GuardrailResult.OK, "current": 0, "cap": 0, "pct": 0, "no_cap": True}

    # Get current month spend
    now = datetime.now(timezone.utc)
    current_spend = await db.scalar(
        select(func.coalesce(func.sum(CostEvent.amount), 0)).where(
            CostEvent.tool_id == tool_id,
            extract('month', CostEvent.created_at) == now.month,
            extract('year', CostEvent.created_at) == now.year,
        )
    ) or 0

    projected = float(current_spend) + estimated_cost
    pct = (projected / cap_row.monthly_cap * 100) if cap_row.monthly_cap > 0 else 0

    if pct >= cap_row.cut_pct:
        result = GuardrailResult.CUT
        action = f"BLOCKED: {tool_id} at {pct:.1f}% (cut threshold: {cap_row.cut_pct}%)"
    elif pct >= cap_row.warn_pct:
        result = GuardrailResult.WARN
        action = f"WARNING: {tool_id} at {pct:.1f}% (warn threshold: {cap_row.warn_pct}%)"
    else:
        result = GuardrailResult.OK
        action = None

    # Log evaluation
    log_entry = GuardrailLog(
        tool_id=tool_id,
        level=result,
        current_spend=projected,
        cap_amount=cap_row.monthly_cap,
        percentage=round(pct, 1),
        action_taken=action,
    )
    db.add(log_entry)
    await db.commit()

    return {
        "result": result,
        "current": round(float(current_spend), 2),
        "projected": round(projected, 2),
        "cap": cap_row.monthly_cap,
        "pct": round(pct, 1),
        "action": action,
    }


async def get_monthly_summary(db: AsyncSession) -> dict:
    """Resumen de costes del mes actual por herramienta."""
    now = datetime.now(timezone.utc)

    # Current month costs by tool
    q = select(
        CostEvent.tool_id,
        func.sum(CostEvent.amount).label("total"),
        func.count(CostEvent.id).label("events"),
    ).where(
        extract('month', CostEvent.created_at) == now.month,
        extract('year', CostEvent.created_at) == now.year,
    ).group_by(CostEvent.tool_id)

    result = (await db.execute(q)).all()

    # Get all caps
    caps = (await db.execute(select(BudgetCap).where(BudgetCap.is_active == True))).scalars().all()  # noqa: E712
    cap_map = {c.tool_id: c for c in caps}

    tools = []
    total_spent = 0
    total_cap = 0

    for row in result:
        tool_id = row[0]
        spent = float(row[1])
        total_spent += spent
        cap = cap_map.get(tool_id)
        cap_amount = cap.monthly_cap if cap else 0
        total_cap += cap_amount
        pct = (spent / cap_amount * 100) if cap_amount > 0 else 0

        level = GuardrailResult.OK
        if cap and pct >= cap.cut_pct:
            level = GuardrailResult.CUT
        elif cap and pct >= cap.warn_pct:
            level = GuardrailResult.WARN

        tools.append({
            "tool_id": tool_id,
            "tool_name": cap.tool_name if cap else tool_id,
            "spent": round(spent, 2),
            "cap": cap_amount,
            "pct": round(pct, 1),
            "level": level,
            "events": row[2],
        })

    # Add tools with caps but no spend
    for cap in caps:
        if cap.tool_id not in [t["tool_id"] for t in tools]:
            total_cap += cap.monthly_cap
            tools.append({
                "tool_id": cap.tool_id,
                "tool_name": cap.tool_name,
                "spent": 0,
                "cap": cap.monthly_cap,
                "pct": 0,
                "level": GuardrailResult.OK,
                "events": 0,
            })

    tools.sort(key=lambda x: x["pct"], reverse=True)

    return {
        "month": now.strftime("%Y-%m"),
        "total_spent": round(total_spent, 2),
        "total_cap": round(total_cap, 2),
        "total_pct": round(total_spent / total_cap * 100, 1) if total_cap > 0 else 0,
        "tools": tools,
    }


async def record_cost(
    db: AsyncSession,
    tool_id: str,
    amount: float,
    category: str = "",
    description: str = "",
) -> dict:
    """Registra un evento de coste."""
    event = CostEvent(
        tool_id=tool_id,
        amount=amount,
        category=category,
        description=description,
    )
    db.add(event)
    await db.commit()

    # Auto-evaluate guardrail
    guardrail = await evaluate(db, tool_id)

    return {"recorded": True, "event_id": str(event.id), "guardrail": guardrail}
