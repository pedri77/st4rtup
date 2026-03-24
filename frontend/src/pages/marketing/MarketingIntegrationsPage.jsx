import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Plug, Check, X, Loader2, ExternalLink, AlertTriangle, ArrowLeft,
  Cloud, FileText, MessageSquare, BarChart3, Search as SearchIcon,
  Globe, Video, LinkedinIcon, Megaphone, Database, Zap, Shield,
  Eye, EyeOff, Save, TestTube
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { settingsApi } from '@/services/api'
import { useHasRole } from '@/components/RoleGuard'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// ─── Marketing Integration Definitions ─────────────────────────────

const INTEGRATION_GROUPS = [
  {
    name: 'Google Suite',
    description: 'Servicios de Google para marketing y documentos.',
    integrations: [
      {
        id: 'google_drive',
        name: 'Google Drive',
        icon: Cloud,
        color: 'hsl(210,80%,55%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'google_drive_config',
        description: 'Gestor documental con carpetas por categoría (Templates, Campaigns, Content, Battlecards, Legal).',
        fields: [
          { key: 'service_account_json', label: 'Service Account JSON', type: 'password', placeholder: '{"type":"service_account",...}' },
          { key: 'folder_id_marketing', label: 'Folder ID (Marketing raíz)', type: 'text', placeholder: 'ID de la carpeta raíz' },
          { key: 'folder_templates', label: 'Folder ID (Templates)', type: 'text', placeholder: '' },
          { key: 'folder_campaigns', label: 'Folder ID (Campaigns)', type: 'text', placeholder: '' },
          { key: 'folder_content', label: 'Folder ID (Content)', type: 'text', placeholder: '' },
          { key: 'folder_battlecards', label: 'Folder ID (Battlecards)', type: 'text', placeholder: '' },
          { key: 'folder_legal', label: 'Folder ID (Legal)', type: 'text', placeholder: '' },
        ],
        envVars: ['GOOGLE_SERVICE_ACCOUNT_KEY_JSON', 'GOOGLE_DRIVE_FOLDER_TEMPLATES'],
      },
      {
        id: 'google_search_console',
        name: 'Search Console',
        icon: SearchIcon,
        color: T.success,
        bgColor: 'rgba(34,197,94,0.1)',
        configKey: 'gsc_config',
        oauthProvider: 'gsc',
        description: 'Rankings orgánicos, keywords y rendimiento SEO por país.',
        fields: [
          { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: '' },
          { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: '' },
          { key: 'site_url', label: 'Site URL', type: 'text', placeholder: 'https://st4rtup.app' },
        ],
        envVars: ['GSC_CLIENT_ID', 'GSC_CLIENT_SECRET'],
      },
      {
        id: 'google_analytics',
        name: 'Google Analytics 4',
        icon: BarChart3,
        color: T.warning,
        bgColor: 'rgba(249,115,22,0.1)',
        configKey: 'ga4_config',
        oauthProvider: 'ga4',
        description: 'Tráfico web, conversiones, audiencias y atribución de canales.',
        fields: [
          { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
          { key: 'property_id', label: 'Property ID', type: 'text', placeholder: '' },
          { key: 'service_account_json', label: 'Service Account JSON', type: 'password', placeholder: '{"type":"service_account",...}' },
        ],
        envVars: ['GA4_MEASUREMENT_ID', 'GA4_PROPERTY_ID'],
      },
      {
        id: 'google_business',
        name: 'Google Business Profile',
        icon: Globe,
        color: T.cyan,
        bgColor: 'rgba(0,188,212,0.1)',
        configKey: 'gbp_config',
        description: 'Perfil de empresa, reseñas, NAP consistency y geo-SEO local.',
        fields: [
          { key: 'account_id', label: 'Account ID', type: 'text', placeholder: '' },
          { key: 'location_id', label: 'Location ID', type: 'text', placeholder: '' },
        ],
        envVars: ['GBP_ACCOUNT_ID'],
      },
    ],
  },
  {
    name: 'Redes Sociales',
    description: 'Plataformas de contenido y publicidad social.',
    integrations: [
      {
        id: 'linkedin',
        name: 'LinkedIn Marketing',
        icon: LinkedinIcon,
        color: 'hsl(210,70%,65%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'linkedin_config',
        oauthProvider: 'linkedin',
        description: 'Campañas LinkedIn Ads, audiencias, métricas de engagement y Company Page analytics.',
        fields: [
          { key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' },
          { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
          { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: '' },
        ],
        envVars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
      },
      {
        id: 'youtube',
        name: 'YouTube',
        icon: Video,
        color: T.destructive,
        bgColor: 'rgba(239,68,68,0.1)',
        configKey: 'youtube_config',
        oauthProvider: 'youtube',
        description: 'Métricas de vídeos: views, watch time, suscriptores y engagement rate. Usa Google OAuth (mismo que Drive).',
        fields: [
          { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'UCe_cKWVMFtl1xKrdzwMYqbQ' },
        ],
        envVars: ['YOUTUBE_CHANNEL_ID'],
        alwaysConfigured: true,
      },
      {
        id: 'metricool',
        name: 'Metricool',
        icon: BarChart3,
        color: 'hsl(30,80%,55%)',
        bgColor: 'rgba(249,115,22,0.1)',
        configKey: 'metricool_config',
        description: 'Social scheduling LinkedIn + YouTube, analytics de engagement y mejor hora de publicación.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['METRICOOL_API_KEY'],
      },
    ],
  },
  {
    name: 'SEO & Datos',
    description: 'Herramientas de SEO, rankings y datos de mercado.',
    integrations: [
      {
        id: 'semrush',
        name: 'Semrush',
        icon: SearchIcon,
        color: 'hsl(30,80%,55%)',
        bgColor: 'rgba(249,115,22,0.1)',
        configKey: 'semrush_config',
        description: 'Keywords, backlinks, keyword gap, domain analytics y position tracking.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['SEMRUSH_API_KEY'],
      },
      {
        id: 'dataforseo',
        name: 'DataForSEO',
        icon: Database,
        color: 'hsl(160,60%,50%)',
        bgColor: 'rgba(16,185,129,0.1)',
        configKey: 'dataforseo_config',
        description: 'Rankings geo-localizados, SERP tracking por ciudad/país y Google Maps rankings.',
        fields: [
          { key: 'login', label: 'Login (email)', type: 'text', placeholder: '' },
          { key: 'password', label: 'Password', type: 'password', placeholder: '' },
        ],
        envVars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
      },
      {
        id: 'serper',
        name: 'Serper.dev',
        icon: SearchIcon,
        color: 'hsl(270,60%,60%)',
        bgColor: 'rgba(139,92,246,0.1)',
        configKey: 'serper_config',
        description: 'Búsquedas Google en tiempo real con filtros gl/hl para geo-SEO.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['SERPER_API_KEY'],
      },
      {
        id: 'apollo',
        name: 'Apollo.io',
        icon: Database,
        color: 'hsl(210,80%,55%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'apollo_config',
        description: 'Enriquecimiento de leads, búsqueda de prospectos por ICP, verificación de emails.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['APOLLO_API_KEY'],
      },
      {
        id: 'clarity',
        name: 'Microsoft Clarity',
        icon: Eye,
        color: 'hsl(190,60%,60%)',
        bgColor: 'rgba(0,188,212,0.1)',
        configKey: 'clarity_config',
        description: 'Heatmaps, session recordings, rage clicks — enriquece lead score con comportamiento web.',
        fields: [
          { key: 'project_id', label: 'Project ID', type: 'text', placeholder: '' },
          { key: 'api_key', label: 'API Key (opcional)', type: 'password', placeholder: '' },
        ],
        envVars: ['CLARITY_PROJECT_ID'],
      },
    ],
  },
  {
    name: 'Comunicación & Notificaciones',
    description: 'Canales de comunicación del equipo de marketing.',
    integrations: [
      {
        id: 'slack_marketing',
        name: 'Slack (Marketing)',
        icon: MessageSquare,
        color: T.purple,
        bgColor: 'rgba(139,92,246,0.1)',
        configKey: 'slack_marketing_config',
        description: 'Alertas de marketing al canal de Slack: CPL, budget, conversiones y SEO.',
        fields: [
          { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/...' },
          { key: 'channel', label: 'Canal', type: 'text', placeholder: '#marketing-alerts' },
        ],
        envVars: ['SLACK_MARKETING_WEBHOOK_URL'],
      },
      {
        id: 'notion',
        name: 'Notion',
        icon: FileText,
        color: T.fg,
        bgColor: 'rgba(107,114,128,0.1)',
        configKey: 'notion_config',
        description: 'Calendario editorial, OKRs de marketing y sincronización de artículos SEO.',
        fields: [
          { key: 'integration_token', label: 'Integration Token', type: 'password', placeholder: 'secret_...' },
          { key: 'database_id', label: 'Database ID (Calendar)', type: 'text', placeholder: '' },
        ],
        envVars: ['NOTION_INTEGRATION_TOKEN'],
      },
    ],
  },
  {
    name: 'IA & LLM Visibility',
    description: 'Monitorización de visibilidad en modelos de lenguaje.',
    integrations: [
      {
        id: 'openai_geo',
        name: 'OpenAI (LLM Visibility)',
        icon: Zap,
        color: 'hsl(140,60%,60%)',
        bgColor: 'rgba(34,197,94,0.1)',
        configKey: 'openai_geo_config',
        description: 'Monitoriza menciones de St4rtup en respuestas de ChatGPT/GPT-4.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
        ],
        envVars: ['OPENAI_API_KEY_GEO'],
      },
      {
        id: 'perplexity',
        name: 'Perplexity AI',
        icon: SearchIcon,
        color: 'hsl(170,60%,50%)',
        bgColor: 'rgba(20,184,166,0.1)',
        configKey: 'perplexity_config',
        description: 'Visibilidad en búsquedas Perplexity para queries growth/tecnología.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'pplx-...' },
        ],
        envVars: ['PERPLEXITY_API_KEY'],
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        icon: Zap,
        color: 'hsl(210,70%,65%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'gemini_config',
        description: 'Visibilidad en Google AI Overview y Gemini para normativas europeas.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['GEMINI_API_KEY'],
      },
    ],
  },
  {
    name: 'Outreach & Nurturing',
    description: 'Cold email, nurturing de leads fríos y agenda automática.',
    integrations: [
      {
        id: 'brevo',
        name: 'Brevo',
        icon: Megaphone,
        color: 'hsl(210,70%,65%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'brevo_config',
        description: 'Nurturing de leads fríos con emails mensuales ENS/NIS2. Re-activation automática si 2+ opens en 7 días.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
          { key: 'nurturing_list_id', label: 'Nurturing List ID', type: 'text', placeholder: '' },
        ],
        envVars: ['BREVO_API_KEY'],
      },
      {
        id: 'cal_com',
        name: 'Cal.com',
        icon: Globe,
        color: 'hsl(270,50%,65%)',
        bgColor: 'rgba(139,92,246,0.1)',
        configKey: 'cal_com_config',
        description: 'Agenda automática post-llamada. Integración con pipeline de ventas.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'cal_live_...' },
          { key: 'event_type_id', label: 'Event Type ID (Demo)', type: 'text', placeholder: '' },
        ],
        envVars: ['CAL_COM_API_KEY'],
      },
      {
        id: 'microsoft_graph',
        name: 'Microsoft Graph (Deal Room)',
        icon: FileText,
        color: 'hsl(210,80%,55%)',
        bgColor: 'rgba(59,130,246,0.1)',
        configKey: 'microsoft_graph_config',
        description: 'Deal Room en SharePoint/OneDrive — carpetas compartidas con propuestas, contratos y documentación por oportunidad.',
        fields: [
          { key: 'client_id', label: 'App Client ID', type: 'text', placeholder: '' },
          { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
          { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: '' },
          { key: 'site_id', label: 'SharePoint Site ID', type: 'text', placeholder: '' },
          { key: 'drive_id', label: 'Drive ID', type: 'text', placeholder: '' },
        ],
        envVars: ['MS_GRAPH_CLIENT_ID', 'MS_GRAPH_CLIENT_SECRET', 'MS_GRAPH_TENANT_ID'],
      },
    ],
  },
  {
    name: 'Automatización',
    description: 'Workflows y automatizaciones de marketing.',
    integrations: [
      {
        id: 'n8n_marketing',
        name: 'n8n (Marketing Workflows)',
        icon: Zap,
        color: 'hsl(30,80%,55%)',
        bgColor: 'rgba(249,115,22,0.1)',
        configKey: 'n8n_marketing_config',
        description: 'Workflows de geo-SEO rankings, NAP audit, LLM visibility queries y alertas.',
        fields: [
          { key: 'base_url', label: 'n8n Base URL', type: 'text', placeholder: 'https://n8n.example.com' },
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['N8N_MARKETING_URL', 'N8N_MARKETING_API_KEY'],
      },
      {
        id: 'lemlist',
        name: 'Lemlist',
        icon: Megaphone,
        color: T.purple,
        bgColor: 'rgba(139,92,246,0.1)',
        configKey: 'lemlist_config',
        description: 'Cold email outreach, secuencias multi-canal, A/B testing y warm-up automático.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
        ],
        envVars: ['LEMLIST_API_KEY'],
      },
    ],
  },
  {
    name: 'Partners & Canal',
    description: 'Programa de partners MSSP y canal de distribución.',
    integrations: [
      {
        id: 'firstpromoter',
        name: 'FirstPromoter',
        icon: Zap,
        color: 'hsl(140,60%,60%)',
        bgColor: 'rgba(34,197,94,0.1)',
        configKey: 'firstpromoter_config',
        description: 'Canal MSSP — Telefónica Tech, T-Systems, Indra. Comisiones automáticas para partners.',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
          { key: 'campaign_id', label: 'Campaign ID', type: 'text', placeholder: '' },
        ],
        envVars: ['FIRSTPROMOTER_API_KEY'],
      },
    ],
  },
]

// ─── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ configured }) {
  return configured ? (
    <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'rgba(34,197,94,0.1)', color: T.success, padding: '2px 8px', borderRadius: 99 }}>
      <Check className="w-3 h-3" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 500, backgroundColor: T.muted, color: T.fgMuted, padding: '2px 8px', borderRadius: 99 }}>
      <X className="w-3 h-3" /> Sin configurar
    </span>
  )
}

// ─── Integration Card ───────────────────────────────────────────────

function IntegrationCard({ integration, settings, isAdmin, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState({})
  const [showSecrets, setShowSecrets] = useState({})
  const [oauthStatus, setOauthStatus] = useState(null)
  const [oauthLoading, setOauthLoading] = useState(false)

  const hasConfig = integration.alwaysConfigured || integration.fields.some(f => {
    const key = `${integration.configKey}_${f.key}`
    return settings?.[key] && settings[key] !== ''
  })

  const handleExpand = async () => {
    if (!expanded) {
      const initial = {}
      integration.fields.forEach(f => {
        const key = `${integration.configKey}_${f.key}`
        initial[f.key] = settings?.[key] || ''
      })
      setValues(initial)
      if (integration.oauthProvider) {
        try {
          const res = await settingsApi.oauthStatus(integration.oauthProvider)
          setOauthStatus(res.data)
        } catch {
          setOauthStatus(null)
        }
      }
    }
    setExpanded(!expanded)
  }

  const handleOAuthConnect = async () => {
    if (!integration.oauthProvider) return
    setOauthLoading(true)
    try {
      const oauthFields = {}
      integration.fields.forEach(f => {
        if (values[f.key]) {
          oauthFields[`${integration.configKey}_${f.key}`] = values[f.key]
        }
      })
      if (Object.keys(oauthFields).length > 0) {
        await settingsApi.update(oauthFields)
      }
      const res = await settingsApi.oauthAuthorize(integration.oauthProvider)
      if (res.data?.auth_url) {
        window.open(res.data.auth_url, '_blank', 'width=600,height=700')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error iniciando OAuth')
    } finally {
      setOauthLoading(false)
    }
  }

  const handleOAuthDisconnect = async () => {
    if (!integration.oauthProvider) return
    setOauthLoading(true)
    try {
      await settingsApi.oauthDisconnect(integration.oauthProvider)
      setOauthStatus(null)
      toast.success('Desconectado correctamente')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al desconectar')
    } finally {
      setOauthLoading(false)
    }
  }

  const handleSave = () => {
    const data = {}
    integration.fields.forEach(f => {
      data[`${integration.configKey}_${f.key}`] = values[f.key] || ''
    })
    onSave(data)
    setExpanded(false)
  }

  const Icon = integration.icon

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 12, outline: 'none', paddingRight: 32,
  }

  return (
    <div style={{
      backgroundColor: T.card, borderRadius: 12, transition: 'all .2s',
      border: `1px solid ${expanded ? T.cyan + '50' : hasConfig ? T.success + '30' : T.border}`,
    }}>
      <button
        onClick={handleExpand}
        className="w-full text-left p-4 flex items-center gap-4"
        style={{ border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: integration.bgColor }}>
          <Icon className="w-5 h-5" style={{ color: integration.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 style={{ fontSize: 14, fontWeight: 500, color: T.fg }}>{integration.name}</h4>
            <StatusBadge configured={hasConfig} />
          </div>
          <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{integration.description}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: `1px solid ${T.border}50` }}>
          {integration.fields.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.fgMuted, marginBottom: 4 }}>{field.label}</label>
              <div className="relative">
                <input
                  type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                  value={values[field.key] || ''}
                  onChange={(e) => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={inputStyle}
                  disabled={!isAdmin}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                  >
                    {showSecrets[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {integration.oauthProvider && isAdmin && (
            <div style={{ backgroundColor: T.bg, borderRadius: 8, padding: 12 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: T.cyan }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.fg }}>OAuth 2.0</span>
                </div>
                {oauthStatus?.connected ? (
                  <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'rgba(34,197,94,0.1)', color: T.success, padding: '2px 8px', borderRadius: 99 }}>
                    <Check className="w-3 h-3" /> {oauthStatus.email || 'Conectado'}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: T.fgMuted }}>No conectado</span>
                )}
              </div>
              {oauthStatus?.connected ? (
                <button
                  onClick={handleOAuthDisconnect}
                  disabled={oauthLoading}
                  className="w-full flex items-center justify-center gap-1.5"
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}`, backgroundColor: T.muted, color: T.destructive, cursor: 'pointer', opacity: oauthLoading ? 0.5 : 1 }}
                >
                  {oauthLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Desconectar
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p style={{ fontSize: 10, color: T.fgMuted }}>
                    Configura Client ID y Client Secret arriba, luego conecta via OAuth.
                  </p>
                  <button
                    onClick={handleOAuthConnect}
                    disabled={oauthLoading}
                    className="w-full flex items-center justify-center gap-1.5"
                    style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none', backgroundColor: T.cyan, color: '#fff', cursor: 'pointer', opacity: oauthLoading ? 0.5 : 1 }}
                  >
                    {oauthLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Conectar con OAuth
                  </button>
                </div>
              )}
            </div>
          )}

          {integration.envVars && (
            <div style={{ backgroundColor: T.bg, borderRadius: 8, padding: 10 }}>
              <p style={{ fontSize: 10, color: T.fgMuted, fontWeight: 500, marginBottom: 4, fontFamily: fontMono }}>Variables de entorno (Fly.io):</p>
              <div className="flex flex-wrap gap-1">
                {integration.envVars.map(v => (
                  <code key={v} style={{ fontSize: 10, backgroundColor: T.muted, color: T.cyan, padding: '2px 6px', borderRadius: 4, fontFamily: fontMono }}>{v}</code>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setExpanded(false)}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}`, backgroundColor: T.muted, color: T.fgMuted, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-1.5"
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none', backgroundColor: T.cyan, color: '#fff', cursor: 'pointer' }}>
                <Save className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function MarketingIntegrationsPage() {
  const queryClient = useQueryClient()
  const { hasRole } = useHasRole()
  const isAdmin = hasRole('admin')
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  // Handle OAuth callback redirect
  useEffect(() => {
    const oauthProvider = searchParams.get('oauth')
    const oauthStatus = searchParams.get('status')
    if (oauthProvider && oauthStatus === 'success') {
      toast.success(`${oauthProvider} conectado correctamente via OAuth`)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSearchParams({}, { replace: true })
    } else if (oauthProvider && oauthStatus === 'error') {
      toast.error(`Error conectando ${oauthProvider}`)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => settingsApi.updateBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Integración guardada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  // Count configured
  const allIntegrations = INTEGRATION_GROUPS.flatMap(g => g.integrations)
  const configuredCount = allIntegrations.filter(int =>
    int.fields.some(f => {
      const key = `${int.configKey}_${f.key}`
      return settings?.[key] && settings[key] !== ''
    })
  ).length

  // Filter
  const filteredGroups = INTEGRATION_GROUPS.map(group => ({
    ...group,
    integrations: group.integrations.filter(int =>
      !search || int.name.toLowerCase().includes(search.toLowerCase()) ||
      int.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.integrations.length > 0)

  if (isLoading) {
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} />
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plug className="w-7 h-7" style={{ color: T.cyan }} />
              Integraciones Marketing
            </h1>
          </div>
          <p className="ml-8" style={{ fontSize: 13, color: T.fgMuted }}>
            Configura las conexiones con servicios externos para el módulo de marketing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: T.cyan, fontFamily: fontDisplay }}>{configuredCount}</p>
            <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>Conectadas</p>
          </div>
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: T.fgMuted, fontFamily: fontDisplay }}>{allIntegrations.length - configuredCount}</p>
            <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>Pendientes</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar integración..."
          style={{ width: '100%', paddingLeft: 40, paddingRight: 12, padding: '8px 12px 8px 40px', backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none' }}
        />
      </div>

      {/* Not admin warning */}
      {!isAdmin && (
        <div className="flex items-center gap-2" style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: `1px solid rgba(234,179,8,0.3)`, borderRadius: 8, padding: 12, fontSize: 14, color: T.warning }}>
          <Shield className="w-4 h-4 flex-shrink-0" />
          Solo los administradores pueden modificar las configuraciones de integraciones.
        </div>
      )}

      {/* Integration Groups */}
      {filteredGroups.map(group => (
        <div key={group.name}>
          <div className="mb-3">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>{group.name}</h2>
            <p style={{ fontSize: 12, color: T.fgMuted }}>{group.description}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {group.integrations.map(integration => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                settings={settings}
                isAdmin={isAdmin}
                onSave={(data) => saveMutation.mutate(data)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
