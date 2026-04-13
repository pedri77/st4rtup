"""
Servicio para crear notificaciones automáticas del sistema.
Se llama desde los endpoints cuando ocurren eventos importantes.
"""
import asyncio
import logging
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType, NotificationPriority
import json

logger = logging.getLogger(__name__)


def fire_and_forget(coro):
    """Schedule a coroutine to run in the background with its own DB session.

    Usage in endpoints:
        fire_and_forget(notification_service.notify_lead_created(db, ...))
    becomes:
        fire_and_forget_bg(lambda db: notification_service.notify_lead_created(db, ...))
    """
    async def _wrapper():
        try:
            await coro
        except Exception:
            logger.debug("Background notification failed", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_wrapper())
    except RuntimeError:
        pass


def fire_and_forget_bg(coro_factory):
    """Schedule a coroutine factory that receives a fresh DB session.

    Usage:
        fire_and_forget_bg(lambda db: notification_service.notify_lead_created(db, user_id=..., ...))
    """
    async def _wrapper():
        from app.core.database import AsyncSessionLocal
        try:
            async with AsyncSessionLocal() as db:
                await coro_factory(db)
        except Exception:
            logger.debug("Background notification failed", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_wrapper())
    except RuntimeError:
        pass


class NotificationService:
    """Servicio centralizado para crear notificaciones y enviar a Telegram."""

    @staticmethod
    async def _send_telegram(db: AsyncSession, title: str, message: str):
        """Intenta enviar a Telegram (silencia errores)."""
        try:
            from app.services.telegram_service import send_message
            text = f"<b>{title}</b>\n{message}"
            await send_message(text, db)
        except Exception:
            pass  # Telegram es opcional

    @staticmethod
    async def _send_slack_teams(db: AsyncSession, title: str, message: str):
        """Intenta enviar a Slack y Teams (silencia errores)."""
        try:
            from app.services.slack_teams_service import notify_all_channels
            await notify_all_channels(db, title, message)
        except Exception:
            pass

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        type: NotificationType,
        priority: NotificationPriority,
        title: str,
        message: str,
        event_metadata: dict = None,
        action_url: str = None,
    ) -> Notification:
        """
        Crea una notificacion en la base de datos.
        Si la prioridad es HIGH o URGENT, envia tambien a Telegram.
        """
        notification = Notification(
            user_id=user_id,
            type=type,
            priority=priority,
            title=title,
            message=message,
            event_metadata=json.dumps(event_metadata) if event_metadata else None,
            action_url=action_url,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # Dispatch to external channels for important notifications
        if priority in (NotificationPriority.HIGH, NotificationPriority.URGENT):
            await NotificationService._send_telegram(db, title, message)
            await NotificationService._send_slack_teams(db, title, message)

        return notification

    # === LEADS ===
    @staticmethod
    async def notify_lead_created(
        db: AsyncSession,
        user_id: UUID,
        lead_id: UUID,
        company_name: str,
        source: str = None,
    ):
        """Notifica cuando se crea un nuevo lead"""
        source_text = f" desde {source}" if source else ""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.LEAD,
            priority=NotificationPriority.MEDIUM,
            title="🎯 Nuevo lead capturado",
            message=f"Se ha creado un nuevo lead: {company_name}{source_text}",
            event_metadata={"lead_id": str(lead_id), "company_name": company_name, "source": source},
            action_url=f"/leads/{lead_id}",
        )

    @staticmethod
    async def notify_lead_status_changed(
        db: AsyncSession,
        user_id: UUID,
        lead_id: UUID,
        company_name: str,
        old_status: str,
        new_status: str,
    ):
        """Notifica cuando cambia el estado de un lead"""
        priority = NotificationPriority.HIGH if new_status in ["qualified", "proposal"] else NotificationPriority.MEDIUM

        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.LEAD,
            priority=priority,
            title=f"Lead actualizado: {company_name}",
            message=f'Estado cambió de "{old_status}" a "{new_status}"',
            event_metadata={
                "lead_id": str(lead_id),
                "company_name": company_name,
                "old_status": old_status,
                "new_status": new_status,
            },
            action_url=f"/leads/{lead_id}",
        )

    @staticmethod
    async def notify_high_score_lead(
        db: AsyncSession,
        user_id: UUID,
        lead_id: UUID,
        company_name: str,
        score: int,
    ):
        """Notifica cuando un lead tiene un score muy alto (>= 80)"""
        if score >= 80:
            await NotificationService.create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.LEAD,
                priority=NotificationPriority.HIGH,
                title="🔥 Lead de alta calidad",
                message=f"{company_name} tiene un score de {score}. ¡Requiere atención prioritaria!",
                event_metadata={"lead_id": str(lead_id), "company_name": company_name, "score": score},
                action_url=f"/leads/{lead_id}",
            )

    # === OPPORTUNITIES ===
    @staticmethod
    async def notify_opportunity_created(
        db: AsyncSession,
        user_id: UUID,
        opportunity_id: UUID,
        name: str,
        amount: float = None,
    ):
        """Notifica cuando se crea una nueva oportunidad"""
        amount_text = f" por {amount:,.0f}€" if amount else ""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.OPPORTUNITY,
            priority=NotificationPriority.HIGH,
            title="💰 Nueva oportunidad",
            message=f'Se ha creado "{name}"{amount_text}',
            event_metadata={"opportunity_id": str(opportunity_id), "name": name, "amount": amount},
            action_url="/pipeline",
        )

    @staticmethod
    async def notify_opportunity_stage_changed(
        db: AsyncSession,
        user_id: UUID,
        opportunity_id: UUID,
        name: str,
        old_stage: str,
        new_stage: str,
    ):
        """Notifica cuando cambia la etapa de una oportunidad"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.OPPORTUNITY,
            priority=NotificationPriority.MEDIUM,
            title="Oportunidad actualizada",
            message=f'"{name}" pasó de {old_stage} a {new_stage}',
            event_metadata={
                "opportunity_id": str(opportunity_id),
                "name": name,
                "old_stage": old_stage,
                "new_stage": new_stage,
            },
            action_url="/pipeline",
        )

    @staticmethod
    async def notify_opportunity_won(
        db: AsyncSession,
        user_id: UUID,
        opportunity_id: UUID,
        name: str,
        amount: float,
    ):
        """Notifica cuando se gana una oportunidad"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.OPPORTUNITY,
            priority=NotificationPriority.HIGH,
            title="🎉 ¡Oportunidad ganada!",
            message=f'"{name}" se cerró con éxito por {amount:,.0f}€',
            event_metadata={"opportunity_id": str(opportunity_id), "name": name, "amount": amount},
            action_url="/pipeline",
        )

    # === ACTIONS ===
    @staticmethod
    async def notify_action_created(
        db: AsyncSession,
        user_id: UUID,
        action_id: UUID,
        title: str,
        due_date: datetime = None,
    ):
        """Notifica cuando se crea una nueva acción"""
        due_text = f" (vence el {due_date.strftime('%d/%m/%Y')})" if due_date else ""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.ACTION,
            priority=NotificationPriority.MEDIUM,
            title="✅ Nueva acción asignada",
            message=f"{title}{due_text}",
            event_metadata={"action_id": str(action_id), "title": title},
            action_url="/actions",
        )

    @staticmethod
    async def notify_action_due_soon(
        db: AsyncSession,
        user_id: UUID,
        action_id: UUID,
        title: str,
        due_date: datetime,
    ):
        """Notifica cuando una acción está próxima a vencer (1-2 días)"""
        days_until = (due_date.date() - datetime.now().date()).days

        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.ACTION,
            priority=NotificationPriority.HIGH,
            title="⏰ Acción próxima a vencer",
            message=f'"{title}" vence en {days_until} día(s)',
            event_metadata={"action_id": str(action_id), "title": title, "days_until": days_until},
            action_url="/actions",
        )

    @staticmethod
    async def notify_action_overdue(
        db: AsyncSession,
        user_id: UUID,
        action_id: UUID,
        title: str,
        days_overdue: int,
    ):
        """Notifica cuando una acción está vencida"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.ACTION,
            priority=NotificationPriority.URGENT,
            title="🚨 Acción vencida",
            message=f'"{title}" está vencida desde hace {days_overdue} día(s)',
            event_metadata={"action_id": str(action_id), "title": title, "days_overdue": days_overdue},
            action_url="/actions",
        )

    # === VISITS ===
    @staticmethod
    async def notify_visit_scheduled(
        db: AsyncSession,
        user_id: UUID,
        visit_id: UUID,
        company_name: str,
        visit_date: datetime,
    ):
        """Notifica cuando se programa una visita"""
        date_text = visit_date.strftime("%d/%m/%Y a las %H:%M")
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.VISIT,
            priority=NotificationPriority.MEDIUM,
            title="📅 Visita programada",
            message=f"Tienes una visita con {company_name} el {date_text}",
            event_metadata={"visit_id": str(visit_id), "company_name": company_name},
            action_url="/visits",
        )

    @staticmethod
    async def notify_visit_reminder(
        db: AsyncSession,
        user_id: UUID,
        visit_id: UUID,
        company_name: str,
        hours_until: int,
    ):
        """Recordatorio de visita próxima"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.VISIT,
            priority=NotificationPriority.HIGH,
            title=f"⏰ Visita en {hours_until}h",
            message=f"Recuerda tu visita con {company_name}",
            event_metadata={"visit_id": str(visit_id), "company_name": company_name, "hours_until": hours_until},
            action_url="/visits",
        )

    # === EMAILS ===
    @staticmethod
    async def notify_email_sent(
        db: AsyncSession,
        user_id: UUID,
        email_id: UUID,
        recipient: str,
        subject: str,
    ):
        """Notifica cuando se envía un email exitosamente"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.EMAIL,
            priority=NotificationPriority.LOW,
            title="✉️ Email enviado",
            message=f'"{subject}" enviado a {recipient}',
            event_metadata={"email_id": str(email_id), "recipient": recipient, "subject": subject},
            action_url="/emails",
        )

    @staticmethod
    async def notify_email_bounced(
        db: AsyncSession,
        user_id: UUID,
        email_id: UUID,
        recipient: str,
        subject: str,
    ):
        """Notifica cuando un email rebota"""
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.EMAIL,
            priority=NotificationPriority.HIGH,
            title="❌ Email rebotado",
            message=f'"{subject}" a {recipient} no pudo ser entregado',
            event_metadata={"email_id": str(email_id), "recipient": recipient, "subject": subject},
            action_url="/emails",
        )

    # === AUTOMATION ===
    @staticmethod
    async def notify_automation_executed(
        db: AsyncSession,
        user_id: UUID,
        automation_id: UUID,
        automation_name: str,
        status: str,
    ):
        """Notifica cuando se ejecuta una automatización"""
        priority = NotificationPriority.LOW if status == "success" else NotificationPriority.HIGH
        icon = "✅" if status == "success" else "⚠️"
        status_text = "exitosamente" if status == "success" else "con errores"

        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.AUTOMATION,
            priority=priority,
            title=f"{icon} Automatización: {automation_name}",
            message=f"Se ejecutó {status_text}",
            event_metadata={"automation_id": str(automation_id), "automation_name": automation_name, "status": status},
            action_url="/automations",
        )


notification_service = NotificationService()
