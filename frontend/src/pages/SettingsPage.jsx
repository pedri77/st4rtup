import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Bell, Key, Globe, Palette, Save, Check, Mail, Send, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'
import { settingsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#F5820B', destructive: '#EF4444',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const tabs = [
  { id: 'profile', name: 'Perfil', icon: User },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'notifications', name: 'Notificaciones', icon: Bell },
  { id: 'api', name: 'API & Integraciones', icon: Key },
  { id: 'preferences', name: 'Preferencias', icon: Globe },
  { id: 'appearance', name: 'Apariencia', icon: Palette },
]

const EMAIL_PROVIDERS = [
  { id: 'resend', name: 'Resend', fields: [{ key: 'resend_api_key', label: 'API Key', type: 'password', placeholder: 're_...' }] },
  { id: 'brevo', name: 'Brevo (Sendinblue)', fields: [{ key: 'brevo_api_key', label: 'API Key', type: 'password', placeholder: 'xkeysib-...' }] },
  { id: 'ses', name: 'Amazon SES', fields: [
    { key: 'ses_access_key', label: 'Access Key', type: 'password', placeholder: 'AKIA...' },
    { key: 'ses_secret_key', label: 'Secret Key', type: 'password', placeholder: '' },
    { key: 'ses_region', label: 'Region', type: 'text', placeholder: 'eu-west-1' },
  ]},
  { id: 'mailgun', name: 'Mailgun', fields: [
    { key: 'mailgun_api_key', label: 'API Key', type: 'password', placeholder: 'key-...' },
    { key: 'mailgun_domain', label: 'Dominio', type: 'text', placeholder: 'mg.tudominio.com' },
  ]},
  { id: 'smtp', name: 'SMTP Generico', fields: [
    { key: 'smtp_host', label: 'Host', type: 'text', placeholder: 'smtp.gmail.com' },
    { key: 'smtp_port', label: 'Puerto', type: 'text', placeholder: '587' },
    { key: 'smtp_user', label: 'Usuario', type: 'text', placeholder: '' },
    { key: 'smtp_password', label: 'Password', type: 'password', placeholder: '' },
  ]},
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Configuracion</h1>
        <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Gestiona tu perfil, preferencias y configuracion del CRM</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={activeTab === tab.id
                  ? { backgroundColor: `${T.cyan}15`, color: T.cyan, fontFamily: fontDisplay }
                  : { color: T.fgMuted, fontFamily: fontDisplay }
                }>
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'email' && <EmailTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'api' && <APITab />}
          {activeTab === 'preferences' && <PreferencesTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  )
}

function EmailTab() {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState('resend')
  const [emailFrom, setEmailFrom] = useState('hello@st4rtup.app')
  const [config, setConfig] = useState({})
  const [testEmail, setTestEmail] = useState('')
  const [showSecrets, setShowSecrets] = useState({})
  const [testResult, setTestResult] = useState(null)
  const [sendingTest, setSendingTest] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  })

  // Sync from DB on load
  const [loaded, setLoaded] = useState(false)
  if (settings && !loaded) {
    setProvider(settings.email_provider || 'resend')
    setEmailFrom(settings.email_from || 'hello@st4rtup.app')
    setConfig(settings.email_config || {})
    setLoaded(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Configuracion de email guardada') },
    onError: () => toast.error('Error al guardar'),
  })

  const handleSave = () => {
    saveMutation.mutate({ email_provider: provider, email_from: emailFrom, email_config: config })
  }

  const handleTest = async () => {
    if (!testEmail) return
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await settingsApi.sendTestEmail({ to_email: testEmail })
      setTestResult({ success: true, message: res.data.message || 'Email enviado correctamente' })
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.detail || 'Error al enviar' })
    }
    setSendingTest(false)
  }

  const currentProvider = EMAIL_PROVIDERS.find(p => p.id === provider)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Provider selector */}
      <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Proveedor de Email</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {EMAIL_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className="p-3 rounded-lg text-left transition-all"
              style={{
                border: `2px solid ${provider === p.id ? T.cyan : T.border}`,
                backgroundColor: provider === p.id ? `${T.cyan}10` : 'transparent',
              }}>
              <p className="text-sm font-medium" style={{ color: provider === p.id ? T.cyan : T.fg }}>{p.name}</p>
            </button>
          ))}
        </div>

        {/* From email */}
        <div className="mb-4">
          <label htmlFor="email-from" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Email remitente</label>
          <input id="email-from" type="email" value={emailFrom} onChange={e => setEmailFrom(e.target.value)}
            placeholder="hello@st4rtup.app" style={inputStyle} />
        </div>

        {/* Provider-specific fields */}
        {currentProvider?.fields.map(field => (
          <div key={field.key} className="mb-3">
            <label htmlFor={`email-${field.key}`} className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{field.label}</label>
            <div className="relative">
              <input id={`email-${field.key}`}
                type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                value={config[field.key] || ''} onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder} style={inputStyle} />
              {field.type === 'password' && (
                <button type="button" onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }}>
                  {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4">
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Configuracion
          </button>
        </div>
      </div>

      {/* Test email */}
      <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Enviar Email de Prueba</h2>
        <p className="text-sm mb-4" style={{ color: T.fgMuted }}>
          Verifica que la configuracion funciona enviando un email de prueba.
        </p>
        <div className="flex items-center gap-3">
          <input id="test-email-address" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="tu@email.com" aria-label="Email de prueba" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={handleTest} disabled={sendingTest || !testEmail}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Prueba
          </button>
        </div>
        {testResult && (
          <div className="mt-3 p-3 rounded-lg text-sm" style={{
            backgroundColor: testResult.success ? `${T.success}15` : `${T.destructive}15`,
            color: testResult.success ? T.success : T.destructive,
            border: `1px solid ${testResult.success ? T.success : T.destructive}33`,
          }}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileTab() {
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', title: '', timezone: 'Europe/Madrid' })
  const [saved, setSaved] = useState(false)

  useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFormData({
          full_name: user.user_metadata?.full_name || '', email: user.email || '',
          phone: user.user_metadata?.phone || '', title: user.user_metadata?.title || '',
          timezone: user.user_metadata?.timezone || 'Europe/Madrid',
        })
      }
      return user
    },
  })

  const saveProfile = useMutation({
    mutationFn: async (data) => {
      // Save to Supabase Auth metadata
      try {
        await supabase.auth.updateUser({ data: { full_name: data.full_name, phone: data.phone, title: data.title, timezone: data.timezone } })
      } catch (e) {
        console.warn('Supabase auth update failed, trying backend', e)
      }
      // Also save to backend user profile
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await settingsApi.update({ general_config: { user_profile: { full_name: data.full_name, phone: data.phone, title: data.title, timezone: data.timezone } } })
        }
      } catch (e) {
        console.warn('Backend profile update failed', e)
      }
    },
    onSuccess: () => { setSaved(true); toast.success('Perfil actualizado'); setTimeout(() => setSaved(false), 3000) },
    onError: (error) => { toast.error(`Error: ${error.message}`) },
  })

  return (
    <div className="rounded-lg p-6 max-w-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="text-base font-semibold mb-6" style={{ fontFamily: fontDisplay, color: T.fg }}>Informacion Personal</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(formData) }} className="space-y-4">
        <div>
          <label htmlFor="settings-fullname" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Nombre completo</label>
          <input id="settings-fullname" type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={inputStyle} placeholder="Juan Perez" />
        </div>
        <div>
          <label htmlFor="settings-email" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Email</label>
          <input id="settings-email" type="email" value={formData.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
          <p className="text-xs mt-1" style={{ color: T.fgMuted }}>No puedes cambiar tu email. Contacta con soporte si necesitas cambiarlo.</p>
        </div>
        <div>
          <label htmlFor="settings-phone" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Telefono</label>
          <input id="settings-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="+34 600 000 000" />
        </div>
        <div>
          <label htmlFor="settings-title" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Cargo</label>
          <input id="settings-title" type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={inputStyle} placeholder="Comercial, Director Ventas, etc." />
        </div>
        <div>
          <label htmlFor="settings-timezone" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Zona horaria</label>
          <select id="settings-timezone" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} style={inputStyle}>
            <option value="Europe/Madrid">Madrid (UTC+1)</option>
            <option value="Europe/London">Londres (UTC+0)</option>
            <option value="America/New_York">Nueva York (UTC-5)</option>
            <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={saveProfile.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            {saved ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> {saveProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}

function NotificationsTab() {
  const {
    email_new_lead, email_action_overdue, email_daily_summary, email_weekly_report,
    push_new_lead, push_action_overdue, push_email_received, setPreferences,
  } = useUserPreferencesStore()

  const settings = { email_new_lead, email_action_overdue, email_daily_summary, email_weekly_report, push_new_lead, push_action_overdue, push_email_received }

  const NotifItem = ({ id, label, desc, checked, onChange }) => (
    <label htmlFor={id} className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium" style={{ color: T.fg }}>{label}</p>
        <p className="text-xs" style={{ color: T.fgMuted }}>{desc}</p>
      </div>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="rounded" />
    </label>
  )

  return (
    <div className="rounded-lg p-6 max-w-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="text-base font-semibold mb-6" style={{ fontFamily: fontDisplay, color: T.fg }}>Notificaciones</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Email</h3>
          <div className="space-y-3">
            <NotifItem id="notif-email-new-lead" label="Nuevo Lead" desc="Recibir email cuando se crea un lead" checked={settings.email_new_lead} onChange={(e) => setPreferences({ email_new_lead: e.target.checked })} />
            <NotifItem id="notif-email-action-overdue" label="Acciones Vencidas" desc="Email cuando hay acciones vencidas" checked={settings.email_action_overdue} onChange={(e) => setPreferences({ email_action_overdue: e.target.checked })} />
            <NotifItem id="notif-email-daily" label="Resumen Diario" desc="Resumen diario de actividad (AC-01)" checked={settings.email_daily_summary} onChange={(e) => setPreferences({ email_daily_summary: e.target.checked })} />
            <NotifItem id="notif-email-weekly" label="Reporte Semanal" desc="Resumen semanal de metricas" checked={settings.email_weekly_report} onChange={(e) => setPreferences({ email_weekly_report: e.target.checked })} />
          </div>
        </div>
        <div className="pt-6" style={{ borderTop: `1px solid ${T.border}` }}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Push / En App</h3>
          <div className="space-y-3">
            <NotifItem id="notif-push-new-lead" label="Nuevo Lead" desc="Notificacion push" checked={settings.push_new_lead} onChange={(e) => setPreferences({ push_new_lead: e.target.checked })} />
            <NotifItem id="notif-push-action-overdue" label="Acciones Vencidas" desc="Notificacion push" checked={settings.push_action_overdue} onChange={(e) => setPreferences({ push_action_overdue: e.target.checked })} />
            <NotifItem id="notif-push-email-received" label="Email Recibido" desc="Notificacion cuando llega un email" checked={settings.push_email_received} onChange={(e) => setPreferences({ push_email_received: e.target.checked })} />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button onClick={() => toast.success('Preferencias de notificaciones guardadas')}
            className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  )
}

function APITab() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
    staleTime: 0, // Always fresh — reflects changes from Integrations pages
    refetchOnMount: 'always',
  })
  const { data: envStatus } = useQuery({
    queryKey: ['env-status'],
    queryFn: () => settingsApi.envStatus().then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Build integration status from real settings
  // AI providers — check from envStatus (Supabase secrets)
  const aiProviders = [
    { name: 'OpenAI', letter: 'OA', color: T.success, envKey: 'OPENAI_API_KEY' },
    { name: 'Mistral', letter: 'MI', color: T.warning, envKey: 'MISTRAL_API_KEY' },
    { name: 'Anthropic', letter: 'AN', color: T.purple, envKey: 'ANTHROPIC_API_KEY' },
    { name: 'DeepSeek', letter: 'DS', color: T.cyan, envKey: 'DEEPSEEK_API_KEY' },
    { name: 'Retell AI', letter: 'RT', color: T.destructive, envKey: 'RETELL_API_KEY' },
    { name: 'vLLM', letter: 'vL', color: T.fgMuted, envKey: 'VLLM_API_URL' },
  ]
  const envVars = envStatus?.env_vars || envStatus || {}

  // Service integrations — check from DB (system_settings)
  const integrations = [
    { name: 'Google Drive', letter: 'GD', color: 'hsl(210,70%,55%)', configKey: 'gdrive_config', href: '/integrations' },
    { name: 'Google Calendar', letter: 'GC', color: T.cyan, configKey: 'gcalendar_config', href: '/integrations' },
    { name: 'Google Forms', letter: 'GF', color: T.success, configKey: 'google_forms_config', href: '/integrations' },
    { name: 'Notion', letter: 'N', color: T.fgMuted, configKey: 'notion_config', href: '/integrations' },
    { name: 'HubSpot', letter: 'HS', color: 'hsl(25,75%,50%)', configKey: 'hubspot_config', href: '/integrations' },
    { name: 'Telegram', letter: 'TG', color: '#0088CC', configKey: 'telegram_config', href: '/alert-channels' },
    { name: 'Slack', letter: 'SL', color: '#E01E5A', configKey: 'slack_config', href: '/alert-channels' },
    { name: 'WhatsApp', letter: 'WA', color: '#25D366', configKey: 'whatsapp_config', href: '/alert-channels' },
    { name: 'Teams', letter: 'MS', color: '#6264A7', configKey: 'teams_config', href: '/alert-channels' },
    { name: 'Apollo.io', letter: 'AP', color: T.purple, configKey: 'apollo_config', href: '/integrations' },
    { name: 'Hunter.io', letter: 'HU', color: T.warning, configKey: 'hunter_config', href: '/integrations' },
    { name: 'Resend', letter: 'RE', color: T.cyan, configKey: 'email_config', href: '/settings' },
    { name: 'n8n', letter: 'n8', color: T.warning, configKey: 'n8n_config', href: '/integrations' },
    { name: 'Stripe', letter: 'ST', color: T.purple, configKey: 'stripe_config', href: '/integrations' },
    { name: 'PandaDoc', letter: 'PD', color: T.success, configKey: 'pandadoc_config', href: '/integrations' },
    { name: 'Calendly', letter: 'CL', color: T.cyan, configKey: 'calendly_config', href: '/integrations' },
    { name: 'LinkedIn', letter: 'LI', color: '#0A66C2', configKey: 'linkedin_config', href: '/integrations' },
    { name: 'Clearbit', letter: 'CB', color: 'hsl(210,70%,55%)', configKey: 'clearbit_config', href: '/integrations' },
    { name: 'PostHog', letter: 'PH', color: T.warning, configKey: 'general_config', href: '/integrations' },
  ]

  // Map configKey to env var names for services configured via Supabase secrets
  const CONFIG_TO_ENV = {
    hubspot_config: 'HUBSPOT_API_KEY',
    hunter_config: 'HUNTER_API_KEY',
    apollo_config: 'APOLLO_API_KEY',
    telegram_config: 'TELEGRAM_BOT_TOKEN',
    stripe_config: 'STRIPE_SECRET_KEY',
    slack_config: 'SLACK_WEBHOOK_URL',
    n8n_config: 'N8N_WEBHOOK_URL',
    calendly_config: 'CALENDLY_API_KEY',
  }

  const isConnected = (configKey) => {
    // Check DB config first
    const cfg = settings?.[configKey]
    if (cfg && Object.values(cfg).some(v => v && v !== '' && v !== false)) return true
    // Check env vars (Supabase secrets)
    const envKey = CONFIG_TO_ENV[configKey]
    if (envKey && envVars[envKey]) return true
    return false
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* AI Providers */}
      <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Proveedores IA</h2>
        <div className="grid grid-cols-2 gap-2">
          {aiProviders.map((ai, i) => {
            const configured = envVars[ai.envKey]
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ border: `1px solid ${configured ? `${T.success}30` : T.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ai.color}15` }}>
                  <span className="text-xs font-bold" style={{ color: ai.color }}>{ai.letter}</span>
                </div>
                <span className="text-sm" style={{ color: T.fg }}>{ai.name}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded font-semibold" style={{
                  color: configured ? T.success : T.fgMuted,
                  backgroundColor: configured ? `${T.success}15` : T.muted,
                }}>
                  {configured ? 'Activo' : 'No configurado'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Integrations status */}
      <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>Integraciones Activas</h2>
          <a href="/integrations" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: T.cyan, backgroundColor: `${T.cyan}15` }}>
            Gestionar todas
          </a>
        </div>
        <div className="space-y-3">
          {integrations.map((int, i) => {
            const connected = isConnected(int.configKey)
            return (
              <a key={i} href={int.href} className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={{ border: `1px solid ${connected ? `${T.success}30` : T.border}`, backgroundColor: connected ? `${T.success}05` : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${int.color}15` }}>
                    <span className="text-xs font-bold" style={{ color: int.color }}>{int.letter}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: T.fg }}>{int.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{
                  color: connected ? T.success : T.fgMuted,
                  backgroundColor: connected ? `${T.success}15` : T.muted,
                }}>
                  {connected ? 'Conectado' : 'No configurado'}
                </span>
              </a>
            )
          })}
        </div>
      </div>

      {/* Env status */}
      {envStatus && (
        <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="text-base font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Variables de Entorno (Supabase)</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(envVars).map(([key, configured]) => (
              <div key={key} className="flex items-center gap-2 text-xs py-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: configured ? T.success : T.fgMuted }} />
                <span style={{ color: configured ? T.fg : T.fgMuted, fontFamily: fontMono }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PreferencesTab() {
  const { language, date_format, currency, week_start, setPreferences } = useUserPreferencesStore()
  const settings = { language, date_format, currency, week_start }

  return (
    <div className="rounded-lg p-6 max-w-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="text-base font-semibold mb-6" style={{ fontFamily: fontDisplay, color: T.fg }}>Preferencias Generales</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="pref-language" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Idioma</label>
          <select id="pref-language" value={settings.language} onChange={(e) => setPreferences({ language: e.target.value })} style={inputStyle}>
            <option value="es">Espanol</option><option value="en">English</option><option value="pt">Portugues</option>
          </select>
        </div>
        <div>
          <label htmlFor="pref-dateformat" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Formato de Fecha</label>
          <select id="pref-dateformat" value={settings.date_format} onChange={(e) => setPreferences({ date_format: e.target.value })} style={inputStyle}>
            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option><option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option><option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
          </select>
        </div>
        <div>
          <label htmlFor="pref-currency" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Moneda</label>
          <select id="pref-currency" value={settings.currency} onChange={(e) => setPreferences({ currency: e.target.value })} style={inputStyle}>
            <option value="EUR">EUR</option><option value="USD">USD ($)</option><option value="GBP">GBP</option>
          </select>
        </div>
        <div>
          <label htmlFor="pref-weekstart" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Inicio de Semana</label>
          <select id="pref-weekstart" value={settings.week_start} onChange={(e) => setPreferences({ week_start: e.target.value })} style={inputStyle}>
            <option value="monday">Lunes</option><option value="sunday">Domingo</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button onClick={() => toast.success('Preferencias guardadas')}
            className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function AppearanceTab() {
  const { theme, setPreferences } = useUserPreferencesStore()
  const [accentColor, setAccentColor] = useState(T.cyan)

  const colors = [
    { name: 'Cyan', value: T.cyan },
    { name: 'Blue', value: 'hsl(220,80%,55%)' },
    { name: 'Purple', value: T.purple },
    { name: 'Pink', value: 'hsl(330,80%,55%)' },
    { name: 'Green', value: T.success },
    { name: 'Orange', value: T.warning },
  ]

  return (
    <div className="rounded-lg p-6 max-w-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="text-base font-semibold mb-6" style={{ fontFamily: fontDisplay, color: T.fg }}>Apariencia</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Tema</label>
          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => setPreferences({ theme: 'light' })}
              className="p-4 rounded-lg transition-all"
              style={{ border: `2px solid ${theme === 'light' ? T.cyan : T.border}`, backgroundColor: theme === 'light' ? `${T.cyan}10` : 'transparent' }}>
              <div className="w-full h-20 rounded mb-2" style={{ backgroundColor: '#e2e8f0', border: `1px solid #cbd5e1` }} />
              <p className="text-sm font-medium" style={{ color: T.fg }}>Claro</p>
            </button>
            <button onClick={() => setPreferences({ theme: 'dark' })}
              className="p-4 rounded-lg transition-all"
              style={{ border: `2px solid ${theme === 'dark' || !theme ? T.cyan : T.border}`, backgroundColor: theme === 'dark' || !theme ? `${T.cyan}10` : 'transparent' }}>
              <div className="w-full h-20 rounded mb-2" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }} />
              <p className="text-sm font-medium" style={{ color: T.fg }}>Oscuro</p>
            </button>
            <button disabled className="p-4 rounded-lg transition-all opacity-50 cursor-not-allowed" style={{ border: `2px solid ${T.border}` }}>
              <div className="w-full h-20 rounded mb-2" style={{ background: `linear-gradient(90deg, #e2e8f0, ${T.bg})`, border: `1px solid ${T.border}` }} />
              <p className="text-sm font-medium" style={{ color: T.fg }}>Auto</p>
              <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Proximamente</p>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Color de Acento</label>
          <div className="grid grid-cols-6 gap-3">
            {colors.map((color) => (
              <button key={color.value} onClick={() => setAccentColor(color.value)}
                className="w-12 h-12 rounded-lg transition-all"
                style={{ backgroundColor: color.value, border: `2px solid ${accentColor === color.value ? T.fg : 'transparent'}`, transform: accentColor === color.value ? 'scale(1.1)' : 'scale(1)' }}
                title={color.name} />
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: T.fgMuted }}>El color de acento personalizado estara disponible proximamente</p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button onClick={() => toast.success('Apariencia guardada')}
            className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}
