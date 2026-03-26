from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access, apply_lead_row_filter
from app.core.rate_limit import limiter, RATE_EMAIL
from app.models import Email, Lead
from app.schemas import EmailCreate, EmailResponse, PaginatedResponse
from app.services.notification_service import notification_service

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_emails(
    lead_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Listar emails con nombre del lead incluido."""
    query = select(Email, Lead.company_name).join(Lead, Email.lead_id == Lead.id, isouter=True).order_by(Email.created_at.desc())
    query = apply_lead_row_filter(query, current_user, Email.lead_id)
    if lead_id:
        query = query.where(Email.lead_id == lead_id)

    # Count
    count_base = select(func.count(Email.id))
    if lead_id:
        count_base = count_base.where(Email.lead_id == lead_id)
    total = (await db.execute(count_base)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    items = []
    for email, company_name in result:
        email_data = EmailResponse.model_validate(email)
        email_data.lead_name = company_name
        items.append(email_data)

    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=EmailResponse, status_code=201)
async def create_email(
    data: EmailCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    email = Email(**data.model_dump())
    db.add(email)
    await db.commit()
    await db.refresh(email)
    return EmailResponse.model_validate(email)


@router.post("/{email_id}/schedule")
async def schedule_email(
    email_id: UUID,
    scheduled_at: str = Query(..., description="ISO datetime: 2026-04-01T10:00:00"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Programa el envío de un email para una fecha/hora específica."""
    from datetime import datetime
    result = await db.execute(select(Email).where(Email.id == email_id))
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    try:
        send_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")

    # Store schedule in metadata
    email.metadata_ = {**(email.metadata_ or {}), "scheduled_at": send_at.isoformat(), "scheduled": True}
    await db.commit()
    return {"scheduled": True, "email_id": str(email_id), "send_at": send_at.isoformat()}


@router.post("/{email_id}/send", response_model=EmailResponse)
@limiter.limit(RATE_EMAIL)
async def send_email(
    request: Request,
    email_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Send a draft email via configured email provider (Zoho or Resend)."""
    from datetime import datetime, timezone
    from app.services.email_service import email_service

    result = await db.execute(select(Email).where(Email.id == email_id))
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    if email.status == "sent":
        raise HTTPException(status_code=400, detail="Email already sent")

    # Inject tracking pixel
    from app.api.v1.endpoints.email_tracking import inject_tracking_pixel
    tracked_html = inject_tracking_pixel(email.body_html or "", str(email.id))

    # Send email via provider
    send_result = await email_service.send_email(
        to=email.to_email,
        subject=email.subject,
        html_body=tracked_html,
        text_body=email.body_text,
        from_email=email.from_email,
        cc=email.cc if isinstance(email.cc, list) else None,
    )

    user_id = UUID(current_user["user_id"])

    if not send_result['success']:
        email.status = "failed"
        await db.commit()
        await db.refresh(email)

        # Notificar email rebotado/fallido
        try:
            await notification_service.notify_email_bounced(
                db=db,
                user_id=user_id,
                email_id=email.id,
                recipient=email.to_email,
                subject=email.subject,
            )
        except Exception:
            logger.warning("Failed to send email bounce notification", exc_info=True)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {send_result['error']}"
        )

    # Update email record
    email.status = "sent"
    email.sent_at = datetime.now(timezone.utc)
    email.resend_id = send_result['message_id']  # Store provider message ID
    await db.commit()
    await db.refresh(email)

    # Notificar email enviado exitosamente
    try:
        await notification_service.notify_email_sent(
            db=db,
            user_id=user_id,
            email_id=email.id,
            recipient=email.to_email,
            subject=email.subject,
        )
    except Exception:
        logger.warning("Failed to send email sent notification", exc_info=True)

    return EmailResponse.model_validate(email)


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Email).where(Email.id == email_id))
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return EmailResponse.model_validate(email)
