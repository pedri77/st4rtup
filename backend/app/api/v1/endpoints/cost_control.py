"""MOD-COST-001 — Cost Control & Guardrails endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.cost import BudgetCap, GuardrailLog
from app.models.models import SystemSettings
from app.services import guardrail_engine

router = APIRouter()


# ─── Summary ──────────────────────────────────────────────────────

@router.get("/summary")
async def cost_summary(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Resumen de costes del mes actual con guardrail status por herramienta."""
    return await guardrail_engine.get_monthly_summary(db)


# ─── Evaluate ─────────────────────────────────────────────────────

@router.get("/evaluate/{tool_id}")
async def evaluate_guardrail(
    tool_id: str,
    estimated_cost: float = Query(0),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Pre-check: evalúa si una operación debe proceder según el presupuesto."""
    return await guardrail_engine.evaluate(db, tool_id, estimated_cost)


# ─── Record Cost ──────────────────────────────────────────────────

class RecordCostRequest(BaseModel):
    tool_id: str
    amount: float
    category: str = ""
    description: str = ""


@router.post("/record")
async def record_cost(
    request: RecordCostRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Registra un evento de coste + auto-evalúa guardrail."""
    return await guardrail_engine.record_cost(
        db, request.tool_id, request.amount, request.category, request.description
    )


# ─── Budget Caps CRUD ─────────────────────────────────────────────

@router.get("/caps")
async def list_caps(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Lista todos los topes de presupuesto."""
    result = await db.execute(select(BudgetCap).order_by(BudgetCap.tool_name))
    caps = result.scalars().all()
    return {
        "caps": [
            {
                "id": str(c.id),
                "tool_id": c.tool_id,
                "tool_name": c.tool_name,
                "monthly_cap": c.monthly_cap,
                "warn_pct": c.warn_pct,
                "cut_pct": c.cut_pct,
                "is_active": c.is_active,
            }
            for c in caps
        ]
    }


class UpdateCapRequest(BaseModel):
    tool_name: Optional[str] = None
    monthly_cap: Optional[float] = None
    warn_pct: Optional[int] = None
    cut_pct: Optional[int] = None
    is_active: Optional[bool] = None


@router.put("/caps/{tool_id}")
async def update_cap(
    tool_id: str,
    request: UpdateCapRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Actualiza un tope de presupuesto (sin redespliegue)."""
    result = await db.execute(select(BudgetCap).where(BudgetCap.tool_id == tool_id))
    cap = result.scalar_one_or_none()

    if not cap:
        # Create new
        cap = BudgetCap(
            tool_id=tool_id,
            tool_name=request.tool_name or tool_id,
            monthly_cap=request.monthly_cap or 0,
            warn_pct=request.warn_pct or 70,
            cut_pct=request.cut_pct or 90,
        )
        db.add(cap)
    else:
        if request.tool_name is not None:
            cap.tool_name = request.tool_name
        if request.monthly_cap is not None:
            cap.monthly_cap = request.monthly_cap
        if request.warn_pct is not None:
            cap.warn_pct = request.warn_pct
        if request.cut_pct is not None:
            cap.cut_pct = request.cut_pct
        if request.is_active is not None:
            cap.is_active = request.is_active

    await db.commit()
    return {"updated": True, "tool_id": tool_id}


# ─── Guardrail Log ────────────────────────────────────────────────

@router.get("/log")
async def guardrail_log(
    tool_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Audit trail de evaluaciones del GuardrailEngine."""
    q = select(GuardrailLog).order_by(desc(GuardrailLog.created_at)).limit(limit)
    if tool_id:
        q = q.where(GuardrailLog.tool_id == tool_id)
    if level:
        q = q.where(GuardrailLog.level == level)

    result = await db.execute(q)
    entries = result.scalars().all()

    return {
        "entries": [
            {
                "id": str(e.id),
                "tool_id": e.tool_id,
                "level": e.level,
                "current_spend": e.current_spend,
                "cap_amount": e.cap_amount,
                "percentage": e.percentage,
                "action_taken": e.action_taken,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }


@router.get("/predictive")
async def predictive_cost_alert(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Alerta predictiva: proyección fin de mes basada en gasto actual."""
    from datetime import datetime, timezone
    from sqlalchemy import extract
    from app.models.cost import CostEvent, BudgetCap

    now = datetime.now(timezone.utc)
    day_of_month = now.day
    days_in_month = 30

    result = await db.execute(select(BudgetCap).where(BudgetCap.is_active == True))  # noqa: E712
    caps = result.scalars().all()

    predictions = []
    for cap in caps:
        spent = await db.scalar(
            select(func.coalesce(func.sum(CostEvent.amount), 0)).where(
                CostEvent.tool_id == cap.tool_id,
                extract('month', CostEvent.created_at) == now.month,
                extract('year', CostEvent.created_at) == now.year,
            )
        ) or 0

        daily_rate = float(spent) / max(day_of_month, 1)
        projected = daily_rate * days_in_month
        pct_projected = round(projected / cap.monthly_cap * 100, 1) if cap.monthly_cap > 0 else 0

        alert = None
        if pct_projected >= cap.cut_pct * 1.2:
            alert = "critical"
        elif pct_projected >= cap.warn_pct:
            alert = "warning"

        predictions.append({
            "tool_id": cap.tool_id,
            "tool_name": cap.tool_name,
            "current_spend": round(float(spent), 2),
            "daily_rate": round(daily_rate, 2),
            "projected_eom": round(projected, 2),
            "cap": cap.monthly_cap,
            "pct_projected": pct_projected,
            "alert": alert,
        })

    predictions.sort(key=lambda x: x["pct_projected"], reverse=True)
    return {"predictions": predictions, "day_of_month": day_of_month}


@router.get("/roi")
async def cost_roi(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """ROI por herramienta — coste vs valor generado."""
    from app.models.cost import CostEvent
    from app.models.pipeline import Opportunity
    from app.models.enums import OpportunityStage

    # Total revenue
    total_revenue = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage == OpportunityStage.CLOSED_WON
        )
    ) or 0

    # Cost by tool
    result = await db.execute(
        select(CostEvent.tool_id, func.sum(CostEvent.amount))
        .group_by(CostEvent.tool_id)
    )
    costs = {r[0]: float(r[1]) for r in result.all()}

    total_cost = sum(costs.values())
    overall_roi = round((float(total_revenue) - total_cost) / max(total_cost, 1) * 100, 1)

    return {
        "total_revenue": float(total_revenue),
        "total_cost": round(total_cost, 2),
        "overall_roi_pct": overall_roi,
        "by_tool": [
            {"tool": tool, "cost": round(cost, 2), "pct_of_total": round(cost / max(total_cost, 1) * 100, 1)}
            for tool, cost in sorted(costs.items(), key=lambda x: x[1], reverse=True)
        ],
    }


# ─── Budget por Departamento ────────────────────────────────────

@router.get("/departments")
async def cost_by_department(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Costes agrupados por departamento/categoria."""
    from app.models.cost import CostEvent
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Group by category (acts as department)
    result = await db.execute(
        select(
            CostEvent.category,
            func.sum(CostEvent.amount),
            func.count(CostEvent.id),
        )
        .where(CostEvent.created_at >= month_start)
        .group_by(CostEvent.category)
    )

    departments = []
    total = 0
    for cat, amount, count in result.all():
        amt = float(amount or 0)
        total += amt
        departments.append({
            "department": cat or "general",
            "amount": round(amt, 2),
            "transactions": count,
        })

    # Get department budgets from system settings
    sys_result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = sys_result.scalar_one_or_none()
    dept_budgets = {}
    if sys_settings and sys_settings.general_config:
        dept_budgets = sys_settings.general_config.get("department_budgets", {})

    for d in departments:
        budget = dept_budgets.get(d["department"], 0)
        d["budget"] = budget
        d["pct_used"] = round(d["amount"] / budget * 100, 1) if budget else 0
        d["status"] = "ok" if d["pct_used"] < 80 else "warning" if d["pct_used"] < 100 else "exceeded"

    return {
        "departments": sorted(departments, key=lambda x: x["amount"], reverse=True),
        "total_month": round(total, 2),
    }


@router.put("/departments/budgets")
async def set_department_budgets(
    budgets: dict,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Establece presupuesto mensual por departamento. Body: {\"sales\": 5000, \"marketing\": 3000, ...}"""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if sys_settings:
        general = sys_settings.general_config or {}
        general["department_budgets"] = budgets
        sys_settings.general_config = general
        await db.commit()
    return {"updated": True, "budgets": budgets}


# ─── Dashboard Predictivo Avanzado ──────────────────────────────

@router.get("/predictive-advanced")
async def predictive_advanced(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Dashboard predictivo avanzado: tendencias, anomalias, proyecciones multi-mes."""
    from app.models.cost import CostEvent
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)

    # Costs by month (last 6 months)
    monthly_costs = []
    for i in range(5, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            m_end = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            m_end = now

        total = await db.scalar(
            select(func.coalesce(func.sum(CostEvent.amount), 0))
            .where(CostEvent.created_at >= m_start, CostEvent.created_at < m_end)
        ) or 0
        monthly_costs.append({
            "month": m_start.strftime("%Y-%m"),
            "amount": round(float(total), 2),
        })

    # Trend (simple linear: average change per month)
    amounts = [m["amount"] for m in monthly_costs if m["amount"] > 0]
    if len(amounts) >= 2:
        avg_change = sum(amounts[i] - amounts[i-1] for i in range(1, len(amounts))) / (len(amounts) - 1)
        trend = "up" if avg_change > 0 else "down" if avg_change < 0 else "flat"
        projected_next = round(amounts[-1] + avg_change, 2)
    else:
        avg_change = 0
        trend = "flat"
        projected_next = amounts[-1] if amounts else 0

    # Anomaly detection (simple: any day with > 2x daily average)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    daily_q = await db.execute(
        select(func.date(CostEvent.created_at), func.sum(CostEvent.amount))
        .where(CostEvent.created_at >= month_start)
        .group_by(func.date(CostEvent.created_at))
    )
    daily_costs = {str(r[0]): float(r[1]) for r in daily_q.all()}
    if daily_costs:
        avg_daily = sum(daily_costs.values()) / len(daily_costs)
        anomalies = [
            {"date": d, "amount": round(a, 2), "vs_avg": round(a / max(avg_daily, 1), 1)}
            for d, a in daily_costs.items()
            if a > avg_daily * 2
        ]
    else:
        avg_daily = 0
        anomalies = []

    return {
        "monthly_costs": monthly_costs,
        "trend": trend,
        "avg_monthly_change": round(avg_change, 2),
        "projected_next_month": projected_next,
        "avg_daily_this_month": round(avg_daily, 2),
        "anomalies": anomalies,
        "total_6_months": round(sum(m["amount"] for m in monthly_costs), 2),
    }


# ─── Burn Rate ───────────────────────────────────────────────────

@router.get("/burn-rate")
async def cost_burn_rate(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Cost burn rate: daily spending by tool over time."""
    from datetime import datetime, timezone, timedelta
    from app.models.cost import CostEvent

    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(CostEvent.created_at).label("day"),
            CostEvent.tool_id,
            func.sum(CostEvent.amount).label("total")
        )
        .where(CostEvent.created_at >= since)
        .group_by(func.date(CostEvent.created_at), CostEvent.tool_id)
        .order_by(func.date(CostEvent.created_at))
    )

    data = {}
    tools = set()
    for day, tool, total in result.all():
        d = str(day)
        if d not in data:
            data[d] = {"date": d}
        data[d][tool] = round(float(total), 4)
        tools.add(tool)

    return {"series": list(data.values()), "tools": sorted(tools), "days": days}
