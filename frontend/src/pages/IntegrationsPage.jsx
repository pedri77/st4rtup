import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, Bot, Webhook, Globe, Key, Shield, Check, X, Loader2,
  ExternalLink, AlertTriangle, Zap, RefreshCw, Lock,
  Search, Phone, Database, Calendar, CalendarCheck, Video, MessageCircle, Hash,
  Megaphone, BarChart3, Ghost, FileText, FileSignature, HardDrive, Building2,
  Tag, CreditCard, Receipt, Headphones, LinkedinIcon, BookOpen, FormInput,
  PenTool, Cloud, FileSpreadsheet, MessageSquare, BrainCircuit, Sparkles,
  ClipboardList, Flame, ListChecks, Eye, EyeOff, Save, Plug
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api, { settingsApi, airtableApi, mcpApi } from '@/services/api'
import { useHasRole } from '@/components/RoleGuard'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


/* ── Design tokens ─────────────────────────────────────────────────── */

const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

// ─── Provider definitions ───────────────────────────────────────────

const EMAIL_PROVIDERS = [
  {
    id: 'resend', name: 'Resend', icon: Zap, accent: T.cyan,
    description: 'API moderna, facil setup. 3.000 emails/mes gratis.',
    url: 'https://resend.com', price: 'Gratis hasta 3K/mes, luego $20/mes',
    fields: [{ key: 'resend_api_key', label: 'API Key', type: 'password', placeholder: 're_...' }],
  },
  {
    id: 'brevo', name: 'Brevo (Sendinblue)', icon: Send, accent: T.success,
    description: '300 emails/dia gratis. SMTP incluido, muy economico.',
    url: 'https://brevo.com', price: 'Gratis 300/dia, luego $9/mes (20K)',
    fields: [{ key: 'brevo_api_key', label: 'API Key', type: 'password', placeholder: 'xkeysib-...' }],
  },
  {
    id: 'ses', name: 'Amazon SES', icon: Cloud, accent: 'hsl(25,85%,55%)',
    description: 'El mas barato a escala. $0.10 por cada 1.000 emails.',
    url: 'https://aws.amazon.com/ses/', price: '$0.10/1.000 emails',
    fields: [
      { key: 'ses_access_key', label: 'SMTP Username (Access Key)', type: 'password', placeholder: 'AKIA...' },
      { key: 'ses_secret_key', label: 'SMTP Password (Secret Key)', type: 'password', placeholder: '' },
      { key: 'ses_region', label: 'Region', type: 'select', options: [
        { value: 'eu-west-1', label: 'EU West (Irlanda)' }, { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
        { value: 'us-east-1', label: 'US East (Virginia)' }, { value: 'us-west-2', label: 'US West (Oregon)' },
      ]},
    ],
  },
  {
    id: 'mailgun', name: 'Mailgun', icon: Mail, accent: T.purple,
    description: 'Buen tracking y analytics. API robusta.',
    url: 'https://mailgun.com', price: '1.000/mes gratis (3 meses), luego $15/mes',
    fields: [
      { key: 'mailgun_api_key', label: 'API Key', type: 'password', placeholder: 'key-...' },
      { key: 'mailgun_domain', label: 'Dominio', type: 'text', placeholder: 'mg.tudominio.com' },
      { key: 'mailgun_region', label: 'Region', type: 'select', options: [
        { value: 'eu', label: 'EU' }, { value: 'us', label: 'US' },
      ]},
    ],
  },
  {
    id: 'zoho', name: 'Zoho ZeptoMail', icon: Mail, accent: T.warning,
    description: 'Si ya usas Zoho Mail corporativo, integracion directa.',
    url: 'https://www.zoho.com/zeptomail/', price: '~$2.50/1.000 emails',
    fields: [{ key: 'zoho_api_key', label: 'API Key (SendMail Token)', type: 'password', placeholder: 'Zoho-enczapikey ...' }],
  },
  {
    id: 'smtp', name: 'SMTP Generico', icon: Globe, accent: T.fgMuted,
    description: 'Gmail, Outlook, o cualquier servidor SMTP personalizado.',
    url: null, price: 'Depende del servidor',
    fields: [
      { key: 'smtp_host', label: 'Host SMTP', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'Puerto', type: 'number', placeholder: '587' },
      { key: 'smtp_user', label: 'Usuario', type: 'text', placeholder: 'user@domain.com' },
      { key: 'smtp_password', label: 'Contrasena', type: 'password', placeholder: '' },
      { key: 'smtp_tls', label: 'Usar TLS', type: 'checkbox' },
    ],
  },
  {
    id: 'gmail_oauth', name: 'Gmail OAuth2', icon: Globe, accent: 'hsl(210,70%,55%)',
    description: 'Envia desde tu cuenta de Gmail/Google Workspace con OAuth2. No necesita contrasena de aplicacion.',
    url: 'https://console.cloud.google.com/apis/credentials', price: 'Gratis (cuenta de Google)',
    oauth: true, fields: [],
  },
]

// ─── Integration categories ─────────────────────────────────────────

const INTEGRATION_CATEGORIES = [
  {
    id: 'automation', name: 'Automatizaciones y Notificaciones', icon: Zap,
    integrations: [
      { id: 'telegram', name: 'Telegram', icon: Bot, configKey: 'telegram_config', description: 'Notificaciones en tiempo real via Telegram Bot.',
        fields: [{ key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF1234...' }, { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-1001234567890' }] },
      { id: 'n8n', name: 'n8n Automations', icon: Zap, configKey: 'n8n_config', description: 'Conexion con tu instancia n8n para automatizaciones.',
        fields: [{ key: 'base_url', label: 'URL Base', type: 'text', placeholder: 'https://n8n.tudominio.com' }, { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'apollo', name: 'Apollo.io', icon: Globe, configKey: 'apollo_config', description: 'Enriquecimiento de leads y datos de contacto.',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'webhooks', name: 'Webhooks', icon: Webhook, configKey: 'webhook_config', description: 'Recibe eventos externos (formularios web, CRM, etc.).',
        fields: [{ key: 'secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' }] },
    ],
  },
  {
    id: 'prospecting', name: 'Prospeccion y Enriquecimiento', icon: Search,
    integrations: [
      { id: 'linkedin', name: 'LinkedIn Sales Navigator', icon: LinkedinIcon, configKey: 'linkedin_config', description: 'Busqueda avanzada de decisores, InMail y alertas.', url: 'https://business.linkedin.com/sales-solutions',
        fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'AQV...' }, { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: '12345678' }] },
      { id: 'clearbit', name: 'Clearbit', icon: Search, configKey: 'clearbit_config', description: 'Enriquecimiento automatico de empresa/contacto por dominio.', url: 'https://clearbit.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk_...' }] },
      { id: 'hunter', name: 'Hunter.io', icon: Mail, configKey: 'hunter_config', description: 'Descubrimiento y verificacion de emails corporativos.', url: 'https://hunter.io',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'lusha', name: 'Lusha', icon: Phone, configKey: 'lusha_config', description: 'Telefonos directos y emails de decisores.', url: 'https://www.lusha.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'zoominfo', name: 'ZoomInfo', icon: Database, configKey: 'zoominfo_config', description: 'Base de datos B2B con datos de contacto verificados.', url: 'https://www.zoominfo.com',
        fields: [{ key: 'username', label: 'Username', type: 'text', placeholder: '' }, { key: 'password', label: 'Password', type: 'password', placeholder: '' }, { key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }] },
      { id: 'phantombuster', name: 'PhantomBuster', icon: Ghost, configKey: 'phantombuster_config', description: 'Scraping automatizado de perfiles LinkedIn.', url: 'https://phantombuster.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'waalaxy', name: 'Waalaxy', icon: LinkedinIcon, configKey: 'linkedin_config', configSubKey: 'waalaxy', description: 'Automatizacion de conexiones y mensajes LinkedIn.', url: 'https://www.waalaxy.com',
        fields: [{ key: 'waalaxy_api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'lemlist', name: 'Lemlist', icon: Send, configKey: 'general_config', configSubKey: 'lemlist', description: 'Cold email sequences y sales automation.', url: 'https://www.lemlist.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
    ],
  },
  {
    id: 'communication', name: 'Comunicacion y Reuniones', icon: MessageCircle,
    integrations: [
      { id: 'gcalendar', name: 'Google Calendar', icon: Calendar, configKey: 'gcalendar_config', description: 'Sync bidireccional de visitas/reuniones con Google Calendar. Conectar via OAuth2.', url: 'https://calendar.google.com',
        oauthProvider: 'gcalendar',
        fields: [] },
      { id: 'outlook', name: 'Microsoft Outlook 365', icon: Mail, configKey: 'outlook_config', description: 'Sync con calendario y emails de Microsoft 365.', url: 'https://outlook.office.com',
        fields: [{ key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' }, { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: '' }, { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '' }] },
      { id: 'calendly', name: 'Calendly', icon: CalendarCheck, configKey: 'calendly_config', description: 'Links de agendamiento para leads y prospectos.', url: 'https://calendly.com',
        fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: '' }, { key: 'organization_uri', label: 'Organization URI', type: 'text', placeholder: 'https://api.calendly.com/organizations/...' }] },
      { id: 'zoom', name: 'Zoom', icon: Video, configKey: 'zoom_config', description: 'Auto-crear enlaces de videollamada en visitas.', url: 'https://marketplace.zoom.us',
        fields: [{ key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' }, { key: 'account_id', label: 'Account ID', type: 'text', placeholder: '' }] },
      { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageCircle, configKey: 'whatsapp_config', description: 'Comunicacion directa con leads via WhatsApp.', url: 'https://business.whatsapp.com',
        fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: '' }, { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: '' }, { key: 'business_account_id', label: 'Business Account ID', type: 'text', placeholder: '' }] },
      { id: 'slack', name: 'Slack', icon: Hash, configKey: 'slack_config', description: 'Notificaciones internas del equipo comercial.', url: 'https://api.slack.com',
        fields: [{ key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' }, { key: 'default_channel', label: 'Canal por defecto', type: 'text', placeholder: '#ventas' }] },
      { id: 'twilio', name: 'Twilio', icon: Phone, configKey: 'general_config', configSubKey: 'twilio', description: 'SMS y llamadas directas. Complementa Retell AI para follow-ups.', url: 'https://www.twilio.com',
        fields: [{ key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' }, { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '' }, { key: 'from_number', label: 'Numero remitente', type: 'text', placeholder: '+34...' }] },
      { id: 'sendgrid', name: 'SendGrid', icon: Send, configKey: 'general_config', configSubKey: 'sendgrid', description: 'Email a escala (>10K/mes). Alternativa a Resend.', url: 'https://sendgrid.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...' }] },
    ],
  },
  {
    id: 'marketing', name: 'Marketing y Captacion', icon: Megaphone,
    integrations: [
      { id: 'google_ads', name: 'Google Ads', icon: Megaphone, configKey: 'google_ads_config', description: 'Tracking de conversion lead -> oportunidad -> cierre.', url: 'https://ads.google.com',
        fields: [{ key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' }, { key: 'developer_token', label: 'Developer Token', type: 'password', placeholder: '' }, { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '' }, { key: 'customer_id', label: 'Customer ID', type: 'text', placeholder: '123-456-7890' }] },
      { id: 'linkedin_ads', name: 'LinkedIn Ads', icon: LinkedinIcon, configKey: 'linkedin_ads_config', description: 'Audiencias lookalike basadas en clientes ganados.', url: 'https://www.linkedin.com/campaignmanager',
        fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: '' }, { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', placeholder: '' }] },
      { id: 'ga4', name: 'Google Analytics 4', icon: BarChart3, configKey: 'ga4_config', description: 'Atribucion de fuente de leads y tracking web.', url: 'https://analytics.google.com',
        fields: [{ key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' }, { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '' }, { key: 'property_id', label: 'Property ID', type: 'text', placeholder: '123456789' }] },
      { id: 'hubspot', name: 'HubSpot', icon: FormInput, configKey: 'hubspot_config', description: 'CRM, formularios, landing pages, email marketing. Webhook: /api/v1/webhooks/hubspot', url: 'https://www.hubspot.com',
        fields: [
          { key: 'api_key', label: 'Private App Token', type: 'password', placeholder: 'pat-eu1-...' },
          { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '88b91b5e-...' },
          { key: 'portal_id', label: 'Portal ID (Hub ID)', type: 'text', placeholder: '12345678' },
          { key: 'webhook_url', label: 'Webhook URL (copiar a HubSpot)', type: 'text', placeholder: 'https://api.st4rtup.com/api/v1/webhooks/hubspot' },
          { key: 'sync_contacts', label: 'Sincronizar contactos como leads', type: 'checkbox' },
          { key: 'sync_deals', label: 'Sincronizar deals con pipeline', type: 'checkbox' },
          { key: 'sync_forms', label: 'Importar envios de formularios', type: 'checkbox' },
        ] },
      { id: 'typeform', name: 'Typeform', icon: FileSpreadsheet, configKey: 'typeform_config', description: 'Formularios interactivos para captura de leads.', url: 'https://www.typeform.com',
        fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'tfp_...' }, { key: 'workspace_id', label: 'Workspace ID', type: 'text', placeholder: '' }] },
    ],
  },
  {
    id: 'documents', name: 'Documentos y Propuestas', icon: FileText,
    integrations: [
      { id: 'pandadoc', name: 'PandaDoc', icon: FileText, configKey: 'pandadoc_config', description: 'Envio y firma digital de propuestas/contratos.', url: 'https://www.pandadoc.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'workspace_id', label: 'Workspace ID', type: 'text', placeholder: '' }] },
      { id: 'docusign', name: 'DocuSign', icon: FileSignature, configKey: 'docusign_config', description: 'Firma electronica de contratos y acuerdos.', url: 'https://www.docusign.com',
        fields: [{ key: 'integration_key', label: 'Integration Key', type: 'text', placeholder: '' }, { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: '' }, { key: 'account_id', label: 'Account ID', type: 'text', placeholder: '' }] },
      { id: 'yousign', name: 'Yousign', icon: PenTool, configKey: 'yousign_config', description: 'Firma electronica europea (eIDAS) para contratos.', url: 'https://yousign.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'environment', label: 'Entorno', type: 'select', options: [{ value: 'sandbox', label: 'Sandbox (pruebas)' }, { value: 'production', label: 'Produccion' }] }] },
      { id: 'gdrive', name: 'Google Drive', icon: HardDrive, configKey: 'gdrive_config', description: 'Adjuntar documentos a oportunidades y leads. Conectar via OAuth2.', url: 'https://drive.google.com',
        oauthProvider: 'gdrive',
        fields: [{ key: 'folder_id', label: 'Folder ID raiz (opcional)', type: 'text', placeholder: 'ID de la carpeta principal en Drive' }] },
      { id: 'onedrive', name: 'OneDrive / SharePoint', icon: Cloud, configKey: 'onedrive_config', description: 'Adjuntar documentos desde Microsoft OneDrive.', url: 'https://onedrive.live.com',
        fields: [{ key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' }, { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: '' }, { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '' }] },
      { id: 'notion', name: 'Notion', icon: BookOpen, configKey: 'notion_config', description: 'Base de conocimiento de producto para el equipo.', url: 'https://www.notion.so',
        fields: [{ key: 'api_key', label: 'Internal Integration Token', type: 'password', placeholder: 'secret_...' }, { key: 'database_id', label: 'Database ID', type: 'text', placeholder: '' }] },
    ],
  },
  {
    id: 'data', name: 'Datos y Compliance', icon: Building2,
    integrations: [
      { id: 'einforma', name: 'eInforma / Axesor', icon: Building2, configKey: 'einforma_config', description: 'Datos financieros de empresas espanolas (facturacion, empleados).', url: 'https://www.einforma.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'user_id', label: 'User ID', type: 'text', placeholder: '' }] },
      { id: 'cnae', name: 'CNAE Lookup', icon: Tag, configKey: 'cnae_config', description: 'Clasificar leads por sector (CNAE) automaticamente.',
        fields: [{ key: 'base_url', label: 'URL del servicio', type: 'text', placeholder: 'https://api.cnae.com.es' }] },
    ],
  },
  {
    id: 'billing', name: 'Facturacion y Post-venta', icon: CreditCard,
    integrations: [
      { id: 'stripe', name: 'Stripe', icon: CreditCard, configKey: 'stripe_config', description: 'Sincronizar oportunidades ganadas -> facturacion.', url: 'https://stripe.com',
        fields: [{ key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_...' }, { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' }] },
      { id: 'holded', name: 'Holded', icon: Receipt, configKey: 'holded_config', description: 'Facturacion y contabilidad integrada (Espana).', url: 'https://www.holded.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'facturama', name: 'Facturama', icon: FileSpreadsheet, configKey: 'facturama_config', description: 'Facturacion electronica CFDI (Mexico/LATAM).', url: 'https://www.facturama.mx',
        fields: [{ key: 'user', label: 'Usuario', type: 'text', placeholder: '' }, { key: 'password', label: 'Contrasena', type: 'password', placeholder: '' }, { key: 'environment', label: 'Entorno', type: 'select', options: [{ value: 'sandbox', label: 'Sandbox (pruebas)' }, { value: 'production', label: 'Produccion' }] }] },
      { id: 'intercom', name: 'Intercom', icon: Headphones, configKey: 'intercom_config', description: 'Tickets post-venta vinculados al lead.', url: 'https://www.intercom.com',
        fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: '' }, { key: 'app_id', label: 'App ID', type: 'text', placeholder: '' }] },
      { id: 'freshdesk', name: 'Freshdesk', icon: MessageSquare, configKey: 'freshdesk_config', description: 'Helpdesk y tickets de soporte post-venta.', url: 'https://freshdesk.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'domain', label: 'Dominio', type: 'text', placeholder: 'tuempresa (sin .freshdesk.com)' }] },
    ],
  },
  {
    id: 'surveys', name: 'Encuestas y Feedback', icon: ClipboardList,
    integrations: [
      { id: 'typeform_survey', name: 'Typeform', icon: FileSpreadsheet, configKey: 'typeform_config', description: 'Encuestas NPS/CSAT interactivas con alta tasa de respuesta.', url: 'https://www.typeform.com',
        fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'tfp_...' }, { key: 'workspace_id', label: 'Workspace ID', type: 'text', placeholder: '' }] },
      { id: 'google_forms', name: 'Google Forms', icon: ListChecks, configKey: 'google_forms_config', description: 'Formularios de encuesta gratuitos via Google Workspace. Conecta via OAuth2 o usa Apps Script webhook.', url: 'https://docs.google.com/forms',
        oauthProvider: 'google_forms',
        fields: [{ key: 'webhook_url', label: 'Webhook URL Apps Script (alternativa)', type: 'text', placeholder: 'https://script.google.com/...' }] },
      { id: 'surveymonkey', name: 'SurveyMonkey', icon: ClipboardList, configKey: 'surveymonkey_config', description: 'Plataforma lider de encuestas con analisis avanzado.', url: 'https://www.surveymonkey.com',
        fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: '' }] },
      { id: 'tally', name: 'Tally', icon: BarChart3, configKey: 'tally_config', description: 'Formularios de encuesta minimalistas y gratuitos.', url: 'https://tally.so',
        fields: [{ key: 'webhook_signing_secret', label: 'Webhook Signing Secret', type: 'password', placeholder: '' }] },
      { id: 'jotform', name: 'JotForm', icon: FormInput, configKey: 'jotform_config', description: 'Constructor de formularios con +10.000 plantillas.', url: 'https://www.jotform.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }] },
      { id: 'survicate', name: 'Survicate', icon: BarChart3, configKey: 'survicate_config', description: 'Encuestas in-app y NPS para productos SaaS.', url: 'https://survicate.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'workspace_key', label: 'Workspace Key', type: 'text', placeholder: '' }] },
      { id: 'hotjar', name: 'Hotjar', icon: Flame, configKey: 'hotjar_config', description: 'Encuestas de feedback + heatmaps en tu web.', url: 'https://www.hotjar.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'site_id', label: 'Site ID', type: 'text', placeholder: '' }] },
    ],
  },
  {
    id: 'ai', name: 'Inteligencia Artificial', icon: BrainCircuit,
    integrations: [
      { id: 'openai', name: 'OpenAI (GPT-4o)', icon: Sparkles, configKey: 'ai_config', configSubKey: 'openai', description: 'ChatGPT y GPT-4o para asistente de ventas.', url: 'https://platform.openai.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }, { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'o1', label: 'o1' }, { value: 'o1-mini', label: 'o1 Mini' }] }, { key: 'base_url', label: 'Base URL (opcional)', type: 'text', placeholder: 'https://api.openai.com/v1' }] },
      { id: 'anthropic', name: 'Anthropic (Claude)', icon: Sparkles, configKey: 'ai_config', configSubKey: 'anthropic', description: 'Claude para analisis y redaccion de propuestas.', url: 'https://console.anthropic.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' }, { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' }, { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }] }] },
      { id: 'google', name: 'Google Gemini', icon: Sparkles, configKey: 'ai_config', configSubKey: 'google', description: 'Gemini para analisis de datos y documentos.', url: 'https://aistudio.google.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }, { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }] }] },
      { id: 'mistral', name: 'Mistral AI', icon: Sparkles, configKey: 'ai_config', configSubKey: 'mistral', description: 'Modelos europeos de IA, cumplimiento GDPR.', url: 'https://console.mistral.ai',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'mistral-large-latest', label: 'Mistral Large' }, { value: 'mistral-medium-latest', label: 'Mistral Medium' }, { value: 'mistral-small-latest', label: 'Mistral Small' }] }] },
      { id: 'groq', name: 'Groq', icon: Zap, configKey: 'ai_config', configSubKey: 'groq', description: 'Inferencia ultra-rapida con modelos open-source.', url: 'https://console.groq.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'gsk_...' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' }, { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (rapido)' }, { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }] }] },
      { id: 'deepseek', name: 'DeepSeek', icon: Sparkles, configKey: 'ai_config', configSubKey: 'deepseek', description: 'IA avanzada con razonamiento (muy economico).', url: 'https://platform.deepseek.com',
        fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }, { key: 'model', label: 'Modelo', type: 'select', options: [{ value: 'deepseek-chat', label: 'DeepSeek Chat' }, { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }] }] },
      { id: 'ollama', name: 'Ollama (Local)', icon: Database, configKey: 'ai_config', configSubKey: 'ollama', description: 'Ejecuta modelos de IA en tu propio servidor.', url: 'https://ollama.ai',
        fields: [{ key: 'base_url', label: 'URL del servidor', type: 'text', placeholder: 'http://localhost:11434' }, { key: 'model', label: 'Modelo', type: 'text', placeholder: 'llama3' }] },
    ],
  },
]

// ─── Integration Styles (HSL colors) ────────────────────────────────

const INTEGRATION_STYLES = {
  telegram: 'hsl(210,70%,55%)', n8n: 'hsl(25,85%,55%)', apollo: T.success, webhooks: T.purple,
  linkedin: 'hsl(210,60%,50%)', clearbit: T.cyan, hunter: 'hsl(25,85%,55%)', lusha: T.success,
  zoominfo: 'hsl(210,70%,55%)', phantombuster: T.purple,
  gcalendar: 'hsl(210,70%,55%)', outlook: 'hsl(210,60%,50%)', calendly: T.cyan,
  zoom: 'hsl(210,70%,55%)', whatsapp: T.success, slack: T.purple,
  google_ads: 'hsl(210,70%,55%)', linkedin_ads: 'hsl(210,60%,50%)', ga4: 'hsl(25,85%,55%)',
  hubspot: 'hsl(25,75%,50%)', typeform: T.purple,
  pandadoc: T.success, docusign: 'hsl(210,70%,55%)', yousign: T.cyan,
  gdrive: 'hsl(210,70%,55%)', onedrive: 'hsl(210,60%,50%)', notion: T.fgMuted,
  einforma: T.warning, cnae: 'hsl(170,60%,45%)',
  stripe: T.purple, holded: 'hsl(210,70%,55%)', facturama: T.success,
  intercom: 'hsl(210,60%,50%)', freshdesk: T.success,
  typeform_survey: T.purple, google_forms: T.success, surveymonkey: T.warning,
  tally: T.cyan, jotform: 'hsl(25,85%,55%)', survicate: 'hsl(210,70%,55%)', hotjar: T.destructive,
  openai: T.success, anthropic: T.warning, google: 'hsl(210,70%,55%)',
  mistral: 'hsl(25,85%,55%)', groq: T.warning, deepseek: 'hsl(210,60%,50%)', ollama: T.fgMuted,
}

const MARKETING_EQUIVALENTS = {
  ga4: 'Google Analytics 4', slack: 'Slack (Marketing)', n8n: 'n8n Marketing Workflows',
  gdrive: 'Google Drive', notion: 'Notion',
}

function StatusBadge({ configured }) {
  const color = configured ? T.success : T.fgMuted
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: `${color}15` }}>
      {configured ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {configured ? 'Conectado' : 'Sin configurar'}
    </span>
  )
}

// ─── Main Page Component ────────────────────────────────────────────

export default function IntegrationsPage() {
  const T = useThemeColors()
  const location = typeof window !== 'undefined' ? window.location : {}
  const params = new URLSearchParams(location.search || '')
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'email')
  const queryClient = useQueryClient()
  const { hasRole } = useHasRole()
  const isAdmin = hasRole('admin')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
    retry: 1,
  })

  // Affiliate links
  const { data: affLinks } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: () => api.get('/affiliates?category=integration').then(r => r.data?.items || []).catch(() => []),
    staleTime: 300000,
  })
  const getAffLink = (provider) => (affLinks || []).find(l => l.provider?.toLowerCase() === provider?.toLowerCase())
  const trackAffClick = async (linkId) => { try { await api.post(`/affiliates/${linkId}/click`) } catch {} }

  const { data: envStatus } = useQuery({
    queryKey: ['env-status'],
    queryFn: () => settingsApi.envStatus().then(r => r.data),
    staleTime: 60000,
  })

  const updateSettings = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => { queryClient.invalidateQueries(['system-settings']); toast.success('Configuracion guardada') },
    onError: (err) => { toast.error(`Error: ${err.response?.data?.detail || err.message}`) },
  })

  const tabs = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'integrations', label: 'Integraciones', icon: Zap },
    { id: 'airtable', label: 'Airtable & MCP', icon: Database },
    { id: 'general', label: 'General', icon: Shield },
  ]

  if (isLoading) {
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight">Integraciones</h1>
          <p style={{ color: T.fgMuted }} className="text-sm mt-1">Configura proveedores de email, APIs y servicios externos</p>
        </div>
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5 mt-6 animate-pulse">
          <div style={{ backgroundColor: T.muted }} className="h-8 rounded w-1/3 mb-4" />
          <div style={{ backgroundColor: T.muted }} className="h-48 rounded opacity-50" />
        </div>
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div>
        <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Plug className="w-7 h-7" style={{ color: T.cyan }} />
          Integraciones
        </h1>
        <p style={{ color: T.fgMuted }} className="text-sm mt-1">Configura proveedores de email, APIs y servicios externos</p>
      </div>

      {/* Env vars status banner */}
      {envStatus && (
        <div className="rounded-xl p-4" style={{ backgroundColor: `${T.cyan}08`, border: `1px solid ${T.cyan}20` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: T.fg }}>
              Variables de entorno (Hetzner secrets): <span style={{ color: T.cyan }}>{envStatus.configured_count} configuradas</span>
            </p>
            {envStatus.llm_available ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.success}15`, color: T.success }}>
                ✓ LLM disponible
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.destructive}15`, color: T.destructive }}>
                ✗ Sin LLM
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {envStatus.configured?.map(k => (
              <span key={k} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.success}10`, color: T.success, border: `1px solid ${T.success}30` }}>
                ✓ {k}
              </span>
            ))}
            {envStatus.missing?.filter(k => ['OPENAI_API_KEY', 'MISTRAL_API_KEY', 'APOLLO_API_KEY', 'BREVO_API_KEY', 'TELEGRAM_BOT_TOKEN'].includes(k)).map(k => (
              <span key={k} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.fgMuted}10`, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                ○ {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${T.warning}10`, border: `1px solid ${T.warning}30` }}>
          <Lock className="w-5 h-5 flex-shrink-0" style={{ color: T.warning }} />
          <p style={{ color: T.warning }} className="text-sm">
            Modo solo lectura. Contacta con un administrador para modificar la configuracion.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: T.muted }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? `${T.cyan}20` : 'transparent',
              color: activeTab === tab.id ? T.cyan : T.fgMuted,
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'email' && (
        <EmailProviderTab settings={settings} onSave={(data) => updateSettings.mutate(data)} saving={updateSettings.isPending} isAdmin={isAdmin} />
      )}
      {activeTab === 'integrations' && (
        <IntegrationsTab settings={settings} onSave={(data) => updateSettings.mutate(data)} saving={updateSettings.isPending} isAdmin={isAdmin} getAffLink={getAffLink} trackAffClick={trackAffClick} />
      )}
      {activeTab === 'airtable' && (
        <AirtableMcpTab />
      )}
      {activeTab === 'general' && (
        <GeneralTab settings={settings} onSave={(data) => updateSettings.mutate(data)} saving={updateSettings.isPending} isAdmin={isAdmin} />
      )}
    </div>
  )
}

// ─── Email Provider Tab ─────────────────────────────────────────────

function EmailProviderTab({ settings, onSave, saving, isAdmin }) {
  const [selectedProvider, setSelectedProvider] = useState(settings?.email_provider || 'resend')
  const [emailFrom, setEmailFrom] = useState(settings?.email_from || 'hello@st4rtup.app')
  const [config, setConfig] = useState(settings?.email_config || {})
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [oauthStatus, setOauthStatus] = useState(null)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthConfig, setOauthConfig] = useState({
    client_id: settings?.gmail_oauth_config?.client_id || '',
    client_secret: settings?.gmail_oauth_config?.client_secret || '',
    redirect_uri: settings?.gmail_oauth_config?.redirect_uri || '',
  })
  const [savingOauth, setSavingOauth] = useState(false)

  const currentProvider = EMAIL_PROVIDERS.find(p => p.id === selectedProvider)

  const checkOAuthStatus = async () => {
    try { const res = await settingsApi.gmailOAuthStatus(); setOauthStatus(res.data) }
    catch { setOauthStatus(null) }
  }

  useEffect(() => {
    if (selectedProvider === 'gmail_oauth') checkOAuthStatus()
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth') === 'success') {
      // CSRF protection: verify state matches what we stored before the OAuth redirect
      const returnedState = params.get('state')
      const expectedState = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      if (!expectedState || returnedState !== expectedState) {
        toast.error('OAuth state inválido — posible ataque CSRF detectado')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }
      setSelectedProvider('gmail_oauth'); checkOAuthStatus()
      toast.success('Gmail OAuth2 conectado correctamente')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (selectedProvider === 'gmail_oauth') checkOAuthStatus()
  }, [selectedProvider])

  const handleFieldChange = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    onSave({ email_provider: selectedProvider, email_from: emailFrom, email_config: config })
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try { const res = await settingsApi.testEmail({ provider: selectedProvider, config }); setTestResult(res.data) }
    catch (err) { setTestResult({ success: false, error: err.response?.data?.detail || err.message }) }
    finally { setTesting(false) }
  }

  const handleSendTest = async () => {
    if (!testEmail) return toast.error('Introduce un email de destino')
    setSendingTest(true)
    try {
      const res = await settingsApi.sendTestEmail({ to_email: testEmail })
      if (res.data.success) toast.success('Email de prueba enviado')
      else toast.error(`Error: ${res.data.error}`)
    } catch (err) { toast.error(`Error: ${err.response?.data?.detail || err.message}`) }
    finally { setSendingTest(false) }
  }

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Proveedor de email — {EMAIL_PROVIDERS.length} disponibles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EMAIL_PROVIDERS.map((provider) => {
            const isSelected = selectedProvider === provider.id
            const ProvIcon = provider.icon
            const accent = provider.accent
            return (
              <button
                key={provider.id}
                onClick={() => isAdmin && setSelectedProvider(provider.id)}
                disabled={!isAdmin}
                className="text-left rounded-xl p-4 transition-all group"
                style={{
                  border: `1px solid ${isSelected ? T.cyan : T.border}`,
                  backgroundColor: T.muted,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = `${accent}40` }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = isSelected ? T.cyan : T.border }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? `${T.cyan}20` : `${accent}15` }}>
                    <ProvIcon className="w-5 h-5" style={{ color: isSelected ? T.cyan : accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="font-semibold text-sm">{provider.name}</h3>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.cyan}15`, color: T.cyan }}>
                          <Check size={10} /> Activo
                        </span>
                      )}
                    </div>
                    <p style={{ color: T.fgMuted }} className="text-xs mt-0.5 leading-relaxed">{provider.description}</p>
                    <p style={{ fontFamily: fontMono, color: isSelected ? T.cyan : T.fgMuted }} className="text-[10px] mt-1.5 font-medium">{provider.price}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Provider config */}
      {currentProvider && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentProvider.accent}15` }}>
                <currentProvider.icon className="w-4 h-4" style={{ color: currentProvider.accent }} />
              </div>
              <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold">
                Configurar {currentProvider.name}
              </h2>
            </div>
            {currentProvider.url && (
              <a href={currentProvider.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs" style={{ color: T.cyan }}>
                Documentacion <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="space-y-4">
            {currentProvider.oauth ? (
              <div className="space-y-4">
                {oauthStatus?.connected ? (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: `${T.success}10`, border: `1px solid ${T.success}30` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5" style={{ color: T.success }} />
                      <span style={{ color: T.success }} className="font-medium">Conectado</span>
                    </div>
                    <p className="text-sm" style={{ color: T.fg }}>
                      Cuenta: <span style={{ fontFamily: fontMono }}>{oauthStatus.email}</span>
                    </p>
                    <button
                      onClick={async () => {
                        setOauthLoading(true)
                        try { await settingsApi.gmailOAuthDisconnect(); setOauthStatus({ connected: false, email: '' }); toast.success('Gmail desconectado') }
                        catch { toast.error('Error desconectando') }
                        finally { setOauthLoading(false) }
                      }}
                      disabled={oauthLoading}
                      className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
                    >
                      {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                      <p style={{ color: T.fg }} className="text-sm mb-3 opacity-80">
                        Conecta tu cuenta de Gmail o Google Workspace para enviar emails sin necesidad de contrasena de aplicacion.
                      </p>
                      <p style={{ color: T.fgMuted }} className="text-xs mb-4">
                        Crea credenciales OAuth2 en <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: T.cyan }}>Google Cloud Console</a> con el scope <code style={{ color: T.cyan }}>gmail.send</code>.
                      </p>

                      <div className="space-y-3 mb-4">
                        <div>
                          <label htmlFor="integ-oauth-client-id" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Client ID</label>
                          <input id="integ-oauth-client-id" type="text" value={oauthConfig.client_id}
                            onChange={(e) => setOauthConfig(prev => ({ ...prev, client_id: e.target.value }))}
                            style={inputStyle} placeholder="123456789.apps.googleusercontent.com" disabled={!isAdmin} />
                        </div>
                        <div>
                          <label htmlFor="integ-oauth-client-secret" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Client Secret</label>
                          <input id="integ-oauth-client-secret" type="password" value={oauthConfig.client_secret}
                            onChange={(e) => setOauthConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                            style={inputStyle} placeholder="GOCSPX-..." disabled={!isAdmin} />
                        </div>
                        <div>
                          <label htmlFor="integ-oauth-redirect-uri" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Redirect URI</label>
                          <input id="integ-oauth-redirect-uri" type="text" value={oauthConfig.redirect_uri}
                            onChange={(e) => setOauthConfig(prev => ({ ...prev, redirect_uri: e.target.value }))}
                            style={inputStyle}
                            placeholder={`${window.location.origin.replace('app.st4rtup.app', 'api.st4rtup.com')}/api/v1/settings/oauth/google/callback`}
                            disabled={!isAdmin} />
                          <p style={{ color: T.fgMuted }} className="text-xs mt-1">URL del backend + /api/v1/settings/oauth/google/callback</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            if (!oauthConfig.client_id || !oauthConfig.client_secret) return toast.error('Introduce Client ID y Client Secret')
                            setSavingOauth(true)
                            try {
                              await settingsApi.update({ gmail_oauth_config: { client_id: oauthConfig.client_id, client_secret: oauthConfig.client_secret, redirect_uri: oauthConfig.redirect_uri } })
                              toast.success('Credenciales guardadas, redirigiendo a Google...')
                              const res = await settingsApi.gmailOAuthAuthorize()
                              window.location.href = res.data.authorize_url
                            } catch (err) { toast.error(err.response?.data?.detail || 'Error iniciando OAuth2') }
                            finally { setSavingOauth(false) }
                          }}
                          disabled={oauthLoading || savingOauth || !isAdmin}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                          style={{ backgroundColor: T.cyan, color: T.bg }}
                        >
                          {(oauthLoading || savingOauth) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                          Guardar y Conectar con Google
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="integ-oauth-email-from" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Email remitente</label>
                  <input id="integ-oauth-email-from" type="email" value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)} style={inputStyle}
                    placeholder={oauthStatus?.email || 'tu@gmail.com'} disabled={!isAdmin} />
                </div>
              </div>
            ) : (
            <>
            <div>
              <label htmlFor="integ-email-from" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Email remitente</label>
              <input id="integ-email-from" type="email" value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)} style={inputStyle}
                placeholder="hello@st4rtup.app" disabled={!isAdmin} />
              <p style={{ color: T.fgMuted }} className="text-xs mt-1">Debe estar verificado en tu proveedor de email</p>
            </div>

            {currentProvider.fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={`integ-provider-${field.key}`} style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select id={`integ-provider-${field.key}`} value={config[field.key] || field.options?.[0]?.value || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)} style={inputStyle} disabled={!isAdmin}>
                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label htmlFor={`integ-provider-${field.key}`}
                    className="flex items-center gap-2" style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }}>
                    <input id={`integ-provider-${field.key}`} type="checkbox" checked={config[field.key] !== false}
                      onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                      className="rounded" style={{ accentColor: T.cyan }} disabled={!isAdmin} />
                    <span style={{ color: T.fg }} className="text-sm">Activado</span>
                  </label>
                ) : (
                  <input id={`integ-provider-${field.key}`} type={field.type === 'password' ? 'password' : field.type}
                    value={config[field.key] || ''} onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    style={inputStyle} placeholder={field.placeholder} disabled={!isAdmin} />
                )}
              </div>
            ))}
            </>
            )}
          </div>

          {isAdmin && !currentProvider.oauth && (
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: T.cyan, color: T.bg }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
              </button>
              <button onClick={handleTest} disabled={testing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Verificar conexion
              </button>
            </div>
          )}
          {isAdmin && currentProvider.oauth && oauthStatus?.connected && (
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: T.cyan, color: T.bg }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Usar Gmail OAuth2 como proveedor
              </button>
            </div>
          )}

          {testResult && (
            <div className="mt-4 p-3 rounded-lg text-sm flex items-start gap-2"
              style={{
                backgroundColor: testResult.success ? `${T.success}10` : `${T.destructive}10`,
                color: testResult.success ? T.success : T.destructive,
                border: `1px solid ${testResult.success ? T.success : T.destructive}30`,
              }}>
              {testResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Send test email */}
      {isAdmin && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${T.success}15` }}>
              <Send className="w-4 h-4" style={{ color: T.success }} />
            </div>
            <div>
              <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold">
                Enviar email de prueba
              </h2>
              <p style={{ color: T.fgMuted }} className="text-xs">
                Guarda la configuracion primero, luego envia un email de prueba para verificar que funciona.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <input id="integ-test-email" type="email" value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)} placeholder="tu@email.com"
              style={{ ...inputStyle, flex: 1 }} aria-label="Email de prueba" />
            <button onClick={handleSendTest} disabled={sendingTest || !testEmail}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: T.cyan, color: T.bg }}>
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar prueba
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Integrations Tab ───────────────────────────────────────────────

function IntegrationCard({ integration, settings, onSave, saving, isAdmin, getAffLink = () => null, trackAffClick = () => {} }) {
  const [expanded, setExpanded] = useState(false)
  const subKey = integration.configSubKey
  const initialConfig = subKey
    ? (settings?.[integration.configKey]?.[subKey] || {})
    : (settings?.[integration.configKey] || {})
  const [config, setConfig] = useState(initialConfig)
  const [showSecrets, setShowSecrets] = useState({})
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const hasConfig = Object.values(initialConfig).some(v => v && v !== '')
  const integrationId = subKey || integration.configKey.replace('_config', '')
  const iconColor = INTEGRATION_STYLES[integration.id] || T.cyan
  const marketingRef = MARKETING_EQUIVALENTS[integration.id]

  const handleFieldChange = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

  const handleExpand = () => {
    if (!expanded) {
      const fresh = subKey
        ? (settings?.[integration.configKey]?.[subKey] || {})
        : (settings?.[integration.configKey] || {})
      setConfig(fresh)
    }
    setExpanded(!expanded)
  }

  const handleSave = () => {
    if (subKey) {
      const parentConfig = settings?.[integration.configKey] || {}
      onSave({ [integration.configKey]: { ...parentConfig, [subKey]: config } })
    } else {
      onSave({ [integration.configKey]: config })
    }
    setExpanded(false)
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try { const res = await settingsApi.testIntegration({ integration_id: integrationId, config }); setTestResult(res.data) }
    catch (err) { setTestResult({ success: false, error: err.response?.data?.detail || err.message }) }
    finally { setTesting(false) }
  }

  const Icon = integration.icon

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        backgroundColor: T.muted,
        border: `1px solid ${expanded ? T.cyan : hasConfig ? `${T.success}40` : T.border}`,
      }}
    >
      <button onClick={handleExpand} className="w-full text-left p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 style={{ color: T.fg }} className="text-sm font-medium">{integration.name}</h4>
            <StatusBadge configured={hasConfig} />
            {marketingRef && (
              <Link to="/app/marketing/integrations"
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors"
                style={{ color: T.purple, backgroundColor: `${T.purple}15` }}
                onClick={e => e.stopPropagation()}>
                Tambien en Marketing
              </Link>
            )}
          </div>
          <p style={{ color: T.fgMuted }} className="text-xs mt-0.5 truncate">{integration.description}</p>
        </div>
        {(() => {
          const aff = getAffLink(integration.id)
          if (aff) return (
            <a href={aff.affiliate_url} target="_blank" rel="noopener noreferrer"
              onClick={e => { e.stopPropagation(); trackAffClick(aff.id) }}
              className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{ backgroundColor: `${T.cyan}10`, color: T.cyan, textDecoration: 'none' }}>
              Registrarse ↗
            </a>
          )
          if (integration.url) return (
            <a href={integration.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-shrink-0 transition-colors" style={{ color: T.fgMuted }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )
          return null
        })()}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          {integration.fields.map(field => (
            <div key={field.key}>
              <label style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">{field.label}</label>
              {field.type === 'select' ? (
                <select id="integrations-select-1" aria-label="Selector" value={config[field.key] || field.options?.[0]?.value || ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  style={{ ...inputStyle, fontSize: '0.75rem', padding: '0.5rem 0.75rem' }} disabled={!isAdmin}>
                  {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2" style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }}>
                  <input type="checkbox" checked={config[field.key] !== false}
                    onChange={e => handleFieldChange(field.key, e.target.checked)}
                    style={{ accentColor: T.cyan }} disabled={!isAdmin} />
                  <span style={{ color: T.fg }} className="text-sm">Activado</span>
                </label>
              ) : (
                <div className="relative">
                  <input
                    type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                    value={config[field.key] || ''} onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ ...inputStyle, fontSize: '0.75rem', padding: '0.5rem 0.75rem', paddingRight: field.type === 'password' ? '2rem' : undefined }}
                    disabled={!isAdmin} />
                  {field.type === 'password' && (
                    <button type="button"
                      onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }}>
                      {showSecrets[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* OAuth connect button */}
          {isAdmin && integration.oauthProvider && (
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${T.purple}10`, border: `1px solid ${T.purple}30` }}>
              <button
                onClick={async () => {
                  try {
                    const res = await settingsApi.oauthAuthorize(integration.oauthProvider)
                    if (res.data?.authorize_url) window.location.href = res.data.authorize_url
                    else toast.error('No se pudo generar URL de autorizacion')
                  } catch (err) { toast.error(err.response?.data?.detail || 'Error OAuth') }
                }}
                className="text-xs py-1.5 px-4 flex items-center gap-1.5 rounded-lg font-semibold"
                style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: T.bg }}>
                <Lock className="w-3.5 h-3.5" /> Conectar via Google OAuth2
              </button>
              <span className="text-[10px]" style={{ color: T.fgMuted }}>No requiere Service Account</span>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setExpanded(false)}
                className="text-xs py-1.5 px-3 rounded-lg"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                Cancelar
              </button>
              {integration.fields.length > 0 && (
                <button onClick={handleSave} disabled={saving}
                  className="text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg font-semibold"
                  style={{ backgroundColor: T.cyan, color: T.bg }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                </button>
              )}
              <button onClick={handleTest} disabled={testing}
                className="text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Probar
              </button>
            </div>
          )}

          {testResult && (
            <div className="p-2 rounded text-xs flex items-start gap-1.5"
              style={{
                backgroundColor: testResult.success ? `${T.success}10` : `${T.destructive}10`,
                color: testResult.success ? T.success : T.destructive,
                border: `1px solid ${testResult.success ? T.success : T.destructive}30`,
              }}>
              {testResult.success ? <Check className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <X className="w-3 h-3 mt-0.5 flex-shrink-0" />}
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IntegrationsTab({ settings, onSave, saving, isAdmin, getAffLink, trackAffClick }) {
  const [search, setSearch] = useState('')

  const allIntegrations = INTEGRATION_CATEGORIES.flatMap(c => c.integrations)
  const configuredCount = allIntegrations.filter(i => {
    const subKey = i.configSubKey
    const cfg = subKey ? (settings?.[i.configKey]?.[subKey] || {}) : (settings?.[i.configKey] || {})
    return Object.values(cfg).some(v => v && v !== '')
  }).length

  const filteredCategories = INTEGRATION_CATEGORIES.map(cat => ({
    ...cat,
    integrations: cat.integrations.filter(i =>
      !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(c => c.integrations.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar integracion..."
            style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
            <p style={{ fontFamily: fontMono, color: T.cyan }} className="text-lg font-bold">{configuredCount}</p>
            <p style={{ color: T.fgMuted }} className="text-[10px] uppercase">Conectadas</p>
          </div>
          <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
            <p style={{ fontFamily: fontMono, color: T.fgMuted }} className="text-lg font-bold">{allIntegrations.length - configuredCount}</p>
            <p style={{ color: T.fgMuted }} className="text-[10px] uppercase">Pendientes</p>
          </div>
          <Link to="/app/marketing/integrations"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: `${T.purple}10`, border: `1px solid ${T.purple}30`, color: T.purple }}>
            <Megaphone className="w-4 h-4" /> Marketing
          </Link>
        </div>
      </div>

      {filteredCategories.map(category => {
        const CatIcon = category.icon
        return (
          <div key={category.id}>
            <div className="mb-3">
              <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold flex items-center gap-2">
                <CatIcon className="w-4 h-4" style={{ color: T.cyan }} />
                {category.name}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {category.integrations.map(integration => (
                <IntegrationCard
                  key={integration.id + (integration.configSubKey || integration.configKey)}
                  integration={integration} settings={settings}
                  onSave={onSave} saving={saving} isAdmin={isAdmin}
                  getAffLink={getAffLink} trackAffClick={trackAffClick} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── General Tab ────────────────────────────────────────────────────

function GeneralTab({ settings, onSave, saving, isAdmin }) {
  const [config, setConfig] = useState(settings?.general_config || {
    company_name: 'St4rtup', timezone: 'Europe/Madrid', language: 'es',
  })

  const handleSave = () => onSave({ general_config: config })

  return (
    <div className="space-y-6">
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
        <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: T.cyan }} />
          Configuracion General
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="integ-company-name" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Nombre de empresa</label>
            <input id="integ-company-name" type="text" value={config.company_name || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
              style={inputStyle} disabled={!isAdmin} />
          </div>
          <div>
            <label htmlFor="integ-timezone" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Zona horaria</label>
            <select id="integ-timezone" value={config.timezone || 'Europe/Madrid'}
              onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
              style={inputStyle} disabled={!isAdmin}>
              <option value="Europe/Madrid">Europe/Madrid (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label htmlFor="integ-language" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Idioma</label>
            <select id="integ-language" value={config.language || 'es'}
              onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
              style={inputStyle} disabled={!isAdmin}>
              <option value="es">Espanol</option>
              <option value="en">English</option>
              <option value="fr">Francais</option>
            </select>
          </div>
          <div>
            <label htmlFor="integ-currency" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Moneda por defecto</label>
            <select id="integ-currency" value={config.currency || 'EUR'}
              onChange={(e) => setConfig(prev => ({ ...prev, currency: e.target.value }))}
              style={inputStyle} disabled={!isAdmin}>
              <option value="EUR">EUR</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: T.cyan, color: T.bg }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
            </button>
          </div>
        )}
      </div>

      {/* API Info */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
        <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" style={{ color: T.cyan }} />
          Informacion de API
        </h2>
        <div className="space-y-3">
          <div>
            <label style={{ color: T.fgMuted }} className="block text-xs font-medium uppercase mb-1">API Base URL</label>
            <div className="flex items-center gap-2">
              <code style={{ fontFamily: fontMono, backgroundColor: T.muted, color: T.fg }}
                className="flex-1 px-3 py-2 rounded-lg text-sm">
                {window.location.origin.includes('localhost')
                  ? 'http://localhost:8001/api/v1'
                  : 'https://api.st4rtup.com/api/v1'}
              </code>
            </div>
          </div>
          <div>
            <label style={{ color: T.fgMuted }} className="block text-xs font-medium uppercase mb-1">Documentacion API</label>
            <div className="flex gap-2">
              <a href={`${window.location.origin.includes('localhost') ? 'http://localhost:8001' : 'https://api.st4rtup.com'}/docs`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm" style={{ color: T.cyan }}>
                Swagger UI <ExternalLink className="w-3 h-3" />
              </a>
              <span style={{ color: T.fgMuted }}>|</span>
              <a href={`${window.location.origin.includes('localhost') ? 'http://localhost:8001' : 'https://api.st4rtup.com'}/redoc`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm" style={{ color: T.cyan }}>
                ReDoc <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="rounded-xl p-5" style={{ backgroundColor: `${T.warning}08`, border: `1px solid ${T.warning}30` }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.warning }} />
          <div>
            <h3 style={{ color: T.warning }} className="text-sm font-semibold">Variables de entorno</h3>
            <p style={{ color: T.fgMuted }} className="text-sm mt-1">
              Las API keys configuradas aqui se almacenan cifradas en la base de datos.
              Alternativamente, puedes configurarlas como variables de entorno en Hetzner
              (tienen prioridad sobre la configuracion de la UI).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Airtable & MCP Tab ─────────────────────────────────────────────

function AirtableMcpTab() {
  const [syncing, setSyncing] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [mcpData, setMcpData] = useState(null)
  const [loadingMcp, setLoadingMcp] = useState(false)

  const { data: airtableStatus } = useQuery({
    queryKey: ['airtable-status'],
    queryFn: () => airtableApi.status().then(r => r.data),
  })

  const { data: mcpTools } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: () => mcpApi.tools().then(r => r.data),
  })

  async function handleSync(type) {
    setSyncing(type)
    setLastResult(null)
    try {
      let res
      if (type === 'leads') res = await airtableApi.syncLeads()
      else if (type === 'pipeline') res = await airtableApi.syncPipeline()
      else if (type === 'kpis') res = await airtableApi.syncKpis()
      setLastResult({ type, ...res.data })
      toast.success(`Sync ${type} completado`)
    } catch (e) {
      toast.error(e.response?.data?.detail || `Error sync ${type}`)
      setLastResult({ type, error: e.response?.data?.detail || 'Error' })
    }
    setSyncing(null)
  }

  async function handleMcpQuery(tool) {
    setLoadingMcp(true)
    setMcpData(null)
    try {
      let res
      if (tool === 'kpis') res = await mcpApi.kpis()
      else if (tool === 'pipeline') res = await mcpApi.pipeline()
      else if (tool === 'actions') res = await mcpApi.actionsPending()
      else if (tool === 'activity') res = await mcpApi.activity()
      setMcpData({ tool, data: res.data })
    } catch (e) {
      toast.error('Error consultando MCP')
    }
    setLoadingMcp(false)
  }

  const configured = airtableStatus?.configured

  return (
    <div className="space-y-6">
      {/* Airtable Section */}
      <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FCB400, #18BFFF)' }}>
              <Database className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: T.fg }}>Airtable</h3>
              <p className="text-xs" style={{ color: T.fgMuted }}>Sincroniza leads, pipeline y KPIs con Airtable</p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
            color: configured ? T.success : T.warning,
            backgroundColor: configured ? `${T.success}15` : `${T.warning}15`,
          }}>
            {configured ? 'Conectado' : 'Sin Base ID'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { type: 'leads', label: 'Sync Leads', desc: 'Empresa, contacto, score, estado', icon: '👥' },
            { type: 'pipeline', label: 'Sync Pipeline', desc: 'Oportunidades, etapa, valor', icon: '📊' },
            { type: 'kpis', label: 'Snapshot KPIs', desc: 'Leads, pipeline, revenue hoy', icon: '📈' },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => handleSync(item.type)}
              disabled={!configured || syncing}
              className="text-left p-3 rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{item.icon}</span>
                <span className="text-sm font-medium" style={{ color: T.fg }}>{item.label}</span>
                {syncing === item.type && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: T.cyan }} />}
              </div>
              <p className="text-[11px]" style={{ color: T.fgMuted }}>{item.desc}</p>
            </button>
          ))}
        </div>

        {lastResult && (
          <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: T.muted, fontFamily: fontMono, color: lastResult.error ? T.destructive : T.success }}>
            {lastResult.error
              ? `Error: ${lastResult.error}`
              : `${lastResult.type}: ${lastResult.created || 0} creados, ${lastResult.updated || 0} actualizados, ${lastResult.errors || 0} errores`
            }
          </div>
        )}
      </div>

      {/* MCP Gateway Section */}
      <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5820B, #1E6FD9)' }}>
            <BrainCircuit className="w-5 h-5 text-gray-800" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: T.fg }}>MCP Gateway</h3>
            <p className="text-xs" style={{ color: T.fgMuted }}>Herramientas del CRM para agentes IA — consulta KPIs, leads, pipeline en lenguaje natural</p>
          </div>
        </div>

        {/* Available Tools */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            { tool: 'kpis', label: 'KPIs', icon: BarChart3 },
            { tool: 'pipeline', label: 'Pipeline', icon: Zap },
            { tool: 'actions', label: 'Acciones', icon: ListChecks },
            { tool: 'activity', label: 'Actividad', icon: Flame },
          ].map(item => (
            <button
              key={item.tool}
              onClick={() => handleMcpQuery(item.tool)}
              disabled={loadingMcp}
              className="p-2.5 rounded-lg text-left transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}
            >
              <item.icon className="w-4 h-4 mb-1" style={{ color: T.cyan }} />
              <span className="text-xs font-medium block" style={{ color: T.fg }}>{item.label}</span>
            </button>
          ))}
        </div>

        {loadingMcp && (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.cyan }} />
            <span className="text-xs" style={{ color: T.fgMuted }}>Consultando MCP Gateway...</span>
          </div>
        )}

        {mcpData && (
          <div className="p-3 rounded-lg overflow-auto max-h-64" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: T.fgMuted }}>
              /mcp/{mcpData.tool}
            </p>
            <pre className="text-xs whitespace-pre-wrap" style={{ fontFamily: fontMono, color: T.fg }}>
              {JSON.stringify(mcpData.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Tools list */}
        {mcpTools?.tools && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: T.fgMuted }}>Herramientas disponibles</p>
            <div className="space-y-1">
              {mcpTools.tools.map(tool => (
                <div key={tool.name} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs" style={{ backgroundColor: T.muted }}>
                  <span className="font-medium" style={{ fontFamily: fontMono, color: T.cyan }}>{tool.name}</span>
                  <span style={{ color: T.fgMuted }}>{tool.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
