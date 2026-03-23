from pydantic_settings import BaseSettings
from typing import List
import json
from urllib.parse import quote_plus, urlparse, urlunparse


class Settings(BaseSettings):
    # App
    APP_NAME: str = "st4rtup"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:5173","https://app.st4rtup.app","https://st4rtup.pages.dev"]'

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from JSON string or comma-separated list"""
        if not self.BACKEND_CORS_ORIGINS:
            return []

        # Try to parse as JSON first
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except json.JSONDecodeError:
            # Fallback: parse as comma-separated list
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(',')]

    # Database
    DATABASE_URL: str = ""

    @property
    def async_database_url(self) -> str:
        """Convert standard PostgreSQL URL to asyncpg format and URL-encode credentials"""
        if not self.DATABASE_URL:
            return ""

        # Parse the URL
        parsed = urlparse(self.DATABASE_URL)

        # URL-encode username and password
        if parsed.username and parsed.password:
            # Reconstruct netloc with encoded credentials
            netloc = f"{quote_plus(parsed.username)}:{quote_plus(parsed.password)}@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
        else:
            netloc = parsed.netloc

        # Reconstruct URL with asyncpg driver
        scheme = "postgresql+asyncpg" if parsed.scheme in ("postgresql", "postgres") else parsed.scheme

        # Strip sslmode from query (asyncpg uses ssl= not sslmode=)
        query = "&".join(
            p for p in parsed.query.split("&")
            if not p.startswith("sslmode=")
        ) if parsed.query else ""

        url = urlunparse((
            scheme,
            netloc,
            parsed.path,
            parsed.params,
            query,
            parsed.fragment
        ))

        return url

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Auth
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # Google OAuth2 (for Gmail sending)
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = ""  # e.g. https://your-backend/api/v1/settings/oauth/google/callback

    # Email
    EMAIL_PROVIDER: str = "resend"  # resend, zoho, brevo, ses, mailgun, smtp, gmail_oauth
    RESEND_API_KEY: str = ""
    ZOHO_API_KEY: str = ""
    BREVO_API_KEY: str = ""
    MAILGUN_API_KEY: str = ""
    MAILGUN_DOMAIN: str = ""
    MAILGUN_REGION: str = "eu"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_SES_REGION: str = "eu-west-1"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "hello@st4rtup.app"

    # Integrations - Existing
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    N8N_BASE_URL: str = ""
    N8N_API_KEY: str = ""
    APOLLO_API_KEY: str = ""

    # Integrations - Prospección
    LINKEDIN_ACCESS_TOKEN: str = ""
    LINKEDIN_ORGANIZATION_ID: str = ""
    WAALAXY_API_KEY: str = ""
    SERPER_API_KEY: str = ""
    # vLLM (self-hosted GPU)
    VLLM_API_URL: str = ""  # http://gpu.hetzner.internal:8000/v1
    CLEARBIT_API_KEY: str = ""
    HUNTER_API_KEY: str = ""
    LUSHA_API_KEY: str = ""
    ZOOMINFO_USERNAME: str = ""
    ZOOMINFO_PASSWORD: str = ""
    ZOOMINFO_CLIENT_ID: str = ""
    PHANTOMBUSTER_API_KEY: str = ""

    # Integrations - Comunicación y Reuniones
    GCALENDAR_CLIENT_ID: str = ""
    GCALENDAR_CLIENT_SECRET: str = ""
    GCALENDAR_REFRESH_TOKEN: str = ""
    OUTLOOK_CLIENT_ID: str = ""
    OUTLOOK_CLIENT_SECRET: str = ""
    OUTLOOK_TENANT_ID: str = ""
    OUTLOOK_REFRESH_TOKEN: str = ""
    CALENDLY_API_KEY: str = ""
    CALENDLY_ORGANIZATION_URI: str = ""
    ZOOM_CLIENT_ID: str = ""
    ZOOM_CLIENT_SECRET: str = ""
    ZOOM_ACCOUNT_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_TOKEN: str = ""
    SLACK_BOT_TOKEN: str = ""
    SLACK_DEFAULT_CHANNEL: str = ""

    # Integrations - Marketing y Captación
    GOOGLE_ADS_CLIENT_ID: str = ""
    GOOGLE_ADS_CLIENT_SECRET: str = ""
    GOOGLE_ADS_DEVELOPER_TOKEN: str = ""
    GOOGLE_ADS_REFRESH_TOKEN: str = ""
    GOOGLE_ADS_CUSTOMER_ID: str = ""
    LINKEDIN_ADS_ACCESS_TOKEN: str = ""
    LINKEDIN_ADS_ACCOUNT_ID: str = ""
    GA4_CLIENT_ID: str = ""
    GA4_CLIENT_SECRET: str = ""
    GA4_REFRESH_TOKEN: str = ""
    GA4_PROPERTY_ID: str = ""
    # YouTube
    YOUTUBE_CHANNEL_ID: str = "UCe_cKWVMFtl1xKrdzwMYqbQ"

    HUBSPOT_API_KEY: str = ""
    HUBSPOT_PORTAL_ID: str = ""
    TYPEFORM_API_KEY: str = ""
    TYPEFORM_WORKSPACE_ID: str = ""
    TYPEFORM_WEBHOOK_SECRET: str = ""

    # Webhook secrets for survey providers
    SURVEY_WEBHOOK_SECRET: str = ""  # Generic HMAC secret for survey webhooks
    TALLY_WEBHOOK_SECRET: str = ""

    # Firma digital (NDA)
    SIGNATURIT_API_KEY: str = ""
    SIGNATURIT_WEBHOOK_SECRET: str = ""
    SIGNATURIT_BASE_URL: str = "https://api.signaturit.com/v3"
    YOUSIGN_API_KEY: str = ""
    YOUSIGN_WEBHOOK_SECRET: str = ""
    YOUSIGN_BASE_URL: str = "https://api.yousign.app/v3"
    DOCUSIGN_BASE_URL: str = "https://demo.docusign.net/restapi"
    NDA_SIGNATURE_TIMEOUT: int = 10

    # Integrations - Documentos y Propuestas
    PANDADOC_API_KEY: str = ""
    PANDADOC_WORKSPACE_ID: str = ""
    DOCUSIGN_INTEGRATION_KEY: str = ""
    DOCUSIGN_SECRET_KEY: str = ""
    DOCUSIGN_ACCOUNT_ID: str = ""
    YOUSIGN_API_KEY: str = ""
    YOUSIGN_ENVIRONMENT: str = "sandbox"
    GDRIVE_CLIENT_ID: str = ""
    GDRIVE_CLIENT_SECRET: str = ""
    GDRIVE_REFRESH_TOKEN: str = ""
    GDRIVE_FOLDER_ID: str = ""

    # Google Drive - Document Manager (service account)
    GOOGLE_SERVICE_ACCOUNT_KEY_JSON: str = ""  # JSON string (for Fly.io)
    GOOGLE_SERVICE_ACCOUNT_KEY_FILE: str = ""  # File path (for local dev)
    GOOGLE_DRIVE_FOLDER_ID_MARKETING: str = ""
    GOOGLE_DRIVE_FOLDER_TEMPLATES: str = ""
    GOOGLE_DRIVE_FOLDER_CAMPAIGNS: str = ""
    GOOGLE_DRIVE_FOLDER_CONTENT: str = ""
    GOOGLE_DRIVE_FOLDER_BATTLECARDS: str = ""
    GOOGLE_DRIVE_FOLDER_LEGAL: str = ""
    ONEDRIVE_CLIENT_ID: str = ""
    ONEDRIVE_CLIENT_SECRET: str = ""
    ONEDRIVE_TENANT_ID: str = ""
    ONEDRIVE_REFRESH_TOKEN: str = ""
    NOTION_API_KEY: str = ""
    NOTION_DATABASE_ID: str = ""

    # Retell AI (Llamadas IA)
    RETELL_API_KEY: str = ""
    RETELL_AGENT_ID_DEFAULT: str = ""
    RETELL_FROM_NUMBER: str = ""
    RETELL_COST_PER_MINUTE: float = 0.07  # EUR/min

    # SEO & Geo-SEO
    DATAFORSEO_LOGIN: str = ""
    DATAFORSEO_PASSWORD: str = ""
    SEMRUSH_API_KEY: str = ""
    SERPER_API_KEY: str = ""  # Google SERP API alternative

    # Integrations - Datos y Compliance
    EINFORMA_API_KEY: str = ""
    EINFORMA_USER_ID: str = ""
    CNAE_BASE_URL: str = "https://api.cnae.com.es"

    # AI Providers
    OPENAI_API_KEY: str = ""
    OPEN_API_KEY: str = ""  # Fallback alias
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    GOOGLE_AI_API_KEY: str = ""
    GOOGLE_AI_MODEL: str = "gemini-1.5-pro"
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-large-latest"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # vLLM self-hosted (soberanía de datos)
    VLLM_BASE_URL: str = ""  # e.g. http://hetzner-gpu:8000

    # PostHog (product analytics → AGENT-CS-001)
    POSTHOG_HOST: str = ""
    POSTHOG_API_KEY: str = ""
    POSTHOG_PROJECT_ID: str = "1"

    # FirstPromoter (MSSP partner channel)
    FIRSTPROMOTER_API_KEY: str = ""

    # Qdrant (RAG vector store)
    QDRANT_URL: str = ""  # e.g. http://localhost:6333 or https://qdrant.hetzner.internal
    QDRANT_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    # Airtable
    AIRTABLE_API_KEY: str = ""
    AIRTABLE_BASE_ID: str = ""

    # Support (tawk.to)
    TAWKTO_PROPERTY_ID: str = ""

    # Slack
    SLACK_WEBHOOK_URL: str = ""
    # Microsoft Teams
    TEAMS_WEBHOOK_URL: str = ""
    # GrowthBook
    GROWTHBOOK_CLIENT_KEY: str = ""
    GROWTHBOOK_API_HOST: str = "https://cdn.growthbook.io"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    AI_DEFAULT_PROVIDER: str = "openai"
    AI_SYSTEM_PROMPT: str = "Eres un asistente de ventas de St4rtup CRM. Ayudas al equipo comercial con información sobre leads, oportunidades y estrategias de venta para startups. Responde siempre en español."

    # Public API
    PUBLIC_API_KEYS: str = ""  # comma-separated API keys
    GENERIC_WEBHOOK_SECRET: str = ""  # HMAC secret for /webhooks/generic
    N8N_API_KEY: str = ""  # API key for n8n service auth (bypasses Supabase JWT)
    CREDENTIAL_ENCRYPTION_KEY: str = ""  # Fernet key for encrypting API keys in DB

    # Integrations - Facturación y Post-venta
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"  # sandbox | live
    HOLDED_API_KEY: str = ""
    FACTURAMA_USER: str = ""
    FACTURAMA_PASSWORD: str = ""
    FACTURAMA_ENVIRONMENT: str = "sandbox"
    INTERCOM_ACCESS_TOKEN: str = ""
    INTERCOM_APP_ID: str = ""
    FRESHDESK_API_KEY: str = ""
    FRESHDESK_DOMAIN: str = ""

    # Admin
    ADMIN_EMAILS: str = "admin@st4rtup.app"

    @property
    def admin_emails_list(self) -> List[str]:
        """Parse admin emails from comma-separated string."""
        if not self.ADMIN_EMAILS:
            return []
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(',') if e.strip()]

    # Server
    PORT: int = 8001

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
