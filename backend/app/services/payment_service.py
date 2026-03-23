"""Servicio de pagos — Stripe + PayPal."""
import logging
from typing import Optional
from datetime import datetime, timezone

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── STRIPE ──────────────────────────────────────────────────

STRIPE_API = "https://api.stripe.com/v1"

def stripe_configured() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)

async def _stripe_request(method: str, path: str, data: dict = None) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.request(
            method, f"{STRIPE_API}/{path}",
            headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"},
            data=data,
        )
        resp.raise_for_status()
        return resp.json()


async def stripe_create_checkout(
    amount_cents: int, currency: str = "eur",
    customer_email: str = "", description: str = "",
    success_url: str = "https://app.st4rtup.app/payments?success=1",
    cancel_url: str = "https://app.st4rtup.app/payments?cancelled=1",
    metadata: dict = None,
) -> dict:
    """Crea una sesion de Stripe Checkout."""
    data = {
        "mode": "payment",
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][unit_amount]": str(amount_cents),
        "line_items[0][price_data][product_data][name]": description or "St4rtup GRC",
        "line_items[0][quantity]": "1",
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    if customer_email:
        data["customer_email"] = customer_email
    if metadata:
        for k, v in metadata.items():
            data[f"metadata[{k}]"] = str(v)

    return await _stripe_request("POST", "checkout/sessions", data)


async def stripe_create_subscription(
    customer_email: str, price_id: str,
    trial_days: int = 0,
) -> dict:
    """Crea suscripcion Stripe."""
    # Create customer first
    customer = await _stripe_request("POST", "customers", {"email": customer_email})

    sub_data = {
        "customer": customer["id"],
        "items[0][price]": price_id,
    }
    if trial_days > 0:
        sub_data["trial_period_days"] = str(trial_days)

    return await _stripe_request("POST", "subscriptions", sub_data)


async def stripe_create_invoice(
    customer_email: str, amount_cents: int, description: str = "",
    due_days: int = 30, tax_rate: float = 21.0,
) -> dict:
    """Crea factura Stripe."""
    customer = await _stripe_request("POST", "customers", {"email": customer_email})

    # Create invoice item
    await _stripe_request("POST", "invoiceitems", {
        "customer": customer["id"],
        "amount": str(amount_cents),
        "currency": "eur",
        "description": description or "St4rtup GRC Platform",
    })

    # Create and finalize invoice
    invoice = await _stripe_request("POST", "invoices", {
        "customer": customer["id"],
        "collection_method": "send_invoice",
        "days_until_due": str(due_days),
    })

    # Finalize
    finalized = await _stripe_request("POST", f"invoices/{invoice['id']}/finalize")
    return finalized


async def stripe_list_payments(limit: int = 20) -> dict:
    return await _stripe_request("GET", f"payment_intents?limit={limit}")


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
                    "description": description or "St4rtup GRC Platform",
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
