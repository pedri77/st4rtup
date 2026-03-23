"""
Endpoint de configuración del sistema.
GET: accesible para todos los usuarios autenticados (datos enmascarados).
PUT/POST: solo administradores.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import SystemSettings, User, UserRole
from app.services.email_service import email_service


class SettingsUpdate(BaseModel):
    """Schema validado para actualización de configuración del sistema."""
    model_config = ConfigDict(extra="forbid")

    email_provider: Optional[str] = None
    email_from: Optional[str] = None
    general_config: Optional[dict] = None
    # Integration configs
    email_config: Optional[dict] = None
    gmail_oauth_config: Optional[dict] = None
    telegram_config: Optional[dict] = None
    n8n_config: Optional[dict] = None
    apollo_config: Optional[dict] = None
    webhook_config: Optional[dict] = None
    linkedin_config: Optional[dict] = None
    clearbit_config: Optional[dict] = None
    hunter_config: Optional[dict] = None
    lusha_config: Optional[dict] = None
    zoominfo_config: Optional[dict] = None
    phantombuster_config: Optional[dict] = None
    gcalendar_config: Optional[dict] = None
    outlook_config: Optional[dict] = None
    calendly_config: Optional[dict] = None
    zoom_config: Optional[dict] = None
    whatsapp_config: Optional[dict] = None
    slack_config: Optional[dict] = None
    teams_config: Optional[dict] = None
    google_ads_config: Optional[dict] = None
    linkedin_ads_config: Optional[dict] = None
    ga4_config: Optional[dict] = None
    gsc_config: Optional[dict] = None
    youtube_config: Optional[dict] = None
    hubspot_config: Optional[dict] = None
    typeform_config: Optional[dict] = None
    surveymonkey_config: Optional[dict] = None
    tally_config: Optional[dict] = None
    jotform_config: Optional[dict] = None
    survicate_config: Optional[dict] = None
    hotjar_config: Optional[dict] = None
    google_forms_config: Optional[dict] = None
    pandadoc_config: Optional[dict] = None
    docusign_config: Optional[dict] = None
    yousign_config: Optional[dict] = None
    gdrive_config: Optional[dict] = None
    onedrive_config: Optional[dict] = None
    notion_config: Optional[dict] = None
    einforma_config: Optional[dict] = None
    cnae_config: Optional[dict] = None
    stripe_config: Optional[dict] = None
    holded_config: Optional[dict] = None
    facturama_config: Optional[dict] = None
    intercom_config: Optional[dict] = None
    freshdesk_config: Optional[dict] = None
    ai_config: Optional[dict] = None


class TestEmailConnectionRequest(BaseModel):
    """Schema validado para test de conexión de email."""
    model_config = ConfigDict(extra="forbid")

    provider: Optional[str] = None
    config: Optional[dict] = None


class SendTestEmailRequest(BaseModel):
    """Schema validado para envío de email de prueba."""
    model_config = ConfigDict(extra="forbid")

    to_email: EmailStr

router = APIRouter()

# All integration config field names in the model
INTEGRATION_CONFIG_FIELDS = [
    'email_config', 'gmail_oauth_config',
    # Automatizaciones y Notificaciones
    'telegram_config', 'n8n_config', 'apollo_config', 'webhook_config',
    # Prospección y Enriquecimiento
    'linkedin_config', 'clearbit_config', 'hunter_config', 'lusha_config',
    'zoominfo_config', 'phantombuster_config',
    # Comunicación y Reuniones
    'gcalendar_config', 'outlook_config', 'calendly_config', 'zoom_config',
    'whatsapp_config', 'slack_config', 'teams_config',
    # Marketing y Captación
    'google_ads_config', 'linkedin_ads_config', 'ga4_config',
    'hubspot_config', 'typeform_config',
    # Encuestas
    'surveymonkey_config', 'tally_config', 'jotform_config',
    'survicate_config', 'hotjar_config', 'google_forms_config',
    # Documentos y Propuestas
    'pandadoc_config', 'docusign_config', 'yousign_config',
    'gdrive_config', 'onedrive_config', 'notion_config',
    # Datos y Compliance
    'einforma_config', 'cnae_config',
    # Facturación y Post-venta
    'stripe_config', 'holded_config', 'facturama_config',
    'intercom_config', 'freshdesk_config',
    # IA
    'ai_config',
]

ALLOWED_FIELDS = ['email_provider', 'email_from', 'general_config'] + INTEGRATION_CONFIG_FIELDS

# Keys that contain sensitive data and should be masked
SENSITIVE_KEYS = [
    'api_key', 'secret_key', 'access_token', 'refresh_token', 'bot_token',
    'secret', 'password', 'client_secret', 'webhook_secret',
    'resend_api_key', 'zoho_api_key', 'brevo_api_key', 'mailgun_api_key',
    'ses_access_key', 'ses_secret_key', 'smtp_password',
    'developer_token', 'integration_key',
]


async def _require_admin(current_user: dict, db: AsyncSession):
    """Verificar que el usuario es admin consultando la tabla users"""
    user_id = UUID(current_user["user_id"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden acceder a configuración")


async def _get_or_create_settings(db: AsyncSession) -> SystemSettings:
    """Obtener o crear la fila singleton de configuración"""
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = SystemSettings(
            email_provider="resend",
            email_from="hello@st4rtup.app",
            email_config={},
            telegram_config={},
            n8n_config={},
            apollo_config={},
            webhook_config={},
            general_config={"company_name": "St4rtup", "timezone": "Europe/Madrid", "language": "es"},
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


def _mask_key(value: str, show_chars: int = 6) -> str:
    """Enmascara una API key mostrando solo los primeros caracteres"""
    if not value or len(value) <= show_chars:
        return value or ""
    return value[:show_chars] + "•" * min(len(value) - show_chars, 20)


def _mask_config(config: dict) -> dict:
    """Enmascara campos sensibles en la configuración"""
    if not config:
        return {}
    masked = dict(config)
    for key in masked:
        if any(sk in key for sk in SENSITIVE_KEYS) and masked[key] and isinstance(masked[key], str):
            masked[key] = _mask_key(str(masked[key]))
    return masked


def _build_response(settings: SystemSettings) -> dict:
    """Construir respuesta con todas las configuraciones enmascaradas"""
    response = {
        "id": str(settings.id),
        "email_provider": settings.email_provider,
        "email_from": settings.email_from,
        "general_config": settings.general_config or {},
    }
    for field in INTEGRATION_CONFIG_FIELDS:
        value = getattr(settings, field, None)
        if field == 'webhook_config':
            response[field] = value or {}
        else:
            response[field] = _mask_config(value or {})
    return response


@router.get("/")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener configuración del sistema (enmascarada). Accesible para todos los usuarios autenticados."""
    settings = await _get_or_create_settings(db)
    return _build_response(settings)


@router.put("/")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualizar configuración del sistema"""
    await _require_admin(current_user, db)
    settings = await _get_or_create_settings(db)

    updates = data.model_dump(exclude_none=True)
    for field in ALLOWED_FIELDS:
        if field in updates:
            new_val = updates[field]

            # For config dicts, merge with existing to preserve masked fields
            if field.endswith('_config') and isinstance(new_val, dict):
                existing = getattr(settings, field) or {}
                # Don't overwrite with masked values (containing •)
                for k, v in new_val.items():
                    if isinstance(v, str) and '•' in v:
                        new_val[k] = existing.get(k, '')
                merged = {**existing, **new_val}
                setattr(settings, field, merged)
            else:
                setattr(settings, field, new_val)

    # Update email service provider at runtime
    if data.email_provider is not None:
        email_service.set_provider(data.email_provider)

    await db.commit()
    await db.refresh(settings)

    response = _build_response(settings)
    response["message"] = "Configuración actualizada correctamente"
    return response


@router.post("/test-email")
async def test_email_provider(
    data: TestEmailConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Probar conexión del proveedor de email configurado"""
    await _require_admin(current_user, db)

    settings = await _get_or_create_settings(db)

    # Build config from DB settings + any overrides
    config = dict(settings.email_config or {})
    provider = data.provider or settings.email_provider
    config['provider'] = provider

    # Merge gmail_oauth_config tokens if testing gmail_oauth
    if provider == 'gmail_oauth' and settings.gmail_oauth_config:
        config.update(settings.gmail_oauth_config)

    # Allow passing test config without saving
    if data.config:
        test_config = data.config
        # Don't use masked values for testing
        for k, v in test_config.items():
            if isinstance(v, str) and '•' not in v and v:
                config[k] = v

    result = await email_service.test_connection(config)
    return result


@router.post("/send-test-email")
async def send_test_email(
    data: SendTestEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Enviar email de prueba"""
    await _require_admin(current_user, db)

    to_email = data.to_email

    settings_row = await _get_or_create_settings(db)
    config = dict(settings_row.email_config or {})
    config['provider'] = settings_row.email_provider
    config['from_email'] = settings_row.email_from

    # Merge gmail_oauth_config tokens if using gmail_oauth
    if settings_row.email_provider == 'gmail_oauth' and settings_row.gmail_oauth_config:
        config.update(settings_row.gmail_oauth_config)

    result = await email_service.send_email(
        to=to_email,
        subject="[St4rtup CRM] Email de prueba",
        html_body="""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #06b6d4;">St4rtup CRM - Email de prueba</h2>
            <p>Este es un email de prueba enviado desde la configuración de St4rtup CRM.</p>
            <p>Si recibes este email, tu proveedor de email está correctamente configurado.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                Proveedor: {provider} | Desde: {from_email}
            </p>
        </div>
        """.format(provider=settings_row.email_provider, from_email=settings_row.email_from),
        text_body="Email de prueba desde St4rtup CRM",
        provider_config=config,
    )

    return result


@router.post("/test-integration")
async def test_integration(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Probar conexión con una integración externa"""
    await _require_admin(current_user, db)

    integration_id = data.get('integration_id')
    if not integration_id:
        raise HTTPException(status_code=400, detail="Se requiere integration_id")

    # Get config from DB and merge with provided config
    settings = await _get_or_create_settings(db)
    config_field = f"{integration_id}_config"
    existing_config = getattr(settings, config_field, None) or {}

    provided_config = data.get('config', {})
    # Don't use masked values
    merged_config = dict(existing_config)
    for k, v in provided_config.items():
        if isinstance(v, str) and '•' not in v and v:
            merged_config[k] = v

    # Check if it's an AI provider
    from app.services.ai_chat_service import ai_chat_service
    if integration_id in ai_chat_service.PROVIDERS:
        # For AI providers, config comes from ai_config.{provider_id}
        ai_config = settings.ai_config or {}
        existing_ai = ai_config.get(integration_id, {})
        ai_merged = dict(existing_ai)
        for k, v in provided_config.items():
            if isinstance(v, str) and '•' not in v and v:
                ai_merged[k] = v
        result = await ai_chat_service.test_connection(integration_id, ai_merged)
        return result

    from app.services.integration_service import integration_service
    result = await integration_service.test_connection(integration_id, merged_config)
    return result


# ─── Feature Flags ─────────────────────────────────────────────────

@router.get("/feature-flags")
async def get_feature_flags(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene feature flags actuales (GrowthBook + local)."""
    from app.services.feature_flags import get_features
    return await get_features(db)


@router.put("/feature-flags")
async def update_feature_flags(
    flags: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza feature flags locales (override)."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if sys_settings:
        general = sys_settings.general_config or {}
        general["feature_flags"] = flags
        sys_settings.general_config = general
        await db.commit()
    return {"updated": True, "flags": flags}


# ─── Encrypt existing credentials ─────────────────────────────────────

@router.post("/encrypt-credentials")
async def encrypt_existing_credentials(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Migra credenciales existentes de plaintext a cifrado Fernet (ENS Alto)."""
    await _require_admin(current_user, db)
    from app.core.credential_store import credential_store, SENSITIVE_KEYS

    if not credential_store.is_encrypted:
        return {"encrypted": 0, "error": "CREDENTIAL_ENCRYPTION_KEY not configured"}

    settings_row = await _get_or_create_settings(db)
    encrypted_count = 0

    for config_attr, keys in SENSITIVE_KEYS.items():
        cfg = getattr(settings_row, config_attr, None)
        if not cfg or not isinstance(cfg, dict):
            continue
        updated = False
        for key in keys:
            val = cfg.get(key, "")
            if val and isinstance(val, str) and not val.startswith("enc:"):
                cfg[key] = credential_store.encrypt(val)
                encrypted_count += 1
                updated = True
        if updated:
            setattr(settings_row, config_attr, cfg)

    await db.commit()
    return {"encrypted": encrypted_count, "message": f"{encrypted_count} credenciales cifradas"}


# ─── Environment Variables Status ─────────────────────────────────────

@router.get("/env-status")
async def get_env_status(
    current_user: dict = Depends(get_current_user),
):
    """Verifica qué API keys están configuradas via env vars (Fly.io secrets)."""
    from app.core.config import settings as app_settings

    def _check(attr, fallback=None):
        val = getattr(app_settings, attr, "")
        if not val and fallback:
            val = getattr(app_settings, fallback, "")
        return bool(val)

    env_checks = {
        # IA Providers
        "OPENAI_API_KEY": _check("OPENAI_API_KEY", "OPEN_API_KEY"),
        "MISTRAL_API_KEY": _check("MISTRAL_API_KEY"),
        "ANTHROPIC_API_KEY": _check("ANTHROPIC_API_KEY"),
        "DEEPSEEK_API_KEY": _check("DEEPSEEK_API_KEY"),
        "RETELL_API_KEY": _check("RETELL_API_KEY"),
        "VLLM_API_URL": _check("VLLM_API_URL"),
        # Email
        "RESEND_API_KEY": _check("RESEND_API_KEY"),
        "BREVO_API_KEY": _check("BREVO_API_KEY"),
        # CRM & Prospecting
        "HUBSPOT_API_KEY": _check("HUBSPOT_API_KEY"),
        "HUNTER_API_KEY": _check("HUNTER_API_KEY"),
        "APOLLO_API_KEY": _check("APOLLO_API_KEY"),
        # Communication
        "TELEGRAM_BOT_TOKEN": _check("TELEGRAM_BOT_TOKEN"),
        "SLACK_WEBHOOK_URL": _check("SLACK_WEBHOOK_URL"),
        "TEAMS_WEBHOOK_URL": _check("TEAMS_WEBHOOK_URL"),
        "WHATSAPP_ACCESS_TOKEN": _check("WHATSAPP_ACCESS_TOKEN"),
        "WHATSAPP_PHONE_NUMBER_ID": _check("WHATSAPP_PHONE_NUMBER_ID"),
        # Google OAuth
        "GOOGLE_OAUTH_CLIENT_ID": _check("GOOGLE_OAUTH_CLIENT_ID"),
        "GOOGLE_OAUTH_CLIENT_SECRET": _check("GOOGLE_OAUTH_CLIENT_SECRET"),
        # Billing & Payments
        "STRIPE_SECRET_KEY": _check("STRIPE_SECRET_KEY"),
        "STRIPE_WEBHOOK_SECRET": _check("STRIPE_WEBHOOK_SECRET"),
        "STRIPE_PUBLISHABLE_KEY": _check("STRIPE_PUBLISHABLE_KEY"),
        "PAYPAL_CLIENT_ID": _check("PAYPAL_CLIENT_ID"),
        "PAYPAL_CLIENT_SECRET": _check("PAYPAL_CLIENT_SECRET"),
        # Automation
        "N8N_API_KEY": _check("N8N_API_KEY"),
        # Analytics
        "POSTHOG_HOST": _check("POSTHOG_HOST"),
        # Data & Collaboration
        "AIRTABLE_API_KEY": _check("AIRTABLE_API_KEY"),
        # YouTube (uses Google OAuth)
        "YOUTUBE_CHANNEL_ID": _check("YOUTUBE_CHANNEL_ID"),
        # Infrastructure
        "SUPABASE_URL": _check("SUPABASE_URL"),
        "SUPABASE_ANON_KEY": _check("SUPABASE_ANON_KEY"),
        "CREDENTIAL_ENCRYPTION_KEY": _check("CREDENTIAL_ENCRYPTION_KEY"),
        # NDA / Firma digital
        "SIGNATURIT_API_KEY": _check("SIGNATURIT_API_KEY"),
        "YOUSIGN_API_KEY": _check("YOUSIGN_API_KEY"),
        "DOCUSIGN_INTEGRATION_KEY": _check("DOCUSIGN_INTEGRATION_KEY"),
    }

    configured = [k for k, v in env_checks.items() if v]
    missing = [k for k, v in env_checks.items() if not v]

    return {
        "env_vars": env_checks,
        "configured_count": len(configured),
        "missing_count": len(missing),
        "configured": configured,
        "missing": missing,
        "llm_available": any(env_checks.get(k) for k in ["OPENAI_API_KEY", "MISTRAL_API_KEY", "VLLM_BASE_URL", "GROQ_API_KEY", "GOOGLE_AI_API_KEY"]),
    }


# ─── Google OAuth2 for Gmail ─────────────────────────────────────────

@router.get("/oauth/google/authorize")
async def google_oauth_authorize(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generar URL de autorización de Google OAuth2 para Gmail."""
    await _require_admin(current_user, db)

    from app.core.config import settings as app_settings

    # Read from DB first, fallback to env vars
    settings_row = await _get_or_create_settings(db)
    gmail_cfg = settings_row.gmail_oauth_config or {}

    client_id = gmail_cfg.get("client_id") or app_settings.GOOGLE_OAUTH_CLIENT_ID
    # Build Gmail-specific redirect URI
    base_redirect = app_settings.GOOGLE_OAUTH_REDIRECT_URI or ""
    if base_redirect:
        settings_base = base_redirect.split("/oauth/")[0]
        redirect_uri = gmail_cfg.get("redirect_uri") or f"{settings_base}/oauth/google/callback"
    else:
        redirect_uri = gmail_cfg.get("redirect_uri", "")

    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=400,
            detail="Configura Client ID y Redirect URI en la sección de Gmail OAuth2."
        )

    import secrets
    from urllib.parse import urlencode

    # Generate CSRF state token and store in DB
    state = secrets.token_urlsafe(32)
    updated_cfg = {**(gmail_cfg), "_oauth_state": state}
    settings_row.gmail_oauth_config = updated_cfg
    await db.commit()

    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })

    return {"authorize_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/oauth/google/callback")
async def google_oauth_callback(
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Callback de Google OAuth2. Intercambia el code por tokens y los guarda."""
    import hmac
    import httpx
    from app.core.config import settings as app_settings

    settings_row = await _get_or_create_settings(db)
    gmail_cfg = settings_row.gmail_oauth_config or {}

    # Verify CSRF state token
    expected_state = gmail_cfg.get("_oauth_state", "")
    if not expected_state or not state or not hmac.compare_digest(expected_state, state):
        raise HTTPException(status_code=403, detail="Invalid OAuth state — possible CSRF attack")

    # Clear used state token immediately (single-use)
    gmail_cfg.pop("_oauth_state", None)

    client_id = gmail_cfg.get("client_id") or app_settings.GOOGLE_OAUTH_CLIENT_ID
    client_secret = gmail_cfg.get("client_secret") or app_settings.GOOGLE_OAUTH_CLIENT_SECRET
    base_redirect = app_settings.GOOGLE_OAUTH_REDIRECT_URI or ""
    if base_redirect:
        settings_base = base_redirect.split("/oauth/")[0]
        redirect_uri = gmail_cfg.get("redirect_uri") or f"{settings_base}/oauth/google/callback"
    else:
        redirect_uri = gmail_cfg.get("redirect_uri", "")

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Google OAuth2 credentials not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        error_data = token_resp.json()
        raise HTTPException(
            status_code=400,
            detail=f"Error obteniendo tokens: {error_data.get('error_description', error_data.get('error', 'Unknown'))}"
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    # Get user email
    email = ""
    if access_token:
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code == 200:
                email = user_resp.json().get("email", "")

    # Save tokens to DB
    updated_config = {
        **gmail_cfg,
        "access_token": access_token,
        "email": email,
        "connected": True,
    }
    # Only update refresh_token if we got a new one
    if refresh_token:
        updated_config["refresh_token"] = refresh_token

    settings_row.gmail_oauth_config = updated_config
    await db.commit()

    # Redirect to frontend integrations page
    from app.core.config import settings as app_settings
    frontend_url = "https://app.st4rtup.app"
    cors_origins = app_settings.cors_origins
    if cors_origins:
        # Use the first non-localhost origin, or fallback
        for origin in cors_origins:
            if 'localhost' not in origin:
                frontend_url = origin
                break

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{frontend_url}/integrations?oauth=success")


@router.post("/oauth/google/disconnect")
async def google_oauth_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Desconectar Google OAuth2."""
    await _require_admin(current_user, db)

    settings_row = await _get_or_create_settings(db)
    gmail_cfg = settings_row.gmail_oauth_config or {}

    # Revoke token if we have one
    access_token = gmail_cfg.get("access_token")
    if access_token:
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://oauth2.googleapis.com/revoke?token={access_token}",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except Exception:
            pass  # Best effort revocation

    # Clear tokens but keep client_id/secret config
    settings_row.gmail_oauth_config = {
        "client_id": gmail_cfg.get("client_id", ""),
        "client_secret": gmail_cfg.get("client_secret", ""),
        "redirect_uri": gmail_cfg.get("redirect_uri", ""),
        "connected": False,
    }
    await db.commit()

    return {"success": True, "message": "Gmail OAuth2 desconectado"}


@router.get("/oauth/google/status")
async def google_oauth_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estado de la conexión Gmail OAuth2."""
    settings_row = await _get_or_create_settings(db)
    gmail_cfg = settings_row.gmail_oauth_config or {}

    return {
        "connected": gmail_cfg.get("connected", False),
        "email": gmail_cfg.get("email", ""),
    }


# ─── Generic Google OAuth2 for Marketing Services ─────────────────

# Maps provider → {scopes, config_column, friendly_name}
_GOOGLE_OAUTH_PROVIDERS = {
    "gsc": {
        "scopes": "https://www.googleapis.com/auth/webmasters.readonly",
        "config_attr": "gsc_config",
        "name": "Google Search Console",
    },
    "ga4": {
        "scopes": "https://www.googleapis.com/auth/analytics.readonly",
        "config_attr": "ga4_config",
        "name": "Google Analytics 4",
    },
    "youtube": {
        "scopes": "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
        "config_attr": "youtube_config",
        "name": "YouTube",
    },
    "gdrive": {
        "scopes": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
        "config_attr": "gdrive_config",
        "name": "Google Drive",
    },
    "gcalendar": {
        "scopes": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        "config_attr": "gcalendar_config",
        "name": "Google Calendar",
    },
    "google_forms": {
        "scopes": "https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/forms.body.readonly",
        "config_attr": "google_forms_config",
        "name": "Google Forms",
    },
}


@router.get("/oauth/{provider}/authorize")
async def generic_oauth_authorize(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generar URL de autorización OAuth2 para servicios de Google (GSC, GA4, YouTube)."""
    # Gmail has its own handler above
    if provider == "google":
        return await google_oauth_authorize(db=db, current_user=current_user)

    if provider == "linkedin":
        return await _linkedin_oauth_authorize(db, current_user)

    provider_cfg = _GOOGLE_OAUTH_PROVIDERS.get(provider)
    if not provider_cfg:
        raise HTTPException(status_code=400, detail=f"Proveedor OAuth desconocido: {provider}")

    await _require_admin(current_user, db)

    from app.core.config import settings as app_settings
    import secrets
    from urllib.parse import urlencode

    settings_row = await _get_or_create_settings(db)
    cfg = getattr(settings_row, provider_cfg["config_attr"]) or {}

    client_id = cfg.get("client_id") or app_settings.GOOGLE_OAUTH_CLIENT_ID
    # Build provider-specific redirect URI from base
    base_redirect = app_settings.GOOGLE_OAUTH_REDIRECT_URI or ""
    if base_redirect and not cfg.get("redirect_uri"):
        # Extract base up to /settings/ then append oauth/{provider}/callback
        settings_base = base_redirect.split("/oauth/")[0]  # .../api/v1/settings
        redirect_uri = f"{settings_base}/oauth/{provider}/callback"
    else:
        redirect_uri = cfg.get("redirect_uri", "")

    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=400,
            detail=f"Configura Client ID y Redirect URI para {provider_cfg['name']}."
        )

    state = secrets.token_urlsafe(32)
    updated_cfg = {**cfg, "_oauth_state": state, "_oauth_provider": provider}
    setattr(settings_row, provider_cfg["config_attr"], updated_cfg)
    await db.commit()

    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": provider_cfg["scopes"],
        "access_type": "offline",
        "prompt": "consent",
        "state": f"{provider}:{state}",
    })

    return {"authorize_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/oauth/{provider}/callback")
async def generic_oauth_callback(
    provider: str,
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Callback OAuth2 genérico para servicios de Google (GSC, GA4, YouTube)."""
    if provider == "google":
        return await google_oauth_callback(code=code, state=state, db=db)

    if provider == "linkedin":
        return await _linkedin_oauth_callback(code, state, db)

    provider_cfg = _GOOGLE_OAUTH_PROVIDERS.get(provider)
    if not provider_cfg:
        raise HTTPException(status_code=400, detail=f"Proveedor OAuth desconocido: {provider}")

    import hmac
    import httpx
    from app.core.config import settings as app_settings

    settings_row = await _get_or_create_settings(db)
    cfg = getattr(settings_row, provider_cfg["config_attr"]) or {}

    # Verify CSRF — state format is "provider:token"
    expected_state = cfg.get("_oauth_state", "")
    actual_token = state.split(":", 1)[1] if ":" in state else state
    if not expected_state or not actual_token or not hmac.compare_digest(expected_state, actual_token):
        raise HTTPException(status_code=403, detail="Invalid OAuth state — possible CSRF attack")

    cfg.pop("_oauth_state", None)
    cfg.pop("_oauth_provider", None)

    client_id = cfg.get("client_id") or app_settings.GOOGLE_OAUTH_CLIENT_ID
    client_secret = cfg.get("client_secret") or app_settings.GOOGLE_OAUTH_CLIENT_SECRET
    # Build provider-specific redirect URI from base
    base_redirect = app_settings.GOOGLE_OAUTH_REDIRECT_URI or ""
    if base_redirect and not cfg.get("redirect_uri"):
        settings_base = base_redirect.split("/oauth/")[0]
        redirect_uri = f"{settings_base}/oauth/{provider}/callback"
    else:
        redirect_uri = cfg.get("redirect_uri", "")

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail=f"Credenciales OAuth2 de {provider_cfg['name']} no configuradas")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        error_data = token_resp.json()
        raise HTTPException(
            status_code=400,
            detail=f"Error obteniendo tokens: {error_data.get('error_description', error_data.get('error', 'Unknown'))}"
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    # Get user email
    email = ""
    if access_token:
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code == 200:
                email = user_resp.json().get("email", "")

    updated_config = {
        **cfg,
        "access_token": access_token,
        "email": email,
        "connected": True,
    }
    if refresh_token:
        updated_config["refresh_token"] = refresh_token

    setattr(settings_row, provider_cfg["config_attr"], updated_config)
    await db.commit()

    from app.core.config import settings as app_settings
    frontend_url = "https://app.st4rtup.app"
    cors_origins = app_settings.cors_origins
    if cors_origins:
        for origin in cors_origins:
            if "localhost" not in origin:
                frontend_url = origin
                break

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{frontend_url}/marketing/integrations?oauth={provider}&status=success")


@router.post("/oauth/{provider}/disconnect")
async def generic_oauth_disconnect(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Desconectar OAuth2 de un servicio de Google o LinkedIn."""
    if provider == "google":
        return await google_oauth_disconnect(db=db, current_user=current_user)

    if provider == "linkedin":
        return await _linkedin_oauth_disconnect(db, current_user)

    provider_cfg = _GOOGLE_OAUTH_PROVIDERS.get(provider)
    if not provider_cfg:
        raise HTTPException(status_code=400, detail=f"Proveedor OAuth desconocido: {provider}")

    await _require_admin(current_user, db)

    settings_row = await _get_or_create_settings(db)
    cfg = getattr(settings_row, provider_cfg["config_attr"]) or {}

    access_token = cfg.get("access_token")
    if access_token:
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://oauth2.googleapis.com/revoke?token={access_token}",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except Exception:
            pass

    setattr(settings_row, provider_cfg["config_attr"], {
        "client_id": cfg.get("client_id", ""),
        "client_secret": cfg.get("client_secret", ""),
        "redirect_uri": cfg.get("redirect_uri", ""),
        "connected": False,
    })
    await db.commit()

    return {"success": True, "message": f"{provider_cfg['name']} OAuth2 desconectado"}


@router.get("/oauth/{provider}/status")
async def generic_oauth_status(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estado de la conexión OAuth2 de un servicio."""
    if provider == "google":
        return await google_oauth_status(db=db, current_user=current_user)

    if provider == "linkedin":
        settings_row = await _get_or_create_settings(db)
        cfg = settings_row.linkedin_config or {}
        return {
            "connected": cfg.get("connected", False),
            "name": cfg.get("name", ""),
        }

    provider_cfg = _GOOGLE_OAUTH_PROVIDERS.get(provider)
    if not provider_cfg:
        raise HTTPException(status_code=400, detail=f"Proveedor OAuth desconocido: {provider}")

    settings_row = await _get_or_create_settings(db)
    cfg = getattr(settings_row, provider_cfg["config_attr"]) or {}

    return {
        "connected": cfg.get("connected", False),
        "email": cfg.get("email", ""),
    }


# ─── LinkedIn OAuth2 ──────────────────────────────────────────────

async def _linkedin_oauth_authorize(db: AsyncSession, current_user: dict):
    """Generar URL de autorización LinkedIn OAuth2."""
    await _require_admin(current_user, db)

    import secrets
    from urllib.parse import urlencode

    settings_row = await _get_or_create_settings(db)
    cfg = settings_row.linkedin_config or {}

    client_id = cfg.get("client_id", "")
    redirect_uri = cfg.get("redirect_uri", "")

    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=400,
            detail="Configura Client ID y Redirect URI en la sección de LinkedIn."
        )

    state = secrets.token_urlsafe(32)
    updated_cfg = {**cfg, "_oauth_state": state}
    settings_row.linkedin_config = updated_cfg
    await db.commit()

    params = urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": f"linkedin:{state}",
        "scope": "r_liteprofile r_emailaddress r_organization_social rw_organization_admin r_ads r_ads_reporting",
    })

    return {"authorize_url": f"https://www.linkedin.com/oauth/v2/authorization?{params}"}


async def _linkedin_oauth_callback(code: str, state: str, db: AsyncSession):
    """Callback LinkedIn OAuth2."""
    import hmac
    import httpx

    settings_row = await _get_or_create_settings(db)
    cfg = settings_row.linkedin_config or {}

    expected_state = cfg.get("_oauth_state", "")
    actual_token = state.split(":", 1)[1] if ":" in state else state
    if not expected_state or not actual_token or not hmac.compare_digest(expected_state, actual_token):
        raise HTTPException(status_code=403, detail="Invalid OAuth state — possible CSRF attack")

    cfg.pop("_oauth_state", None)

    client_id = cfg.get("client_id", "")
    client_secret = cfg.get("client_secret", "")
    redirect_uri = cfg.get("redirect_uri", "")

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Credenciales LinkedIn OAuth2 no configuradas")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Error obteniendo tokens de LinkedIn. Verifica las credenciales OAuth2."
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")

    # Get profile name
    name = ""
    if access_token:
        async with httpx.AsyncClient() as client:
            profile_resp = await client.get(
                "https://api.linkedin.com/v2/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_resp.status_code == 200:
                data = profile_resp.json()
                name = f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip()

    settings_row.linkedin_config = {
        **cfg,
        "access_token": access_token,
        "name": name,
        "connected": True,
    }
    await db.commit()

    from app.core.config import settings as app_settings
    frontend_url = "https://app.st4rtup.app"
    cors_origins = app_settings.cors_origins
    if cors_origins:
        for origin in cors_origins:
            if "localhost" not in origin:
                frontend_url = origin
                break

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{frontend_url}/marketing/integrations?oauth=linkedin&status=success")


async def _linkedin_oauth_disconnect(db: AsyncSession, current_user: dict):
    """Desconectar LinkedIn OAuth2."""
    await _require_admin(current_user, db)

    settings_row = await _get_or_create_settings(db)
    cfg = settings_row.linkedin_config or {}

    settings_row.linkedin_config = {
        "client_id": cfg.get("client_id", ""),
        "client_secret": cfg.get("client_secret", ""),
        "redirect_uri": cfg.get("redirect_uri", ""),
        "connected": False,
    }
    await db.commit()

    return {"success": True, "message": "LinkedIn OAuth2 desconectado"}


# ---------------------------------------------------------------------------
# Google Drive — Upload templates folder
# ---------------------------------------------------------------------------
@router.post("/gdrive/upload-templates")
async def upload_templates_to_drive(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sube los 16 documentos base de docs/templates/ a Google Drive."""
    try:
        role = str(current_user.role)
    except Exception:
        role = str(current_user.get("role", "")) if isinstance(current_user, dict) else ""
    if "admin" not in role:
        raise HTTPException(403, "Solo administradores")

    from app.services.google_drive_service import get_drive_service_auto, _get_or_create_subfolder
    from googleapiclient.http import MediaIoBaseUpload
    import io as _io

    service = await get_drive_service_auto()
    if not service:
        raise HTTPException(400, "Google Drive no esta configurado. Conecta via OAuth en Integraciones.")

    # Get root folder from config
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    root_folder_id = None
    if sys_settings and sys_settings.gdrive_config:
        root_folder_id = sys_settings.gdrive_config.get("root_folder_id") or sys_settings.gdrive_config.get("folder_id")
    if not root_folder_id:
        from app.core.config import settings as app_settings
        root_folder_id = getattr(app_settings, "GOOGLE_DRIVE_FOLDER_ID_MARKETING", "")
    if not root_folder_id:
        raise HTTPException(400, "No hay carpeta raiz de Drive configurada (root_folder_id en gdrive_config)")

    # Template files to upload
    import os
    # Try multiple locations
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "templates")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "docs", "templates")),
        "/app/templates",
    ]
    templates_base = None
    for c in candidates:
        if os.path.exists(c):
            templates_base = c
            break

    # Fallback: define files inline
    TEMPLATE_FILES = {
        "comercial": [
            "01_pitch_deck.md",
            "02_one_pager.md",
            "03_propuesta_tipo.md",
            "04_caso_exito.md",
            "05_battlecard_competidores.md",
            "06_faq_comercial.md",
        ],
        "legal": [
            "07_nda.md",
            "08_contrato_saas.md",
            "09_dpa.md",
            "10_politica_seguridad.md",
        ],
        "onboarding": [
            "11_welcome_pack.md",
            "12_checklist_implementacion.md",
            "13_guia_usuario.md",
        ],
        "interno": [
            "14_playbook_ventas.md",
            "15_icp_buyer_personas.md",
            "16_pricing_sheet.md",
        ],
    }

    uploaded = []
    errors = []

    # Create "Documentos St4rtup" subfolder
    docs_folder_id = _get_or_create_subfolder(service, root_folder_id, "Documentos St4rtup")
    if not docs_folder_id:
        raise HTTPException(500, "No se pudo crear la carpeta 'Documentos St4rtup' en Drive")

    for category, files in TEMPLATE_FILES.items():
        # Create category subfolder
        cat_folder_id = _get_or_create_subfolder(service, docs_folder_id, category.capitalize())
        if not cat_folder_id:
            errors.append(f"No se pudo crear carpeta {category}")
            continue

        for filename in files:
            try:
                # Read file from local disk
                if templates_base:
                    filepath = os.path.join(templates_base, category, filename)
                    if os.path.exists(filepath):
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                    else:
                        errors.append(f"Archivo no encontrado: {filepath}")
                        continue
                else:
                    errors.append(f"Directorio templates no encontrado")
                    continue

                # Upload as Google Doc (convert markdown to Google Docs)
                file_metadata = {
                    "name": filename.replace(".md", "").replace("_", " ").title(),
                    "parents": [cat_folder_id],
                    "mimeType": "application/vnd.google-apps.document",
                }
                media = MediaIoBaseUpload(
                    _io.BytesIO(content.encode("utf-8")),
                    mimetype="text/markdown",
                    resumable=True,
                )
                result_file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields="id,webViewLink",
                ).execute()

                uploaded.append({
                    "name": file_metadata["name"],
                    "category": category,
                    "url": result_file.get("webViewLink", ""),
                    "id": result_file["id"],
                })
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")

    return {
        "uploaded": len(uploaded),
        "errors": len(errors),
        "files": uploaded,
        "error_details": errors if errors else None,
    }
