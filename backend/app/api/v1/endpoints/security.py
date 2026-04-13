"""2FA (TOTP) + session management endpoints."""
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserSession

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── TOTP 2FA ──────────────────────────────────────────────────

def _generate_totp_secret() -> str:
    """Generate a base32-encoded TOTP secret."""
    import base64
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8")


def _generate_backup_codes(count: int = 8) -> list[str]:
    """Generate single-use backup codes."""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def _verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code against a secret. Uses HMAC-based OTP (RFC 6238)."""
    import hmac
    import struct
    import time

    # Current time step (30-second window)
    counter = int(time.time()) // 30

    # Check current and adjacent windows for clock skew tolerance
    for offset in (-1, 0, 1):
        t = counter + offset
        msg = struct.pack(">Q", t)
        import base64
        key = base64.b32decode(secret)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        o = h[-1] & 0x0F
        otp = str((struct.unpack(">I", h[o:o+4])[0] & 0x7FFFFFFF) % 1000000).zfill(6)
        if hmac.compare_digest(otp, code):
            return True
    return False


def _build_totp_uri(secret: str, email: str) -> str:
    """Build otpauth:// URI for QR code generation."""
    from urllib.parse import quote
    issuer = "St4rtup"
    return f"otpauth://totp/{quote(issuer)}:{quote(email)}?secret={secret}&issuer={quote(issuer)}&digits=6&period=30"


@router.post("/2fa/setup")
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate TOTP secret and return QR code URI. User must verify before enabling."""
    user = await db.get(User, UUID(current_user["user_id"]))
    if not user:
        raise HTTPException(404, "User not found")
    if user.totp_enabled:
        raise HTTPException(400, "2FA ya esta habilitado")

    secret = _generate_totp_secret()

    # Store secret temporarily (not enabled yet until verified)
    user.totp_secret = secret
    await db.commit()

    return {
        "secret": secret,
        "uri": _build_totp_uri(secret, user.email),
        "message": "Escanea el QR con tu app de autenticacion y verifica con /2fa/verify",
    }


@router.post("/2fa/verify")
async def verify_and_enable_2fa(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Verify TOTP code and enable 2FA. Returns backup codes."""
    user = await db.get(User, UUID(current_user["user_id"]))
    if not user:
        raise HTTPException(404, "User not found")
    if user.totp_enabled:
        raise HTTPException(400, "2FA ya esta habilitado")
    if not user.totp_secret:
        raise HTTPException(400, "Primero ejecuta /2fa/setup")

    if not _verify_totp(user.totp_secret, code):
        raise HTTPException(400, "Codigo invalido")

    # Enable 2FA and generate backup codes
    backup_codes = _generate_backup_codes()
    user.totp_enabled = True
    user.backup_codes = [hashlib.sha256(c.encode()).hexdigest() for c in backup_codes]
    await db.commit()

    return {
        "enabled": True,
        "backup_codes": backup_codes,
        "message": "2FA habilitado. Guarda los codigos de respaldo en un lugar seguro.",
    }


@router.post("/2fa/validate")
async def validate_2fa_code(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Validate a TOTP code or backup code."""
    user = await db.get(User, UUID(current_user["user_id"]))
    if not user or not user.totp_enabled:
        raise HTTPException(400, "2FA no esta habilitado")

    # Try TOTP first
    if _verify_totp(user.totp_secret, code):
        return {"valid": True, "method": "totp"}

    # Try backup code
    code_hash = hashlib.sha256(code.strip().upper().encode()).hexdigest()
    if user.backup_codes and code_hash in user.backup_codes:
        # Remove used backup code
        remaining = [c for c in user.backup_codes if c != code_hash]
        user.backup_codes = remaining
        await db.commit()
        return {"valid": True, "method": "backup", "remaining_codes": len(remaining)}

    raise HTTPException(400, "Codigo invalido")


@router.post("/2fa/disable")
async def disable_2fa(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Disable 2FA (requires valid TOTP or backup code)."""
    user = await db.get(User, UUID(current_user["user_id"]))
    if not user or not user.totp_enabled:
        raise HTTPException(400, "2FA no esta habilitado")

    # Verify code before disabling
    valid = _verify_totp(user.totp_secret, code)
    if not valid:
        code_hash = hashlib.sha256(code.strip().upper().encode()).hexdigest()
        valid = user.backup_codes and code_hash in user.backup_codes

    if not valid:
        raise HTTPException(400, "Codigo invalido — necesitas un codigo valido para desactivar 2FA")

    user.totp_enabled = False
    user.totp_secret = None
    user.backup_codes = None
    await db.commit()

    return {"enabled": False, "message": "2FA desactivado"}


@router.get("/2fa/status")
async def get_2fa_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current 2FA status."""
    user = await db.get(User, UUID(current_user["user_id"]))
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "enabled": user.totp_enabled,
        "backup_codes_remaining": len(user.backup_codes) if user.backup_codes else 0,
    }


# ─── SESSION MANAGEMENT ──────────────────────────────────────

def _parse_device(user_agent: str) -> str:
    """Extract a human-readable device label from User-Agent."""
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "mac" in ua:
        return "Mac"
    if "windows" in ua:
        return "Windows"
    if "linux" in ua:
        return "Linux"
    return "Desktop"


@router.post("/sessions/register")
async def register_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Register current session (call on login)."""
    user_id = UUID(current_user["user_id"])
    ip = request.headers.get("x-forwarded-for", request.client.host or "").split(",")[0].strip()
    ua = request.headers.get("user-agent", "")

    session = UserSession(
        user_id=user_id,
        ip_address=ip,
        user_agent=ua,
        device_label=_parse_device(ua),
        last_active_at=datetime.now(timezone.utc),
        is_current=True,
    )
    db.add(session)
    await db.commit()

    return {"session_id": str(session.id), "device": session.device_label}


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all active sessions for current user."""
    user_id = UUID(current_user["user_id"])
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == user_id)
        .order_by(UserSession.last_active_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    return {
        "sessions": [{
            "id": str(s.id),
            "ip_address": s.ip_address,
            "device_label": s.device_label,
            "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
            "is_current": s.is_current,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in sessions]
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Revoke a specific session."""
    user_id = UUID(current_user["user_id"])
    session = await db.get(UserSession, UUID(session_id))
    if not session or session.user_id != user_id:
        raise HTTPException(404, "Session not found")

    await db.delete(session)
    await db.commit()
    return {"revoked": True}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Revoke all sessions except current."""
    user_id = UUID(current_user["user_id"])
    await db.execute(
        delete(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_current == False,
        )
    )
    await db.commit()
    return {"message": "Todas las sesiones revocadas excepto la actual"}
