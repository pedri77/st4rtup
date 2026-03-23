"""
Email Service - Supports Resend, Zoho ZeptoMail, Brevo, Amazon SES, Mailgun, and SMTP
"""
from typing import Optional, Dict, Any
import httpx
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


class EmailService:
    """Unified email service supporting multiple providers"""

    def __init__(self):
        self.provider = getattr(settings, 'EMAIL_PROVIDER', 'resend').lower()

    def set_provider(self, provider: str):
        """Dynamically change provider at runtime"""
        self.provider = provider.lower()

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        from_email: Optional[str] = None,
        cc: Optional[list] = None,
        reply_to: Optional[str] = None,
        provider_config: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Send email using configured provider

        Args:
            provider_config: Optional override config from DB settings

        Returns:
            Dict with: {
                'success': bool,
                'message_id': str,
                'provider': str,
                'error': Optional[str]
            }
        """
        from_email = from_email or (provider_config or {}).get('from_email') or settings.EMAIL_FROM
        provider = (provider_config or {}).get('provider') or self.provider

        dispatch = {
            'resend': self._send_resend,
            'zoho': self._send_zoho,
            'brevo': self._send_brevo,
            'ses': self._send_ses,
            'mailgun': self._send_mailgun,
            'smtp': self._send_smtp,
            'gmail_oauth': self._send_gmail_oauth,
        }

        # Auto-detect: prefer Gmail OAuth (free) if connected, then configured provider
        if provider not in ('gmail_oauth',):
            try:
                from sqlalchemy import select as sa_select
                from app.core.database import AsyncSessionLocal
                from app.models.system import SystemSettings
                async with AsyncSessionLocal() as session:
                    result = await session.execute(sa_select(SystemSettings).limit(1))
                    sys = result.scalar_one_or_none()
                    if sys and sys.gmail_oauth_config and sys.gmail_oauth_config.get("connected"):
                        provider = 'gmail_oauth'
            except Exception:
                pass  # Fallback to configured provider

        handler = dispatch.get(provider)
        if not handler:
            return {
                'success': False,
                'provider': provider,
                'error': f'Proveedor de email no soportado: {provider}. Opciones: {", ".join(dispatch.keys())}'
            }

        result = await handler(to, subject, html_body, text_body, from_email, cc, reply_to, provider_config)

        # Fallback: if Gmail fails, try Resend
        if not result.get('success') and provider == 'gmail_oauth' and settings.RESEND_API_KEY:
            import logging
            logging.getLogger(__name__).info("Gmail OAuth failed, falling back to Resend")
            result = await self._send_resend(to, subject, html_body, text_body, from_email, cc, reply_to, provider_config)

        return result

    # ─── Resend ──────────────────────────────────────────────────────

    async def _send_resend(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Resend"""
        api_key = (config or {}).get('resend_api_key') or getattr(settings, 'RESEND_API_KEY', None)
        if not api_key or not api_key.startswith('re_') or api_key == 're_optional':
            return {
                'success': False,
                'provider': 'resend',
                'error': 'RESEND_API_KEY no configurada. Configura una API key válida de Resend en Integraciones.'
            }

        payload = {
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            payload["text"] = text_body
        if cc:
            payload["cc"] = cc
        if reply_to:
            payload["reply_to"] = reply_to

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return {'success': True, 'message_id': data.get('id', 'unknown'), 'provider': 'resend', 'error': None}
        except httpx.HTTPStatusError as e:
            error_msg = f"Resend API error: {e.response.status_code}"
            try:
                error_msg = e.response.json().get('message', error_msg)
            except Exception:
                pass
            return {'success': False, 'provider': 'resend', 'error': error_msg}
        except Exception as e:
            return {'success': False, 'provider': 'resend', 'error': str(e)}

    # ─── Zoho ZeptoMail ──────────────────────────────────────────────

    async def _send_zoho(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Zoho ZeptoMail"""
        api_key = (config or {}).get('zoho_api_key') or getattr(settings, 'ZOHO_API_KEY', None)
        if not api_key:
            return {
                'success': False,
                'provider': 'zoho',
                'error': 'ZOHO_API_KEY no configurada. Configura una API key válida de Zoho ZeptoMail en Integraciones.'
            }

        payload = {
            "from": {"address": from_email},
            "to": [{"email_address": {"address": to}}],
            "subject": subject,
            "htmlbody": html_body,
        }
        if text_body:
            payload["textbody"] = text_body
        if cc:
            payload["cc"] = [{"email_address": {"address": email}} for email in cc]
        if reply_to:
            payload["reply_to"] = [{"address": reply_to}]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.zeptomail.eu/v1.1/email",
                    headers={"Authorization": api_key, "Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    'success': True,
                    'message_id': data.get('data', {}).get('message_id', 'unknown'),
                    'provider': 'zoho',
                    'error': None,
                }
        except httpx.HTTPStatusError as e:
            error_msg = f"Zoho API error: {e.response.status_code}"
            try:
                error_msg = e.response.json().get('message', error_msg)
            except Exception:
                pass
            return {'success': False, 'provider': 'zoho', 'error': error_msg}
        except Exception as e:
            return {'success': False, 'provider': 'zoho', 'error': str(e)}

    # ─── Brevo (Sendinblue) ──────────────────────────────────────────

    async def _send_brevo(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Brevo (ex Sendinblue)"""
        api_key = (config or {}).get('brevo_api_key') or getattr(settings, 'BREVO_API_KEY', None)
        if not api_key:
            return {
                'success': False,
                'provider': 'brevo',
                'error': 'BREVO_API_KEY no configurada. Configura una API key válida de Brevo en Integraciones.'
            }

        payload = {
            "sender": {"email": from_email},
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": html_body,
        }
        if text_body:
            payload["textContent"] = text_body
        if cc:
            payload["cc"] = [{"email": email} for email in cc]
        if reply_to:
            payload["replyTo"] = {"email": reply_to}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={"api-key": api_key, "Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    'success': True,
                    'message_id': data.get('messageId', 'unknown'),
                    'provider': 'brevo',
                    'error': None,
                }
        except httpx.HTTPStatusError as e:
            error_msg = f"Brevo API error: {e.response.status_code}"
            try:
                error_msg = e.response.json().get('message', error_msg)
            except Exception:
                pass
            return {'success': False, 'provider': 'brevo', 'error': error_msg}
        except Exception as e:
            return {'success': False, 'provider': 'brevo', 'error': str(e)}

    # ─── Amazon SES ──────────────────────────────────────────────────

    async def _send_ses(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Amazon SES v2 API"""
        cfg = config or {}
        access_key = cfg.get('ses_access_key') or getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        secret_key = cfg.get('ses_secret_key') or getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        region = cfg.get('ses_region') or getattr(settings, 'AWS_SES_REGION', 'eu-west-1')

        if not access_key or not secret_key:
            return {
                'success': False,
                'provider': 'ses',
                'error': 'AWS SES no configurado. Configura Access Key y Secret Key en Integraciones.'
            }

        # Use SES v2 via SMTP (simpler than signing v4 requests)
        # SES SMTP endpoint: email-smtp.{region}.amazonaws.com:587
        smtp_host = f"email-smtp.{region}.amazonaws.com"
        smtp_port = 587

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to
            if cc:
                msg["Cc"] = ", ".join(cc)
            if reply_to:
                msg["Reply-To"] = reply_to

            if text_body:
                msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            recipients = [to] + (cc or [])

            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.starttls(context=context)
                server.login(access_key, secret_key)
                server.sendmail(from_email, recipients, msg.as_string())

            return {'success': True, 'message_id': f'ses-{smtp_host}', 'provider': 'ses', 'error': None}
        except smtplib.SMTPAuthenticationError:
            return {
                'success': False,
                'provider': 'ses',
                'error': 'Error de autenticación SES. Verifica las credenciales SMTP de AWS SES.'
            }
        except Exception as e:
            return {'success': False, 'provider': 'ses', 'error': str(e)}

    # ─── Mailgun ─────────────────────────────────────────────────────

    async def _send_mailgun(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Mailgun"""
        cfg = config or {}
        api_key = cfg.get('mailgun_api_key') or getattr(settings, 'MAILGUN_API_KEY', None)
        domain = cfg.get('mailgun_domain') or getattr(settings, 'MAILGUN_DOMAIN', None)
        api_region = cfg.get('mailgun_region', 'eu')

        if not api_key or not domain:
            return {
                'success': False,
                'provider': 'mailgun',
                'error': 'Mailgun no configurado. Configura API Key y Domain en Integraciones.'
            }

        base_url = "https://api.eu.mailgun.net" if api_region == 'eu' else "https://api.mailgun.net"
        url = f"{base_url}/v3/{domain}/messages"

        data = {
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            data["text"] = text_body
        if cc:
            data["cc"] = cc
        if reply_to:
            data["h:Reply-To"] = reply_to

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    auth=("api", api_key),
                    data=data,
                    timeout=30.0,
                )
                response.raise_for_status()
                resp_data = response.json()
                return {
                    'success': True,
                    'message_id': resp_data.get('id', 'unknown'),
                    'provider': 'mailgun',
                    'error': None,
                }
        except httpx.HTTPStatusError as e:
            error_msg = f"Mailgun API error: {e.response.status_code}"
            try:
                error_msg = e.response.json().get('message', error_msg)
            except Exception:
                pass
            return {'success': False, 'provider': 'mailgun', 'error': error_msg}
        except Exception as e:
            return {'success': False, 'provider': 'mailgun', 'error': str(e)}

    # ─── SMTP Genérico ───────────────────────────────────────────────

    async def _send_smtp(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via generic SMTP (Gmail, Outlook, custom servers)"""
        cfg = config or {}
        smtp_host = cfg.get('smtp_host') or getattr(settings, 'SMTP_HOST', None)
        smtp_port = int(cfg.get('smtp_port', 0) or getattr(settings, 'SMTP_PORT', 587))
        smtp_user = cfg.get('smtp_user') or getattr(settings, 'SMTP_USER', None)
        smtp_pass = cfg.get('smtp_password') or getattr(settings, 'SMTP_PASSWORD', None)
        use_tls = cfg.get('smtp_tls', True)

        if not smtp_host:
            return {
                'success': False,
                'provider': 'smtp',
                'error': 'SMTP no configurado. Configura host, puerto y credenciales en Integraciones.'
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to
            if cc:
                msg["Cc"] = ", ".join(cc)
            if reply_to:
                msg["Reply-To"] = reply_to

            if text_body:
                msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            recipients = [to] + (cc or [])

            if use_tls:
                context = ssl.create_default_context()
                with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                    server.starttls(context=context)
                    if smtp_user and smtp_pass:
                        server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, recipients, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                    if smtp_user and smtp_pass:
                        server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, recipients, msg.as_string())

            return {'success': True, 'message_id': f'smtp-{smtp_host}', 'provider': 'smtp', 'error': None}
        except smtplib.SMTPAuthenticationError:
            return {
                'success': False,
                'provider': 'smtp',
                'error': 'Error de autenticación SMTP. Verifica usuario y contraseña.'
            }
        except Exception as e:
            return {'success': False, 'provider': 'smtp', 'error': str(e)}

    # ─── Gmail OAuth2 ───────────────────────────────────────────────

    async def _refresh_gmail_token(self, config: dict) -> Optional[str]:
        """Refresh Gmail OAuth2 access token using refresh_token."""
        refresh_token = config.get('gmail_oauth_refresh_token') or config.get('refresh_token')
        client_id = config.get('gmail_oauth_client_id') or config.get('client_id')
        client_secret = config.get('gmail_oauth_client_secret') or config.get('client_secret')

        if not refresh_token or not client_id or not client_secret:
            return None

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    return resp.json().get("access_token")
        except Exception:
            pass
        return None

    async def _send_gmail_oauth(
        self, to, subject, html_body, text_body, from_email, cc, reply_to, config=None,
    ) -> Dict[str, Any]:
        """Send email via Gmail API using OAuth2."""
        cfg = config or {}
        access_token = cfg.get('gmail_oauth_access_token') or cfg.get('access_token')
        refresh_token = cfg.get('gmail_oauth_refresh_token') or cfg.get('refresh_token')

        # If no tokens in config, load from DB gmail_oauth_config
        if not access_token and not refresh_token:
            try:
                from app.core.database import AsyncSessionLocal
                from app.models import SystemSettings
                from sqlalchemy import select as sa_select
                async with AsyncSessionLocal() as session:
                    result = await session.execute(sa_select(SystemSettings).limit(1))
                    settings_row = result.scalar_one_or_none()
                    if settings_row and settings_row.gmail_oauth_config:
                        db_cfg = settings_row.gmail_oauth_config
                        access_token = db_cfg.get('access_token')
                        refresh_token = db_cfg.get('refresh_token')
                        # Merge DB config into cfg for token refresh
                        cfg = {**db_cfg, **cfg}
            except Exception:
                pass

        if not access_token and not refresh_token:
            return {
                'success': False,
                'provider': 'gmail_oauth',
                'error': 'Gmail OAuth2 no configurado. Conecta tu cuenta de Google en Integraciones.'
            }

        # Try to refresh token if we have a refresh token
        if refresh_token:
            new_token = await self._refresh_gmail_token(cfg)
            if new_token:
                access_token = new_token

        if not access_token:
            return {
                'success': False,
                'provider': 'gmail_oauth',
                'error': 'No se pudo obtener access token. Reconecta tu cuenta de Google.'
            }

        # Build RFC 2822 message
        import base64
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to
        if cc:
            msg["Cc"] = ", ".join(cc)
        if reply_to:
            msg["Reply-To"] = reply_to

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    json={"raw": raw_message},
                    timeout=30.0,
                )

                if resp.status_code == 401:
                    # Token expired, try refresh
                    new_token = await self._refresh_gmail_token(cfg)
                    if new_token:
                        resp = await client.post(
                            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                            headers={
                                "Authorization": f"Bearer {new_token}",
                                "Content-Type": "application/json",
                            },
                            json={"raw": raw_message},
                            timeout=30.0,
                        )

                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        'success': True,
                        'message_id': data.get('id', 'unknown'),
                        'provider': 'gmail_oauth',
                        'error': None,
                    }
                else:
                    error_msg = f"Gmail API error: {resp.status_code}"
                    try:
                        error_data = resp.json()
                        error_msg = error_data.get('error', {}).get('message', error_msg)
                    except Exception:
                        pass
                    return {'success': False, 'provider': 'gmail_oauth', 'error': error_msg}

        except Exception as e:
            return {'success': False, 'provider': 'gmail_oauth', 'error': str(e)}

    # ─── Test Connection ─────────────────────────────────────────────

    async def test_connection(self, provider_config: dict) -> Dict[str, Any]:
        """Test email provider connection without sending a real email"""
        provider = provider_config.get('provider', self.provider)

        validators = {
            'resend': lambda c: bool(c.get('resend_api_key', '').startswith('re_')),
            'zoho': lambda c: bool(c.get('zoho_api_key')),
            'brevo': lambda c: bool(c.get('brevo_api_key')),
            'ses': lambda c: bool(c.get('ses_access_key') and c.get('ses_secret_key')),
            'mailgun': lambda c: bool(c.get('mailgun_api_key') and c.get('mailgun_domain')),
            'smtp': lambda c: bool(c.get('smtp_host')),
            'gmail_oauth': lambda c: bool(c.get('access_token') or c.get('refresh_token')),
        }

        validator = validators.get(provider)
        if not validator:
            return {'success': False, 'error': f'Proveedor no soportado: {provider}'}

        if not validator(provider_config):
            return {'success': False, 'error': 'Faltan campos obligatorios para este proveedor'}

        # For API-based providers, try a lightweight validation call
        if provider == 'resend':
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://api.resend.com/domains",
                        headers={"Authorization": f"Bearer {provider_config['resend_api_key']}"},
                        timeout=10.0,
                    )
                    if resp.status_code == 200:
                        return {'success': True, 'message': 'Conexión con Resend verificada'}
                    return {'success': False, 'error': f'API key inválida (HTTP {resp.status_code})'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        if provider == 'brevo':
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://api.brevo.com/v3/account",
                        headers={"api-key": provider_config['brevo_api_key']},
                        timeout=10.0,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return {'success': True, 'message': f'Conectado a Brevo: {data.get("companyName", "OK")}'}
                    return {'success': False, 'error': f'API key inválida (HTTP {resp.status_code})'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        if provider == 'mailgun':
            try:
                domain = provider_config['mailgun_domain']
                region = provider_config.get('mailgun_region', 'eu')
                base = "https://api.eu.mailgun.net" if region == 'eu' else "https://api.mailgun.net"
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{base}/v3/domains/{domain}",
                        auth=("api", provider_config['mailgun_api_key']),
                        timeout=10.0,
                    )
                    if resp.status_code == 200:
                        return {'success': True, 'message': f'Dominio {domain} verificado en Mailgun'}
                    return {'success': False, 'error': f'Error verificando dominio (HTTP {resp.status_code})'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        if provider == 'smtp':
            try:
                host = provider_config['smtp_host']
                port = int(provider_config.get('smtp_port', 587))
                context = ssl.create_default_context()
                with smtplib.SMTP(host, port, timeout=10) as server:
                    server.starttls(context=context)
                    user = provider_config.get('smtp_user')
                    pwd = provider_config.get('smtp_password')
                    if user and pwd:
                        server.login(user, pwd)
                return {'success': True, 'message': f'Conexión SMTP a {host}:{port} verificada'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        if provider == 'gmail_oauth':
            token = provider_config.get('access_token') or provider_config.get('refresh_token')
            if not token:
                return {'success': False, 'error': 'No hay token. Conecta tu cuenta de Google.'}
            # Try to get user profile with the token
            try:
                access_token = provider_config.get('access_token')
                if not access_token and provider_config.get('refresh_token'):
                    access_token = await self._refresh_gmail_token(provider_config)
                if access_token:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(
                            "https://www.googleapis.com/oauth2/v2/userinfo",
                            headers={"Authorization": f"Bearer {access_token}"},
                            timeout=10.0,
                        )
                        if resp.status_code == 200:
                            email = resp.json().get('email', '')
                            return {'success': True, 'message': f'Gmail OAuth2 conectado: {email}'}
                return {'success': False, 'error': 'Token inválido. Reconecta tu cuenta de Google.'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        # Zoho / SES: basic validation only
        return {'success': True, 'message': 'Configuración guardada. Se verificará al enviar.'}


# Singleton instance
email_service = EmailService()
