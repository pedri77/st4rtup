"""
Stripe invoicing — crear facturas al cerrar deals.
API docs: https://stripe.com/docs/api/invoices
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
STRIPE_API = "https://api.stripe.com/v1"


async def _get_secret_key(db: Optional[AsyncSession] = None) -> str:
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.stripe_config and s.stripe_config.get("secret_key"):
            return s.stripe_config["secret_key"]
    from app.core.config import settings
    if getattr(settings, "STRIPE_SECRET_KEY", ""):
        return settings.STRIPE_SECRET_KEY
    raise ValueError("Stripe no configurado")


def _headers(key: str) -> dict:
    return {"Authorization": f"Bearer {key}"}


async def get_or_create_customer(email: str, name: str = "",
                                   db: Optional[AsyncSession] = None) -> dict:
    """Busca cliente por email o lo crea."""
    key = await _get_secret_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Search existing
        r = await client.get(f"{STRIPE_API}/customers/search",
                             headers=_headers(key),
                             params={"query": f"email:'{email}'"})
        if r.status_code == 200:
            data = r.json().get("data", [])
            if data:
                return {"id": data[0]["id"], "email": data[0]["email"], "name": data[0].get("name", ""), "created": False}

        # Create new
        r = await client.post(f"{STRIPE_API}/customers",
                              headers=_headers(key),
                              data={"email": email, "name": name})
        r.raise_for_status()
        cust = r.json()
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
    items: [{"description": "ENS Alto PoC 90 dias", "amount": 1950000, "quantity": 1}]
    amount en centimos (19500 EUR = 1950000 cents)
    """
    key = await _get_secret_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Create invoice
        invoice_data = {"customer": customer_id, "currency": currency,
                        "auto_advance": str(auto_advance).lower()}
        if description:
            invoice_data["description"] = description
        r = await client.post(f"{STRIPE_API}/invoices", headers=_headers(key), data=invoice_data)
        r.raise_for_status()
        invoice = r.json()
        invoice_id = invoice["id"]

        # Add line items
        for item in items:
            await client.post(f"{STRIPE_API}/invoiceitems", headers=_headers(key), data={
                "customer": customer_id, "invoice": invoice_id,
                "description": item.get("description", ""),
                "unit_amount": item.get("amount", 0),
                "quantity": item.get("quantity", 1),
                "currency": currency,
            })

        return {"id": invoice_id, "status": invoice["status"],
                "total": invoice.get("total", 0), "currency": currency,
                "hosted_invoice_url": invoice.get("hosted_invoice_url"),
                "pdf": invoice.get("invoice_pdf")}


async def create_payment_link(
    amount: int, description: str = "St4rtup GRC",
    currency: str = "eur", db: Optional[AsyncSession] = None,
) -> dict:
    """Crea un link de pago unico."""
    key = await _get_secret_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Create price
        r = await client.post(f"{STRIPE_API}/prices", headers=_headers(key), data={
            "unit_amount": amount, "currency": currency,
            "product_data[name]": description,
        })
        r.raise_for_status()
        price_id = r.json()["id"]

        # Create payment link
        r = await client.post(f"{STRIPE_API}/payment_links", headers=_headers(key), data={
            "line_items[0][price]": price_id, "line_items[0][quantity]": 1,
        })
        r.raise_for_status()
        return {"url": r.json()["url"], "id": r.json()["id"]}


async def list_invoices(customer_id: str = "", limit: int = 10,
                         db: Optional[AsyncSession] = None) -> list:
    key = await _get_secret_key(db)
    params = {"limit": limit}
    if customer_id:
        params["customer"] = customer_id
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{STRIPE_API}/invoices", headers=_headers(key), params=params)
        r.raise_for_status()
        return [
            {"id": inv["id"], "status": inv["status"], "total": inv["total"],
             "currency": inv["currency"], "customer": inv["customer"],
             "created": inv["created"], "hosted_url": inv.get("hosted_invoice_url")}
            for inv in r.json().get("data", [])
        ]
