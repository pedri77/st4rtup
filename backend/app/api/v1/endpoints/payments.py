"""Endpoints de pagos — Stripe + PayPal (MOD-PAYMENTS-001)."""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models.payment import PaymentPlan, Payment, Invoice
from app.schemas.base import PaginatedResponse
from app.services import payment_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────

def _row_to_dict(row):
    """Convert SQLAlchemy model instance to dict."""
    d = {}
    for c in row.__table__.columns:
        val = getattr(row, c.name if c.name != "metadata" else "metadata_")
        if isinstance(val, datetime):
            val = val.isoformat()
        elif hasattr(val, "hex"):  # UUID
            val = str(val)
        d[c.name] = val
    return d


# ─── LIST PAYMENTS ───────────────────────────────────────────

@router.get("", response_model=PaginatedResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    provider: Optional[str] = None,
    payment_type: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Lista pagos con filtros y paginacion."""
    query = select(Payment)
    query = query.where(Payment.org_id == org_id)

    if status:
        query = query.where(Payment.status == status)
    if provider:
        query = query.where(Payment.provider == provider)
    if payment_type:
        query = query.where(Payment.payment_type == payment_type)
    if search:
        query = query.where(
            Payment.customer_email.ilike(f"%{search}%") |
            Payment.customer_name.ilike(f"%{search}%") |
            Payment.description.ilike(f"%{search}%")
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(desc(Payment.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = [_row_to_dict(r) for r in result.scalars().all()]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


# ─── STATS / KPIs ───────────────────────────────────────────

@router.get("/stats")
async def payment_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """KPIs de pagos: ingresos totales, MRR, suscripciones activas, facturas pendientes."""
    # Total revenue (completed payments)
    total_q = select(func.coalesce(func.sum(Payment.amount_eur), 0)).where(Payment.status == "completed")
    total_revenue = (await db.execute(total_q)).scalar()

    # MRR (subscription payments completed this month)
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    mrr_q = (
        select(func.coalesce(func.sum(Payment.amount_eur), 0))
        .where(Payment.status == "completed")
        .where(Payment.payment_type == "subscription")
        .where(Payment.paid_at >= first_of_month)
    )
    mrr = (await db.execute(mrr_q)).scalar()

    # Active subscriptions count
    subs_q = (
        select(func.count())
        .select_from(Payment)
        .where(Payment.payment_type == "subscription")
        .where(Payment.status == "completed")
        .where(Payment.provider_subscription_id.isnot(None))
    )
    active_subscriptions = (await db.execute(subs_q)).scalar()

    # Pending invoices
    pending_q = (
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.status.in_(["draft", "sent", "overdue"]))
    )
    pending_invoices = (await db.execute(pending_q)).scalar()

    # Total payments count
    count_q = select(func.count()).select_from(Payment)
    total_payments = (await db.execute(count_q)).scalar()

    return {
        "total_revenue": float(total_revenue),
        "mrr": float(mrr),
        "active_subscriptions": active_subscriptions,
        "pending_invoices": pending_invoices,
        "total_payments": total_payments,
        "stripe_configured": payment_service.stripe_configured(),
        "paypal_configured": payment_service.paypal_configured(),
    }


# ─── PLANS ───────────────────────────────────────────────────

@router.get("/plans")
async def list_plans(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista planes de precios."""
    query = select(PaymentPlan)
    if active_only:
        query = query.where(PaymentPlan.is_active == True)
    query = query.order_by(PaymentPlan.price_eur)
    result = await db.execute(query)
    return [_row_to_dict(p) for p in result.scalars().all()]


@router.post("/plans")
async def create_plan(
    name: str = Query(...),
    price_eur: float = Query(...),
    interval: str = Query("month"),
    description: str = Query(""),
    trial_days: int = Query(0),
    max_users: Optional[int] = None,
    max_leads: Optional[int] = None,
    stripe_price_id: Optional[str] = None,
    paypal_plan_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un plan de precios."""
    plan = PaymentPlan(
        name=name,
        price_eur=price_eur,
        interval=interval,
        description=description,
        trial_days=trial_days,
        max_users=max_users,
        max_leads=max_leads,
        stripe_price_id=stripe_price_id,
        paypal_plan_id=paypal_plan_id,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return _row_to_dict(plan)


# ─── STRIPE CHECKOUT ────────────────────────────────────────

@router.post("/checkout")
async def create_checkout(
    amount_eur: float = Query(..., description="Importe en EUR"),
    customer_email: str = Query(""),
    description: str = Query("St4rtup growth"),
    plan_id: Optional[UUID] = None,
    lead_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea sesion de Stripe Checkout."""
    if not payment_service.stripe_configured():
        raise HTTPException(400, "Stripe no configurado. Configura STRIPE_SECRET_KEY.")

    amount_cents = int(amount_eur * 100)
    metadata = {}
    if plan_id:
        metadata["plan_id"] = str(plan_id)
    if lead_id:
        metadata["lead_id"] = str(lead_id)

    session = await payment_service.stripe_create_checkout(
        amount_cents=amount_cents,
        customer_email=customer_email,
        description=description,
        metadata=metadata,
    )

    # Record payment in DB
    payment = Payment(
        provider="stripe",
        provider_payment_id=session.get("payment_intent") or session.get("id"),
        amount_eur=amount_eur,
        status="pending",
        payment_type="one_time",
        customer_email=customer_email,
        description=description,
        lead_id=lead_id,
        plan_id=plan_id,
    )
    db.add(payment)
    await db.commit()

    return {"checkout_url": session.get("url"), "session_id": session.get("id")}


# ─── STRIPE SUBSCRIPTION ────────────────────────────────────

@router.post("/subscription")
async def create_subscription(
    customer_email: str = Query(...),
    price_id: str = Query(..., description="Stripe price_id"),
    trial_days: int = Query(0),
    plan_id: Optional[UUID] = None,
    lead_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea suscripcion Stripe."""
    if not payment_service.stripe_configured():
        raise HTTPException(400, "Stripe no configurado.")

    sub = await payment_service.stripe_create_subscription(
        customer_email=customer_email,
        price_id=price_id,
        trial_days=trial_days,
    )

    payment = Payment(
        provider="stripe",
        provider_subscription_id=sub.get("id"),
        provider_customer_id=sub.get("customer"),
        amount_eur=0,  # Will be updated by webhook
        status=sub.get("status", "pending"),
        payment_type="subscription",
        customer_email=customer_email,
        lead_id=lead_id,
        plan_id=plan_id,
    )
    db.add(payment)
    await db.commit()

    return sub


# ─── STRIPE INVOICE ─────────────────────────────────────────

@router.post("/invoice")
async def create_invoice(
    customer_email: str = Query(...),
    amount_eur: float = Query(...),
    description: str = Query("St4rtup growth Platform"),
    due_days: int = Query(30),
    customer_name: str = Query(""),
    customer_tax_id: str = Query(""),
    lead_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea y envia factura via Stripe."""
    if not payment_service.stripe_configured():
        raise HTTPException(400, "Stripe no configurado.")

    amount_cents = int(amount_eur * 100)
    stripe_inv = await payment_service.stripe_create_invoice(
        customer_email=customer_email,
        amount_cents=amount_cents,
        description=description,
        due_days=due_days,
    )

    # Record payment
    payment = Payment(
        provider="stripe",
        provider_invoice_id=stripe_inv.get("id"),
        provider_customer_id=stripe_inv.get("customer"),
        amount_eur=amount_eur,
        status="pending",
        payment_type="invoice",
        customer_email=customer_email,
        customer_name=customer_name,
        description=description,
        invoice_url=stripe_inv.get("hosted_invoice_url"),
        lead_id=lead_id,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # Record invoice
    tax_amount = round(amount_eur * 0.21, 2)
    invoice = Invoice(
        payment_id=payment.id,
        lead_id=lead_id,
        provider="stripe",
        provider_invoice_id=stripe_inv.get("id"),
        invoice_number=stripe_inv.get("number"),
        amount_eur=amount_eur,
        tax_rate=21.0,
        tax_amount=tax_amount,
        total_eur=round(amount_eur + tax_amount, 2),
        status="sent",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_tax_id=customer_tax_id,
        pdf_url=stripe_inv.get("invoice_pdf"),
    )
    db.add(invoice)
    await db.commit()

    return {
        "invoice_id": str(invoice.id),
        "stripe_invoice_id": stripe_inv.get("id"),
        "hosted_invoice_url": stripe_inv.get("hosted_invoice_url"),
        "invoice_pdf": stripe_inv.get("invoice_pdf"),
    }


# ─── PAYPAL ORDER ────────────────────────────────────────────

@router.post("/paypal/order")
async def create_paypal_order(
    amount_eur: float = Query(...),
    description: str = Query("St4rtup growth"),
    lead_id: Optional[UUID] = None,
    plan_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea orden de pago PayPal."""
    if not payment_service.paypal_configured():
        raise HTTPException(400, "PayPal no configurado. Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.")

    order = await payment_service.paypal_create_order(
        amount=amount_eur,
        description=description,
    )

    payment = Payment(
        provider="paypal",
        provider_payment_id=order.get("id"),
        amount_eur=amount_eur,
        status="pending",
        payment_type="one_time",
        description=description,
        lead_id=lead_id,
        plan_id=plan_id,
    )
    db.add(payment)
    await db.commit()

    # Extract approval URL
    approve_url = ""
    for link in order.get("links", []):
        if link.get("rel") == "approve":
            approve_url = link.get("href")
            break

    return {"order_id": order.get("id"), "approve_url": approve_url}


# ─── PAYPAL CAPTURE ──────────────────────────────────────────

@router.post("/paypal/capture")
async def capture_paypal_order(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Captura (confirma) una orden PayPal aprobada por el usuario."""
    if not payment_service.paypal_configured():
        raise HTTPException(400, "PayPal no configurado.")

    capture = await payment_service.paypal_capture_order(order_id)

    # Update payment in DB
    query = select(Payment).where(
        Payment.provider == "paypal",
        Payment.provider_payment_id == order_id,
    )
    result = await db.execute(query)
    payment = result.scalar_one_or_none()

    if payment:
        pp_status = capture.get("status", "")
        payment.status = "completed" if pp_status == "COMPLETED" else "failed"
        payment.paid_at = datetime.now(timezone.utc) if payment.status == "completed" else None

        # Extract payer info
        payer = capture.get("payer", {})
        payment.customer_email = payer.get("email_address", payment.customer_email)
        name = payer.get("name", {})
        if name:
            payment.customer_name = f"{name.get('given_name', '')} {name.get('surname', '')}".strip()

        await db.commit()

    return capture


# ─── STRIPE WEBHOOK ──────────────────────────────────────────

@router.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receptor de webhooks de Stripe (sin auth JWT, validacion via signature)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verify webhook signature using Stripe SDK
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = payment_service.stripe_construct_webhook_event(payload, sig_header)
        except stripe.SignatureVerificationError as e:
            logger.warning(f"Stripe webhook signature verification failed: {e}")
            raise HTTPException(400, "Invalid webhook signature")
        except ValueError:
            raise HTTPException(400, "Invalid payload")
    else:
        import json
        event = json.loads(payload)

    event_type = event.get("type", "") if isinstance(event, dict) else event.type
    event_id = event.get("id", "") if isinstance(event, dict) else event.id
    data_obj = (event.get("data", {}).get("object", {}) if isinstance(event, dict)
                else event.data.object)

    # Idempotency: skip if this event was already processed
    if event_id:
        from sqlalchemy import text
        existing = await db.execute(
            text("SELECT 1 FROM processed_webhook_events WHERE event_id = :eid"),
            {"eid": event_id},
        )
        if existing.scalar_one_or_none():
            logger.info(f"Stripe webhook {event_id} already processed, skipping")
            return {"received": True, "duplicate": True}

    logger.info(f"Stripe webhook: {event_type}")

    if event_type == "payment_intent.succeeded":
        pi_id = data_obj.get("id")
        q = select(Payment).where(Payment.provider_payment_id == pi_id)
        result = await db.execute(q)
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "completed"
            payment.paid_at = datetime.now(timezone.utc)
            payment.receipt_url = data_obj.get("charges", {}).get("data", [{}])[0].get("receipt_url")
            await db.commit()

    elif event_type == "payment_intent.payment_failed":
        pi_id = data_obj.get("id")
        q = select(Payment).where(Payment.provider_payment_id == pi_id)
        result = await db.execute(q)
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "failed"
            await db.commit()

    elif event_type == "invoice.paid":
        inv_id = data_obj.get("id")
        q = select(Invoice).where(Invoice.provider_invoice_id == inv_id)
        result = await db.execute(q)
        invoice = result.scalar_one_or_none()
        if invoice:
            invoice.status = "paid"
            invoice.paid_at = datetime.now(timezone.utc)
            await db.commit()

        # Also update corresponding payment
        q2 = select(Payment).where(Payment.provider_invoice_id == inv_id)
        result2 = await db.execute(q2)
        payment = result2.scalar_one_or_none()
        if payment:
            payment.status = "completed"
            payment.paid_at = datetime.now(timezone.utc)
            await db.commit()

    elif event_type == "invoice.payment_failed":
        inv_id = data_obj.get("id")
        q = select(Invoice).where(Invoice.provider_invoice_id == inv_id)
        result = await db.execute(q)
        invoice = result.scalar_one_or_none()
        if invoice:
            invoice.status = "overdue"
            await db.commit()

    elif event_type == "customer.subscription.deleted":
        sub_id = data_obj.get("id")
        q = select(Payment).where(Payment.provider_subscription_id == sub_id)
        result = await db.execute(q)
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "cancelled"
            await db.commit()

    elif event_type == "checkout.session.completed":
        metadata = data_obj.get("metadata", {})
        plan = metadata.get("plan", "")
        org_id = metadata.get("org_id", "")
        customer_email = data_obj.get("customer_email", "")
        subscription_id = data_obj.get("subscription", "")

        logger.info(f"Checkout completed: plan={plan}, org_id={org_id}, email={customer_email}")

        # Handle plan upgrades (growth/scale)
        if plan in ("growth_monthly", "growth_annual", "scale_monthly", "scale_annual"):
            plan_name = plan.split("_")[0]  # growth or scale
            max_users = 3 if plan_name == "growth" else 10
            max_leads = 5000 if plan_name == "growth" else 999999

            if org_id:
                from app.models.organization import Organization
                org = await db.get(Organization, org_id)
                if org:
                    org.plan = plan_name
                    org.max_users = max_users
                    org.max_leads = max_leads
                    org.stripe_subscription_id = subscription_id
                    await db.commit()
                    logger.info(f"Org {org_id} upgraded to {plan_name}")
            elif customer_email:
                # Find org by email if no org_id in metadata
                from app.models.user import User
                from app.models.organization import Organization, OrgMember
                user = (await db.execute(select(User).where(User.email == customer_email))).scalar_one_or_none()
                if user:
                    member = (await db.execute(select(OrgMember).where(OrgMember.user_id == user.id).limit(1))).scalar_one_or_none()
                    if member:
                        org = await db.get(Organization, str(member.org_id))
                        if org:
                            org.plan = plan_name
                            org.max_users = max_users
                            org.max_leads = max_leads
                            org.stripe_subscription_id = subscription_id
                            await db.commit()
                            logger.info(f"Org {org.id} upgraded to {plan_name} (via email lookup)")

        # Handle add-on purchases
        elif plan in ("extra_users", "ai_advanced", "deal_room_addon", "whatsapp_addon", "api_access"):
            if org_id:
                from app.models.organization import Organization
                org = await db.get(Organization, org_id)
                if org:
                    settings_dict = dict(org.settings or {})
                    addons = settings_dict.get("addons", [])
                    if plan not in addons:
                        addons.append(plan)
                    settings_dict["addons"] = addons
                    # Apply addon effects
                    if plan == "extra_users":
                        org.max_users = (org.max_users or 1) + 5
                    org.settings = settings_dict
                    await db.commit()
                    logger.info(f"Addon {plan} activated for org {org_id}")

    # Mark event as processed for idempotency
    if event_id:
        from sqlalchemy import text
        try:
            await db.execute(
                text("INSERT INTO processed_webhook_events (event_id, event_type) VALUES (:eid, :etype) ON CONFLICT DO NOTHING"),
                {"eid": event_id, "etype": event_type},
            )
            await db.commit()
        except Exception:
            pass  # Non-critical — duplicate check is best-effort

    return {"received": True}


# ─── PUBLIC CHECKOUT (no auth — for landing/pricing page) ────

PLAN_PRICES = {
    "growth_monthly": {"price_id_env": "STRIPE_PRICE_GROWTH_MONTHLY", "amount": 19, "interval": "month"},
    "growth_annual": {"price_id_env": "STRIPE_PRICE_GROWTH_ANNUAL", "amount": 190, "interval": "year"},
    "scale_monthly": {"price_id_env": "STRIPE_PRICE_SCALE_MONTHLY", "amount": 49, "interval": "month"},
    "scale_annual": {"price_id_env": "STRIPE_PRICE_SCALE_ANNUAL", "amount": 490, "interval": "year"},
    # Add-ons
    "extra_users": {"price_id_env": "STRIPE_PRICE_EXTRA_USERS", "amount": 9, "interval": "month"},
    "ai_advanced": {"price_id_env": "STRIPE_PRICE_AI_ADVANCED", "amount": 15, "interval": "month"},
    "deal_room_addon": {"price_id_env": "STRIPE_PRICE_DEAL_ROOM", "amount": 12, "interval": "month"},
    "whatsapp_addon": {"price_id_env": "STRIPE_PRICE_WHATSAPP", "amount": 9, "interval": "month"},
    "api_access": {"price_id_env": "STRIPE_PRICE_API_ACCESS", "amount": 15, "interval": "month"},
}

@router.post("/public/checkout")
async def public_checkout(
    plan: str = Query(..., description="Plan or add-on ID"),
    email: str = Query("", description="Email del cliente"),
    org_id: str = Query("", description="Organization ID (for add-on activation)"),
):
    """Crea sesión de Stripe Checkout SIN login — para la landing/pricing page."""
    if plan not in PLAN_PRICES:
        raise HTTPException(400, f"Plan inválido. Opciones: {', '.join(PLAN_PRICES.keys())}")

    if not payment_service.stripe_configured():
        raise HTTPException(400, "Stripe no configurado")

    plan_info = PLAN_PRICES[plan]
    price_id = plan_info.get("price_id") or getattr(settings, plan_info.get("price_id_env", ""), "")

    if not price_id:
        # Fallback: create ad-hoc checkout without price_id
        session = await payment_service.stripe_create_checkout(
            amount_cents=plan_info["amount"] * 100,
            customer_email=email,
            description=f"St4rtup {plan.replace('_', ' ').title()}",
            success_url="https://st4rtup.com/login?payment=success&plan=" + plan,
            cancel_url="https://st4rtup.com/pricing?cancelled=1",
            metadata={"plan": plan, "org_id": org_id},
        )
    else:
        # Use Stripe subscription checkout with price_id via SDK
        is_addon = plan in ("extra_users", "ai_advanced", "deal_room_addon", "whatsapp_addon", "api_access")
        success_url = f"https://st4rtup.com/app/marketplace?activated={plan}" if is_addon else f"https://st4rtup.com/login?payment=success&plan={plan}"
        trial_days = 0 if is_addon else (settings.TRIAL_DAYS or 0)

        session = payment_service.stripe_create_checkout_subscription(
            price_id=price_id,
            email=email,
            metadata={"plan": plan, "org_id": org_id},
            success_url=success_url,
            cancel_url="https://st4rtup.com/pricing?cancelled=1",
            trial_days=trial_days,
        )

    checkout_url = session.get("url", "")
    if not checkout_url:
        raise HTTPException(500, "Error creando sesión de checkout")

    return {"checkout_url": checkout_url, "session_id": session.get("id", ""), "plan": plan}


@router.post("/public/paypal-order")
async def public_paypal_order(
    plan: str = Query(..., description="Plan: growth_monthly, growth_annual, scale_monthly, scale_annual"),
):
    """Crea orden PayPal SIN login."""
    if plan not in PLAN_PRICES:
        raise HTTPException(400, f"Plan inválido")

    if not payment_service.paypal_configured():
        raise HTTPException(400, "PayPal no configurado")

    plan_info = PLAN_PRICES[plan]
    result = await payment_service.paypal_create_order(
        amount=float(plan_info["amount"]),
        currency="EUR",
        description=f"St4rtup {plan.replace('_', ' ').title()}",
        return_url=f"https://st4rtup.com/login?payment=success&plan={plan}",
        cancel_url="https://st4rtup.com/pricing?cancelled=1",
    )

    approval_url = ""
    for link in result.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link["href"]

    return {"approval_url": approval_url, "order_id": result.get("id", ""), "plan": plan}


# ─── CONFIG (PUBLIC) ─────────────────────────────────────────

@router.get("/config")
async def get_payment_config():
    """Devuelve claves publicas de Stripe y PayPal (sin secretos)."""
    return {
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        "paypal_client_id": settings.PAYPAL_CLIENT_ID,
        "paypal_mode": settings.PAYPAL_MODE,
        "stripe_configured": payment_service.stripe_configured(),
        "paypal_configured": payment_service.paypal_configured(),
    }
