"""API Key model for machine-to-machine authentication."""
import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


def generate_api_key() -> tuple[str, str]:
    """Generate an API key and its SHA-256 hash.

    Returns (plaintext_key, key_hash).
    The plaintext is shown once to the user, only the hash is stored.
    """
    raw = secrets.token_urlsafe(32)
    prefix = raw[:8]
    key = f"stk_{raw}"
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    return key, key_hash, prefix


class ApiKey(BaseModel):
    """API key for external service access (M2M).

    Security:
    - Only the SHA-256 hash is stored, never the plaintext
    - Prefix (first 8 chars) stored for identification
    - Scopes limit what the key can access
    - Optional expiration
    - Revocable
    """
    __tablename__ = "api_keys"

    name = Column(String(128), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)
    key_prefix = Column(String(12), nullable=False)
    scopes = Column(JSON, default=lambda: ["read"])  # read, write, admin
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String(128), default="admin")
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    @staticmethod
    def hash_key(plaintext: str) -> str:
        """Hash a plaintext API key for lookup."""
        return hashlib.sha256(plaintext.encode()).hexdigest()

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.is_active and not self.is_expired and not self.revoked_at
