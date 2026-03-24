"""In-memory rate limiter by plan."""
import time
from fastapi import Depends, HTTPException, Request
from app.core.plan_gate import get_user_plan
from app.core.security import get_current_user

PLAN_LIMITS = {"starter": 100, "growth": 500, "scale": 2000, "enterprise": 10000}
_limiter = {}
WINDOW = 60


def rate_limit():
    async def check(request: Request, current_user: dict = Depends(get_current_user)):
        uid = current_user.get("user_id", "anon")
        plan = await get_user_plan(current_user)
        limit = PLAN_LIMITS.get(plan, 100)
        now = time.time()
        entry = _limiter.get(uid, {"count": 0, "start": now})
        if now - entry["start"] > WINDOW:
            entry = {"count": 0, "start": now}
        entry["count"] += 1
        _limiter[uid] = entry
        if entry["count"] > limit:
            retry = int(WINDOW - (now - entry["start"]))
            raise HTTPException(429, detail={
                "error": "rate_limit_exceeded",
                "message": f"Límite de {limit} peticiones/minuto para plan {plan.title()}.",
                "limit": limit, "plan": plan, "retry_after": retry,
            }, headers={"Retry-After": str(retry)})
        request.state.rate_limit_remaining = limit - entry["count"]
        return current_user
    return check
