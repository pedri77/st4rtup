"""
Servicio de facturacion — Holded, Stripe y Facturama.
Crea facturas a partir de ofertas aceptadas y gestiona webhooks de estado.
"""
import httpx
import base64
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Offer, Lead, SystemSettings

TIMEOUT = 30.0


async def _get_provider_config(db: AsyncSession, provider: str) -> dict:
    """Obtiene la configuracion del proveedor de facturacion desde system_settings."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if not sys_settings:
        raise ValueError("No hay configuracion del sistema")

    config_field = f"{provider}_config"
    config = getattr(sys_settings, config_field, None)
    if not config:
        raise ValueError(f"No hay configuracion para {provider}")
    return config


async def _get_offer_with_lead(db: AsyncSession, offer_id: UUID) -> tuple:
    """Obtiene la oferta con datos del lead."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise ValueError("Oferta no encontrada")

    lead_result = await db.execute(select(Lead).where(Lead.id == offer.lead_id))
    lead = lead_result.scalar_one_or_none()
    return offer, lead


async def create_invoice(
    db: AsyncSession,
    offer_id: UUID,
    provider: str,
) -> dict:
    """
    Crea una factura a partir de una oferta aceptada.
    Retorna {invoice_id, invoice_number, invoice_url, provider}.
    """
    if provider not in ("holded", "stripe", "facturama"):
        raise ValueError(f"Proveedor no soportado: {provider}")

    offer, lead = await _get_offer_with_lead(db, offer_id)

    if offer.status.value not in ("accepted", "sent"):
        raise ValueError("Solo se pueden facturar ofertas aceptadas o enviadas")

    if offer.invoice_id:
        raise ValueError(f"Esta oferta ya tiene factura: {offer.invoice_number or offer.invoice_id}")

    config = await _get_provider_config(db, provider)

    if provider == "holded":
        result = await _create_holded_invoice(offer, lead, config)
    elif provider == "stripe":
        result = await _create_stripe_invoice(offer, lead, config)
    else:
        result = await _create_facturama_invoice(offer, lead, config)

    # Update offer with invoice info
    offer.invoice_provider = provider
    offer.invoice_id = result["invoice_id"]
    offer.invoice_number = result.get("invoice_number")
    offer.invoice_url = result.get("invoice_url")
    offer.invoice_status = "draft"
    offer.invoiced_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(offer)

    return result


async def _create_holded_invoice(
    offer: Offer,
    lead: Lead,
    config: dict,
) -> dict:
    """Crea factura en Holded API v1."""
    api_key = config.get("api_key", "")
    if not api_key:
        raise ValueError("Holded API key no configurada")

    base_url = "https://api.holded.com/api/invoicing/v1"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "key": api_key,
    }

    company = lead.company_name if lead else "Cliente"

    # Build line items
    items = []
    if offer.items:
        for item in offer.items:
            items.append({
                "name": item.get("name", "Servicio"),
                "desc": item.get("description", ""),
                "units": item.get("quantity", 1),
                "subtotal": item.get("unit_price", 0),
                "tax": offer.tax_rate or 21,
            })
    else:
        items.append({
            "name": offer.title,
            "units": 1,
            "subtotal": offer.subtotal or offer.total,
            "tax": offer.tax_rate or 21,
        })

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # 1. Find or create contact
        contact_id = await _holded_find_or_create_contact(client, headers, base_url, lead)

        # 2. Create invoice
        invoice_data = {
            "contactId": contact_id,
            "desc": f"Propuesta {offer.reference} - {company}",
            "date": int(datetime.now(timezone.utc).timestamp()),
            "items": items,
            "currency": offer.currency or "EUR",
        }

        if offer.discount_percent and offer.discount_percent > 0:
            invoice_data["discount"] = offer.discount_percent

        response = await client.post(
            f"{base_url}/documents/invoice",
            headers=headers,
            json=invoice_data,
        )
        if response.status_code not in (200, 201):
            raise ValueError(f"Holded error: {response.status_code} - {response.text[:300]}")

        data = response.json()
        invoice_id = data.get("id", "")
        invoice_number = data.get("docNumber", "")

        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "invoice_url": f"https://app.holded.com/invoicing/invoices/{invoice_id}",
            "provider": "holded",
        }


async def _holded_find_or_create_contact(
    client: httpx.AsyncClient,
    headers: dict,
    base_url: str,
    lead: Lead,
) -> str:
    """Busca o crea contacto en Holded."""
    if not lead:
        raise ValueError("No se puede crear factura sin lead asociado")

    # Search by name
    search_response = await client.get(
        f"{base_url}/contacts",
        headers=headers,
        params={"name": lead.company_name},
    )

    if search_response.status_code == 200:
        contacts = search_response.json()
        if contacts and isinstance(contacts, list):
            for contact in contacts:
                if contact.get("name", "").lower() == lead.company_name.lower():
                    return contact["id"]

    # Create new contact
    contact_data = {
        "name": lead.company_name,
        "email": lead.email or "",
        "phone": lead.phone or "",
        "type": "client",
        "isperson": False,
    }
    if lead.tax_id:
        contact_data["vatnumber"] = lead.tax_id

    create_response = await client.post(
        f"{base_url}/contacts",
        headers=headers,
        json=contact_data,
    )
    if create_response.status_code not in (200, 201):
        raise ValueError(f"Holded error creando contacto: {create_response.status_code}")

    return create_response.json().get("id", "")


async def _create_stripe_invoice(
    offer: Offer,
    lead: Lead,
    config: dict,
) -> dict:
    """Crea factura en Stripe Invoicing API."""
    secret_key = config.get("secret_key", "")
    if not secret_key:
        raise ValueError("Stripe secret key no configurada")

    base_url = "https://api.stripe.com/v1"
    headers = {"Authorization": f"Bearer {secret_key}"}
    company = lead.company_name if lead else "Cliente"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # 1. Find or create customer
        customer_id = await _stripe_find_or_create_customer(client, headers, base_url, lead)

        # 2. Create invoice
        invoice_response = await client.post(
            f"{base_url}/invoices",
            headers=headers,
            data={
                "customer": customer_id,
                "description": f"Propuesta {offer.reference} - {company}",
                "currency": (offer.currency or "EUR").lower(),
                "auto_advance": "false",
                "collection_method": "send_invoice",
                "days_until_due": 30,
            },
        )
        if invoice_response.status_code not in (200, 201):
            raise ValueError(f"Stripe error creando factura: {invoice_response.status_code} - {invoice_response.text[:300]}")

        invoice_data = invoice_response.json()
        invoice_id = invoice_data["id"]

        # 3. Add line items
        if offer.items:
            for item in offer.items:
                unit_price = item.get("unit_price", 0)
                quantity = item.get("quantity", 1)
                await client.post(
                    f"{base_url}/invoiceitems",
                    headers=headers,
                    data={
                        "customer": customer_id,
                        "invoice": invoice_id,
                        "description": item.get("name", "Servicio"),
                        "unit_amount": int(unit_price * 100),
                        "quantity": quantity,
                        "currency": (offer.currency or "EUR").lower(),
                    },
                )
        else:
            await client.post(
                f"{base_url}/invoiceitems",
                headers=headers,
                data={
                    "customer": customer_id,
                    "invoice": invoice_id,
                    "description": offer.title,
                    "unit_amount": int((offer.subtotal or offer.total) * 100),
                    "quantity": 1,
                    "currency": (offer.currency or "EUR").lower(),
                },
            )

        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_data.get("number"),
            "invoice_url": invoice_data.get("hosted_invoice_url", f"https://dashboard.stripe.com/invoices/{invoice_id}"),
            "provider": "stripe",
        }


async def _stripe_find_or_create_customer(
    client: httpx.AsyncClient,
    headers: dict,
    base_url: str,
    lead: Lead,
) -> str:
    """Busca o crea customer en Stripe."""
    if not lead:
        raise ValueError("No se puede crear factura sin lead asociado")

    # Search by email
    if lead.email:
        search_response = await client.get(
            f"{base_url}/customers/search",
            headers=headers,
            params={"query": f"email:'{lead.email}'"},
        )
        if search_response.status_code == 200:
            data = search_response.json()
            if data.get("data"):
                return data["data"][0]["id"]

    # Create new customer
    customer_data = {
        "name": lead.company_name,
        "email": lead.email or "",
    }
    if lead.phone:
        customer_data["phone"] = lead.phone

    create_response = await client.post(
        f"{base_url}/customers",
        headers=headers,
        data=customer_data,
    )
    if create_response.status_code not in (200, 201):
        raise ValueError(f"Stripe error creando customer: {create_response.status_code}")

    return create_response.json()["id"]


async def _create_facturama_invoice(
    offer: Offer,
    lead: Lead,
    config: dict,
) -> dict:
    """Crea factura en Facturama API."""
    user = config.get("user", "")
    password = config.get("password", "")
    environment = config.get("environment", "sandbox")

    if not user or not password:
        raise ValueError("Facturama credenciales no configuradas")

    base_url = "https://apisandbox.facturama.mx" if environment == "sandbox" else "https://api.facturama.mx"
    auth = base64.b64encode(f"{user}:{password}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }

    company = lead.company_name if lead else "Cliente"

    # Build items
    items = []
    if offer.items:
        for item in offer.items:
            items.append({
                "ProductCode": "81112100",
                "Description": item.get("name", "Servicio"),
                "UnitCode": "E48",
                "UnitPrice": item.get("unit_price", 0),
                "Quantity": item.get("quantity", 1),
                "Subtotal": item.get("total", 0),
                "Taxes": [
                    {
                        "Total": round(item.get("total", 0) * (offer.tax_rate or 21) / 100, 2),
                        "Name": "IVA",
                        "Rate": (offer.tax_rate or 21) / 100,
                        "Base": item.get("total", 0),
                        "IsRetention": False,
                    }
                ],
                "Total": round(item.get("total", 0) * (1 + (offer.tax_rate or 21) / 100), 2),
            })
    else:
        subtotal = offer.subtotal or offer.total
        items.append({
            "ProductCode": "81112100",
            "Description": offer.title,
            "UnitCode": "E48",
            "UnitPrice": subtotal,
            "Quantity": 1,
            "Subtotal": subtotal,
            "Taxes": [
                {
                    "Total": round(subtotal * (offer.tax_rate or 21) / 100, 2),
                    "Name": "IVA",
                    "Rate": (offer.tax_rate or 21) / 100,
                    "Base": subtotal,
                    "IsRetention": False,
                }
            ],
            "Total": round(subtotal * (1 + (offer.tax_rate or 21) / 100), 2),
        })

    invoice_data = {
        "Receiver": {
            "Name": company,
            "Rfc": getattr(lead, "tax_id", None) or "XAXX010101000",
            "CfdiUse": "G03",
        },
        "CfdiType": "I",
        "PaymentForm": "99",
        "PaymentMethod": "PPD",
        "Currency": offer.currency or "EUR",
        "Items": items,
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{base_url}/3/cfdis",
            headers=headers,
            json=invoice_data,
        )
        if response.status_code not in (200, 201):
            raise ValueError(f"Facturama error: {response.status_code} - {response.text[:300]}")

        data = response.json()
        cfdi_id = data.get("Id", "")
        folio = data.get("Folio", "")

        return {
            "invoice_id": cfdi_id,
            "invoice_number": folio,
            "invoice_url": f"{base_url}/cfdi/{cfdi_id}",
            "provider": "facturama",
        }


async def send_invoice(
    db: AsyncSession,
    offer_id: UUID,
) -> dict:
    """Envia la factura al cliente (cambia estado a 'sent')."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise ValueError("Oferta no encontrada")
    if not offer.invoice_id:
        raise ValueError("Esta oferta no tiene factura creada")

    provider = offer.invoice_provider
    config = await _get_provider_config(db, provider)

    if provider == "holded":
        api_key = config.get("api_key", "")
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            await client.post(
                f"https://api.holded.com/api/invoicing/v1/documents/invoice/{offer.invoice_id}/send",
                headers={"key": api_key, "Content-Type": "application/json"},
                json={"emails": [offer.lead and ""]},
            )
    elif provider == "stripe":
        secret_key = config.get("secret_key", "")
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            await client.post(
                f"https://api.stripe.com/v1/invoices/{offer.invoice_id}/send",
                headers={"Authorization": f"Bearer {secret_key}"},
            )
    # Facturama sends automatically on creation

    offer.invoice_status = "sent"
    await db.commit()

    return {"status": "sent", "invoice_id": offer.invoice_id}


async def handle_invoice_webhook(
    db: AsyncSession,
    provider: str,
    payload: dict,
) -> dict:
    """Procesa webhook de facturacion y actualiza estado."""
    if provider == "stripe":
        return await _handle_stripe_webhook(db, payload)
    elif provider == "holded":
        return await _handle_holded_webhook(db, payload)
    return {"status": "unknown_provider"}


async def _handle_stripe_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook de Stripe para facturas."""
    event_type = payload.get("type", "")
    invoice_data = payload.get("data", {}).get("object", {})
    invoice_id = invoice_data.get("id", "")

    if not invoice_id:
        return {"status": "no_invoice_id"}

    result = await db.execute(
        select(Offer).where(Offer.invoice_id == invoice_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        return {"status": "offer_not_found"}

    if event_type == "invoice.paid":
        offer.invoice_status = "paid"
    elif event_type == "invoice.payment_failed":
        offer.invoice_status = "overdue"
    elif event_type == "invoice.sent":
        offer.invoice_status = "sent"

    await db.commit()
    return {"status": "processed", "event": event_type, "offer_id": str(offer.id)}


async def _handle_holded_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook de Holded para facturas."""
    event = payload.get("event", "")
    doc_id = payload.get("id", "") or payload.get("data", {}).get("id", "")

    if not doc_id:
        return {"status": "no_doc_id"}

    result = await db.execute(
        select(Offer).where(Offer.invoice_id == doc_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        return {"status": "offer_not_found"}

    if event in ("invoice.paid", "payment.received"):
        offer.invoice_status = "paid"
    elif event == "invoice.overdue":
        offer.invoice_status = "overdue"

    await db.commit()
    return {"status": "processed", "event": event, "offer_id": str(offer.id)}
