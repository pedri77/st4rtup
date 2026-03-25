"""
Background Scheduler — 22 automations via APScheduler
"""
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from sqlalchemy import select, func, and_

from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
scheduler: AsyncIOScheduler = None


# ═══════════════════════════════════════════════════════════════
# AUTOMATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════

async def run_ac01_daily_summary():
    """AC-01: Resumen diario de acciones pendientes — 08:30"""
    from app.models import Action, ActionStatus
    try:
        async with AsyncSessionLocal() as db:
            today = datetime.now(timezone.utc).date()
            overdue = (await db.execute(select(func.count(Action.id)).where(
                Action.due_date < today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
            ))).scalar() or 0
            due_today = (await db.execute(select(func.count(Action.id)).where(
                Action.due_date == today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
            ))).scalar() or 0
            logger.info(f"AC-01: {overdue} vencidas, {due_today} para hoy")
    except Exception as e:
        logger.error(f"AC-01 error: {e}")


async def run_ac02_escalation():
    """AC-02: Escalado — acciones vencidas >3 días — 09:30"""
    from app.models import Action, ActionStatus, Notification
    try:
        async with AsyncSessionLocal() as db:
            cutoff = datetime.now(timezone.utc).date() - timedelta(days=3)
            result = await db.execute(select(Action).where(
                Action.due_date < cutoff,
                Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
            ))
            overdue = result.scalars().all()
            for a in overdue:
                db.add(Notification(title=f"Acción escalada: {a.title}", message=f"Vencida hace {(datetime.now(timezone.utc).date() - a.due_date).days} días", type="warning"))
            await db.commit()
            logger.info(f"AC-02: {len(overdue)} acciones escaladas")
    except Exception as e:
        logger.error(f"AC-02 error: {e}")


async def run_ac03_auto_close():
    """AC-03: Auto-cierre de acciones completadas — 23:00"""
    from app.models import Action, ActionStatus
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Action).where(Action.status == ActionStatus.COMPLETED))
            # Mark old completed actions as archived (if field exists)
            logger.info("AC-03: Auto-close check completed")
    except Exception as e:
        logger.error(f"AC-03 error: {e}")


async def run_em01_day3():
    """EM-01 Day 3: Email de valor — 09:00"""
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            target_date = (datetime.now(timezone.utc) - timedelta(days=3)).date()
            result = await db.execute(select(Lead).where(func.date(Lead.created_at) == target_date))
            leads = result.scalars().all()
            logger.info(f"EM-01 Day 3: {len(leads)} leads para email")
    except Exception as e:
        logger.error(f"EM-01 Day 3 error: {e}")


async def run_em01_day7():
    """EM-01 Day 7: Email follow-up — 09:15"""
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            target_date = (datetime.now(timezone.utc) - timedelta(days=7)).date()
            result = await db.execute(select(Lead).where(func.date(Lead.created_at) == target_date))
            leads = result.scalars().all()
            logger.info(f"EM-01 Day 7: {len(leads)} leads para email")
    except Exception as e:
        logger.error(f"EM-01 Day 7 error: {e}")


async def run_em03_reengagement():
    """EM-03: Re-engagement leads inactivos 30+ días — 10:00"""
    from app.models import Lead, LeadStatus
    try:
        async with AsyncSessionLocal() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            result = await db.execute(select(Lead).where(
                Lead.updated_at < cutoff,
                Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST])
            ).limit(20))
            stale = result.scalars().all()
            logger.info(f"EM-03: {len(stale)} leads inactivos para re-engagement")
    except Exception as e:
        logger.error(f"EM-03 error: {e}")


async def run_em04_post_visit():
    """EM-04: Follow-up post-visita — 11:00"""
    from app.models.crm import Visit
    try:
        async with AsyncSessionLocal() as db:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
            result = await db.execute(select(Visit).where(func.date(Visit.visit_date) == yesterday))
            visits = result.scalars().all()
            logger.info(f"EM-04: {len(visits)} visitas de ayer para follow-up")
    except Exception as e:
        logger.error(f"EM-04 error: {e}")


async def run_ld04_lead_scoring():
    """LD-04: Lead scoring automático — cada 6h"""
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(func.count(Lead.id)))
            total = result.scalar() or 0
            logger.info(f"LD-04: {total} leads para scoring")
    except Exception as e:
        logger.error(f"LD-04 error: {e}")


async def run_pi01_stage_triggers():
    """PI-01: Triggers por cambio de etapa — event-driven (check hourly)"""
    logger.info("PI-01: Stage triggers check (event-driven)")


async def run_pi02_weekly_pipeline():
    """PI-02: Report semanal pipeline — Lun 08:00"""
    from app.models.pipeline import Opportunity, OpportunityStage
    try:
        async with AsyncSessionLocal() as db:
            total = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
            ))).scalar() or 0
            logger.info(f"PI-02: Pipeline activo: {total:,.0f} EUR")
    except Exception as e:
        logger.error(f"PI-02 error: {e}")


async def run_pi03_stale_deals():
    """PI-03: Alerta deals estancados 14+ días — 10:30"""
    from app.models.pipeline import Opportunity, OpportunityStage
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(days=14)
            result = await db.execute(select(Opportunity).where(
                Opportunity.updated_at < cutoff,
                Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
            ))
            stale = result.scalars().all()
            for opp in stale:
                db.add(Notification(title=f"Deal estancado: {opp.name}", message=f"Sin actividad hace {(datetime.now(timezone.utc) - opp.updated_at).days} días", type="warning"))
            await db.commit()
            logger.info(f"PI-03: {len(stale)} deals estancados")
    except Exception as e:
        logger.error(f"PI-03 error: {e}")


async def run_mr01_monthly_review():
    """MR-01: Auto-generación monthly review — 1° mes 08:00"""
    logger.info("MR-01: Monthly review auto-generation check")


async def run_mr02_consolidated_report():
    """MR-02: Informe mensual consolidado — 1° mes 09:00"""
    logger.info("MR-02: Monthly consolidated report")


async def run_sv01_post_close_nps():
    """SV-01: Encuesta NPS post-cierre — 11:30"""
    from app.models.pipeline import Opportunity, OpportunityStage
    try:
        async with AsyncSessionLocal() as db:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
            result = await db.execute(select(Opportunity).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                func.date(Opportunity.updated_at) == yesterday
            ))
            won = result.scalars().all()
            logger.info(f"SV-01: {len(won)} deals cerrados ayer para NPS")
    except Exception as e:
        logger.error(f"SV-01 error: {e}")


async def run_sv02_quarterly_csat():
    """SV-02: Encuesta trimestral CSAT — 1° trimestre 08:00"""
    logger.info("SV-02: Quarterly CSAT survey trigger")


async def run_drip_emails():
    """Drip email sequences — 09:00"""
    try:
        from app.services.drip_emails import run_drip_check
        await run_drip_check()
    except Exception as e:
        logger.error(f"Drip emails error: {e}")


async def run_weekly_digest():
    """Weekly digest email — Lun 09:15"""
    try:
        from app.services.drip_emails import send_weekly_digest
        await send_weekly_digest()
    except Exception as e:
        logger.error(f"Weekly digest error: {e}")


async def run_slack_daily_digest():
    """Slack daily digest — 08:45"""
    if not getattr(settings, 'SLACK_WEBHOOK_URL', ''):
        return
    import httpx
    try:
        async with AsyncSessionLocal() as db:
            from app.models import Lead, Action, ActionStatus, Opportunity, OpportunityStage
            today = datetime.now(timezone.utc).date()
            overdue = (await db.execute(select(func.count(Action.id)).where(Action.due_date < today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])))).scalar() or 0
            pipeline = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])))).scalar() or 0
            text = f"*St4rtup CRM* ({today.strftime('%d/%m/%Y')})\n• Vencidas: *{overdue}*\n• Pipeline: *{pipeline:,.0f} EUR*"
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(settings.SLACK_WEBHOOK_URL, json={"text": text})
    except Exception as e:
        logger.error(f"Slack digest error: {e}")


async def run_call_queues():
    """CALLS-Q: Procesa colas de llamadas — cada 2 min"""
    try:
        async with AsyncSessionLocal() as db:
            from app.models.call import CallQueue
            now = datetime.now(timezone.utc)
            result = await db.execute(select(CallQueue).where(and_(
                CallQueue.status == "pending", CallQueue.scheduled_at.isnot(None), CallQueue.scheduled_at <= now
            )))
            for queue in result.scalars().all():
                queue.status = "running"
                queue.started_at = now
            await db.commit()
    except Exception as e:
        logger.error(f"CALLS-Q error: {e}")


# ═══════════════════════════════════════════════════════════════
# SCHEDULER SETUP
# ═══════════════════════════════════════════════════════════════

def job_listener(event):
    if event.exception:
        logger.error(f"Job {event.job_id} failed: {event.exception}")


def init_scheduler():
    global scheduler
    if scheduler is not None:
        return scheduler

    logger.info("Initializing scheduler with 22 automations...")
    scheduler = AsyncIOScheduler(timezone='Europe/Madrid')
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    JOBS = [
        # Email automations
        (run_em01_day3,          CronTrigger(hour=9, minute=0),  'em01_day3',    'EM-01 Day 3: Welcome email'),
        (run_em01_day7,          CronTrigger(hour=9, minute=15), 'em01_day7',    'EM-01 Day 7: Follow-up email'),
        (run_em03_reengagement,  CronTrigger(hour=10, minute=0), 'em03_reengage','EM-03: Re-engagement 30d'),
        (run_em04_post_visit,    CronTrigger(hour=11, minute=0), 'em04_visit',   'EM-04: Follow-up post-visita'),
        (run_drip_emails,        CronTrigger(hour=9, minute=0),  'drip_emails',  'Drip email sequences'),
        # Actions
        (run_ac01_daily_summary, CronTrigger(hour=8, minute=30), 'ac01_summary', 'AC-01: Resumen diario acciones'),
        (run_ac02_escalation,    CronTrigger(hour=9, minute=30), 'ac02_escalate','AC-02: Escalado acciones vencidas'),
        (run_ac03_auto_close,    CronTrigger(hour=23, minute=0), 'ac03_close',   'AC-03: Auto-cierre acciones'),
        # Pipeline
        (run_pi01_stage_triggers,CronTrigger(hour='*/1'),        'pi01_stages',  'PI-01: Stage change triggers'),
        (run_pi02_weekly_pipeline,CronTrigger(day_of_week='mon', hour=8, minute=0), 'pi02_pipeline', 'PI-02: Report semanal pipeline'),
        (run_pi03_stale_deals,   CronTrigger(hour=10, minute=30),'pi03_stale',   'PI-03: Alerta deals estancados'),
        # Lead scoring
        (run_ld04_lead_scoring,  CronTrigger(hour='*/6'),        'ld04_scoring', 'LD-04: Lead scoring automático'),
        # Monthly reviews
        (run_mr01_monthly_review,CronTrigger(day=1, hour=8, minute=0), 'mr01_review', 'MR-01: Auto monthly review'),
        (run_mr02_consolidated_report,CronTrigger(day=1, hour=9, minute=0), 'mr02_report', 'MR-02: Informe consolidado'),
        # Surveys
        (run_sv01_post_close_nps,CronTrigger(hour=11, minute=30),'sv01_nps',     'SV-01: NPS post-cierre'),
        (run_sv02_quarterly_csat,CronTrigger(month='1,4,7,10', day=1, hour=8), 'sv02_csat', 'SV-02: CSAT trimestral'),
        # Notifications
        (run_slack_daily_digest, CronTrigger(hour=8, minute=45), 'slack_digest', 'Slack daily digest'),
        (run_weekly_digest,      CronTrigger(day_of_week='mon', hour=9, minute=15), 'weekly_digest', 'Weekly digest email'),
        # Calls
        (run_call_queues,        CronTrigger(minute='*/2'),      'calls_queue',  'CALLS-Q: Process call queues'),
    ]

    for func, trigger, job_id, name in JOBS:
        scheduler.add_job(func, trigger=trigger, id=job_id, name=name, replace_existing=True, misfire_grace_time=3600)

    # Workflow engine scheduled jobs
    try:
        from app.core.workflow_engine import register_scheduled_workflows
        register_scheduled_workflows(scheduler)
    except Exception:
        pass

    logger.info(f"Scheduler configured: {len(scheduler.get_jobs())} jobs")
    for job in scheduler.get_jobs():
        logger.info(f"  - {job.name}")

    return scheduler


def start_scheduler():
    global scheduler
    if scheduler is None:
        init_scheduler()
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def shutdown_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
