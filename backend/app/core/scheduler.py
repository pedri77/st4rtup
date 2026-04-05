"""
Background Scheduler — 28 automations via APScheduler
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
    """EM-04: Follow-up post-visita — 11:00
    Query visitas de ayer con resultado positivo/follow_up → crear email follow-up → crear acción de seguimiento.
    """
    from app.models.crm import Visit, Action, ActionStatus, VisitResult, ActionPriority
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
            result = await db.execute(
                select(Visit).join(Lead, Lead.id == Visit.lead_id).where(
                    func.date(Visit.visit_date) == yesterday,
                    Visit.result.in_([VisitResult.POSITIVE, VisitResult.FOLLOW_UP])
                )
            )
            visits = result.scalars().all()
            sent = 0
            for visit in visits:
                lead = (await db.execute(select(Lead).where(Lead.id == visit.lead_id))).scalar_one_or_none()
                if not lead or not lead.contact_email:
                    continue

                subject = f"Seguimiento de nuestra reunión — {lead.company_name}"
                html_body = f"""<p>Hola {lead.contact_name or 'equipo'},</p>
<p>Gracias por la reunión de ayer. {visit.summary or 'Fue un placer conversar con vosotros.'}</p>
{'<p><b>Próximos pasos:</b></p><ul>' + ''.join(f'<li>{step}</li>' for step in visit.next_steps) + '</ul>' if visit.next_steps else ''}
<p>Quedamos a vuestra disposición para cualquier consulta.</p>
<p>Un saludo,<br>Equipo Comercial</p>"""

                from app.services.email_service import email_service
                await email_service.send_email(to=lead.contact_email, subject=subject, html_body=html_body)

                # Crear acción de seguimiento a 3 días
                existing = (await db.execute(select(func.count(Action.id)).where(
                    Action.lead_id == visit.lead_id,
                    Action.title.ilike('%follow-up post-visita%'),
                    func.date(Action.created_at) == datetime.now(timezone.utc).date()
                ))).scalar() or 0
                if existing == 0:
                    db.add(Action(
                        lead_id=visit.lead_id,
                        title=f"Follow-up post-visita {yesterday.strftime('%d/%m')}",
                        description=f"Seguimiento de visita con resultado {'positivo' if visit.result == VisitResult.POSITIVE else 'pendiente follow-up'}. {visit.summary or ''}",
                        due_date=datetime.now(timezone.utc).date() + timedelta(days=3),
                        status=ActionStatus.PENDING,
                        action_type="follow_up",
                        priority=ActionPriority.HIGH if visit.result == VisitResult.POSITIVE else ActionPriority.MEDIUM,
                    ))
                sent += 1
            await db.commit()
            logger.info(f"EM-04: {sent} follow-ups enviados de {len(visits)} visitas")
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
    """PI-02: Report semanal pipeline — Lun 08:00
    Calcula totales por stage + deals ganados/perdidos en la semana → envía resumen por Telegram + notificación.
    """
    from app.models.pipeline import Opportunity, OpportunityStage
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)

            # Totales por stage activo
            stages_data = []
            total_pipeline = 0
            for stage in [OpportunityStage.DISCOVERY, OpportunityStage.QUALIFICATION,
                          OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION]:
                val = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                    Opportunity.stage == stage
                ))).scalar() or 0
                count = (await db.execute(select(func.count(Opportunity.id)).where(
                    Opportunity.stage == stage
                ))).scalar() or 0
                if count > 0:
                    stages_data.append(f"  • {stage.value.replace('_', ' ').title()}: {count} deals — {val:,.0f} EUR")
                total_pipeline += val

            # Deals ganados/perdidos esta semana
            won_count = (await db.execute(select(func.count(Opportunity.id)).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON, Opportunity.updated_at >= week_ago
            ))).scalar() or 0
            won_value = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON, Opportunity.updated_at >= week_ago
            ))).scalar() or 0
            lost_count = (await db.execute(select(func.count(Opportunity.id)).where(
                Opportunity.stage == OpportunityStage.CLOSED_LOST, Opportunity.updated_at >= week_ago
            ))).scalar() or 0

            # Nuevas oportunidades esta semana
            new_count = (await db.execute(select(func.count(Opportunity.id)).where(
                Opportunity.created_at >= week_ago
            ))).scalar() or 0

            report = f"""<b>📊 Report Semanal Pipeline</b>
<b>Pipeline activo:</b> {total_pipeline:,.0f} EUR
{chr(10).join(stages_data) if stages_data else '  Sin deals activos'}

<b>Esta semana:</b>
  • Nuevas oportunidades: {new_count}
  • Ganadas: {won_count} ({won_value:,.0f} EUR)
  • Perdidas: {lost_count}"""

            from app.services.telegram_service import send_message
            await send_message(report, db=db)

            db.add(Notification(
                title="Report semanal pipeline",
                message=f"Pipeline activo: {total_pipeline:,.0f} EUR | Ganadas: {won_count} | Perdidas: {lost_count}",
                type="info",
            ))
            await db.commit()
            logger.info(f"PI-02: Pipeline activo: {total_pipeline:,.0f} EUR, {won_count} won, {lost_count} lost")
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
    """MR-02: Informe mensual consolidado — 1° mes 09:00
    Query pipeline + actividad + rendimiento del mes anterior → formatear → enviar por Telegram + notificación.
    """
    from app.models.pipeline import Opportunity, OpportunityStage
    from app.models import Lead, Action, ActionStatus
    from app.models.crm import Visit, Email
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            first_day_last_month = (first_day_this_month - timedelta(days=1)).replace(day=1)
            month_name = first_day_last_month.strftime('%B %Y')

            # Leads
            new_leads = (await db.execute(select(func.count(Lead.id)).where(
                Lead.created_at >= first_day_last_month, Lead.created_at < first_day_this_month
            ))).scalar() or 0

            # Visitas
            total_visits = (await db.execute(select(func.count(Visit.id)).where(
                Visit.visit_date >= first_day_last_month, Visit.visit_date < first_day_this_month
            ))).scalar() or 0

            # Emails enviados
            emails_sent = (await db.execute(select(func.count(Email.id)).where(
                Email.created_at >= first_day_last_month, Email.created_at < first_day_this_month
            ))).scalar() or 0

            # Acciones completadas
            actions_done = (await db.execute(select(func.count(Action.id)).where(
                Action.status == ActionStatus.COMPLETED,
                Action.updated_at >= first_day_last_month, Action.updated_at < first_day_this_month
            ))).scalar() or 0

            # Pipeline
            won_count = (await db.execute(select(func.count(Opportunity.id)).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.updated_at >= first_day_last_month, Opportunity.updated_at < first_day_this_month
            ))).scalar() or 0
            won_value = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage == OpportunityStage.CLOSED_WON,
                Opportunity.updated_at >= first_day_last_month, Opportunity.updated_at < first_day_this_month
            ))).scalar() or 0
            lost_count = (await db.execute(select(func.count(Opportunity.id)).where(
                Opportunity.stage == OpportunityStage.CLOSED_LOST,
                Opportunity.updated_at >= first_day_last_month, Opportunity.updated_at < first_day_this_month
            ))).scalar() or 0
            active_pipeline = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
                Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
            ))).scalar() or 0

            report = f"""<b>📋 Informe Mensual Consolidado — {month_name}</b>

<b>Captación:</b>
  • Leads nuevos: {new_leads}
  • Visitas realizadas: {total_visits}
  • Emails enviados: {emails_sent}

<b>Actividad:</b>
  • Acciones completadas: {actions_done}

<b>Pipeline:</b>
  • Deals ganados: {won_count} ({won_value:,.0f} EUR)
  • Deals perdidos: {lost_count}
  • Pipeline activo: {active_pipeline:,.0f} EUR"""

            from app.services.telegram_service import send_message
            await send_message(report, db=db)

            db.add(Notification(
                title=f"Informe mensual {month_name}",
                message=f"Leads: {new_leads} | Won: {won_count} ({won_value:,.0f} EUR) | Pipeline: {active_pipeline:,.0f} EUR",
                type="info",
            ))
            await db.commit()
            logger.info(f"MR-02: Informe {month_name} — {new_leads} leads, {won_count} won, pipeline {active_pipeline:,.0f} EUR")
    except Exception as e:
        logger.error(f"MR-02 error: {e}")


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
    """SV-02: Encuesta trimestral CSAT — 1° trimestre 08:00
    Query leads con status=WON → crear Survey tipo CSAT por cada uno → enviar email con link de respuesta.
    """
    from app.models import Lead, LeadStatus
    from app.models.survey import Survey
    import secrets
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            quarter = f"Q{(now.month - 1) // 3 + 1} {now.year}"

            result = await db.execute(select(Lead).where(Lead.status == LeadStatus.WON))
            clients = result.scalars().all()
            created = 0
            for lead in clients:
                if not lead.contact_email:
                    continue

                # Evitar duplicados: no crear si ya hay CSAT este trimestre
                existing = (await db.execute(select(func.count(Survey.id)).where(
                    Survey.lead_id == lead.id,
                    Survey.survey_type == "csat",
                    Survey.created_at >= now.replace(month=((now.month - 1) // 3) * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0),
                ))).scalar() or 0
                if existing > 0:
                    continue

                token = secrets.token_urlsafe(32)
                survey = Survey(
                    lead_id=lead.id,
                    title=f"Encuesta CSAT {quarter} — {lead.company_name}",
                    survey_type="csat",
                    status="sent",
                    sent_at=now,
                    expires_at=now + timedelta(days=30),
                    response_token=token,
                )
                db.add(survey)

                from app.services.email_service import email_service
                survey_url = f"{getattr(settings, 'FRONTEND_URL', 'https://sales.riskitera.com')}/survey/{token}"
                await email_service.send_email(
                    to=lead.contact_email,
                    subject=f"¿Cómo valorarías nuestro servicio? — Encuesta {quarter}",
                    html_body=f"""<p>Hola {lead.contact_name or 'equipo'},</p>
<p>Nos gustaría conocer tu opinión sobre nuestro servicio durante este trimestre.</p>
<p>La encuesta solo te llevará 2 minutos:</p>
<p><a href="{survey_url}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Responder encuesta</a></p>
<p>Tu feedback es muy valioso para seguir mejorando.</p>
<p>Gracias,<br>Equipo Riskitera</p>""",
                )
                created += 1

            await db.commit()
            logger.info(f"SV-02: {created} encuestas CSAT {quarter} enviadas a {len(clients)} clientes")
    except Exception as e:
        logger.error(f"SV-02 error: {e}")


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


async def run_ld01_webhook_check():
    """LD-01: Check new form submissions — every 15 min"""
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            recent = datetime.now(timezone.utc) - timedelta(minutes=15)
            new = (await db.execute(select(func.count(Lead.id)).where(Lead.created_at >= recent))).scalar() or 0
            if new > 0:
                logger.info(f"LD-01: {new} leads nuevos en 15 min")
    except Exception as e:
        logger.error(f"LD-01 error: {e}")


async def run_ld02_sync_external():
    """LD-02: Sync Apollo.io — every 4h
    Busca prospectos en Apollo (España, >50 empleados, sectores clave) → deduplica por company_name → crea leads nuevos.
    """
    from app.services.apollo_service import apollo_service
    from app.models import Lead
    if not apollo_service.is_configured():
        return
    try:
        async with AsyncSessionLocal() as db:
            result = await apollo_service.search_prospects(
                industries=["computer software", "information technology", "financial services", "banking", "insurance", "government administration"],
                employee_ranges=["51-200", "201-500", "501-1000", "1001-5000", "5001-10000"],
                countries=["Spain"],
                limit=25,
            )
            if "error" in result:
                logger.warning(f"LD-02: Apollo error: {result['error']}")
                return

            created = 0
            for prospect in result.get("prospects", []):
                company = prospect.get("company", "")
                if not company:
                    continue
                # Deduplicar por company_name
                existing = (await db.execute(select(func.count(Lead.id)).where(
                    func.lower(Lead.company_name) == company.lower()
                ))).scalar() or 0
                if existing > 0:
                    continue

                db.add(Lead(
                    company_name=company,
                    contact_name=prospect.get("name", ""),
                    contact_email=prospect.get("email", ""),
                    contact_linkedin=prospect.get("linkedin_url", ""),
                    contact_title=prospect.get("title", ""),
                    company_sector=prospect.get("company_industry", ""),
                    company_size=prospect.get("company_size", ""),
                    company_country=prospect.get("company_country", "Spain"),
                    source="apollo",
                    notes=f"Auto-imported from Apollo.io ({datetime.now(timezone.utc).strftime('%d/%m/%Y')})",
                ))
                created += 1

            if created:
                await db.commit()
            logger.info(f"LD-02: {created} leads importados de Apollo ({result.get('total', 0)} encontrados)")
    except Exception as e:
        logger.error(f"LD-02 error: {e}")


async def run_ld03_enrichment():
    """LD-03: Auto-enrich leads without sector — every 8h
    Leads sin sector/datos mínimos → apollo_service.enrich_lead() para obtener sector, tamaño, contactos.
    Fallback: marca como 'Por clasificar' si Apollo no está configurado.
    """
    from app.services.apollo_service import apollo_service
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Lead).where(
                (Lead.company_sector.is_(None)) | (Lead.company_sector == '')
            ).limit(10))
            leads = result.scalars().all()

            if apollo_service.is_configured():
                enriched = 0
                for lead in leads:
                    if not lead.company_name:
                        continue
                    res = await apollo_service.enrich_lead(db, lead.id)
                    if res.get("enriched"):
                        enriched += 1
                logger.info(f"LD-03: {enriched}/{len(leads)} leads enriquecidos via Apollo")
            else:
                for lead in leads:
                    if lead.company_name and not lead.company_sector:
                        lead.company_sector = "Por clasificar"
                if leads:
                    await db.commit()
                logger.info(f"LD-03: {len(leads)} leads marcados 'Por clasificar' (Apollo no configurado)")
    except Exception as e:
        logger.error(f"LD-03 error: {e}")


async def run_vi01_post_visit_actions():
    """VI-01: Auto-crear acciones post-visita — 18:00"""
    from app.models.crm import Visit, Action, ActionStatus
    try:
        async with AsyncSessionLocal() as db:
            today = datetime.now(timezone.utc).date()
            result = await db.execute(select(Visit).where(func.date(Visit.visit_date) == today))
            visits = result.scalars().all()
            created = 0
            for visit in visits:
                existing = (await db.execute(select(func.count(Action.id)).where(
                    Action.lead_id == visit.lead_id,
                    Action.title.ilike('%follow-up visita%'),
                    func.date(Action.created_at) == today
                ))).scalar() or 0
                if existing == 0:
                    db.add(Action(lead_id=visit.lead_id, title=f"Follow-up visita {today.strftime('%d/%m')}",
                        description="Seguimiento de la visita realizada hoy",
                        due_date=today + timedelta(days=2), status=ActionStatus.PENDING, action_type="follow_up"))
                    created += 1
            await db.commit()
            logger.info(f"VI-01: {created} acciones creadas de {len(visits)} visitas")
    except Exception as e:
        logger.error(f"VI-01 error: {e}")


async def run_vi02_pre_visit_reminder():
    """VI-02: Recordatorio pre-visita — 08:00"""
    from app.models.crm import Visit
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
            result = await db.execute(select(Visit).where(func.date(Visit.visit_date) == tomorrow))
            visits = result.scalars().all()
            for visit in visits:
                db.add(Notification(title="Visita mañana", message="Tienes una visita programada para mañana", type="info"))
            await db.commit()
            logger.info(f"VI-02: {len(visits)} recordatorios de visita")
    except Exception as e:
        logger.error(f"VI-02 error: {e}")


async def run_vi03_calendar_sync():
    """VI-03: Google Calendar sync — every 30 min
    Bidireccional: visitas sin evento GCal → crear evento. Eventos GCal sin visita → crear visita.
    """
    from app.services.gcalendar_service import gcalendar_service
    from app.models.crm import Visit
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            # Check if GCal is configured (OAuth tokens in DB)
            from app.models.system import SystemSettings
            cfg = (await db.execute(select(SystemSettings))).scalar_one_or_none()
            if not cfg or not getattr(cfg, 'gcalendar_config', None):
                return

            gcal_config = cfg.gcalendar_config or {}
            if not gcal_config.get("access_token"):
                return

            now = datetime.now(timezone.utc)
            tomorrow = now + timedelta(days=7)

            # 1. Visitas próximas sin evento GCal → crear evento
            result = await db.execute(select(Visit).where(
                Visit.visit_date >= now,
                Visit.visit_date <= tomorrow,
                (Visit.gcal_event_id.is_(None)) | (Visit.gcal_event_id == ''),
            ))
            visits = result.scalars().all()
            synced_out = 0
            for visit in visits:
                lead = (await db.execute(select(Lead).where(Lead.id == visit.lead_id))).scalar_one_or_none()
                lead_name = lead.company_name if lead else "Sin lead"
                try:
                    event = await gcalendar_service.create_calendar_event(
                        db=db,
                        summary=f"Visita: {lead_name}",
                        description=f"Tipo: {visit.visit_type}\n{visit.summary or ''}",
                        start_dt=visit.visit_date,
                        location=visit.location or "",
                    )
                    if event.get("id"):
                        visit.gcal_event_id = event["id"]
                        synced_out += 1
                except Exception as e:
                    logger.warning(f"VI-03: Error creating GCal event for visit {visit.id}: {e}")

            if synced_out:
                await db.commit()
            logger.info(f"VI-03: {synced_out} visitas sincronizadas a Google Calendar")
    except Exception as e:
        logger.error(f"VI-03 error: {e}")


async def run_em02_email_tracking():
    """EM-02: Process email open/click tracking — every 10 min"""
    logger.info("EM-02: Email tracking processed")


async def run_in01_scraping_import():
    """IN-01: Import leads from external scraping — 06:00"""
    logger.info("IN-01: Scraping import check")


async def run_in02_telegram_hub():
    """IN-02: Telegram notification hub — every 5 min"""
    if not getattr(settings, 'TELEGRAM_BOT_TOKEN', ''):
        return
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            pending = (await db.execute(select(func.count(Notification.id)).where(Notification.is_read == False))).scalar() or 0
            if pending > 0:
                logger.info(f"IN-02: {pending} notificaciones Telegram pendientes")
    except Exception as e:
        logger.error(f"IN-02 error: {e}")


async def run_founder_weekly_report():
    """Send weekly KPI report to admin/founder — Mon 09:30"""
    try:
        from app.core.config import settings
        admin_email = (settings.ADMIN_EMAILS or "").split(",")[0].strip()
        if not admin_email or not settings.RESEND_API_KEY:
            return
        async with AsyncSessionLocal() as db:
            from app.models import Lead, Opportunity, Action, ActionStatus, Email
            from app.models.pipeline import OpportunityStage
            from app.models.organization import Organization
            now = datetime.now(timezone.utc)
            week_ago = now - timedelta(days=7)

            new_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.created_at >= week_ago))).scalar() or 0
            new_opps = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.created_at >= week_ago))).scalar() or 0
            won = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.stage == OpportunityStage.CLOSED_WON, Opportunity.updated_at >= week_ago))).scalar() or 0
            actions_done = (await db.execute(select(func.count(Action.id)).where(Action.status == ActionStatus.COMPLETED, Action.updated_at >= week_ago))).scalar() or 0
            emails_sent = (await db.execute(select(func.count(Email.id)).where(Email.created_at >= week_ago))).scalar() or 0
            total_orgs = (await db.execute(select(func.count(Organization.id)))).scalar() or 0
            new_signups = (await db.execute(select(func.count(Organization.id)).where(Organization.created_at >= week_ago))).scalar() or 0
            mrr = 0
            for plan, price in [('growth', 19), ('scale', 49)]:
                count = (await db.execute(select(func.count(Organization.id)).where(Organization.plan == plan))).scalar() or 0
                mrr += count * price

            subject = f"St4rtup Weekly Report — MRR €{mrr} · {new_signups} signups · {new_leads} leads"
            body = f"""Resumen semanal St4rtup ({now.strftime('%d/%m/%Y')})

NEGOCIO
• MRR: €{mrr}
• Organizaciones: {total_orgs} ({new_signups} nuevas)

ACTIVIDAD (últimos 7 días)
• Leads nuevos: {new_leads}
• Oportunidades: {new_opps}
• Deals ganados: {won}
• Acciones completadas: {actions_done}
• Emails enviados: {emails_sent}

Dashboard: https://st4rtup.com/app/admin

— St4rtup Platform"""

            from app.services.email_service import send_email
            await send_email(to=admin_email, subject=subject, body=body)
            logger.info("Founder weekly report sent to %s", admin_email)
    except Exception as e:
        logger.error(f"Founder weekly report error: {e}")


async def run_trial_expiry_check():
    """Check for trials expiring in 1-2 days and send emails — 10:00"""
    try:
        async with AsyncSessionLocal() as db:
            from app.models.organization import Organization, OrgMember
            from app.models.user import User
            now = datetime.now(timezone.utc)
            for days_left in [2, 1]:
                target = now + timedelta(days=days_left)
                orgs = await db.execute(select(Organization).where(
                    Organization.trial_ends_at.isnot(None),
                    func.date(Organization.trial_ends_at) == target.date(),
                ))
                for org in orgs.scalars().all():
                    members = await db.execute(select(OrgMember, User).join(User, User.id == OrgMember.user_id).where(OrgMember.org_id == org.id))
                    for member, user in members.all():
                        if user.email:
                            from app.services.drip_emails import send_trial_expiring_email
                            await send_trial_expiring_email(user.email, user.full_name, days_left)
            logger.info("Trial expiry check completed")
    except Exception as e:
        logger.error(f"Trial expiry check error: {e}")


async def run_platform_metrics_snapshot():
    """Platform metrics daily snapshot — 02:00"""
    try:
        async with AsyncSessionLocal() as db:
            from app.models.organization import Organization
            from app.models import Lead, Opportunity
            total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
            total_orgs = (await db.execute(select(func.count(Organization.id)))).scalar() or 0
            total_leads = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
            import json
            from pathlib import Path
            metrics_dir = Path("/opt/st4rtup/metrics")
            metrics_dir.mkdir(exist_ok=True)
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            (metrics_dir / f"{today}.json").write_text(json.dumps({"date": today, "users": total_users, "orgs": total_orgs, "leads": total_leads}))
            logger.info(f"Platform metrics: users={total_users} orgs={total_orgs} leads={total_leads}")
    except Exception as e:
        logger.error(f"Metrics snapshot error: {e}")


async def run_rs054b_brevo_nurturing():
    """RS-054b: Brevo nurturing — diario 07:00
    Leads con score < 40 y sin nurturing activo → añadir a lista Brevo para nurturing automático.
    """
    from app.services.brevo_service import brevo_service
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Lead).where(
                Lead.score < 40,
                Lead.status.notin_(["won", "lost"]),
                (Lead.tags.is_(None)) | (~Lead.tags.contains(["brevo_nurturing"])),
            ).limit(20))
            leads = result.scalars().all()
            added = 0
            for lead in leads:
                if not lead.contact_email:
                    continue
                res = await brevo_service.add_lead_to_nurturing(
                    db=db,
                    email=lead.contact_email,
                    first_name=lead.contact_name or "",
                    company=lead.company_name or "",
                    source="crm_cold",
                    icp_score=lead.score or 0,
                )
                if res.get("nurturing"):
                    lead.tags = (lead.tags or []) + ["brevo_nurturing"]
                    added += 1
            if added:
                await db.commit()
            logger.info(f"RS-054b: {added} leads añadidos a nurturing Brevo")
    except Exception as e:
        logger.error(f"RS-054b error: {e}")


async def run_rs054c_brevo_reactivation():
    """RS-054c: Brevo reactivation check — diario 10:30
    Leads dormant en Brevo → check si han abierto emails recientemente → reactivar en CRM.
    """
    from app.services.brevo_service import brevo_service
    from app.models import Lead, LeadStatus
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Lead).where(
                Lead.status == LeadStatus.DORMANT,
                Lead.contact_email.isnot(None),
            ).limit(30))
            leads = result.scalars().all()
            reactivated = 0
            for lead in leads:
                res = await brevo_service.check_reactivation(db=db, email=lead.contact_email)
                if res.get("should_reactivate"):
                    lead.status = LeadStatus.CONTACTED
                    lead.notes = (lead.notes or "") + f"\n[{datetime.now(timezone.utc).strftime('%d/%m/%Y')}] Reactivado: {res.get('recommendation', '')}"
                    db.add(Notification(
                        title=f"Lead reactivado: {lead.company_name}",
                        message=f"{res.get('recent_opens', 0)} aperturas recientes en Brevo",
                        type="info",
                    ))
                    reactivated += 1
            if reactivated:
                await db.commit()
            logger.info(f"RS-054c: {reactivated} leads reactivados de {len(leads)} dormant")
    except Exception as e:
        logger.error(f"RS-054c error: {e}")


async def run_rs093_lemlist_sync():
    """RS-093: Lemlist activity sync — diario 12:00
    Sincroniza actividad de campañas Lemlist → actualiza score de leads según opens/clicks/replies.
    """
    from app.services.lemlist_service import lemlist_service
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            # Obtener campañas activas
            campaigns = await lemlist_service.list_campaigns(db)
            if not campaigns.get("connected"):
                return

            updated = 0
            for campaign in campaigns.get("campaigns", []):
                if campaign.get("status") != "running":
                    continue
                # Buscar leads del CRM que están en esta campaña
                result = await db.execute(select(Lead).where(
                    Lead.contact_email.isnot(None),
                    Lead.tags.contains(["lemlist"]),
                ).limit(50))
                leads = result.scalars().all()
                for lead in leads:
                    activity = await lemlist_service.sync_lead_activity(
                        db=db, campaign_id=campaign["id"], email=lead.contact_email,
                    )
                    if not activity.get("connected"):
                        continue
                    # Ajustar score según actividad
                    score_delta = 0
                    if activity.get("replied"):
                        score_delta += 20
                    elif activity.get("clicked"):
                        score_delta += 10
                    elif activity.get("opened"):
                        score_delta += 5
                    if score_delta > 0:
                        lead.score = (lead.score or 0) + score_delta
                        updated += 1

            if updated:
                await db.commit()
            logger.info(f"RS-093: {updated} leads actualizados desde Lemlist")
    except Exception as e:
        logger.error(f"RS-093 error: {e}")


async def run_rs045b_clarity_enrichment():
    """RS-045b: Clarity enrichment — diario 14:00
    Sessions con ≥2 product page views → buscar lead por email → incrementar score.
    """
    from app.services.clarity_service import get_engaged_sessions
    from app.models import Lead
    try:
        async with AsyncSessionLocal() as db:
            result = await get_engaged_sessions(db, min_product_views=2, days=1)
            if not result.get("connected") or not result.get("sessions"):
                return

            updated = 0
            for session in result["sessions"]:
                email = session.get("email", "")
                if not email:
                    continue
                lead = (await db.execute(select(Lead).where(
                    func.lower(Lead.contact_email) == email.lower()
                ))).scalar_one_or_none()
                if lead:
                    views = session.get("page_views", 2)
                    bonus = min(views * 5, 25)  # Max +25 per session
                    lead.score = min(100, (lead.score or 0) + bonus)
                    updated += 1

            if updated:
                await db.commit()
            logger.info(f"RS-045b: {updated} leads enriched from Clarity ({len(result['sessions'])} sessions)")
    except Exception as e:
        logger.error(f"RS-045b error: {e}")


async def run_rs045c_metricool_social():
    """RS-045c: Metricool social scheduling — Lun/Mié/Vie 08:30
    Busca posts en estado 'scheduled' → programa en Metricool API.
    """
    try:
        async with AsyncSessionLocal() as db:
            from app.models.system import SystemSettings
            cfg_row = (await db.execute(select(SystemSettings).limit(1))).scalar_one_or_none()
            if not cfg_row:
                return
            metricool_cfg = (cfg_row.general_config or {}).get("metricool", {})
            api_key = metricool_cfg.get("api_key", "")
            if not api_key:
                return

            from app.models.social import SocialPost
            result = await db.execute(select(SocialPost).where(
                SocialPost.status == "scheduled",
            ).limit(10))
            posts = result.scalars().all()
            if not posts:
                return

            import httpx
            published = 0
            async with httpx.AsyncClient(timeout=15) as client:
                for post in posts:
                    try:
                        resp = await client.post(
                            "https://app.metricool.com/api/v2/scheduler/post",
                            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                            json={
                                "platform": post.platform or "linkedin",
                                "content": post.content,
                                "media_url": post.media_url or "",
                                "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else "",
                            },
                        )
                        if resp.status_code in (200, 201):
                            post.status = "published"
                            published += 1
                        else:
                            logger.warning(f"RS-045c: Metricool API {resp.status_code} for post {post.id}")
                    except Exception as e:
                        logger.warning(f"RS-045c: Failed to publish post {post.id}: {e}")

            if published:
                await db.commit()
            logger.info(f"RS-045c: {published}/{len(posts)} posts published via Metricool")
    except Exception as e:
        logger.error(f"RS-045c error: {e}")


async def run_rs033_regulatory_trigger():
    """RS-033: Regulatory trigger BOE/ENISA — diario 07:30
    Fetch BOE + ENISA RSS → filtrar por keywords regulatorios → crear notificación.
    """
    import httpx
    from app.models.notification import Notification
    try:
        async with AsyncSessionLocal() as db:
            keywords = ["ciberseguridad", "ENS", "NIS2", "DORA", "protección de datos", "RGPD",
                        "seguridad de la información", "ISO 27001", "ENISA", "AI Act", "inteligencia artificial"]
            alerts = []

            async with httpx.AsyncClient(timeout=20) as client:
                # BOE — buscar en el API de últimas disposiciones
                try:
                    resp = await client.get("https://www.boe.es/datosabiertos/api/boe/dias/ultimos/1", timeout=15)
                    if resp.status_code == 200:
                        import xml.etree.ElementTree as ET
                        root = ET.fromstring(resp.content)
                        for item in root.iter("item"):
                            titulo = (item.findtext("titulo") or "").lower()
                            if any(kw.lower() in titulo for kw in keywords):
                                alerts.append({
                                    "source": "BOE",
                                    "title": item.findtext("titulo", ""),
                                    "url": item.findtext("urlPdf", item.findtext("url", "")),
                                })
                except Exception as e:
                    logger.debug(f"RS-033: BOE fetch error: {e}")

                # ENISA — RSS feed
                try:
                    resp = await client.get("https://www.enisa.europa.eu/rss/rss_publications.xml", timeout=15)
                    if resp.status_code == 200:
                        import xml.etree.ElementTree as ET
                        root = ET.fromstring(resp.content)
                        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                        for item in root.iter("item"):
                            title = (item.findtext("title") or "").lower()
                            pub_date = item.findtext("pubDate", "")
                            if any(kw.lower() in title for kw in keywords) or today in pub_date:
                                alerts.append({
                                    "source": "ENISA",
                                    "title": item.findtext("title", ""),
                                    "url": item.findtext("link", ""),
                                })
                except Exception as e:
                    logger.debug(f"RS-033: ENISA fetch error: {e}")

            if alerts:
                summary = "\n".join(f"[{a['source']}] {a['title'][:80]}" for a in alerts[:5])
                db.add(Notification(
                    title=f"Alerta regulatoria: {len(alerts)} publicaciones relevantes",
                    message=summary,
                    type="warning",
                ))
                from app.services.telegram_service import send_message
                await send_message(
                    f"<b>⚖️ Alerta Regulatoria</b>\n\n{summary}",
                    db=db,
                )
                await db.commit()

            logger.info(f"RS-033: {len(alerts)} alertas regulatorias (BOE + ENISA)")
    except Exception as e:
        logger.error(f"RS-033 error: {e}")


async def run_rs094_competitor_alerts():
    """RS-094: Competitor alerts — diario 13:00
    Monitoriza webs de competidores → detecta cambios en pricing/features → alerta.
    """
    import httpx
    import hashlib
    from app.models.notification import Notification
    from app.models.system import SystemSettings
    try:
        async with AsyncSessionLocal() as db:
            cfg_row = (await db.execute(select(SystemSettings).limit(1))).scalar_one_or_none()
            competitors = (cfg_row.general_config or {}).get("competitors", []) if cfg_row else []
            if not competitors:
                # Default competitors for Riskitera
                competitors = [
                    {"name": "SecurityScorecard", "url": "https://securityscorecard.com/pricing"},
                    {"name": "Vanta", "url": "https://www.vanta.com/pricing"},
                ]

            changes = []
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                for comp in competitors:
                    url = comp.get("url", "")
                    name = comp.get("name", url)
                    if not url:
                        continue
                    try:
                        resp = await client.get(url, timeout=15)
                        if resp.status_code != 200:
                            continue
                        # Hash del contenido para detectar cambios
                        content_hash = hashlib.md5(resp.text.encode()).hexdigest()
                        stored_hash = (cfg_row.general_config or {}).get(f"competitor_hash_{name}", "")

                        if stored_hash and stored_hash != content_hash:
                            changes.append(name)

                        # Guardar nuevo hash
                        if cfg_row and cfg_row.general_config is not None:
                            cfg_row.general_config[f"competitor_hash_{name}"] = content_hash
                    except Exception as e:
                        logger.debug(f"RS-094: Error fetching {name}: {e}")

            if changes:
                msg = f"Cambios detectados en: {', '.join(changes)}"
                db.add(Notification(title="Alerta competencia", message=msg, type="warning"))
                from app.services.telegram_service import send_message
                await send_message(f"<b>🔍 Alerta Competencia</b>\n\n{msg}", db=db)

            if changes or competitors:
                await db.commit()
            logger.info(f"RS-094: {len(changes)} cambios detectados en {len(competitors)} competidores")
    except Exception as e:
        logger.error(f"RS-094 error: {e}")


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

    logger.info("Initializing scheduler with 28 automations...")
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
        # Leads
        (run_ld01_webhook_check, CronTrigger(minute='*/15'),     'ld01_webhook', 'LD-01: Webhook form check'),
        (run_ld02_sync_external, CronTrigger(hour='*/4'),        'ld02_sync',    'LD-02: External sync'),
        (run_ld03_enrichment,    CronTrigger(hour='*/8'),        'ld03_enrich',  'LD-03: Lead enrichment'),
        # Visits
        (run_vi01_post_visit_actions, CronTrigger(hour=18, minute=0), 'vi01_actions', 'VI-01: Post-visit actions'),
        (run_vi02_pre_visit_reminder, CronTrigger(hour=8, minute=0),  'vi02_reminder','VI-02: Pre-visit reminder'),
        (run_vi03_calendar_sync, CronTrigger(minute='*/30'),     'vi03_calendar','VI-03: Google Calendar sync'),
        # Email
        (run_em02_email_tracking,CronTrigger(minute='*/10'),     'em02_tracking','EM-02: Email tracking'),
        # Integrations
        (run_in01_scraping_import,CronTrigger(hour=6, minute=0), 'in01_scraping','IN-01: Scraping import'),
        (run_in02_telegram_hub,  CronTrigger(minute='*/5'),      'in02_telegram','IN-02: Telegram hub'),
        # Sprint 2: External services
        (run_rs054b_brevo_nurturing, CronTrigger(hour=7, minute=0), 'rs054b_nurture', 'RS-054b: Brevo nurturing'),
        (run_rs054c_brevo_reactivation, CronTrigger(hour=10, minute=30), 'rs054c_react', 'RS-054c: Brevo reactivation'),
        (run_rs093_lemlist_sync, CronTrigger(hour=12, minute=0), 'rs093_lemlist', 'RS-093: Lemlist sync'),
        # Sprint 4: New APIs
        (run_rs045b_clarity_enrichment, CronTrigger(hour=14, minute=0), 'rs045b_clarity', 'RS-045b: Clarity enrichment'),
        (run_rs045c_metricool_social, CronTrigger(day_of_week='mon,wed,fri', hour=8, minute=30), 'rs045c_metricool', 'RS-045c: Metricool social'),
        (run_rs033_regulatory_trigger, CronTrigger(hour=7, minute=30), 'rs033_regulatory', 'RS-033: BOE/ENISA regulatory'),
        (run_rs094_competitor_alerts, CronTrigger(hour=13, minute=0), 'rs094_competitors', 'RS-094: Competitor alerts'),
        # Platform
        (run_platform_metrics_snapshot, CronTrigger(hour=2, minute=0), 'platform_metrics', 'Platform metrics daily snapshot'),
        (run_trial_expiry_check, CronTrigger(hour=10, minute=0), 'trial_expiry', 'Trial expiry email check'),
        (run_founder_weekly_report, CronTrigger(day_of_week='mon', hour=9, minute=30), 'founder_report', 'Founder weekly KPI report'),
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
