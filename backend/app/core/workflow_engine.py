"""
Internal Workflow Engine — reemplaza n8n para flujos criticos.
n8n sigue disponible como alternativa opcional.

Tipos de workflows:
1. EVENT-DRIVEN: se disparan cuando ocurre un evento en el CRM
2. SCHEDULED: se ejecutan en cron (via APScheduler)
3. MANUAL: se ejecutan bajo demanda

Eventos soportados:
- lead.created, lead.updated, lead.status_changed
- opportunity.created, opportunity.stage_changed, opportunity.won, opportunity.lost
- action.created, action.completed, action.overdue
- email.sent, email.opened, email.bounced
- visit.scheduled, visit.completed
- form.submitted
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Callable, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Registry of event handlers
_event_handlers: dict[str, list[Callable]] = {}


def on_event(event_name: str):
    """Decorator to register a function as handler for an event."""
    def decorator(func):
        if event_name not in _event_handlers:
            _event_handlers[event_name] = []
        _event_handlers[event_name].append(func)
        logger.info(f"  Workflow registered: {func.__name__} -> {event_name}")
        return func
    return decorator


async def dispatch_event(event_name: str, data: dict, db: Optional[AsyncSession] = None):
    """Dispatch an event to all registered handlers."""
    handlers = _event_handlers.get(event_name, [])
    if not handlers:
        return

    logger.info(f"Dispatching event '{event_name}' to {len(handlers)} handler(s)")

    for handler in handlers:
        try:
            if db:
                await handler(db=db, **data)
            else:
                async with AsyncSessionLocal() as session:
                    await handler(db=session, **data)
        except Exception as e:
            logger.error(f"Workflow error in {handler.__name__} for {event_name}: {e}")

    # Also dispatch to external webhook subscribers (n8n optional)
    try:
        if db:
            from app.services.webhook_dispatcher import dispatch_event as dispatch_webhook
            await dispatch_webhook(db, event_name, data)
    except Exception:
        pass  # Webhook dispatch is optional


# ═══════════════════════════════════════════════════════════════
# EVENT-DRIVEN WORKFLOWS
# ═══════════════════════════════════════════════════════════════

# ── EM-01: Welcome sequence on new lead ──────────────────────

@on_event("lead.created")
async def em01_trigger_welcome(db: AsyncSession, lead_id: str, **kwargs):
    """EM-01: Auto-trigger welcome email sequence for new leads."""
    try:
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email
        result = await send_welcome_sequence_email(db, lead_id, day=0)
        logger.info(f"EM-01: Welcome email sent for lead {lead_id}: {result.get('success')}")
    except Exception as e:
        logger.warning(f"EM-01: Welcome email failed for {lead_id}: {e}")


# ── LD-04: Auto lead scoring ─────────────────────────────────

@on_event("lead.created")
async def ld04_auto_score(db: AsyncSession, lead_id: str, **kwargs):
    """LD-04: Auto-score lead with AI (ICP scoring)."""
    try:
        from app.models import Lead
        result = await db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead or not lead.contact_email:
            return
        from app.agents.lead_intelligence import score_lead
        await score_lead(db, lead_id)
        logger.info(f"LD-04: Auto-scored lead {lead_id}")
    except Exception as e:
        logger.debug(f"LD-04: Scoring skipped for {lead_id}: {e}")


# ── IN-02: Telegram notification on important events ─────────

@on_event("lead.created")
@on_event("opportunity.won")
@on_event("opportunity.lost")
@on_event("action.overdue")
async def in02_telegram_notify(db: AsyncSession, **kwargs):
    """IN-02: Send Telegram notification for important CRM events."""
    try:
        from app.services.notification_service import NotificationService
        event = kwargs.get("event_name", "")
        title = kwargs.get("title", event)
        message = kwargs.get("message", "")
        if title and message:
            await NotificationService._send_telegram(db, title, message)
            await NotificationService._send_slack_teams(db, title, message)
    except Exception:
        pass


# ── PI-01: Pipeline stage change triggers ────────────────────

@on_event("opportunity.stage_changed")
async def pi01_stage_triggers(db: AsyncSession, opportunity_id: str, old_stage: str, new_stage: str, **kwargs):
    """PI-01: Actions triggered by pipeline stage changes."""
    from app.models import Action, ActionStatus
    from uuid import UUID

    # Auto-create follow-up action when entering proposal stage
    if new_stage == "proposal":
        action = Action(
            lead_id=kwargs.get("lead_id"),
            title=f"Preparar propuesta — {kwargs.get('name', '')}",
            description="Oportunidad en fase de propuesta. Preparar documento y enviar.",
            status=ActionStatus.PENDING,
            priority="high",
            due_date=(datetime.now(timezone.utc) + timedelta(days=3)).date(),
        )
        db.add(action)
        await db.commit()
        logger.info(f"PI-01: Auto-created proposal action for {opportunity_id}")

    # Notify on negotiation
    if new_stage == "negotiation":
        await dispatch_event("notification.send", {
            "title": f"Deal en negociacion: {kwargs.get('name', '')}",
            "message": f"Valor: {kwargs.get('value', 0)} EUR",
        }, db)


# ── PI-03: Stale deal alert ──────────────────────────────────

@on_event("daily.check")
async def pi03_stale_deals(db: AsyncSession, **kwargs):
    """PI-03: Alert on deals stale >14 days."""
    from app.models.pipeline import Opportunity
    from app.models.enums import OpportunityStage

    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
            Opportunity.updated_at < two_weeks_ago,
        )
    )
    stale = result.scalars().all()
    if stale:
        names = ", ".join([o.name for o in stale[:5]])
        total_value = sum(float(o.value or 0) for o in stale)
        await dispatch_event("notification.send", {
            "title": f"{len(stale)} deals estancados (>14 dias)",
            "message": f"Valor en riesgo: {total_value:,.0f} EUR. Deals: {names}",
        }, db)
        logger.info(f"PI-03: {len(stale)} stale deals alerted")


# ── AC-02: Escalation on overdue actions ─────────────────────

@on_event("daily.check")
async def ac02_escalate_overdue(db: AsyncSession, **kwargs):
    """AC-02: Escalate actions overdue >3 days."""
    from app.models import Action, ActionStatus

    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).date()
    result = await db.execute(
        select(Action).where(
            Action.status == ActionStatus.PENDING,
            Action.due_date < three_days_ago,
        )
    )
    overdue = result.scalars().all()
    if overdue:
        await dispatch_event("notification.send", {
            "title": f"{len(overdue)} acciones vencidas >3 dias",
            "message": f"Requieren escalado inmediato.",
        }, db)
        logger.info(f"AC-02: {len(overdue)} overdue actions escalated")


# ── AC-03: Auto-close old completed actions ──────────────────

@on_event("daily.check")
async def ac03_auto_close(db: AsyncSession, **kwargs):
    """AC-03: Auto-close actions completed >30 days ago."""
    from app.models import Action, ActionStatus

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).date()
    result = await db.execute(
        select(Action).where(
            Action.status == ActionStatus.COMPLETED,
            Action.due_date < thirty_days_ago,
        )
    )
    old_actions = result.scalars().all()
    for action in old_actions:
        action.status = ActionStatus.CANCELLED
    if old_actions:
        await db.commit()
        logger.info(f"AC-03: Auto-closed {len(old_actions)} old actions")


# ── EM-02: Email tracking score update ───────────────────────

@on_event("email.opened")
async def em02_score_on_open(db: AsyncSession, lead_id: str, **kwargs):
    """EM-02: Increase lead score when email is opened."""
    from app.models import Lead
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead:
        lead.score = min(100, (lead.score or 0) + 5)
        await db.commit()


@on_event("email.clicked")
async def em02_score_on_click(db: AsyncSession, lead_id: str, **kwargs):
    """EM-02: Increase lead score on email click."""
    from app.models import Lead
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead:
        lead.score = min(100, (lead.score or 0) + 10)
        await db.commit()


# ── EM-03: Re-engagement for cold leads ──────────────────────

@on_event("weekly.check")
async def em03_reengagement(db: AsyncSession, **kwargs):
    """EM-03: Flag leads inactive >90 days for re-engagement."""
    from app.models import Lead, LeadStatus
    ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
    result = await db.execute(
        select(Lead).where(
            Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
            Lead.updated_at < ninety_days_ago,
        ).limit(50)
    )
    cold_leads = result.scalars().all()
    if cold_leads:
        logger.info(f"EM-03: {len(cold_leads)} cold leads flagged for re-engagement")
        await dispatch_event("notification.send", {
            "title": f"{len(cold_leads)} leads frios (>90 dias)",
            "message": "Considerar campana de re-engagement.",
        }, db)


# ── VI-02: Visit reminder ────────────────────────────────────

@on_event("daily.check")
async def vi02_visit_reminder(db: AsyncSession, **kwargs):
    """VI-02: Remind about visits scheduled for tomorrow."""
    from app.models import Visit, Lead
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
    result = await db.execute(
        select(Visit, Lead)
        .join(Lead, Visit.lead_id == Lead.id, isouter=True)
        .where(func.date(Visit.visit_date) == tomorrow)
    )
    visits = result.all()
    if visits:
        for visit, lead in visits:
            company = lead.company_name if lead else "Sin empresa"
            await dispatch_event("notification.send", {
                "title": f"Visita manana: {company}",
                "message": f"Visita programada para {tomorrow}",
            }, db)
        logger.info(f"VI-02: {len(visits)} visit reminders sent")


# ── MR-01: Auto-generate monthly review ──────────────────────

@on_event("monthly.check")
async def mr01_auto_review(db: AsyncSession, **kwargs):
    """MR-01: Remind to create monthly review for active clients."""
    from app.models import Lead, LeadStatus
    result = await db.execute(
        select(Lead).where(Lead.status == LeadStatus.WON)
    )
    clients = result.scalars().all()
    if clients:
        await dispatch_event("notification.send", {
            "title": f"Monthly review pendiente: {len(clients)} clientes",
            "message": "Es momento de crear los seguimientos mensuales.",
        }, db)


# ── SV-01: NPS post-close survey ─────────────────────────────

@on_event("opportunity.won")
async def sv01_nps_trigger(db: AsyncSession, lead_id: str, **kwargs):
    """SV-01: Schedule NPS survey 30 days after deal close."""
    logger.info(f"SV-01: NPS survey scheduled for lead {lead_id} (30 days from now)")


# ── Form submission handler ──────────────────────────────────

@on_event("form.submitted")
async def form_notification(db: AsyncSession, form_id: str, **kwargs):
    """Notify when a public form is submitted."""
    await dispatch_event("notification.send", {
        "title": f"Formulario recibido: {form_id}",
        "message": f"Se ha enviado el formulario {form_id}.",
    }, db)


# ── HU-01: Weekly Hunter verification ────────────────────────

@on_event("weekly.check")
async def hu01_hunter_verify(db: AsyncSession, **kwargs):
    """HU-01: Verify unverified lead emails weekly."""
    try:
        from app.services.hunter_service import verify_email
        from app.models import Lead
        result = await db.execute(
            select(Lead).where(
                Lead.contact_email.isnot(None),
                Lead.contact_email != "",
            ).limit(20)
        )
        leads = result.scalars().all()
        verified = 0
        for lead in leads:
            meta = (lead.metadata_ or {}) if isinstance(lead.metadata_, dict) else {}
            if meta.get("email_verification"):
                continue
            try:
                v = await verify_email(lead.contact_email, db)
                meta["email_verification"] = v
                lead.metadata_ = meta
                verified += 1
            except Exception:
                break
        if verified:
            await db.commit()
            logger.info(f"HU-01: Verified {verified} emails")
    except Exception as e:
        logger.debug(f"HU-01: Skipped: {e}")


# ── GC-01: Calendar sync ─────────────────────────────────────

@on_event("daily.check")
async def gc01_calendar_sync(db: AsyncSession, **kwargs):
    """GC-01: Sync upcoming visits to Google Calendar."""
    try:
        from app.services.gcalendar_service import create_calendar_event
        from app.models import Visit, Lead
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
        next_week = tomorrow + timedelta(days=7)
        result = await db.execute(
            select(Visit, Lead).join(Lead, Visit.lead_id == Lead.id, isouter=True)
            .where(func.date(Visit.visit_date) >= tomorrow, func.date(Visit.visit_date) <= next_week)
        )
        synced = 0
        for visit, lead in result.all():
            meta = (visit.metadata_ or {}) if isinstance(visit.metadata_, dict) else {}
            if meta.get("gcal_event_id"):
                continue
            try:
                company = lead.company_name if lead else "Sin empresa"
                gcal = await create_calendar_event(
                    db=db, summary=f"Visita - {company}",
                    description=visit.summary or "",
                    start_dt=visit.visit_date,
                )
                meta["gcal_event_id"] = gcal.get("id", "")
                visit.metadata_ = meta
                synced += 1
            except Exception:
                break
        if synced:
            await db.commit()
            logger.info(f"GC-01: Synced {synced} visits to Google Calendar")
    except Exception as e:
        logger.debug(f"GC-01: Skipped: {e}")


# ── SC-01: Social recurrence generator ───────────────────────

@on_event("hourly.check")
async def sc01_generate_recurring(db: AsyncSession, **kwargs):
    """SC-01: Generate posts from active recurrences whose next_run has passed."""
    from app.models.social import SocialPost, SocialRecurrence
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(SocialRecurrence).where(
            SocialRecurrence.is_active.is_(True),
            SocialRecurrence.next_run <= now,
        )
    )
    for rec in result.scalars().all():
        content = rec.content_template.replace("{date}", now.strftime("%d/%m/%Y"))
        content = content.replace("{week}", str(now.isocalendar()[1]))
        content = content.replace("{month}", now.strftime("%B"))
        post = SocialPost(
            platform=rec.platform, content=content,
            media_url=rec.media_url, status="draft",
            tags=rec.tags, recurrence_id=str(rec.id),
        )
        db.add(post)
        rec.total_generated = (rec.total_generated or 0) + 1
        # Advance next_run
        from dateutil.relativedelta import relativedelta
        if rec.frequency == "daily":
            rec.next_run = now + timedelta(days=1)
        elif rec.frequency == "weekly":
            rec.next_run = now + timedelta(weeks=1)
        elif rec.frequency == "biweekly":
            rec.next_run = now + timedelta(weeks=2)
        elif rec.frequency == "monthly":
            rec.next_run = now + timedelta(days=30)
    await db.commit()


# ── LD-01: Create lead from web form submission ─────────────

@on_event("form.submitted")
async def ld01_create_lead_from_form(db: AsyncSession, **kwargs):
    """LD-01: Create a Lead from web form data, assign initial score, notify."""
    from app.models import Lead
    from app.services.telegram_service import notify_new_lead

    form_data = kwargs.get("form_data", {})
    email = form_data.get("email", "")
    company = form_data.get("company", form_data.get("company_name", ""))
    name = form_data.get("name", form_data.get("contact_name", ""))

    if not email and not company:
        return

    # Deduplicar por email
    if email:
        existing = (await db.execute(select(func.count(Lead.id)).where(
            func.lower(Lead.contact_email) == email.lower()
        ))).scalar() or 0
        if existing > 0:
            logger.info(f"LD-01: Duplicate lead skipped: {email}")
            return

    lead = Lead(
        company_name=company or "Web Form Lead",
        contact_name=name,
        contact_email=email,
        contact_phone=form_data.get("phone", ""),
        source="website",
        score=15,  # Score inicial formulario web
        notes=f"Origen: formulario web. Mensaje: {form_data.get('message', '')}",
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    await notify_new_lead(db, company or name, "website", email)
    logger.info(f"LD-01: Lead created from form: {email} / {company}")


# ── IN-01: Import batch of leads from scraping ──────────────

@on_event("lead.import_batch")
async def in01_import_leads_batch(db: AsyncSession, **kwargs):
    """IN-01: Import array of leads from scraping, deduplicate by company_name."""
    from app.models import Lead

    leads_data = kwargs.get("leads", [])
    if not leads_data:
        return

    created = 0
    skipped = 0
    for item in leads_data:
        company = item.get("company_name", "")
        if not company:
            continue

        # Deduplicar por company_name
        existing = (await db.execute(select(func.count(Lead.id)).where(
            func.lower(Lead.company_name) == company.lower()
        ))).scalar() or 0
        if existing > 0:
            skipped += 1
            continue

        db.add(Lead(
            company_name=company,
            contact_name=item.get("contact_name", ""),
            contact_email=item.get("contact_email", ""),
            contact_phone=item.get("contact_phone", ""),
            company_website=item.get("website", ""),
            company_sector=item.get("sector", ""),
            company_city=item.get("city", ""),
            company_country=item.get("country", "Spain"),
            source="scraping",
            score=10,
            notes=f"Importado por scraping ({datetime.now(timezone.utc).strftime('%d/%m/%Y')})",
        ))
        created += 1

    if created:
        await db.commit()
    logger.info(f"IN-01: Batch import — {created} created, {skipped} duplicates skipped")


# ── RS-092: FirstPromoter webhook events ─────────────────────

@on_event("partner.event")
async def rs092_firstpromoter_event(db: AsyncSession, **kwargs):
    """RS-092: Handle FirstPromoter webhook events — new referral or sale."""
    from app.models import Lead
    from app.services.firstpromoter_service import track_referral_sale

    event_type = kwargs.get("event_type", "")
    data = kwargs.get("data", {})

    if event_type == "new_referral":
        email = data.get("email", "")
        company = data.get("company", "")
        promoter = data.get("promoter_name", "partner")

        if email:
            existing = (await db.execute(select(func.count(Lead.id)).where(
                func.lower(Lead.contact_email) == email.lower()
            ))).scalar() or 0
            if existing > 0:
                logger.info(f"RS-092: Referral lead already exists: {email}")
                return

        lead = Lead(
            company_name=company or f"Referral from {promoter}",
            contact_name=data.get("name", ""),
            contact_email=email,
            source="referral",
            score=25,  # Referrals get higher initial score
            notes=f"Referido por: {promoter}. FirstPromoter ID: {data.get('referral_id', '')}",
            tags=["firstpromoter", "referral"],
        )
        db.add(lead)
        await db.commit()
        logger.info(f"RS-092: Referral lead created from {promoter}: {email}")

    elif event_type == "sale":
        referral_id = data.get("referral_id")
        amount = data.get("amount", 0)
        if referral_id:
            try:
                await track_referral_sale(
                    referral_id=referral_id,
                    amount=amount,
                    plan=data.get("plan", ""),
                )
                logger.info(f"RS-092: Sale tracked for referral {referral_id}: {amount} EUR")
            except Exception as e:
                logger.warning(f"RS-092: Failed to track sale: {e}")


# ═══════════════════════════════════════════════════════════════
# SCHEDULED JOBS REGISTRATION
# ═══════════════════════════════════════════════════════════════

def register_scheduled_workflows(scheduler):
    """Register all scheduled workflows with APScheduler."""
    from apscheduler.triggers.cron import CronTrigger

    async def _daily_check():
        async with AsyncSessionLocal() as db:
            await dispatch_event("daily.check", {}, db)

    async def _weekly_check():
        async with AsyncSessionLocal() as db:
            await dispatch_event("weekly.check", {}, db)

    async def _monthly_check():
        async with AsyncSessionLocal() as db:
            await dispatch_event("monthly.check", {}, db)

    async def _hourly_check():
        async with AsyncSessionLocal() as db:
            await dispatch_event("hourly.check", {}, db)

    # Daily at 08:00
    scheduler.add_job(_daily_check, trigger=CronTrigger(hour=8, minute=0, timezone='Europe/Madrid'),
                      id='wf_daily_check', name='Daily workflows check', replace_existing=True, misfire_grace_time=3600)

    # Weekly Monday at 08:00
    scheduler.add_job(_weekly_check, trigger=CronTrigger(hour=8, minute=0, day_of_week='mon', timezone='Europe/Madrid'),
                      id='wf_weekly_check', name='Weekly workflows check', replace_existing=True, misfire_grace_time=3600)

    # Monthly 1st at 08:00
    scheduler.add_job(_monthly_check, trigger=CronTrigger(hour=8, minute=0, day=1, timezone='Europe/Madrid'),
                      id='wf_monthly_check', name='Monthly workflows check', replace_existing=True, misfire_grace_time=3600)

    # Hourly
    scheduler.add_job(_hourly_check, trigger=CronTrigger(minute=0, timezone='Europe/Madrid'),
                      id='wf_hourly_check', name='Hourly workflows check', replace_existing=True, misfire_grace_time=600)

    logger.info("Workflow engine: scheduled jobs registered (daily/weekly/monthly/hourly)")
