"""Servicio de colas de llamadas (Fase 2 MOD-AICALLS-001)."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.models.call import CallQueue, CallQueueItem, CallPrompt
from app.models.lead import Lead
from app.services.retell_service import initiate_call
from app.core.config import settings

logger = logging.getLogger(__name__)


async def create_queue(
    db: AsyncSession,
    name: str,
    prompt_id: UUID,
    lead_ids: list[UUID],
    user_id: UUID,
    scheduled_at: Optional[datetime] = None,
    concurrency_limit: int = 1,
    delay_between_calls_s: int = 30,
    max_retries: int = 2,
    notes: Optional[str] = None,
) -> CallQueue:
    """Crea una cola de llamadas con sus items."""
    # Verificar prompt
    prompt = await db.get(CallPrompt, prompt_id)
    if not prompt:
        raise ValueError("Prompt no encontrado")

    # Verificar leads existen
    lead_result = await db.execute(
        select(Lead.id).where(Lead.id.in_(lead_ids))
    )
    valid_ids = {row[0] for row in lead_result.all()}
    if not valid_ids:
        raise ValueError("Ningún lead válido encontrado")

    # Estimar coste (duracion_objetivo_min * cost_per_min * leads)
    cost_per_min = getattr(settings, "RETELL_COST_PER_MINUTE", 0.15)
    estimated = len(valid_ids) * prompt.duracion_objetivo_min * cost_per_min

    queue = CallQueue(
        name=name,
        status="pending",
        prompt_id=prompt_id,
        created_by=user_id,
        total_leads=len(valid_ids),
        estimated_cost_eur=round(estimated, 2),
        scheduled_at=scheduled_at,
        concurrency_limit=concurrency_limit,
        delay_between_calls_s=delay_between_calls_s,
        max_retries=max_retries,
        notes=notes,
    )
    db.add(queue)
    await db.flush()

    # Crear items preservando el orden solicitado
    for i, lid in enumerate(lead_ids):
        if lid in valid_ids:
            item = CallQueueItem(
                queue_id=queue.id,
                lead_id=lid,
                position=i,
                status="pending",
            )
            db.add(item)

    await db.commit()
    await db.refresh(queue)
    return queue


async def start_queue(db: AsyncSession, queue_id: UUID) -> CallQueue:
    """Marca una cola como running para que el scheduler la procese."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise ValueError("Cola no encontrada")
    if queue.status not in ("pending", "paused"):
        raise ValueError(f"No se puede iniciar cola en estado '{queue.status}'")

    queue.status = "running"
    queue.started_at = queue.started_at or datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(queue)
    return queue


async def pause_queue(db: AsyncSession, queue_id: UUID) -> CallQueue:
    """Pausa una cola en ejecución."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise ValueError("Cola no encontrada")
    if queue.status != "running":
        raise ValueError("Solo se puede pausar una cola en ejecución")

    queue.status = "paused"
    await db.commit()
    await db.refresh(queue)
    return queue


async def cancel_queue(db: AsyncSession, queue_id: UUID) -> CallQueue:
    """Cancela una cola."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise ValueError("Cola no encontrada")
    if queue.status in ("completed", "cancelled"):
        raise ValueError(f"Cola ya {queue.status}")

    queue.status = "cancelled"
    queue.completed_at = datetime.now(timezone.utc)

    # Marcar items pendientes como skipped
    await db.execute(
        update(CallQueueItem)
        .where(CallQueueItem.queue_id == queue_id, CallQueueItem.status == "pending")
        .values(status="skipped")
    )

    await db.commit()
    await db.refresh(queue)
    return queue


async def retry_failed(db: AsyncSession, queue_id: UUID) -> dict:
    """Re-encola items fallidos."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise ValueError("Cola no encontrada")

    result = await db.execute(
        select(CallQueueItem).where(
            CallQueueItem.queue_id == queue_id,
            CallQueueItem.status == "failed",
            CallQueueItem.retry_count < queue.max_retries,
        )
    )
    items = result.scalars().all()
    for item in items:
        item.status = "pending"
        item.error_message = None

    if items:
        queue.status = "running" if queue.status in ("completed", "failed") else queue.status

    await db.commit()
    return {"requeued": len(items)}


async def process_queue_items(queue_id: UUID):
    """Procesa los items pendientes de una cola. Ejecutado por el scheduler."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        queue = await db.get(CallQueue, queue_id)
        if not queue or queue.status != "running":
            return

        # Obtener items pendientes en orden
        result = await db.execute(
            select(CallQueueItem)
            .where(CallQueueItem.queue_id == queue_id, CallQueueItem.status == "pending")
            .order_by(CallQueueItem.position)
        )
        pending_items = result.scalars().all()

        if not pending_items:
            queue.status = "completed"
            queue.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return

        for item in pending_items:
            # Re-check queue status (might have been paused/cancelled)
            await db.refresh(queue)
            if queue.status != "running":
                return

            item.status = "calling"
            await db.commit()

            try:
                result = await initiate_call(
                    db=db,
                    lead_id=item.lead_id,
                    prompt_id=queue.prompt_id,
                    user_id=queue.created_by,
                )

                if result.get("error"):
                    item.status = "failed"
                    item.error_message = result["error"]
                    item.retry_count += 1
                    queue.failed_calls += 1
                else:
                    item.status = "completed"
                    item.call_record_id = UUID(result["call_id"]) if result.get("call_id") else None
                    queue.completed_calls += 1

                    # Actualizar coste real
                    if result.get("call_id"):
                        from app.models.call import CallRecord
                        cr = await db.get(CallRecord, UUID(result["call_id"]))
                        if cr and cr.coste_eur:
                            queue.actual_cost_eur += cr.coste_eur

            except Exception as e:
                logger.error("Error processing queue item %s: %s", item.id, str(e))
                item.status = "failed"
                item.error_message = str(e)
                item.retry_count += 1
                queue.failed_calls += 1

            await db.commit()

            # Delay entre llamadas
            if queue.delay_between_calls_s > 0:
                await asyncio.sleep(queue.delay_between_calls_s)

        # Verificar si quedan pendientes
        await db.refresh(queue)
        remaining = await db.scalar(
            select(func.count(CallQueueItem.id))
            .where(CallQueueItem.queue_id == queue_id, CallQueueItem.status == "pending")
        )
        if remaining == 0:
            queue.status = "completed"
            queue.completed_at = datetime.now(timezone.utc)
            await db.commit()


async def get_queue_stats(db: AsyncSession) -> dict:
    """Estadísticas globales de colas."""
    total = await db.scalar(select(func.count(CallQueue.id))) or 0
    active = await db.scalar(
        select(func.count(CallQueue.id)).where(CallQueue.status == "running")
    ) or 0
    total_items = await db.scalar(select(func.count(CallQueueItem.id))) or 0
    completed_items = await db.scalar(
        select(func.count(CallQueueItem.id)).where(CallQueueItem.status == "completed")
    ) or 0
    failed_items = await db.scalar(
        select(func.count(CallQueueItem.id)).where(CallQueueItem.status == "failed")
    ) or 0
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(CallQueue.actual_cost_eur), 0))
    ) or 0

    return {
        "total_queues": total,
        "active_queues": active,
        "total_calls_queued": total_items,
        "total_calls_completed": completed_items,
        "total_calls_failed": failed_items,
        "total_cost_eur": float(total_cost),
    }
