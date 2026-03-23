"""
Encrypted credential store — cifra API keys en reposo con Fernet (AES-128-CBC).
Cumple ENS Alto: las credenciales de terceros nunca se almacenan en texto plano en DB.

Uso:
    from app.core.credential_store import credential_store
    # Cifrar antes de guardar
    encrypted = credential_store.encrypt(api_key)
    # Descifrar para usar
    api_key = credential_store.decrypt(encrypted)
    # Cifrar/descifrar un dict completo de config
    encrypted_config = credential_store.encrypt_config({"api_key": "secret", "public": "visible"}, ["api_key"])
    decrypted_config = credential_store.decrypt_config(encrypted_config, ["api_key"])
"""
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)


class CredentialStore:
    """Cifrado Fernet para credenciales almacenadas en DB."""

    def __init__(self):
        self._fernet = None
        self._init_key()

    def _init_key(self):
        """Inicializa Fernet con CREDENTIAL_ENCRYPTION_KEY o genera una."""
        key = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY", "") or os.getenv("CREDENTIAL_ENCRYPTION_KEY", "")
        if key:
            try:
                self._fernet = Fernet(key.encode() if isinstance(key, str) else key)
                logger.info("Credential store initialized with encryption key")
                return
            except Exception as e:
                logger.warning(f"Invalid CREDENTIAL_ENCRYPTION_KEY: {e}")

        # Fallback: no encryption (development mode)
        logger.warning("CREDENTIAL_ENCRYPTION_KEY not set — credentials stored in plaintext (dev mode)")
        self._fernet = None

    @property
    def is_encrypted(self) -> bool:
        return self._fernet is not None

    def encrypt(self, plaintext: str) -> str:
        """Cifra un valor. Devuelve prefijo 'enc:' + ciphertext."""
        if not plaintext or not self._fernet:
            return plaintext
        try:
            encrypted = self._fernet.encrypt(plaintext.encode()).decode()
            return f"enc:{encrypted}"
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return plaintext

    def decrypt(self, value: str) -> str:
        """Descifra un valor. Si no tiene prefijo 'enc:', devuelve tal cual."""
        if not value:
            return value
        if not value.startswith("enc:"):
            return value  # Not encrypted (legacy or dev mode)
        if not self._fernet:
            logger.warning("Cannot decrypt: no encryption key configured")
            return value
        try:
            ciphertext = value[4:]  # Remove "enc:" prefix
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            logger.error("Decryption failed: invalid token (key mismatch?)")
            return value
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return value

    def encrypt_config(self, config: dict, sensitive_keys: list[str]) -> dict:
        """Cifra solo las keys sensibles de un dict de configuracion."""
        if not config or not self._fernet:
            return config
        result = dict(config)
        for key in sensitive_keys:
            if key in result and result[key] and not str(result[key]).startswith("enc:"):
                result[key] = self.encrypt(str(result[key]))
        return result

    def decrypt_config(self, config: dict, sensitive_keys: list[str]) -> dict:
        """Descifra las keys sensibles de un dict de configuracion."""
        if not config:
            return config
        result = dict(config)
        for key in sensitive_keys:
            if key in result and result[key] and str(result[key]).startswith("enc:"):
                result[key] = self.decrypt(str(result[key]))
        return result

    @staticmethod
    def generate_key() -> str:
        """Genera una nueva key Fernet. Usar para configurar CREDENTIAL_ENCRYPTION_KEY."""
        return Fernet.generate_key().decode()


# Singleton
credential_store = CredentialStore()

# Keys sensibles por tipo de config
SENSITIVE_KEYS = {
    "email_config": ["resend_api_key", "brevo_api_key", "ses_access_key", "ses_secret_key", "mailgun_api_key", "smtp_password"],
    "telegram_config": ["bot_token"],
    "slack_config": ["webhook_url", "bot_token"],
    "teams_config": ["webhook_url"],
    "whatsapp_config": ["access_token"],
    "apollo_config": ["api_key"],
    "hunter_config": ["api_key"],
    "hubspot_config": ["api_key", "client_secret"],
    "notion_config": ["api_key"],
    "n8n_config": ["api_key"],
    "stripe_config": ["secret_key", "webhook_secret"],
    "pandadoc_config": ["api_key"],
    "twilio_config": ["auth_token"],
    "sendgrid_config": ["api_key"],
    "calendly_config": ["api_key"],
    "gdrive_config": ["access_token", "refresh_token", "client_secret"],
    "gcalendar_config": ["access_token", "refresh_token", "client_secret"],
    "google_forms_config": ["access_token", "refresh_token", "client_secret"],
}
