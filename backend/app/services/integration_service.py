"""
Service para probar conexiones y interactuar con integraciones externas.
Cada integración tiene un método _test_{id} que verifica las credenciales.
"""
import base64
from typing import Dict, Any

import httpx

TIMEOUT = 15.0


class IntegrationService:
    """Service for testing and interacting with external integrations."""

    async def test_connection(self, integration_id: str, config: dict) -> Dict[str, Any]:
        """Test connection to an integration. Returns {success, message/error}."""
        method = getattr(self, f"_test_{integration_id}", None)
        if not method:
            return {"success": False, "error": f"Integración desconocida: {integration_id}"}
        try:
            return await method(config)
        except httpx.TimeoutException:
            return {"success": False, "error": "Timeout: el servidor no respondió en 15 segundos"}
        except httpx.ConnectError as e:
            return {"success": False, "error": f"Error de conexión: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ─── Prospección y Enriquecimiento ────────────────────────────

    async def _test_linkedin(self, config: dict) -> dict:
        """Test LinkedIn API connection."""
        token = config.get("access_token", "")
        if not token:
            return {"success": False, "error": "Se requiere access_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.linkedin.com/v2/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                data = r.json()
                name = f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}"
                return {"success": True, "message": f"Conectado como {name.strip()}"}
            return {"success": False, "error": f"LinkedIn API error {r.status_code}: {r.text[:200]}"}

    async def _test_clearbit(self, config: dict) -> dict:
        """Test Clearbit API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://company.clearbit.com/v2/companies/find?domain=clearbit.com",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": "API Key válida. Clearbit conectado."}
            if r.status_code == 401 or r.status_code == 403:
                return {"success": False, "error": "API Key inválida"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_hunter(self, config: dict) -> dict:
        """Test Hunter.io API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"https://api.hunter.io/v2/account?api_key={key}",
            )
            if r.status_code == 200:
                data = r.json().get("data", {})
                calls = data.get("requests", {})
                return {"success": True, "message": f"Conectado. Búsquedas: {calls.get('searches', {}).get('available', 'N/A')} disponibles"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_lusha(self, config: dict) -> dict:
        """Test Lusha API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.lusha.com/person",
                headers={"api_key": key},
                params={"firstName": "test", "lastName": "test", "company": "test"},
            )
            if r.status_code in (200, 404):
                return {"success": True, "message": "API Key válida. Lusha conectado."}
            if r.status_code == 401 or r.status_code == 403:
                return {"success": False, "error": "API Key inválida"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_zoominfo(self, config: dict) -> dict:
        """Test ZoomInfo API."""
        username = config.get("username", "")
        password = config.get("password", "")
        client_id = config.get("client_id", "")
        if not username or not password:
            return {"success": False, "error": "Se requieren username y password"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                "https://api.zoominfo.com/authenticate",
                json={"username": username, "password": password, "client_id": client_id},
            )
            if r.status_code == 200:
                return {"success": True, "message": "Autenticación exitosa. ZoomInfo conectado."}
            return {"success": False, "error": f"Error de autenticación: {r.text[:200]}"}

    async def _test_phantombuster(self, config: dict) -> dict:
        """Test PhantomBuster API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.phantombuster.com/api/v2/user",
                headers={"X-Phantombuster-Key": key},
            )
            if r.status_code == 200:
                data = r.json()
                return {"success": True, "message": f"Conectado. Plan: {data.get('plan', 'N/A')}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    # ─── Comunicación y Reuniones ─────────────────────────────────

    async def _test_gcalendar(self, config: dict) -> dict:
        """Test Google Calendar API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        refresh_token = config.get("refresh_token", "")
        if not all([client_id, client_secret, refresh_token]):
            return {"success": False, "error": "Se requieren client_id, client_secret y refresh_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Get access token from refresh token
            token_r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "No se pudo obtener token de acceso. Verifica las credenciales OAuth2."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                summary = r.json().get("summary", "")
                return {"success": True, "message": f"Conectado al calendario: {summary}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_outlook(self, config: dict) -> dict:
        """Test Microsoft Outlook/365 API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        tenant_id = config.get("tenant_id", "")
        refresh_token = config.get("refresh_token", "")
        if not all([client_id, client_secret, tenant_id, refresh_token]):
            return {"success": False, "error": "Se requieren client_id, client_secret, tenant_id y refresh_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "scope": "https://graph.microsoft.com/.default",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token. Verifica las credenciales."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                name = r.json().get("displayName", "")
                return {"success": True, "message": f"Conectado como {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_calendly(self, config: dict) -> dict:
        """Test Calendly API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.calendly.com/users/me",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                name = r.json().get("resource", {}).get("name", "")
                return {"success": True, "message": f"Conectado como {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_zoom(self, config: dict) -> dict:
        """Test Zoom API (Server-to-Server OAuth)."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        account_id = config.get("account_id", "")
        if not all([client_id, client_secret, account_id]):
            return {"success": False, "error": "Se requieren client_id, client_secret y account_id"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            token_r = await client.post(
                f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={account_id}",
                headers={"Authorization": f"Basic {credentials}"},
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error de autenticación. Verifica las credenciales."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://api.zoom.us/v2/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                email = r.json().get("email", "")
                return {"success": True, "message": f"Conectado como {email}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_whatsapp(self, config: dict) -> dict:
        """Test WhatsApp Business API."""
        token = config.get("access_token", "")
        phone_id = config.get("phone_number_id", "")
        if not token or not phone_id:
            return {"success": False, "error": "Se requieren access_token y phone_number_id"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"https://graph.facebook.com/v18.0/{phone_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                phone = r.json().get("display_phone_number", "")
                return {"success": True, "message": f"Conectado. Teléfono: {phone}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_slack(self, config: dict) -> dict:
        """Test Slack Bot API."""
        token = config.get("bot_token", "")
        if not token:
            return {"success": False, "error": "Se requiere bot_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("ok"):
                    return {"success": True, "message": f"Conectado al workspace: {data.get('team', '')}"}
                return {"success": False, "error": f"Slack error: {data.get('error', 'unknown')}"}
            return {"success": False, "error": f"Error {r.status_code}"}

    async def _test_teams(self, config: dict) -> dict:
        """Test Microsoft Teams Incoming Webhook."""
        webhook_url = config.get("webhook_url", "")
        if not webhook_url:
            return {"success": False, "error": "Se requiere webhook_url"}
        try:
            from app.services.slack_teams_service import test_teams_connection
            return await test_teams_connection(config)
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ─── Marketing y Captación ────────────────────────────────────

    async def _test_google_ads(self, config: dict) -> dict:
        """Test Google Ads API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        developer_token = config.get("developer_token", "")
        refresh_token = config.get("refresh_token", "")
        customer_id = config.get("customer_id", "")
        if not all([client_id, client_secret, developer_token, refresh_token, customer_id]):
            return {"success": False, "error": "Se requieren todos los campos: client_id, client_secret, developer_token, refresh_token, customer_id"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token OAuth2."}
            access_token = token_r.json().get("access_token")
            cid = customer_id.replace("-", "")
            r = await client.get(
                f"https://googleads.googleapis.com/v15/customers/{cid}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": developer_token,
                },
            )
            if r.status_code == 200:
                name = r.json().get("descriptiveName", cid)
                return {"success": True, "message": f"Conectado a cuenta: {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_linkedin_ads(self, config: dict) -> dict:
        """Test LinkedIn Ads API."""
        token = config.get("access_token", "")
        account_id = config.get("ad_account_id", "")
        if not token:
            return {"success": False, "error": "Se requiere access_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.linkedin.com/v2/adAccountsV2" + (f"/{account_id}" if account_id else ""),
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": "Conectado a LinkedIn Ads."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_ga4(self, config: dict) -> dict:
        """Test Google Analytics 4 API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        refresh_token = config.get("refresh_token", "")
        property_id = config.get("property_id", "")
        if not all([client_id, client_secret, refresh_token, property_id]):
            return {"success": False, "error": "Se requieren client_id, client_secret, refresh_token y property_id"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token OAuth2."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                f"https://analyticsadmin.googleapis.com/v1beta/properties/{property_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                name = r.json().get("displayName", property_id)
                return {"success": True, "message": f"Conectado a propiedad: {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_google_search_console(self, config: dict) -> dict:
        """Test Google Search Console API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        refresh_token = config.get("refresh_token", "")
        site_url = config.get("site_url", "")
        if not all([client_id, client_secret, refresh_token]):
            return {"success": False, "error": "Se requieren client_id, client_secret y refresh_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token OAuth2."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://www.googleapis.com/webmasters/v3/sites",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                sites = r.json().get("siteEntry", [])
                if site_url:
                    return {"success": True, "message": f"Conectado. Sitio: {site_url}. {len(sites)} sitio(s) disponibles."}
                return {"success": True, "message": f"Conectado. {len(sites)} sitio(s) disponibles."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_youtube(self, config: dict) -> dict:
        """Test YouTube Data API."""
        api_key = config.get("api_key", "")
        channel_id = config.get("channel_id", "")
        if not api_key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            params = {"part": "snippet,statistics", "key": api_key}
            if channel_id:
                params["id"] = channel_id
            else:
                params["mine"] = "true"
            r = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params=params,
            )
            if r.status_code == 200:
                items = r.json().get("items", [])
                if items:
                    name = items[0].get("snippet", {}).get("title", "")
                    subs = items[0].get("statistics", {}).get("subscriberCount", "N/A")
                    return {"success": True, "message": f"Conectado a canal: {name} ({subs} suscriptores)"}
                return {"success": True, "message": "API Key válida. No se encontró el canal especificado."}
            if r.status_code == 403:
                return {"success": False, "error": "API Key inválida o YouTube Data API no habilitada en Google Cloud."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_hubspot(self, config: dict) -> dict:
        """Test HubSpot API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key (Private App Token)"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": "HubSpot conectado correctamente."}
            if r.status_code == 401:
                return {"success": False, "error": "API Key/Token inválido"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_typeform(self, config: dict) -> dict:
        """Test Typeform API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.typeform.com/me",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                alias = r.json().get("alias", "")
                return {"success": True, "message": f"Conectado como {alias}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    # ─── Documentos y Propuestas ──────────────────────────────────

    async def _test_pandadoc(self, config: dict) -> dict:
        """Test PandaDoc API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.pandadoc.com/public/v1/documents?count=1",
                headers={"Authorization": f"API-Key {key}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": "PandaDoc conectado correctamente."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_docusign(self, config: dict) -> dict:
        """Test DocuSign API."""
        integration_key = config.get("integration_key", "")
        secret_key = config.get("secret_key", "")
        account_id = config.get("account_id", "")
        if not all([integration_key, secret_key]):
            return {"success": False, "error": "Se requieren integration_key y secret_key"}
        return {"success": True, "message": f"Credenciales configuradas. Account: {account_id or 'pendiente'}. Requiere flujo OAuth2 para activar."}

    async def _test_yousign(self, config: dict) -> dict:
        """Test Yousign API."""
        key = config.get("api_key", "")
        env = config.get("environment", "sandbox")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        base = "https://api.yousign.app" if env == "production" else "https://api-sandbox.yousign.app"
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{base}/v3/users",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": f"Yousign conectado ({env})."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_gdrive(self, config: dict) -> dict:
        """Test Google Drive API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        refresh_token = config.get("refresh_token", "")
        if not all([client_id, client_secret, refresh_token]):
            return {"success": False, "error": "Se requieren client_id, client_secret y refresh_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token OAuth2."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://www.googleapis.com/drive/v3/about?fields=user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                email = r.json().get("user", {}).get("emailAddress", "")
                return {"success": True, "message": f"Google Drive conectado como {email}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_onedrive(self, config: dict) -> dict:
        """Test OneDrive / Microsoft Graph API."""
        client_id = config.get("client_id", "")
        client_secret = config.get("client_secret", "")
        tenant_id = config.get("tenant_id", "")
        refresh_token = config.get("refresh_token", "")
        if not all([client_id, client_secret, tenant_id, refresh_token]):
            return {"success": False, "error": "Se requieren client_id, client_secret, tenant_id y refresh_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            token_r = await client.post(
                f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "scope": "https://graph.microsoft.com/.default",
                },
            )
            if token_r.status_code != 200:
                return {"success": False, "error": "Error obteniendo token."}
            access_token = token_r.json().get("access_token")
            r = await client.get(
                "https://graph.microsoft.com/v1.0/me/drive",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if r.status_code == 200:
                name = r.json().get("owner", {}).get("user", {}).get("displayName", "")
                return {"success": True, "message": f"OneDrive conectado como {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_notion(self, config: dict) -> dict:
        """Test Notion API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key (Internal Integration Token)"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.notion.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Notion-Version": "2022-06-28",
                },
            )
            if r.status_code == 200:
                name = r.json().get("name", "Bot")
                return {"success": True, "message": f"Notion conectado como {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    # ─── Datos y Compliance ───────────────────────────────────────

    async def _test_einforma(self, config: dict) -> dict:
        """Test eInforma/Axesor API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.einforma.com/v1/account",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": "eInforma conectado correctamente."}
            if r.status_code == 401:
                return {"success": False, "error": "API Key inválida"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_cnae(self, config: dict) -> dict:
        """Test CNAE lookup service."""
        from app.services.ai_chat_service import _validate_base_url
        base_url = config.get("base_url", "https://api.cnae.com.es")
        _validate_base_url(base_url)
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                r = await client.get(f"{base_url}/health")
                if r.status_code == 200:
                    return {"success": True, "message": "Servicio CNAE disponible."}
                return {"success": True, "message": f"Servicio responde con código {r.status_code}. Verificar URL."}
            except Exception:
                return {"success": False, "error": f"No se puede conectar a {base_url}"}

    # ─── Facturación y Post-venta ─────────────────────────────────

    async def _test_stripe(self, config: dict) -> dict:
        """Test Stripe API."""
        key = config.get("secret_key", "")
        if not key:
            return {"success": False, "error": "Se requiere secret_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.stripe.com/v1/balance",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                data = r.json()
                available = data.get("available", [{}])
                amount = available[0].get("amount", 0) / 100 if available else 0
                currency = available[0].get("currency", "eur").upper() if available else "EUR"
                return {"success": True, "message": f"Stripe conectado. Balance: {amount:.2f} {currency}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_holded(self, config: dict) -> dict:
        """Test Holded API."""
        key = config.get("api_key", "")
        if not key:
            return {"success": False, "error": "Se requiere api_key"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.holded.com/api/invoicing/v1/contacts?limit=1",
                headers={"key": key},
            )
            if r.status_code == 200:
                return {"success": True, "message": "Holded conectado correctamente."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_facturama(self, config: dict) -> dict:
        """Test Facturama API."""
        user = config.get("user", "")
        password = config.get("password", "")
        env = config.get("environment", "sandbox")
        if not user or not password:
            return {"success": False, "error": "Se requieren user y password"}
        base = "https://api.facturama.mx" if env == "production" else "https://apisandbox.facturama.mx"
        credentials = base64.b64encode(f"{user}:{password}".encode()).decode()
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{base}/api/Client?length=1",
                headers={"Authorization": f"Basic {credentials}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": f"Facturama conectado ({env})."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_intercom(self, config: dict) -> dict:
        """Test Intercom API."""
        token = config.get("access_token", "")
        if not token:
            return {"success": False, "error": "Se requiere access_token"}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.intercom.io/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )
            if r.status_code == 200:
                name = r.json().get("name", "")
                return {"success": True, "message": f"Intercom conectado como {name}"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

    async def _test_freshdesk(self, config: dict) -> dict:
        """Test Freshdesk API."""
        key = config.get("api_key", "")
        domain = config.get("domain", "")
        if not key or not domain:
            return {"success": False, "error": "Se requieren api_key y domain"}
        credentials = base64.b64encode(f"{key}:X".encode()).decode()
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"https://{domain}.freshdesk.com/api/v2/tickets?per_page=1",
                headers={"Authorization": f"Basic {credentials}"},
            )
            if r.status_code == 200:
                return {"success": True, "message": f"Freshdesk conectado ({domain})."}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}


    async def _test_telegram(self, config: dict) -> dict:
        """Test Telegram Bot API connection."""
        from app.services.telegram_service import test_connection
        try:
            result = await test_connection(config)
            return {"success": True, "message": f"Telegram conectado (@{result['bot_username']})."}
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Error: {str(e)}"}


integration_service = IntegrationService()
