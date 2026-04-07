"""
Servicio de firma electrónica — DocuSign y YouSign.
Genera el PDF de la oferta, lo sube al proveedor y crea la solicitud de firma.
"""
import httpx
import base64
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Offer, Lead, SystemSettings

TIMEOUT = 30.0


async def _get_provider_config(db: AsyncSession, provider: str) -> dict:
    """Obtiene la configuración del proveedor de firma desde system_settings."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if not sys_settings:
        raise ValueError("No hay configuración del sistema")

    config_field = f"{provider}_config"
    config = getattr(sys_settings, config_field, None)
    if not config:
        raise ValueError(f"No hay configuración para {provider}")
    # Decifrar credenciales sensibles si están cifradas at-rest
    from app.core.credential_store import credential_store, SENSITIVE_KEYS
    sensitive = SENSITIVE_KEYS.get(config_field, ["access_token", "refresh_token", "client_secret", "api_key", "secret_key"])
    return credential_store.decrypt_config(config, sensitive)


async def _get_offer_with_lead(db: AsyncSession, offer_id: UUID) -> tuple:
    """Obtiene la oferta con datos del lead."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise ValueError("Oferta no encontrada")

    lead_result = await db.execute(select(Lead).where(Lead.id == offer.lead_id))
    lead = lead_result.scalar_one_or_none()
    return offer, lead


async def send_for_signature(
    db: AsyncSession,
    offer_id: UUID,
    provider: str,
    signer_email: str,
    signer_name: str,
    message: Optional[str] = None,
) -> dict:
    """
    Envía una oferta para firma electrónica.
    Retorna {signature_request_id, signature_url, provider}.
    """
    if provider not in ("docusign", "yousign"):
        raise ValueError(f"Proveedor no soportado: {provider}")

    offer, lead = await _get_offer_with_lead(db, offer_id)
    config = await _get_provider_config(db, provider)

    if provider == "yousign":
        result = await _send_yousign(offer, lead, config, signer_email, signer_name, message)
    else:
        result = await _send_docusign(offer, lead, config, signer_email, signer_name, message)

    # Update offer with signature info
    offer.signature_provider = provider
    offer.signature_request_id = result["signature_request_id"]
    offer.signature_url = result["signature_url"]
    offer.signature_status = "pending"
    if offer.status.value == "draft":
        offer.status = "sent"
        offer.sent_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(offer)

    return result


async def _send_yousign(
    offer: Offer,
    lead: Lead,
    config: dict,
    signer_email: str,
    signer_name: str,
    message: Optional[str],
) -> dict:
    """Crea solicitud de firma en YouSign v3 API."""
    api_key = config.get("api_key", "")
    env = config.get("environment", "sandbox")
    if not api_key:
        raise ValueError("YouSign API key no configurada")

    base_url = "https://api.yousign.app" if env == "production" else "https://api-sandbox.yousign.app"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    company = lead.company_name if lead else "Cliente"
    subject = f"Propuesta comercial {offer.reference} - St4rtup"
    body_message = message or f"Estimado/a {signer_name},\n\nAdjuntamos la propuesta comercial {offer.reference} para {company}.\n\nPor favor, revísela y proceda a la firma electrónica.\n\nAtentamente,\nSt4rtup"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # 1. Create signature request
        sr_response = await client.post(
            f"{base_url}/v3/signature_requests",
            headers=headers,
            json={
                "name": subject,
                "delivery_mode": "email",
                "timezone": "Europe/Madrid",
                "email_notification": {
                    "sender": {"type": "organization"},
                    "custom_note": body_message,
                },
            },
        )
        if sr_response.status_code not in (200, 201):
            raise ValueError(f"YouSign error creando solicitud: {sr_response.status_code} - {sr_response.text[:300]}")

        sr_data = sr_response.json()
        sr_id = sr_data["id"]

        # 2. Upload document (placeholder PDF - in production, generate real PDF)
        # Create a minimal PDF placeholder with offer reference
        pdf_content = _generate_simple_pdf(offer, company)

        upload_response = await client.post(
            f"{base_url}/v3/signature_requests/{sr_id}/documents",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (f"{offer.reference}.pdf", pdf_content, "application/pdf")},
            data={"nature": "signable_document"},
        )
        if upload_response.status_code not in (200, 201):
            raise ValueError(f"YouSign error subiendo documento: {upload_response.status_code} - {upload_response.text[:300]}")

        doc_data = upload_response.json()
        doc_id = doc_data["id"]

        # 3. Add signer
        signer_response = await client.post(
            f"{base_url}/v3/signature_requests/{sr_id}/signers",
            headers=headers,
            json={
                "info": {
                    "first_name": signer_name.split()[0] if signer_name else "Cliente",
                    "last_name": " ".join(signer_name.split()[1:]) if len(signer_name.split()) > 1 else signer_name,
                    "email": signer_email,
                    "locale": "es",
                },
                "signature_level": "electronic_signature",
                "signature_authentication_mode": "no_otp",
                "fields": [
                    {
                        "document_id": doc_id,
                        "type": "signature",
                        "page": 1,
                        "x": 77,
                        "y": 581,
                        "width": 200,
                        "height": 60,
                    }
                ],
            },
        )
        if signer_response.status_code not in (200, 201):
            raise ValueError(f"YouSign error añadiendo firmante: {signer_response.status_code} - {signer_response.text[:300]}")

        # 4. Activate signature request
        activate_response = await client.post(
            f"{base_url}/v3/signature_requests/{sr_id}/activate",
            headers=headers,
        )
        if activate_response.status_code not in (200, 201):
            raise ValueError(f"YouSign error activando solicitud: {activate_response.status_code} - {activate_response.text[:300]}")

        activate_data = activate_response.json()

        return {
            "signature_request_id": sr_id,
            "signature_url": activate_data.get("external_id", f"{base_url}/signature_requests/{sr_id}"),
            "provider": "yousign",
        }


async def _send_docusign(
    offer: Offer,
    lead: Lead,
    config: dict,
    signer_email: str,
    signer_name: str,
    message: Optional[str],
) -> dict:
    """Crea envelope en DocuSign eSignature API."""
    config.get("integration_key", "")
    config.get("secret_key", "")
    account_id = config.get("account_id", "")
    access_token = config.get("access_token", "")

    if not access_token:
        raise ValueError("DocuSign access_token no configurado. Complete el flujo OAuth2 primero.")

    base_url = config.get("base_url", "https://demo.docusign.net/restapi")
    company = lead.company_name if lead else "Cliente"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Generate PDF
    pdf_content = _generate_simple_pdf(offer, company)
    pdf_b64 = base64.b64encode(pdf_content).decode("utf-8")

    subject = f"Propuesta comercial {offer.reference} - St4rtup"
    email_body = message or f"Propuesta comercial {offer.reference} para {company}. Por favor, revise y firme el documento."

    envelope_data = {
        "emailSubject": subject,
        "emailBlurb": email_body,
        "documents": [
            {
                "documentBase64": pdf_b64,
                "name": f"{offer.reference}.pdf",
                "fileExtension": "pdf",
                "documentId": "1",
            }
        ],
        "recipients": {
            "signers": [
                {
                    "email": signer_email,
                    "name": signer_name,
                    "recipientId": "1",
                    "tabs": {
                        "signHereTabs": [
                            {
                                "documentId": "1",
                                "pageNumber": "1",
                                "xPosition": "200",
                                "yPosition": "700",
                            }
                        ]
                    },
                }
            ]
        },
        "status": "sent",
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{base_url}/v2.1/accounts/{account_id}/envelopes",
            headers=headers,
            json=envelope_data,
        )
        if response.status_code not in (200, 201):
            raise ValueError(f"DocuSign error: {response.status_code} - {response.text[:300]}")

        data = response.json()
        envelope_id = data.get("envelopeId", "")

        return {
            "signature_request_id": envelope_id,
            "signature_url": data.get("uri", f"{base_url}/v2.1/accounts/{account_id}/envelopes/{envelope_id}"),
            "provider": "docusign",
        }


def _generate_simple_pdf(offer: Offer, company: str) -> bytes:
    """
    Genera un PDF simple de la oferta para subir al proveedor de firma.
    En producción se podría usar una plantilla más elaborada.
    """
    # Minimal valid PDF with offer summary text
    lines = [
        f"PROPUESTA COMERCIAL - {offer.reference}",
        f"Cliente: {company}",
        f"Titulo: {offer.title}",
        f"Total: {offer.total} {offer.currency}",
        "",
        "Lineas:",
    ]
    if offer.items:
        for item in offer.items:
            name = item.get("name", "")
            qty = item.get("quantity", 1)
            item.get("unit_price", 0)
            total = item.get("total", 0)
            lines.append(f"  - {name} x{qty} = {total} {offer.currency}")

    lines.extend([
        "",
        f"Subtotal: {offer.subtotal} {offer.currency}",
        f"IVA ({offer.tax_rate}%): {offer.tax_amount} {offer.currency}",
        f"Total: {offer.total} {offer.currency}",
        "",
        "",
        "Firma del cliente: ___________________________",
        "",
        "Fecha: ___/___/______",
    ])

    "\n".join(lines)

    # Build a minimal PDF (PDF 1.4 spec)
    content_stream = "BT /F1 12 Tf 50 750 Td "
    y = 750
    for line in lines:
        safe_line = line.replace("(", "\\(").replace(")", "\\)")
        content_stream += f"({safe_line}) Tj 0 -16 Td "
        y -= 16
    content_stream += "ET"

    stream_bytes = content_stream.encode("latin-1", errors="replace")

    pdf_parts = []
    pdf_parts.append(b"%PDF-1.4\n")

    # Catalog
    pdf_parts.append(b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n")
    # Pages
    pdf_parts.append(b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n")
    # Page
    pdf_parts.append(b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n")
    # Content stream
    pdf_parts.append(f"4 0 obj<</Length {len(stream_bytes)}>>stream\n".encode())
    pdf_parts.append(stream_bytes)
    pdf_parts.append(b"\nendstream\nendobj\n")
    # Font
    pdf_parts.append(b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n")

    # xref + trailer (simplified)
    body = b"".join(pdf_parts)
    xref_pos = len(body)
    xref = b"xref\n0 6\n"
    xref += b"0000000000 65535 f \n"
    len(b"%PDF-1.4\n")
    for i in range(1, 6):
        obj_marker = f"{i} 0 obj".encode()
        obj_pos = body.find(obj_marker)
        xref += f"{obj_pos:010d} 00000 n \n".encode()

    trailer = f"trailer<</Size 6/Root 1 0 R>>\nstartxref\n{xref_pos}\n%%EOF".encode()

    return body + xref + trailer


async def handle_webhook(
    db: AsyncSession,
    provider: str,
    payload: dict,
) -> dict:
    """Procesa webhook de firma electrónica y actualiza estado."""
    if provider == "yousign":
        return await _handle_yousign_webhook(db, payload)
    elif provider == "docusign":
        return await _handle_docusign_webhook(db, payload)
    return {"status": "unknown_provider"}


async def _handle_yousign_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook de YouSign."""
    event_name = payload.get("event_name", "")
    sr_data = payload.get("data", {}).get("signature_request", {}) or payload.get("data", {})
    sr_id = sr_data.get("id", "")

    if not sr_id:
        return {"status": "no_id"}

    result = await db.execute(
        select(Offer).where(Offer.signature_request_id == sr_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        return {"status": "offer_not_found"}

    now = datetime.now(timezone.utc)

    if event_name in ("signature_request.done", "signer.done"):
        offer.signature_status = "signed"
        offer.signed_at = now
        offer.status = "accepted"
        offer.accepted_at = now
    elif event_name in ("signature_request.declined", "signer.declined"):
        offer.signature_status = "declined"
        offer.status = "rejected"
        offer.rejected_at = now
        offer.rejection_reason = "Firma rechazada por el cliente"
    elif event_name == "signature_request.expired":
        offer.signature_status = "expired"
        offer.status = "expired"

    await db.commit()
    return {"status": "processed", "event": event_name, "offer_id": str(offer.id)}


async def _handle_docusign_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook (Connect) de DocuSign."""
    envelope_id = payload.get("envelopeId", "") or payload.get("data", {}).get("envelopeId", "")
    status = payload.get("status", "") or payload.get("data", {}).get("envelopeSummary", {}).get("status", "")

    if not envelope_id:
        return {"status": "no_envelope_id"}

    result = await db.execute(
        select(Offer).where(Offer.signature_request_id == envelope_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        return {"status": "offer_not_found"}

    now = datetime.now(timezone.utc)

    if status == "completed":
        offer.signature_status = "signed"
        offer.signed_at = now
        offer.status = "accepted"
        offer.accepted_at = now
    elif status == "declined":
        offer.signature_status = "declined"
        offer.status = "rejected"
        offer.rejected_at = now
        offer.rejection_reason = "Firma rechazada por el cliente"
    elif status == "voided":
        offer.signature_status = "expired"
        offer.status = "expired"

    await db.commit()
    return {"status": "processed", "docusign_status": status, "offer_id": str(offer.id)}
