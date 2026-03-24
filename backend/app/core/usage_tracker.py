"""Middleware to track feature usage per request."""
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func as sqlfunc
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def track_usage(user_id, feature, action="view"):
    try:
        from app.models.usage_event import UsageEvent
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        async with AsyncSessionLocal() as db:
            existing = await db.execute(select(UsageEvent).where(
                UsageEvent.user_id == user_id, UsageEvent.feature == feature,
                UsageEvent.action == action, UsageEvent.day == today,
            ))
            event = existing.scalar_one_or_none()
            if event:
                event.count += 1
            else:
                db.add(UsageEvent(user_id=user_id, feature=feature, action=action, day=today))
            await db.commit()
    except Exception as e:
        logger.debug("Usage tracking failed: %s", e)


async def get_usage_summary(user_id=None, days=30):
    from app.models.usage_event import UsageEvent
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    async with AsyncSessionLocal() as db:
        query = select(UsageEvent.feature, sqlfunc.sum(UsageEvent.count).label("total")).where(
            UsageEvent.day >= since).group_by(UsageEvent.feature).order_by(sqlfunc.sum(UsageEvent.count).desc())
        if user_id:
            query = query.where(UsageEvent.user_id == user_id)
        result = await db.execute(query)
        features = {row[0]: row[1] for row in result.all()}
        active = await db.execute(select(sqlfunc.count(sqlfunc.distinct(UsageEvent.user_id))).where(UsageEvent.day >= since))
        return {"features": features, "active_users": active.scalar() or 0, "period_days": days}
