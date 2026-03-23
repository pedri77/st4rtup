"""Endpoints para recibir webhooks de Typeform, Tally y otros + suscripciones salientes."""
import json
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel as PydanticModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limit import limiter, RATE_WEBHOOK
from app.core.webhook_verify import verify_webhook_signature
from app.models.webhook_log import WebhookLog
from app.models.webhook_subscription import WebhookSubscription
from app.models.lead import Lead
from app.models.enums import LeadStatus, LeadSource
from app.schemas.webhook import WebhookLogResponse
from app.schemas.base import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# Webhook Receivers (PUBLIC — no auth required)
# ═══════════════════════════════════════════════════════════════


@router.post("/typeform", status_code=200)
@limiter.limit(RATE_WEBHOOK)
async def receive_typeform(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Recibe webhook de Typeform cuando se envía un formulario."""
    raw_body = await verify_webhook_signature(request, "typeform")
    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("event_type", "form_response")
    form_response = payload.get("form_response", {})
    form_id = form_response.get("form_id", payload.get("form_id", ""))
    submission_id = form_response.get("token", "")

    # Idempotencia: verificar si ya procesamos este submission
    if submission_id:
        existing = await db.execute(
            select(WebhookLog).where(WebhookLog.submission_id == submission_id)
        )
        if existing.scalar_one_or_none():
            return {"status": "already_processed", "submission_id": submission_id}

    # Parsear datos del formulario
    parsed = _parse_typeform_response(form_response)

    # Crear log
    log = WebhookLog(
        provider="typeform",
        event_type=event_type,
        form_id=form_id,
        form_name=form_response.get("definition", {}).get("title"),
        submission_id=submission_id,
        payload=payload,
        parsed_data=parsed,
        ip_address=request.client.host if request.client else None,
    )

    # Crear lead si tenemos suficientes datos
    lead_id = None
    try:
        if parsed.get("company_name") or parsed.get("contact_email"):
            lead = Lead(
                company_name=parsed.get("company_name", parsed.get("contact_name", "Typeform Lead")),
                contact_name=parsed.get("contact_name"),
                contact_email=parsed.get("contact_email"),
                contact_phone=parsed.get("contact_phone"),
                company_website=parsed.get("company_website"),
                company_sector=parsed.get("company_sector"),
                company_size=parsed.get("company_size"),
                company_city=parsed.get("company_city"),
                company_country=parsed.get("company_country", "España"),
                status=LeadStatus.NEW,
                source=LeadSource.WEBSITE,
                notes=f"Lead from Typeform: {form_response.get('definition', {}).get('title', form_id)}",
                regulatory_frameworks=parsed.get("regulatory_frameworks"),
            )
            db.add(lead)
            await db.flush()
            lead_id = str(lead.id)
            log.lead_created = True
            log.lead_id = lead_id
    except Exception as e:
        logger.error("Error creating lead from Typeform: %s", str(e))
        log.error = str(e)

    db.add(log)
    await db.commit()

    return {"status": "ok", "lead_created": log.lead_created, "lead_id": lead_id}


@router.post("/tally", status_code=200)
@limiter.limit(RATE_WEBHOOK)
async def receive_tally(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Recibe webhook de Tally cuando se envía un formulario."""
    raw_body = await verify_webhook_signature(request, "tally")
    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("eventType", "FORM_RESPONSE")
    data = payload.get("data", {})
    form_id = data.get("formId", "")
    form_name = data.get("formName", "")
    submission_id = data.get("responseId", "")

    # Idempotencia
    if submission_id:
        existing = await db.execute(
            select(WebhookLog).where(WebhookLog.submission_id == submission_id)
        )
        if existing.scalar_one_or_none():
            return {"status": "already_processed", "submission_id": submission_id}

    # Parsear datos
    parsed = _parse_tally_response(data)

    # Crear log
    log = WebhookLog(
        provider="tally",
        event_type=event_type,
        form_id=form_id,
        form_name=form_name,
        submission_id=submission_id,
        payload=payload,
        parsed_data=parsed,
        ip_address=request.client.host if request.client else None,
    )

    # Crear lead
    lead_id = None
    try:
        if parsed.get("company_name") or parsed.get("contact_email"):
            lead = Lead(
                company_name=parsed.get("company_name", parsed.get("contact_name", "Tally Lead")),
                contact_name=parsed.get("contact_name"),
                contact_email=parsed.get("contact_email"),
                contact_phone=parsed.get("contact_phone"),
                company_website=parsed.get("company_website"),
                company_sector=parsed.get("company_sector"),
                company_size=parsed.get("company_size"),
                company_city=parsed.get("company_city"),
                company_country=parsed.get("company_country", "España"),
                status=LeadStatus.NEW,
                source=LeadSource.WEBSITE,
                notes=f"Lead from Tally: {form_name or form_id}",
                regulatory_frameworks=parsed.get("regulatory_frameworks"),
            )
            db.add(lead)
            await db.flush()
            lead_id = str(lead.id)
            log.lead_created = True
            log.lead_id = lead_id
    except Exception as e:
        logger.error("Error creating lead from Tally: %s", str(e))
        log.error = str(e)

    db.add(log)
    await db.commit()

    return {"status": "ok", "lead_created": log.lead_created, "lead_id": lead_id}


# ═══════════════════════════════════════════════════════════════
# HubSpot Webhook Receiver
# ═══════════════════════════════════════════════════════════════


@router.post("/hubspot", status_code=200)
@limiter.limit(RATE_WEBHOOK)
async def receive_hubspot(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Recibe webhooks de HubSpot (contact.creation, deal.creation, form submissions)."""
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # HubSpot sends an array of events
    events = payload if isinstance(payload, list) else [payload]
    results = []

    for event in events:
        event_type = event.get("subscriptionType", event.get("eventType", ""))
        object_id = str(event.get("objectId", ""))
        portal_id = str(event.get("portalId", ""))

        # Log the webhook
        log = WebhookLog(
            provider="hubspot",
            event_type=event_type,
            submission_id=f"hs-{portal_id}-{object_id}-{event.get('occurredAt', '')}",
            payload=event,
            ip_address=request.client.host if request.client else None,
        )

        # Idempotency
        if log.submission_id:
            existing = await db.execute(
                select(WebhookLog).where(WebhookLog.submission_id == log.submission_id)
            )
            if existing.scalar_one_or_none():
                results.append({"event": event_type, "status": "already_processed"})
                continue

        lead_id = None
        parsed = {}

        # Handle contact creation/update — fetch contact details from HubSpot API
        if "contact" in event_type.lower():
            properties = event.get("properties", {})
            if not properties and event.get("propertyName"):
                # propertyChange event — minimal data
                parsed = {"hubspot_contact_id": object_id, "property_changed": event.get("propertyName"), "new_value": event.get("propertyValue")}
            else:
                parsed = _parse_hubspot_contact(properties)

        # Handle form submission
        elif "form" in event_type.lower() or event.get("formGuid"):
            parsed = _parse_hubspot_form_submission(event)

        # Handle deal creation
        elif "deal" in event_type.lower():
            parsed = {"hubspot_deal_id": object_id, "event": event_type}

        log.parsed_data = parsed

        # Create lead from contact or form data
        if parsed.get("company_name") or parsed.get("contact_email"):
            try:
                lead = Lead(
                    company_name=parsed.get("company_name", parsed.get("contact_name", "HubSpot Lead")),
                    contact_name=parsed.get("contact_name"),
                    contact_email=parsed.get("contact_email"),
                    contact_phone=parsed.get("contact_phone"),
                    company_website=parsed.get("company_website"),
                    company_city=parsed.get("company_city"),
                    company_country=parsed.get("company_country", "España"),
                    status=LeadStatus.NEW,
                    source=LeadSource.WEBSITE,
                    notes=f"Lead from HubSpot ({event_type})",
                )
                db.add(lead)
                await db.flush()
                lead_id = str(lead.id)
                log.lead_created = True
                log.lead_id = lead_id
            except Exception as e:
                logger.error("Error creating lead from HubSpot: %s", str(e))
                log.error = str(e)

        db.add(log)
        results.append({"event": event_type, "status": "ok", "lead_created": log.lead_created, "lead_id": lead_id})

    await db.commit()
    return {"status": "ok", "processed": len(results), "results": results}


def _parse_hubspot_contact(properties: dict) -> dict:
    """Parsea propiedades de un contacto HubSpot a campos de lead."""
    return {
        "contact_name": f"{properties.get('firstname', '')} {properties.get('lastname', '')}".strip() or None,
        "contact_email": properties.get("email"),
        "contact_phone": properties.get("phone") or properties.get("mobilephone"),
        "company_name": properties.get("company"),
        "company_website": properties.get("website"),
        "company_city": properties.get("city"),
        "company_country": properties.get("country"),
        "contact_title": properties.get("jobtitle"),
        "company_sector": properties.get("industry"),
        "company_size": properties.get("numberofemployees"),
        "hubspot_contact_id": properties.get("hs_object_id"),
    }


def _parse_hubspot_form_submission(event: dict) -> dict:
    """Parsea un envio de formulario HubSpot."""
    parsed = {
        "form_id": event.get("formGuid", event.get("formId", "")),
        "form_name": event.get("formName", ""),
    }
    # Form submissions can have fields in different formats
    for field in event.get("fields", []):
        name = field.get("name", "").lower()
        value = field.get("value", "")
        if not value:
            continue
        mapped = _normalize_label(name)
        if mapped:
            parsed[mapped] = value
        elif "email" in name:
            parsed["contact_email"] = value
        elif "company" in name or "empresa" in name:
            parsed["company_name"] = value
        elif "name" in name or "nombre" in name:
            parsed["contact_name"] = value
        elif "phone" in name or "tel" in name:
            parsed["contact_phone"] = value

    return parsed


# ═══════════════════════════════════════════════════════════════
# Webhook Log Management (PROTECTED)
# ═══════════════════════════════════════════════════════════════


@router.get("/logs", response_model=PaginatedResponse)
async def list_webhook_logs(
    provider: Optional[str] = None,
    lead_created: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista webhook logs."""
    query = select(WebhookLog).order_by(desc(WebhookLog.created_at))
    if provider:
        query = query.where(WebhookLog.provider == provider)
    if lead_created is not None:
        query = query.where(WebhookLog.lead_created.is_(lead_created))

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[WebhookLogResponse.model_validate(log) for log in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/stats")
async def webhook_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas de webhooks."""
    total = await db.scalar(select(func.count()).select_from(WebhookLog)) or 0
    leads_created = await db.scalar(
        select(func.count()).select_from(WebhookLog).where(WebhookLog.lead_created.is_(True))
    ) or 0
    errors = await db.scalar(
        select(func.count()).select_from(WebhookLog).where(WebhookLog.error.isnot(None))
    ) or 0

    # By provider
    prov_q = await db.execute(
        select(WebhookLog.provider, func.count(WebhookLog.id))
        .group_by(WebhookLog.provider)
    )
    by_provider = {row[0]: row[1] for row in prov_q.all()}

    return {
        "total": total,
        "leads_created": leads_created,
        "errors": errors,
        "by_provider": by_provider,
    }


# ═══════════════════════════════════════════════════════════════
# Generic Inbound Webhook (Zapier / Make / custom)
# ═══════════════════════════════════════════════════════════════


@router.post("/generic", status_code=200)
@limiter.limit(RATE_WEBHOOK)
async def receive_generic_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Recibe webhook generico (Zapier, Make, n8n, custom).
    Acepta cualquier JSON con campos mapeables a un lead.
    Si se configura GENERIC_WEBHOOK_SECRET, verifica HMAC-SHA256 en X-Webhook-Signature."""
    import hashlib, hmac as _hmac
    from app.core.config import settings as app_settings
    secret = getattr(app_settings, "GENERIC_WEBHOOK_SECRET", "")
    raw_body = await request.body()
    if secret:
        sig = request.headers.get("x-webhook-signature", "")
        expected = _hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not _hmac.compare_digest(sig, expected):
            raise HTTPException(status_code=403, detail="Invalid webhook signature")
    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Parse using field map
    parsed = {}
    for key, value in (payload if isinstance(payload, dict) else {}).items():
        field_name = _normalize_label(key)
        if field_name and value:
            parsed[field_name] = str(value) if not isinstance(value, list) else value

    submission_id = payload.get("id") or payload.get("submission_id") or payload.get("_id") or ""

    # Idempotency
    if submission_id:
        existing = await db.execute(
            select(WebhookLog).where(WebhookLog.submission_id == str(submission_id))
        )
        if existing.scalar_one_or_none():
            return {"status": "already_processed", "submission_id": submission_id}

    log = WebhookLog(
        provider="generic",
        event_type="inbound",
        submission_id=str(submission_id) if submission_id else None,
        payload=payload,
        parsed_data=parsed,
        ip_address=request.client.host if request.client else None,
    )

    lead_id = None
    try:
        if parsed.get("company_name") or parsed.get("contact_email"):
            lead = Lead(
                company_name=parsed.get("company_name", parsed.get("contact_name", "Webhook Lead")),
                contact_name=parsed.get("contact_name"),
                contact_email=parsed.get("contact_email"),
                contact_phone=parsed.get("contact_phone"),
                company_website=parsed.get("company_website"),
                company_sector=parsed.get("company_sector"),
                company_size=parsed.get("company_size"),
                company_city=parsed.get("company_city"),
                company_country=parsed.get("company_country", "España"),
                status=LeadStatus.NEW,
                source=LeadSource.WEBSITE,
                notes=f"Lead from generic webhook",
                regulatory_frameworks=parsed.get("regulatory_frameworks"),
            )
            db.add(lead)
            await db.flush()
            lead_id = str(lead.id)
            log.lead_created = True
            log.lead_id = lead_id
    except Exception as e:
        logger.error("Error creating lead from generic webhook: %s", str(e))
        log.error = str(e)

    db.add(log)
    await db.commit()

    return {"status": "ok", "lead_created": log.lead_created, "lead_id": lead_id, "parsed_fields": list(parsed.keys())}


# ═══════════════════════════════════════════════════════════════
# Outgoing Webhook Subscriptions CRUD (PROTECTED)
# ═══════════════════════════════════════════════════════════════


class SubscriptionCreate(PydanticModel):
    name: str
    url: str
    secret: Optional[str] = None
    events: list[str] = []
    headers: Optional[dict] = None


class SubscriptionUpdate(PydanticModel):
    name: Optional[str] = None
    url: Optional[str] = None
    secret: Optional[str] = None
    events: Optional[list[str]] = None
    headers: Optional[dict] = None
    is_active: Optional[bool] = None


@router.get("/subscriptions")
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista suscripciones de webhooks salientes."""
    result = await db.execute(
        select(WebhookSubscription).order_by(desc(WebhookSubscription.created_at))
    )
    subs = result.scalars().all()
    return [
        {
            "id": str(s.id), "name": s.name, "url": s.url,
            "events": s.events or [], "is_active": s.is_active,
            "last_status": s.last_status, "last_error": s.last_error,
            "total_sent": s.total_sent, "total_errors": s.total_errors,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in subs
    ]


@router.post("/subscriptions")
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crea una nueva suscripcion de webhook saliente."""
    sub = WebhookSubscription(
        name=data.name, url=data.url, secret=data.secret,
        events=data.events, headers=data.headers,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return {"id": str(sub.id), "name": sub.name, "url": sub.url, "events": sub.events}


@router.put("/subscriptions/{sub_id}")
async def update_subscription(
    sub_id: UUID,
    data: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza una suscripcion."""
    result = await db.execute(select(WebhookSubscription).where(WebhookSubscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    await db.commit()
    return {"id": str(sub.id), "name": sub.name, "is_active": sub.is_active}


@router.delete("/subscriptions/{sub_id}")
async def delete_subscription(
    sub_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Elimina una suscripcion."""
    result = await db.execute(select(WebhookSubscription).where(WebhookSubscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
    return {"deleted": True}


@router.post("/subscriptions/{sub_id}/test")
async def test_subscription_endpoint(
    sub_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Envia un ping de test a la suscripcion."""
    result = await db.execute(select(WebhookSubscription).where(WebhookSubscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    from app.services.webhook_dispatcher import test_subscription
    res = await test_subscription(sub.url, sub.secret, sub.headers)
    return res


@router.get("/subscriptions/events")
async def list_available_events(
    current_user: dict = Depends(get_current_user),
):
    """Lista eventos disponibles para suscripcion."""
    from app.services.webhook_dispatcher import EVENTS
    return {"events": EVENTS}


# ═══════════════════════════════════════════════════════════════
# Parsers
# ═══════════════════════════════════════════════════════════════

# Field label mapping — maps common form field labels to lead fields
FIELD_MAP = {
    # Company
    "empresa": "company_name", "company": "company_name", "company name": "company_name",
    "nombre empresa": "company_name", "organización": "company_name", "organization": "company_name",
    "website": "company_website", "web": "company_website", "sitio web": "company_website",
    "sector": "company_sector", "industria": "company_sector", "industry": "company_sector",
    "tamaño": "company_size", "employees": "company_size", "empleados": "company_size",
    "ciudad": "company_city", "city": "company_city",
    "país": "company_country", "country": "company_country",
    # Contact
    "nombre": "contact_name", "name": "contact_name", "full name": "contact_name",
    "nombre completo": "contact_name",
    "email": "contact_email", "correo": "contact_email", "e-mail": "contact_email",
    "correo electrónico": "contact_email",
    "teléfono": "contact_phone", "phone": "contact_phone", "tel": "contact_phone",
    "móvil": "contact_phone",
    # Regulatory
    "normativa": "regulatory_frameworks", "frameworks": "regulatory_frameworks",
    "cumplimiento": "regulatory_frameworks",
}


def _normalize_label(label: str) -> Optional[str]:
    """Normaliza un label de campo a un field name del lead."""
    key = label.strip().lower()
    return FIELD_MAP.get(key)


def _parse_typeform_response(form_response: dict) -> dict:
    """Parsea respuesta de Typeform a datos de lead."""
    parsed = {}
    answers = form_response.get("answers", [])
    definition = form_response.get("definition", {})
    fields_def = {f["id"]: f for f in definition.get("fields", [])}

    for answer in answers:
        field_id = answer.get("field", {}).get("id", "")
        field_def = fields_def.get(field_id, {})
        label = field_def.get("title", "")
        field_name = _normalize_label(label)
        if not field_name:
            continue

        # Extract value based on answer type
        atype = answer.get("type", "")
        if atype == "text":
            value = answer.get("text", "")
        elif atype == "email":
            value = answer.get("email", "")
        elif atype == "phone_number":
            value = answer.get("phone_number", "")
        elif atype == "url":
            value = answer.get("url", "")
        elif atype == "number":
            value = str(answer.get("number", ""))
        elif atype == "choice":
            value = answer.get("choice", {}).get("label", "")
        elif atype == "choices":
            labels = [c.get("label", "") for c in answer.get("choices", {}).get("labels", [])]
            value = labels if field_name == "regulatory_frameworks" else ", ".join(labels)
        else:
            value = str(answer.get(atype, ""))

        if value:
            parsed[field_name] = value

    return parsed


def _parse_tally_response(data: dict) -> dict:
    """Parsea respuesta de Tally a datos de lead."""
    parsed = {}
    fields = data.get("fields", [])

    for field in fields:
        label = field.get("label", "")
        field_name = _normalize_label(label)
        if not field_name:
            continue

        value = field.get("value", "")
        # Tally sends arrays for multi-select
        if isinstance(value, list):
            if field_name == "regulatory_frameworks":
                parsed[field_name] = value
            else:
                parsed[field_name] = ", ".join(str(v) for v in value)
        elif value:
            parsed[field_name] = str(value)

    return parsed
