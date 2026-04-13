"""
Stripe invoicing — crear facturas al cerrar deals.
API docs: https://stripe.com/docs/api/invoices
"""
import logging
from typing import Optional

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)


def _configure_key(db_key: Optional[str] = None):
    """Configura la API key de Stripe (prioriza DB sobre config)."""
    if db_key:
        stripe.api_key = db_key
        return
    from app.core.config import settings
    if getattr(settings, "STRIPE_SECRET_KEY", ""):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        return
    raise ValueError("Stripe no configurado")


async def _get_secret_key(db: Optional[AsyncSession] = None) -> Optional[str]:
    """Intenta obtener la key de la DB, devuelve None si no hay."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.stripe_config and s.stripe_config.get("secret_key"):
            return s.stripe_config["secret_key"]
    return None


async def get_or_create_customer(email: str, name: str = "",
                                   db: Optional[AsyncSession] = None) -> dict:
    """Busca cliente por email o lo crea."""
    db_key = await _get_secret_key(db)
    _configure_key(db_key)

    # Search existing
    results = stripe.Customer.search(query=f"email:'{email}'")
    if results.data:
        c = results.data[0]
        return {"id": c["id"], "email": c["email"], "name": c.get("name", ""), "created": False}

    # Create new
    cust = stripe.Customer.create(email=email, name=name)
    return {"id": cust["id"], "email": cust["email"], "name": cust.get("name", ""), "created": True}


async def create_invoice(
    customer_id: str,
    items: list[dict],
    description: str = "",
    currency: str = "eur",
    auto_advance: bool = False,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Crea una factura draft con line items.
    items: [{"description": "Enterprise PoC 90 dias", "amount": 1950000, "quantity": 1}]
    amount en centimos (19500 EUR = 1950000 cents)
    """
    db_key = await _get_secret_key(db)
    _configure_key(db_key)

    invoice_params = {
        "customer": customer_id,
        "currency": currency,
        "auto_advance": auto_advance,
    }
    if description:
        invoice_params["description"] = description

    invoice = stripe.Invoice.create(**invoice_params)

    # Add line items
    for item in items:
        stripe.InvoiceItem.create(
            customer=customer_id,
            invoice=invoice["id"],
            description=item.get("description", ""),
            unit_amount=item.get("amount", 0),
            quantity=item.get("quantity", 1),
            currency=currency,
        )

    return {
        "id": invoice["id"],
        "status": invoice["status"],
        "total": invoice.get("total", 0),
        "currency": currency,
        "hosted_invoice_url": invoice.get("hosted_invoice_url"),
        "pdf": invoice.get("invoice_pdf"),
    }


async def create_payment_link(
    amount: int, description: str = "St4rtup growth",
    currency: str = "eur", db: Optional[AsyncSession] = None,
) -> dict:
    """Crea un link de pago unico."""
    db_key = await _get_secret_key(db)
    _configure_key(db_key)

    price = stripe.Price.create(
        unit_amount=amount,
        currency=currency,
        product_data={"name": description},
    )

    link = stripe.PaymentLink.create(
        line_items=[{"price": price["id"], "quantity": 1}],
    )

    return {"url": link["url"], "id": link["id"]}


async def list_invoices(customer_id: str = "", limit: int = 10,
                         db: Optional[AsyncSession] = None) -> list:
    db_key = await _get_secret_key(db)
    _configure_key(db_key)

    params = {"limit": limit}
    if customer_id:
        params["customer"] = customer_id

    result = stripe.Invoice.list(**params)
    return [
        {"id": inv["id"], "status": inv["status"], "total": inv["total"],
         "currency": inv["currency"], "customer": inv["customer"],
         "created": inv["created"], "hosted_url": inv.get("hosted_invoice_url")}
        for inv in result.data
    ]
