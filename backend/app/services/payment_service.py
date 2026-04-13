"""Servicio de pagos — Stripe + PayPal."""
import logging
from typing import Optional

import httpx
import stripe
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Stripe SDK
stripe.api_key = settings.STRIPE_SECRET_KEY or ""


# ─── STRIPE ──────────────────────────────────────────────────

def stripe_configured() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)


async def stripe_create_checkout(
    amount_cents: int, currency: str = "eur",
    customer_email: str = "", description: str = "",
    success_url: str = "https://app.st4rtup.app/payments?success=1",
    cancel_url: str = "https://app.st4rtup.app/payments?cancelled=1",
    metadata: dict = None,
) -> dict:
    """Crea una sesion de Stripe Checkout."""
    params = {
        "mode": "payment",
        "payment_method_types": ["card"],
        "line_items": [{
            "price_data": {
                "currency": currency,
                "unit_amount": amount_cents,
                "product_data": {"name": description or "St4rtup growth"},
            },
            "quantity": 1,
        }],
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    if customer_email:
        params["customer_email"] = customer_email
    if metadata:
        params["metadata"] = metadata

    session = stripe.checkout.Session.create(**params)
    return session


async def stripe_create_subscription(
    customer_email: str, price_id: str,
    trial_days: int = 0,
) -> dict:
    """Crea suscripcion Stripe."""
    customer = stripe.Customer.create(email=customer_email)

    sub_params = {
        "customer": customer["id"],
        "items": [{"price": price_id}],
    }
    if trial_days > 0:
        sub_params["trial_period_days"] = trial_days

    return stripe.Subscription.create(**sub_params)


async def stripe_create_invoice(
    customer_email: str, amount_cents: int, description: str = "",
    due_days: int = 30, tax_rate: float = 21.0,
) -> dict:
    """Crea factura Stripe."""
    customer = stripe.Customer.create(email=customer_email)

    stripe.InvoiceItem.create(
        customer=customer["id"],
        amount=amount_cents,
        currency="eur",
        description=description or "St4rtup growth Platform",
    )

    invoice = stripe.Invoice.create(
        customer=customer["id"],
        collection_method="send_invoice",
        days_until_due=due_days,
    )

    finalized = stripe.Invoice.finalize_invoice(invoice["id"])
    return finalized


async def stripe_list_payments(limit: int = 20) -> dict:
    return stripe.PaymentIntent.list(limit=limit)


def stripe_construct_webhook_event(payload: bytes, sig_header: str) -> dict:
    """Construye y verifica un evento de webhook de Stripe."""
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.STRIPE_WEBHOOK_SECRET,
    )


def stripe_get_subscription(subscription_id: str) -> dict:
    """Recupera una suscripcion de Stripe."""
    return stripe.Subscription.retrieve(subscription_id)


def stripe_create_portal_session(customer_id: str, return_url: str) -> dict:
    """Crea sesion de Customer Portal."""
    return stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )


def stripe_create_checkout_subscription(
    price_id: str, email: str = "", metadata: dict = None,
    success_url: str = "", cancel_url: str = "",
    trial_days: int = 0,
) -> dict:
    """Crea Checkout Session para suscripcion con price_id."""
    params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    if email:
        params["customer_email"] = email
    if metadata:
        params["metadata"] = metadata
        params["subscription_data"] = {"metadata": metadata}
    if trial_days > 0:
        params["subscription_data"] = {
            **(params.get("subscription_data") or {}),
            "trial_period_days": trial_days,
        }
    return stripe.checkout.Session.create(**params)


# ─── PAYPAL ──────────────────────────────────────────────────

def paypal_configured() -> bool:
    return bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)

def _paypal_base():
    return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

async def _paypal_token() -> str:
    import base64
    credentials = base64.b64encode(f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode()).decode()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_paypal_base()}/v1/oauth2/token",
            headers={"Authorization": f"Basic {credentials}"},
            data={"grant_type": "client_credentials"},
        )
        return resp.json()["access_token"]

async def paypal_create_order(
    amount: float, currency: str = "EUR", description: str = "",
    return_url: str = "https://app.st4rtup.app/payments?success=1",
    cancel_url: str = "https://app.st4rtup.app/payments?cancelled=1",
) -> dict:
    """Crea orden de pago PayPal."""
    token = await _paypal_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_paypal_base()}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                    "description": description or "St4rtup growth Platform",
                }],
                "application_context": {
                    "return_url": return_url,
                    "cancel_url": cancel_url,
                },
            },
        )
        return resp.json()

async def paypal_capture_order(order_id: str) -> dict:
    token = await _paypal_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_paypal_base()}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        return resp.json()
