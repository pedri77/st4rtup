import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, Clock, Save, Loader2, ExternalLink,
  Users, TrendingUp, Zap, Phone, Mail, Globe, Target, BarChart3,
  BookOpen, Edit3
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { playbookApi, leadsApi, externalAnalyticsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// Map each tactic channel to quick actions
const CHANNEL_ACTIONS = {
  blog_youtube: {
    label: 'Contenido',
    actions: [
      { label: 'Programar post social', href: '/marketing/calendar', icon: Globe },
      { label: 'Ver assets publicados', href: '/marketing/assets', icon: BookOpen },
      { label: 'Analytics trafico', href: '/marketing/analytics', icon: BarChart3 },
    ],
    kpis: ['Articulos/mes', 'Videos/mes', 'Trafico organico'],
    description: 'Publicar 48 articulos/año en blog + videos YouTube sobre ENS, NIS2, DORA. Pipeline n8n automatiza la distribucion social via Metricool.',
  },
  seo: {
    label: 'SEO',
    actions: [
      { label: 'Ver keywords y rankings', href: '/marketing/seo', icon: Target },
      { label: 'Rendimiento GSC', href: '/marketing/analytics', icon: TrendingUp },
      { label: 'Trafico por pais', href: '/marketing/analytics', icon: Globe },
    ],
    kpis: ['Keywords top 3', 'CTR medio', 'Trafico organico/mes'],
    description: '44 keywords objetivo para ENS/NIS2/DORA. Meta: top 3 España. GSC y GA4 conectados para tracking automatico.',
  },
  landing: {
    label: 'Lead Magnets',
    actions: [
      { label: 'Ver conversiones GA4', href: '/marketing/analytics', icon: TrendingUp },
      { label: 'Gestionar assets', href: '/marketing/assets', icon: BookOpen },
    ],
    kpis: ['Downloads ebook', 'Registros webinar', 'Demos solicitadas'],
    description: 'Ebook ENS Alto, webinar NIS2/DORA, demo interactiva, calculadora ROI. Cada descarga genera un lead con score inicial.',
  },
  email: {
    label: 'Email Marketing',
    actions: [
      { label: 'Campañas Brevo', href: '/marketing/integrations', icon: Mail },
      { label: 'Leads en nurturing', href: '/leads', icon: Users },
    ],
    kpis: ['Emails enviados/mes', 'Open rate', 'Click rate', 'Leads reactivados'],
    description: 'Newsletter quincenal para CISOs + nurturing automatico via Brevo. Leads frios (score<40) entran en secuencia. Si abren 2+ emails en 7 dias → re-scoring con AGENT-LEAD-001.',
  },
  retell_ai: {
    label: 'Llamadas ABM',
    actions: [
      { label: 'Consola de llamadas', href: '/calls', icon: Phone },
      { label: 'Historial llamadas', href: '/calls/history', icon: Clock },
      { label: 'Dashboard llamadas', href: '/calls/dashboard', icon: BarChart3 },
    ],
    kpis: ['Llamadas/semana', 'Tasa contacto', 'Reuniones agendadas', 'BANT score medio'],
    description: '15 cuentas Tier-1 con llamadas outbound via Retell AI. Post-llamada: AGENT-QUALIFY-001 analiza BANT automaticamente. Si objecion compleja → HITL-2 al founder.',
  },
  lemlist: {
    label: 'Emails ABM',
    actions: [
      { label: 'Campañas Lemlist', href: '/marketing/integrations', icon: Mail },
      { label: 'Ver leads', href: '/leads', icon: Users },
    ],
    kpis: ['Secuencias activas', 'Open rate', 'Reply rate', 'Leads generados'],
    description: '3 touchpoints por cuenta, personalizacion por vertical (finanzas, salud, gobierno). Lemlist webhook sincroniza opens/clicks/replies con el CRM y actualiza lead score.',
  },
  direct: {
    label: 'Venta Directa',
    actions: [
      { label: 'Calculadora pricing', href: '/gtm/pricing', icon: TrendingUp },
      { label: 'Pipeline', href: '/pipeline', icon: Target },
      { label: 'Battle cards', href: '/gtm/competitors', icon: BookOpen },
    ],
    kpis: ['Reuniones/mes', 'PoC activos', 'Conversion rate'],
    description: 'Incluye elevator pitch (CISO/CTO/CFO/CEO en 30s/2min/10min), ventas por solucion (PoC 90d €19.500) y cierre por urgencia regulatoria (deadlines NIS2/DORA/ENS).',
  },
  cs: {
    label: 'Customer Success',
    actions: [
      { label: 'Analizar con AGENT-CS-001', href: '/agents', icon: Zap },
      { label: 'Encuestas NPS', href: '/surveys', icon: BarChart3 },
      { label: 'Seguimiento mensual', href: '/reviews', icon: Clock },
    ],
    kpis: ['NPS', 'Churn rate', 'Upsell rate', 'QBRs completados'],
    description: 'CSM, QBRs trimestrales, KPIs SOC-CMM. AGENT-CS-001 detecta señales de churn (0 eventos 14d) y upsell (3+ proposal opens en 48h). PostHog alimenta los datos de actividad.',
  },
  events: {
    label: 'Eventos & Partners',
    actions: [
      { label: 'Partners MSSP', href: '/marketing/integrations', icon: Users },
      { label: 'Calendario marketing', href: '/marketing/calendar', icon: Clock },
    ],
    kpis: ['Eventos asistidos', 'Leads de eventos', 'Partners activos'],
    description: 'RootedCON, Cybercamp, ENISE + partners MSSP (Telefonica Tech, T-Systems, Indra). FirstPromoter gestiona comisiones automaticas.',
  },
  self_service: {
    label: 'Self-service SMB',
    actions: [
      { label: 'Pricing SMB', href: '/gtm/pricing', icon: TrendingUp },
      { label: 'Trafico web', href: '/gtm', icon: Globe },
    ],
    kpis: ['Signups/mes', 'Conversion trial→paid', 'MRR SMB'],
    description: 'Venta directa desde €1.200/mes sin intervencion comercial. Landing page + signup automatico.',
  },
  linkedin: {
    label: 'Redes Sociales',
    actions: [
      { label: 'Programar con Metricool', href: '/marketing/integrations', icon: Globe },
      { label: 'Calendario contenido', href: '/marketing/calendar', icon: Clock },
    ],
    kpis: ['Posts/semana', 'Engagement rate', 'Seguidores/mes', 'Leads de social'],
    description: 'LinkedIn para CISOs/CTOs + YouTube B2B. Metricool programa posts automaticamente cada lunes desde assets publicados.',
  },
}

const STATUS_CONFIG = {
  active: { icon: Play, color: T.success, bg: 'hsla(142,71%,45%,0.1)', label: 'Activa' },
  planned: { icon: Clock, color: T.fgMuted, bg: 'hsla(220,10%,55%,0.1)', label: 'Planificada' },
  paused: { icon: Pause, color: T.warning, bg: 'hsla(38,92%,50%,0.1)', label: 'Pausada' },
}

export default function PlaybookDetailPage() {
  const { tacticId } = useParams()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  const { data: allTactics } = useQuery({
    queryKey: ['playbook-all'],
    queryFn: () => playbookApi.list({}).then(r => r.data),
  })

  const tactic = (allTactics?.tactics || []).find(t => t.id === tacticId)
  const channelConfig = CHANNEL_ACTIONS[tactic?.channel] || CHANNEL_ACTIONS.direct

  const updateMutation = useMutation({
    mutationFn: (data) => playbookApi.update(tacticId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-all'] })
      toast.success('Tactica actualizada')
      setEditing(false)
    },
  })

  const toggleStatus = () => {
    const next = tactic.status === 'planned' ? 'active' : tactic.status === 'active' ? 'paused' : 'active'
    updateMutation.mutate({ status: next })
  }

  if (!tactic) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} />
      </div>
    )
  }

  const s = STATUS_CONFIG[tactic.status] || STATUS_CONFIG.planned
  const StatusIcon = s.icon

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/gtm/playbook" className="transition-colors" style={{ color: T.fgMuted }}
                onMouseEnter={e => e.currentTarget.style.color = T.fg}
                onMouseLeave={e => e.currentTarget.style.color = T.fgMuted}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{tactic.name}</h1>
              <button onClick={toggleStatus}
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-colors"
                style={{ backgroundColor: s.bg, color: s.color }}>
                <StatusIcon className="w-3 h-3" /> {s.label}
              </button>
            </div>
            <p className="text-sm ml-8" style={{ color: T.fgMuted }}>
              <span className="capitalize">{tactic.category}</span> · {channelConfig.label}
              {tactic.responsible && <> · Responsable: <span style={{ color: 'hsl(220,15%,75%)' }}>{tactic.responsible}</span></>}
            </p>
          </div>
        </div>

        {/* Que es y como funciona */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>¿Como funciona esta tactica?</h3>
          <p className="text-sm leading-relaxed" style={{ color: T.fgMuted }}>{channelConfig.description}</p>
        </div>

        {/* Acciones rapidas */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Zap className="w-4 h-4" style={{ color: T.cyan }} /> Acciones Rapidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {channelConfig.actions.map((action, i) => {
              const ActionIcon = action.icon
              return (
                <Link key={i} to={action.href}
                  className="rounded-xl p-4 flex items-center gap-3 transition-colors group"
                  style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'hsla(185,72%,48%,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                  <ActionIcon className="w-5 h-5 transition-colors" style={{ color: T.fgMuted }} />
                  <span className="text-sm transition-colors" style={{ color: 'hsl(220,15%,75%)' }}>{action.label}</span>
                  <ExternalLink className="w-3 h-3 ml-auto" style={{ color: T.fgMuted }} />
                </Link>
              )
            })}
          </div>
        </div>

        {/* KPIs */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <TrendingUp className="w-4 h-4" style={{ color: T.cyan }} /> KPIs de esta tactica
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {channelConfig.kpis.map((kpi, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                <p className="text-lg font-bold" style={{ color: T.fgMuted, fontFamily: fontMono }}>—</p>
                <p className="text-[10px] uppercase mt-0.5" style={{ color: T.fgMuted }}>{kpi}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: T.fgMuted }}>Los KPIs se rellenan automaticamente cuando las herramientas esten conectadas.</p>
        </div>

        {/* Configuracion editable */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
              <Edit3 className="w-4 h-4" style={{ color: T.cyan }} /> Configuracion
            </h3>
            {!editing && (
              <button onClick={() => { setEditing(true); setForm({ responsible: tactic.responsible || '', budget_monthly: tactic.budget_monthly || 0, budget_spent: tactic.budget_spent || 0 }) }}
                className="btn-secondary text-xs">Editar</button>
            )}
          </div>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="playbookdetail-field-1">Responsable</label>
                <input id="playbookdetail-field-1" type="text" value={form.responsible || ''} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  className="input text-sm" placeholder="Nombre del responsable" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="playbookdetail-field-2">Budget mensual (€)</label>
                  <input id="playbookdetail-field-2" type="number" value={form.budget_monthly || ''} onChange={e => setForm(f => ({ ...f, budget_monthly: parseFloat(e.target.value) || 0 }))}
                    className="input text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="playbookdetail-field-3">Gasto acumulado (€)</label>
                  <input id="playbookdetail-field-3" type="number" value={form.budget_spent || ''} onChange={e => setForm(f => ({ ...f, budget_spent: parseFloat(e.target.value) || 0 }))}
                    className="input text-sm" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
                  className="btn-primary text-xs flex items-center gap-1">
                  {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="text-sm space-y-1" style={{ color: T.fgMuted }}>
              <p><span style={{ color: T.fgMuted }}>Canal:</span> <span style={{ fontFamily: fontMono }}>{tactic.channel}</span></p>
              <p><span style={{ color: T.fgMuted }}>Categoria:</span> <span className="capitalize">{tactic.category}</span></p>
              <p><span style={{ color: T.fgMuted }}>Responsable:</span> {tactic.responsible || 'Sin asignar'}</p>
              {(tactic.budget_monthly > 0 || tactic.budget_spent > 0) && (
                <p><span style={{ color: T.fgMuted }}>Budget:</span> <span style={{ fontFamily: fontMono }}>€{tactic.budget_spent || 0} / €{(tactic.budget_monthly || 0) * 12} anual</span></p>
              )}
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>📝 Notas</h3>
          <textarea id="playbookdetail-textarea-4" aria-label="Texto" defaultValue={tactic.notes || ''}
            onBlur={(e) => {
              if (e.target.value !== (tactic.notes || '')) {
                updateMutation.mutate({ notes: e.target.value })
              }
            }}
            placeholder="Escribe notas sobre esta tactica..."
            className="input text-sm w-full h-24 resize-none"
          />
        </div>

        {/* Checklist */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>✅ Checklist de implementacion</h3>
            <button onClick={() => {
              const current = tactic.checklist || []
              const text = prompt('Nueva tarea:')
              if (text) updateMutation.mutate({ checklist: [...current, { text, done: false }] })
            }} className="text-xs hover:underline" style={{ color: T.cyan }}>+ Añadir</button>
          </div>
          <div className="space-y-2">
            {(tactic.checklist || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <button onClick={() => {
                  const updated = [...(tactic.checklist || [])]
                  updated[i] = { ...updated[i], done: !updated[i].done }
                  updateMutation.mutate({ checklist: updated })
                }} style={{ color: item.done ? T.success : T.fgMuted }}>
                  {item.done ? '☑️' : '⬜'}
                </button>
                <span style={{ color: item.done ? T.fgMuted : 'hsl(220,15%,75%)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
              </div>
            ))}
            {(!tactic.checklist || tactic.checklist.length === 0) && (
              <p className="text-xs" style={{ color: T.fgMuted }}>Sin tareas. Pulsa "+ Añadir" para crear una.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
