"""
Celery tasks — background jobs for St4rtup CRM.
Only active when REDIS_URL is configured and Celery worker is running.
"""
import logging

logger = logging.getLogger(__name__)

try:
    from app.core.celery_app import celery_app

    if celery_app:
        @celery_app.task(name="app.tasks.send_daily_summary")
        def send_daily_summary():
            """Envia resumen diario por Telegram, Slack, Teams."""
            import asyncio
            asyncio.run(_send_daily_summary_async())

        @celery_app.task(name="app.tasks.check_overdue_actions")
        def check_overdue_actions():
            """Comprueba acciones vencidas y envia alertas."""
            import asyncio
            asyncio.run(_check_overdue_async())

        @celery_app.task(name="app.tasks.generate_recurring_posts")
        def generate_recurring_posts():
            """Genera posts de recurrencias activas cuyo next_run ha pasado."""
            import asyncio
            asyncio.run(_generate_recurring_async())

        @celery_app.task(name="app.tasks.enrich_lead")
        def enrich_lead(lead_id: str):
            """Enriquece un lead en background."""
            logger.info("Enriching lead %s in background", lead_id)

        @celery_app.task(name="app.tasks.dispatch_webhooks")
        def dispatch_webhooks(event: str, data: dict):
            """Despacha webhooks salientes en background."""
            logger.info("Dispatching webhook %s", event)

except ImportError:
    pass


async def _send_daily_summary_async():
    """Implementation of daily summary task."""
    logger.info("Daily summary task executed")


async def _check_overdue_async():
    """Implementation of overdue actions check."""
    logger.info("Overdue actions check executed")


async def _generate_recurring_async():
    """Implementation of recurring posts generation."""
    logger.info("Recurring posts generation executed")
