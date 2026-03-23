"""NDA signature service — Signaturit primary, Yousign secondary, DocuSign fallback."""
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def signaturit_configured():
    return bool(settings.SIGNATURIT_API_KEY)


def yousign_configured():
    return bool(getattr(settings, "YOUSIGN_API_KEY", ""))


def docusign_configured():
    return bool(settings.DOCUSIGN_INTEGRATION_KEY)


async def send_nda(member_email: str, member_name: str, company_name: str) -> dict:
    """Send NDA for signature. Chain: Signaturit → Yousign → DocuSign → Checkbox."""

    # 1. Try Signaturit (eIDAS cualificado, España)
    if signaturit_configured():
        try:
            async with httpx.AsyncClient(timeout=settings.NDA_SIGNATURE_TIMEOUT) as client:
                resp = await client.post(
                    f"{settings.SIGNATURIT_BASE_URL}/signatures",
                    headers={"Authorization": f"Bearer {settings.SIGNATURIT_API_KEY}"},
                    json={
                        "recipients": [{"email": member_email, "name": member_name}],
                        "name": f"NDA - {company_name} - St4rtup",
                        "body": f"Acuerdo de confidencialidad entre {company_name} y St4rtup",
                    },
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return {
                        "provider": "signaturit",
                        "signature_id": data.get("id", ""),
                        "sign_url": data.get("url", ""),
                        "status": "pending",
                    }
        except Exception as e:
            logger.warning("Signaturit failed, trying Yousign: %s", e)

    # 2. Try Yousign (eIDAS avanzado, Francia/EU)
    if yousign_configured():
        try:
            yousign_base = getattr(settings, "YOUSIGN_BASE_URL", "https://api.yousign.app/v3")
            async with httpx.AsyncClient(timeout=settings.NDA_SIGNATURE_TIMEOUT) as client:
                # Create signature request
                resp = await client.post(
                    f"{yousign_base}/signature_requests",
                    headers={
                        "Authorization": f"Bearer {settings.YOUSIGN_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "name": f"NDA - {company_name} - St4rtup",
                        "delivery_mode": "email",
                        "timezone": "Europe/Madrid",
                    },
                )
                if resp.status_code in (200, 201):
                    sr_data = resp.json()
                    sr_id = sr_data.get("id", "")

                    # Add signer
                    signer_resp = await client.post(
                        f"{yousign_base}/signature_requests/{sr_id}/signers",
                        headers={
                            "Authorization": f"Bearer {settings.YOUSIGN_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "info": {
                                "first_name": member_name.split()[0] if member_name else "Contacto",
                                "last_name": " ".join(member_name.split()[1:]) if len(member_name.split()) > 1 else company_name,
                                "email": member_email,
                                "locale": "es",
                            },
                            "signature_level": "electronic_signature",
                        },
                    )

                    sign_url = ""
                    if signer_resp.status_code in (200, 201):
                        signer_data = signer_resp.json()
                        sign_url = signer_data.get("signature_link", "")

                    # Activate the signature request
                    await client.post(
                        f"{yousign_base}/signature_requests/{sr_id}/activate",
                        headers={"Authorization": f"Bearer {settings.YOUSIGN_API_KEY}"},
                    )

                    return {
                        "provider": "yousign",
                        "signature_id": sr_id,
                        "sign_url": sign_url,
                        "status": "pending",
                    }
        except Exception as e:
            logger.warning("Yousign failed, trying DocuSign: %s", e)

    # 3. Fallback: DocuSign
    if docusign_configured():
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.DOCUSIGN_BASE_URL}/v2.1/accounts/{settings.DOCUSIGN_ACCOUNT_ID}/envelopes",
                    headers={"Authorization": f"Bearer {settings.DOCUSIGN_INTEGRATION_KEY}"},
                    json={
                        "emailSubject": f"NDA - {company_name} - St4rtup",
                        "recipients": {
                            "signers": [{
                                "email": member_email,
                                "name": member_name,
                                "recipientId": "1",
                                "routingOrder": "1",
                            }]
                        },
                        "status": "sent",
                    },
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return {
                        "provider": "docusign",
                        "signature_id": data.get("envelopeId", ""),
                        "sign_url": "",
                        "status": "pending",
                    }
        except Exception as e:
            logger.error("DocuSign also failed: %s", e)

    # 4. If nothing configured, use checkbox consent
    return {
        "provider": "checkbox",
        "signature_id": "",
        "sign_url": "",
        "status": "checkbox_required",
    }


async def check_nda_status(provider: str, signature_id: str) -> dict:
    """Check NDA signature status with the provider."""
    if provider == "checkbox":
        return {"signed": True}

    if provider == "signaturit" and signaturit_configured():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{settings.SIGNATURIT_BASE_URL}/signatures/{signature_id}",
                    headers={"Authorization": f"Bearer {settings.SIGNATURIT_API_KEY}"},
                )
                if resp.status_code == 200:
                    status = resp.json().get("status", "")
                    return {"signed": status == "completed", "status": status, "provider": "signaturit"}
        except Exception:
            pass

    if provider == "yousign" and yousign_configured():
        try:
            yousign_base = getattr(settings, "YOUSIGN_BASE_URL", "https://api.yousign.app/v3")
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{yousign_base}/signature_requests/{signature_id}",
                    headers={"Authorization": f"Bearer {settings.YOUSIGN_API_KEY}"},
                )
                if resp.status_code == 200:
                    status = resp.json().get("status", "")
                    return {"signed": status == "done", "status": status, "provider": "yousign"}
        except Exception:
            pass

    if provider == "docusign" and docusign_configured():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{settings.DOCUSIGN_BASE_URL}/v2.1/accounts/{settings.DOCUSIGN_ACCOUNT_ID}/envelopes/{signature_id}",
                    headers={"Authorization": f"Bearer {settings.DOCUSIGN_INTEGRATION_KEY}"},
                )
                if resp.status_code == 200:
                    status = resp.json().get("status", "")
                    return {"signed": status == "completed", "status": status, "provider": "docusign"}
        except Exception:
            pass

    return {"signed": False, "status": "unknown"}
