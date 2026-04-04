"""Webhook signature verification for external providers.

In production (DEBUG=False): REJECTS webhooks if the signing secret is not configured.
In development (DEBUG=True): logs a warning and allows the request through.
"""
import hmac
import hashlib
import logging

from fastapi import Request, HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

_is_dev = getattr(settings, "DEBUG", False)


async def verify_webhook_signature(request: Request, provider: str) -> bytes:
    """Verify webhook signature and return raw body."""
    body = await request.body()

    if provider == "stripe":
        return _verify_stripe(request, body)
    elif provider == "yousign":
        return _verify_hmac(request, body, settings.YOUSIGN_API_KEY, "x-yousign-signature-256", "sha256")
    elif provider == "docusign":
        return _verify_hmac(request, body, settings.DOCUSIGN_SECRET_KEY, "x-docusign-signature-1", "sha256")
    elif provider == "typeform":
        return _verify_hmac(request, body, settings.TYPEFORM_WEBHOOK_SECRET, "typeform-signature", "sha256")
    elif provider == "tally":
        return _verify_hmac(request, body, settings.TALLY_WEBHOOK_SECRET, "tally-signature", "sha256")
    elif provider in ("google_forms", "surveymonkey", "jotform"):
        return _verify_hmac(request, body, settings.SURVEY_WEBHOOK_SECRET, "x-webhook-signature", "sha256")

    logger.warning(f"Webhook received for unknown provider: {provider}")
    raise HTTPException(status_code=400, detail=f"Unknown webhook provider: {provider}")


def _verify_stripe(request: Request, body: bytes) -> bytes:
    """Verify Stripe webhook using their signature scheme."""
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret:
        if _is_dev:
            logger.warning("DEV MODE: Stripe webhook without secret — allowing unsigned request")
            return body
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")

    sig_header = request.headers.get("stripe-signature", "")
    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing Stripe signature header")

    # Parse Stripe signature: t=timestamp,v1=signature
    parts = dict(p.split("=", 1) for p in sig_header.split(",") if "=" in p)
    timestamp = parts.get("t", "")
    signature = parts.get("v1", "")

    if not timestamp or not signature:
        raise HTTPException(status_code=401, detail="Invalid Stripe signature format")

    signed_payload = f"{timestamp}.{body.decode()}"
    expected = hmac.new(
        secret.encode(), signed_payload.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Stripe webhook signature mismatch")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    return body


def _verify_hmac(
    request: Request, body: bytes, secret: str, header_name: str, algorithm: str
) -> bytes:
    """Generic HMAC verification. Rejects in production if secret is missing."""
    if not secret:
        if _is_dev:
            logger.warning(f"DEV MODE: Webhook for {header_name} without secret — allowing unsigned request")
            return body
        logger.error(f"PRODUCTION: Webhook for {header_name} rejected — signing secret not configured")
        raise HTTPException(status_code=503, detail="Webhook signing secret not configured")

    sig = request.headers.get(header_name, "")
    if not sig:
        raise HTTPException(status_code=401, detail=f"Missing {header_name} header")

    # Some providers prefix with "sha256="
    if "=" in sig and not sig.startswith("sha"):
        sig = sig.split("=", 1)[1]
    elif sig.startswith("sha256="):
        sig = sig[7:]

    hash_func = hashlib.sha256 if algorithm == "sha256" else hashlib.sha1
    expected = hmac.new(secret.encode(), body, hash_func).hexdigest()

    if not hmac.compare_digest(expected, sig):
        logger.warning(f"Webhook signature mismatch for {header_name}")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    return body
