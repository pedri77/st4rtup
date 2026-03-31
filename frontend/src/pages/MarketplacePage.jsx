import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag, Check, Lock, Zap, Users, Target, BarChart3, Megaphone,
  BrainCircuit, Phone, Plug, Shield, ArrowRight, BookOpen,
  MessageCircle, Sparkles, FileText, Calendar, CreditCard
} from 'lucide-react'
import featuresMatrix from '@/data/features-matrix.json'
import { useOrganization } from '@/hooks/useOrganization'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const PLAN_RANK = { starter: 0, growth: 1, scale: 2, enterprise: 3 }

// ─── Icon + accent mapping per category ─────────────────────────────
const CATEGORY_META = {
  'CRM Core': { icon: Target, accent: T.cyan },
  'Marketing Hub': { icon: Megaphone, accent: T.purple },
  'Inteligencia Artificial': { icon: BrainCircuit, accent: T.warning },
  'Llamadas IA': { icon: Phone, accent: T.success },
  'Integraciones': { icon: Plug, accent: 'hsl(210,70%,55%)' },
  'Avanzado': { icon: Shield, accent: 'hsl(250,60%,58%)' },
}

// ─── Icon mapping per feature id ────────────────────────────────────
const FEATURE_ICONS = {
  leads: Target, pipeline: BarChart3, offers: FileText, visits: Calendar,
  emails: MessageCircle, actions: Zap, contacts: Users, calendar: Calendar,
  surveys: BookOpen, reviews: BarChart3,
  campaigns: Megaphone, seo_center: Shield, funnels: Target, assets: FileText,
  utm: Plug, marketing_calendar: Calendar, analytics: BarChart3, social: MessageCircle,
  agent_scoring: BrainCircuit, agent_qualify: BrainCircuit, agent_proposal: Sparkles,
  agent_cs: BrainCircuit, content_pipeline: Sparkles, auto_tagging: BrainCircuit,
  ai_summary: Sparkles, chat_ai: MessageCircle,
  calls_console: Phone, calls_prompts: FileText, calls_queue: Phone,
  calls_ab: BarChart3, calls_rgpd: Shield,
  gmail: MessageCircle, google_calendar: Calendar, google_drive: FileText,
  stripe_int: CreditCard, whatsapp: MessageCircle, youtube: BarChart3,
  airtable: Plug, slack: MessageCircle, webhooks: Zap,
  deal_room: Lock, nda_digital: Shield, public_api: Plug, widgets: BarChart3,
  graphs: BarChart3, automations: Zap, export_pdf: FileText,
  dashboard_config: BarChart3, i18n: BookOpen,
}

// ─── Addon icon + accent mapping ────────────────────────────────────
const ADDON_META = {
  extra_users: { icon: Users, accent: T.cyan },
  ai_advanced: { icon: BrainCircuit, accent: T.warning },
  deal_room_addon: { icon: Lock, accent: T.purple },
  whatsapp_addon: { icon: MessageCircle, accent: T.success },
  api_access: { icon: Plug, accent: 'hsl(210,70%,55%)' },
}

export default function MarketplacePage() {
  const { org, plan } = useOrganization()
  const userRank = PLAN_RANK[plan] || 0
  const [filter, setFilter] = useState('all')
  const activeAddons = org?.settings?.addons || []

  const categories = featuresMatrix.categories
  const addons = featuresMatrix.addons || []

  function getFeatureStatus(f) {
    const planValue = f[plan] || f.starter
    if (planValue === true) return 'included'
    if (typeof planValue === 'string') return 'limited'
    if (f.growth === true || f.scale === true) return 'locked'
    return 'locked'
  }

  function getRequiredPlan(f) {
    if (f.growth === true && userRank < 1) return 'Growth'
    if (f.scale === true && userRank < 2) return 'Scale'
    return 'Scale'
  }

  const allFeatures = categories.flatMap(c => c.features.map(f => ({ ...f, category: c.name })))
  const filtered = filter === 'all' ? allFeatures
    : filter === 'included' ? allFeatures.filter(f => getFeatureStatus(f) === 'included' || getFeatureStatus(f) === 'limited')
    : allFeatures.filter(f => getFeatureStatus(f) === 'locked')

  const activeCount = filtered.filter(f => getFeatureStatus(f) === 'included' || getFeatureStatus(f) === 'limited').length

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" style={{ color: T.cyan }} />
            Marketplace
          </h1>
          <p style={{ color: T.fgMuted }} className="text-sm mt-1">
            Tu plan: <strong style={{ color: T.cyan }}>{plan?.charAt(0).toUpperCase() + plan?.slice(1)}</strong> — {activeCount} funcionalidades activas
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: T.muted }}>
          {['all', 'included', 'locked'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors" style={{
              backgroundColor: filter === f ? `${T.cyan}20` : 'transparent',
              color: filter === f ? T.cyan : T.fgMuted,
              border: 'none', cursor: 'pointer',
            }}>{f === 'all' ? 'Todas' : f === 'included' ? 'Activas' : 'Bloqueadas'}</button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Funcionalidades', value: allFeatures.length, icon: ShoppingBag, color: T.cyan },
          { label: 'Activas', value: activeCount, icon: Check, color: T.success },
          { label: 'Add-ons', value: addons.length, icon: Zap, color: T.warning },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2.5">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-xs uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Funcionalidades — {filtered.length} {filter === 'all' ? 'totales' : filter === 'included' ? 'activas' : 'bloqueadas'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(f => {
            const status = getFeatureStatus(f)
            const catMeta = CATEGORY_META[f.category] || { icon: ShoppingBag, accent: T.cyan }
            const FeatureIcon = FEATURE_ICONS[f.id] || catMeta.icon
            const accent = catMeta.accent
            return (
              <div
                key={f.id}
                className="rounded-xl p-5 transition-all group"
                style={{
                  backgroundColor: T.card,
                  border: `1px solid ${T.border}`,
                  opacity: status === 'locked' ? 0.7 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <FeatureIcon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                        {f.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accent }} />
                      </h3>
                      {status === 'included' ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.success}15`, color: T.success }}>
                          <Check size={10} /> Incluido
                        </span>
                      ) : status === 'limited' ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.warning}15`, color: T.warning }}>
                          {f[plan]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.fgMuted}15`, color: T.fgMuted }}>
                          <Lock size={10} /> {getRequiredPlan(f)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: T.fgMuted }}>{f.desc}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.fgMuted, opacity: 0.7 }}>{f.category}</span>
                      <Link to="/app/docs" className="text-[10px]" style={{ color: T.cyan, textDecoration: 'none' }}>Docs</Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Add-ons — {addons.length} disponibles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {addons.map(a => {
            const isActive = activeAddons.includes(a.id)
            const meta = ADDON_META[a.id] || { icon: Zap, accent: T.cyan }
            const AddonIcon = meta.icon
            return (
              <div
                key={a.id}
                className="rounded-xl p-5 transition-all group"
                style={{
                  backgroundColor: T.card,
                  border: `1px solid ${isActive ? T.success : T.border}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = `${meta.accent}40` }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = T.border }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.accent}15` }}
                  >
                    <AddonIcon className="w-5 h-5" style={{ color: meta.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{a.name}</h3>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.success}15`, color: T.success }}>
                          <Check size={10} /> Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: T.fgMuted }}>{a.desc}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-sm" style={{ fontFamily: fontDisplay, color: isActive ? T.success : T.fg }}>
                        {isActive ? 'Incluido' : `${a.price_monthly}/mes`}
                      </span>
                      {!isActive && (
                        <button onClick={async () => {
                          try {
                            const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                            const orgId = org?.org_id || ''
                            const res = await fetch(`${apiUrl}/payments/public/checkout?plan=${a.id}&email=&org_id=${orgId}`, { method: 'POST' })
                            const data = await res.json()
                            if (data.checkout_url) window.location.href = data.checkout_url
                            else alert('Contacta con soporte para activar este add-on')
                          } catch { alert('Error de conexion') }
                        }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ backgroundColor: T.cyan, color: 'white', border: 'none', cursor: 'pointer' }}>
                          <CreditCard className="w-3 h-3" /> Comprar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
