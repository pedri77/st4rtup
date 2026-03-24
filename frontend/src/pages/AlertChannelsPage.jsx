import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Hash, MessageSquare, Check, X, Loader2, Send, Save, Eye, EyeOff, Phone, Bot,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const CHANNELS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Bot,
    color: '#0088CC',
    description: 'Recibe alertas en un grupo/chat de Telegram via Bot API.',
    configKey: 'telegram_config',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-1001234567890' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: Hash,
    color: '#E01E5A',
    description: 'Recibe alertas en un canal de Slack via Incoming Webhook o Bot API.',
    configKey: 'slack_config',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/T.../B.../...' },
      { key: 'bot_token', label: 'Bot Token (opcional)', type: 'password', placeholder: 'xoxb-...' },
      { key: 'default_channel', label: 'Canal por defecto (solo Bot)', type: 'text', placeholder: '#alerts' },
    ],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: MessageSquare,
    color: '#6264A7',
    description: 'Recibe alertas en un canal de Teams via Incoming Webhook (Adaptive Cards).',
    configKey: 'teams_config',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'password', placeholder: 'https://outlook.office.com/webhook/...' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: Phone,
    color: '#25D366',
    description: 'Recibe alertas via WhatsApp Business Cloud API (Meta).',
    configKey: 'whatsapp_config',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'EAAx...' },
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', placeholder: '9876543210' },
    ],
  },
]

const EVENT_CATEGORIES = [
  { label: 'Leads', events: ['Nuevo lead', 'Cambio de estado', 'Lead high-score (>80)'] },
  { label: 'Pipeline', events: ['Nueva oportunidad', 'Cambio de etapa', 'Deal ganado', 'Deal perdido'] },
  { label: 'Acciones', events: ['Accion creada', 'Proxima a vencer', 'Accion vencida'] },
  { label: 'Emails', events: ['Email enviado', 'Email rebotado'] },
  { label: 'Automatizaciones', events: ['Ejecucion exitosa', 'Ejecucion con error'] },
  { label: 'Costes', events: ['Alerta de presupuesto', 'Anomalia detectada'] },
]

function ChannelCard({ channel, config, onSave, onTest }) {
  const [form, setForm] = useState(config || {})
  const [showSecrets, setShowSecrets] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const toggleSecret = (key) => setShowSecrets(p => ({ ...p, [key]: !p[key] }))
  const isConfigured = channel.fields.some(f => form[f.key])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await settingsApi.testIntegration({ integration_id: channel.id, config: form })
      setTestResult(res.data)
    } catch (e) {
      setTestResult({ success: false, error: e.response?.data?.detail || e.message })
    }
    setTesting(false)
  }

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '0.5rem', backgroundColor: channel.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <channel.icon size={20} color={channel.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: '1.125rem', fontWeight: 700, color: T.fg, margin: 0 }}>{channel.name}</h3>
          <p style={{ fontSize: '0.75rem', color: T.fgMuted, margin: 0 }}>{channel.description}</p>
        </div>
        <div style={{
          padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
          backgroundColor: isConfigured ? T.success + '22' : T.muted,
          color: isConfigured ? T.success : T.fgMuted,
          border: `1px solid ${isConfigured ? T.success + '44' : T.border}`,
        }}>
          {isConfigured ? 'Configurado' : 'Sin configurar'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {channel.fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>{f.label}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={f.type === 'password' && !showSecrets[f.key] ? 'password' : 'text'}
                value={form[f.key] || ''}
                onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={inputStyle}
              />
              {f.type === 'password' && (
                <button onClick={() => toggleSecret(f.key)} style={{ background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer', padding: '0.5rem' }}>
                  {showSecrets[f.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button
          onClick={() => onSave(channel.configKey, form)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
            backgroundColor: T.cyan + '22', color: T.cyan, border: `1px solid ${T.cyan}44`,
            borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}
        >
          <Save size={14} /> Guardar
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !isConfigured}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
            backgroundColor: T.purple + '22', color: T.purple, border: `1px solid ${T.purple}44`,
            borderRadius: '0.5rem', cursor: testing ? 'wait' : 'pointer', fontSize: '0.8rem', fontWeight: 600,
            opacity: !isConfigured ? 0.4 : 1,
          }}
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Test
        </button>
      </div>

      {testResult && (
        <div style={{
          marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem',
          backgroundColor: testResult.success ? T.success + '15' : T.destructive + '15',
          color: testResult.success ? T.success : T.destructive,
          border: `1px solid ${testResult.success ? T.success : T.destructive}33`,
        }}>
          {testResult.success ? <Check size={14} style={{ display: 'inline', marginRight: 6 }} /> : <X size={14} style={{ display: 'inline', marginRight: 6 }} />}
          {testResult.message || testResult.error}
        </div>
      )}
    </div>
  )
}

export default function AlertChannelsPage() {
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Canal guardado')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const handleSave = (configKey, config) => {
    saveMutation.mutate({ [configKey]: config })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Bell size={24} color={T.cyan} />
          <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>
            CANALES DE ALERTA
          </h1>
        </div>
        <p style={{ color: T.fgMuted, fontSize: '0.875rem', margin: 0 }}>
          Configura Telegram, Slack, Teams y WhatsApp para recibir alertas del CRM en tiempo real.
          Las notificaciones de prioridad ALTA y URGENTE se envian automaticamente a todos los canales activos.
        </p>
      </div>

      {/* Channel cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {CHANNELS.map(ch => (
          <ChannelCard
            key={ch.id}
            channel={ch}
            config={settings?.[ch.configKey] || {}}
            onSave={handleSave}
            onTest={() => {}}
          />
        ))}
      </div>

      {/* Event routing table */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: '1.125rem', fontWeight: 700, color: T.fg, margin: '0 0 1rem 0' }}>
          Eventos que generan alertas
        </h2>
        <p style={{ color: T.fgMuted, fontSize: '0.8rem', marginBottom: '1rem' }}>
          Las alertas se envian a todos los canales configurados cuando la prioridad es HIGH o URGENT.
        </p>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {EVENT_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <h3 style={{ fontFamily: fontMono, fontSize: '0.75rem', color: T.cyan, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{cat.label}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {cat.events.map(ev => (
                  <span key={ev} style={{
                    padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem',
                    backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}`,
                  }}>
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
