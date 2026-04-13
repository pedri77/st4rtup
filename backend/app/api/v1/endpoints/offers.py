from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access, apply_lead_row_filter
from app.core.rate_limit import limiter, RATE_WEBHOOK
from app.core.webhook_verify import verify_webhook_signature
from app.models.models import Offer, OfferStatus, Lead
from app.schemas import OfferCreate, OfferUpdate, OfferResponse, PaginatedResponse
from app.services.signature_service import send_for_signature, handle_webhook
from app.services.invoice_service import create_invoice, send_invoice, handle_invoice_webhook

router = APIRouter()


async def _generate_reference(db: AsyncSession) -> str:
    """Genera referencia secuencial: OF-YYYY-NNN."""
    year = datetime.now().year
    prefix = f"OF-{year}-"
    result = await db.execute(
        select(func.count()).select_from(Offer).where(Offer.reference.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:03d}"


@router.get("", response_model=PaginatedResponse)
async def list_offers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    lead_id: Optional[UUID] = None,
    status: Optional[OfferStatus] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Listar ofertas con filtros y paginación."""
    # Build filter conditions
    filters = []
    if lead_id:
        filters.append(Offer.lead_id == lead_id)
    if status:
        filters.append(Offer.status == status)
    if search:
        filters.append(Offer.title.ilike(f"%{search}%") | Offer.reference.ilike(f"%{search}%"))

    # Count
    count_q = select(func.count()).select_from(Offer)
    count_q = apply_lead_row_filter(count_q, current_user, Offer.lead_id)
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.execute(count_q)).scalar()

    # Query with JOIN for lead name (avoids N+1)
    query = select(Offer, Lead.company_name).join(Lead, Offer.lead_id == Lead.id, isouter=True)
    query = apply_lead_row_filter(query, current_user, Offer.lead_id)
    for f in filters:
        query = query.where(f)
    query = query.order_by(Offer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    items = []
    for offer, company_name in result:
        data = OfferResponse.model_validate(offer)
        data.lead_name = company_name
        items.append(data)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.post("", response_model=OfferResponse, status_code=201)
async def create_offer(
    data: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Crear una nueva oferta."""
    # Verify lead exists
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    reference = await _generate_reference(db)
    offer = Offer(
        **data.model_dump(),
        reference=reference,
        created_by=UUID(current_user["user_id"]),
    )
    offer.org_id = org_id
    db.add(offer)
    await db.commit()
    await db.refresh(offer)

    response = OfferResponse.model_validate(offer)
    response.lead_name = lead.company_name
    return response


@router.get("/{offer_id}", response_model=OfferResponse)
async def get_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Obtener detalle de una oferta."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id, Offer.org_id == org_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    response = OfferResponse.model_validate(offer)
    lead_result = await db.execute(select(Lead.company_name).where(Lead.id == offer.lead_id))
    response.lead_name = lead_result.scalar_one_or_none()
    return response


@router.put("/{offer_id}", response_model=OfferResponse)
async def update_offer(
    offer_id: UUID,
    data: OfferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Actualizar una oferta existente."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id, Offer.org_id == org_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    update_data = data.model_dump(exclude_unset=True)

    # Track status change timestamps
    new_status = update_data.get("status")
    if new_status:
        now = datetime.now(timezone.utc)
        if new_status == OfferStatus.SENT and not offer.sent_at:
            update_data["sent_at"] = now
        elif new_status == OfferStatus.ACCEPTED:
            update_data["accepted_at"] = now
        elif new_status == OfferStatus.REJECTED:
            update_data["rejected_at"] = now

    for key, value in update_data.items():
        setattr(offer, key, value)

    await db.commit()
    await db.refresh(offer)

    response = OfferResponse.model_validate(offer)
    lead_result = await db.execute(select(Lead.company_name).where(Lead.id == offer.lead_id))
    response.lead_name = lead_result.scalar_one_or_none()
    return response


@router.delete("/{offer_id}", status_code=204)
async def delete_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Eliminar una oferta."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    await db.delete(offer)
    await db.commit()


@router.post("/{offer_id}/sign")
async def sign_offer(
    offer_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Enviar oferta para firma electrónica (DocuSign o YouSign)."""
    provider = data.get("provider", "")
    signer_email = data.get("signer_email", "")
    signer_name = data.get("signer_name", "")
    message = data.get("message")

    if not provider:
        raise HTTPException(status_code=400, detail="Se requiere el campo 'provider' (docusign o yousign)")
    if not signer_email:
        raise HTTPException(status_code=400, detail="Se requiere 'signer_email'")
    if not signer_name:
        raise HTTPException(status_code=400, detail="Se requiere 'signer_name'")

    try:
        result = await send_for_signature(
            db=db,
            offer_id=offer_id,
            provider=provider,
            signer_email=signer_email,
            signer_name=signer_name,
            message=message,
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error enviando a firma")


@router.post("/webhook/{provider}")
@limiter.limit(RATE_WEBHOOK)
async def signature_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook para recibir actualizaciones de firma (DocuSign Connect / YouSign)."""
    if provider not in ("docusign", "yousign"):
        raise HTTPException(status_code=400, detail="Proveedor no soportado")

    # Verify signature before processing
    body = await verify_webhook_signature(request, provider)

    try:
        import json
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    result = await handle_webhook(db, provider, payload)
    return result


@router.post("/{offer_id}/invoice")
async def invoice_offer(
    offer_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crear factura a partir de una oferta aceptada (Holded, Stripe o Facturama)."""
    provider = data.get("provider", "")
    if not provider:
        raise HTTPException(status_code=400, detail="Se requiere el campo 'provider' (holded, stripe o facturama)")

    try:
        result = await create_invoice(db=db, offer_id=offer_id, provider=provider)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error creando factura")


@router.post("/{offer_id}/invoice/send")
async def send_offer_invoice(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Enviar factura al cliente."""
    try:
        result = await send_invoice(db=db, offer_id=offer_id)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error enviando factura")


@router.post("/invoice-webhook/{provider}")
@limiter.limit(RATE_WEBHOOK)
async def invoice_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook para recibir actualizaciones de facturacion (Stripe, Holded)."""
    if provider not in ("stripe", "holded"):
        raise HTTPException(status_code=400, detail="Proveedor no soportado")

    # Verify signature before processing
    body = await verify_webhook_signature(request, provider)

    try:
        import json
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    result = await handle_invoice_webhook(db, provider, payload)
    return result
