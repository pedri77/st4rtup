import { Link } from 'react-router-dom'
import {
  Megaphone, Target, BarChart3, Link2, Calendar, AlertTriangle,
  ArrowRight, TrendingUp, Globe, FileText, Plug, Calculator, Shield, Bot, Search, Share2, Youtube
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { campaignsApi, marketingAlertsApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const modules = [
  { name: 'SEO Command Center', description: 'Content Hub, auditoría, repurposer, brand monitor y dashboard SEO unificado. Genera artículos con IA.', href: '/app/marketing/seo-center', icon: Search, accent: T.cyan },
  { name: 'Campañas', description: 'Gestiona campañas de marketing: LinkedIn Ads, Google Ads, SEO, Email, YouTube, Webinars y Eventos.', href: '/app/marketing/campaigns', icon: Megaphone, accent: T.cyan },
  { name: 'Generador UTM', description: 'Crea y gestiona códigos UTM para trackear campañas con vista previa en tiempo real.', href: '/app/marketing/utm', icon: Link2, accent: T.success },
  { name: 'Calendario', description: 'Calendario de campañas: artículos SEO, lanzamientos, newsletters, vídeos y webinars.', href: '/app/marketing/calendar', icon: Calendar, accent: T.warning },
  { name: 'Alertas', description: 'Alertas de rendimiento: CPL, keywords SEO, integraciones y LLM visibility.', href: '/app/marketing/alerts', icon: AlertTriangle, accent: '#F59E0B' },
  { name: 'Funnels', description: 'Constructor visual de funnels: Awareness, Consideración, Decisión y Acción.', href: '/app/marketing/funnels', icon: Target, accent: T.purple },
  { name: 'Assets', description: 'Landing pages, CTAs y assets de marketing con métricas de rendimiento e idioma.', href: '/app/marketing/assets', icon: Globe, accent: T.cyan },
  { name: 'Documentos', description: 'Gestor documental con versionado, Google Drive, normativa y persona target.', href: '/app/marketing/docs', icon: FileText, accent: 'hsl(250,60%,58%)' },
  { name: 'Analytics', description: 'Dashboard unificado Marketing + Sales: CPL, MQL rate, CAC, pipeline y ROI.', href: '/app/marketing/analytics', icon: BarChart3, accent: 'hsl(340,65%,55%)' },
  { name: 'Tools', description: 'Calculadora ROI, generador de contenido con IA y tracker de competidores.', href: '/app/marketing/tools', icon: Calculator, accent: T.warning },
  { name: 'Audit Log', description: 'Registro de acciones sensibles: creación, edición, eliminación y cambios de configuración.', href: '/app/marketing/audit', icon: Shield, accent: T.fgMuted },
  { name: 'SEO & Geo-SEO', description: 'Keywords, rankings, geo pages, NAP audits y rankings localizados para growth España.', href: '/app/marketing/seo', icon: Search, accent: T.success },
  { name: 'LLM Visibility', description: 'Monitoriza cómo ChatGPT, Claude y Gemini mencionan tu marca vs competidores growth.', href: '/app/marketing/llm-visibility', icon: Bot, accent: T.purple },
  { name: 'Social Media', description: 'Publicaciones en LinkedIn, Twitter/X, Instagram, YouTube. Programación, recurrencia y métricas.', href: '/app/marketing/social', icon: Share2, accent: 'hsl(210,70%,55%)' },
  { name: 'YouTube', description: 'Analytics del canal, vídeos recientes, suscriptores, watch time y métricas de rendimiento.', href: '/app/marketing/youtube', icon: Youtube, accent: '#EF4444' },
  { name: 'Integraciones', description: 'Google Drive, Search Console, GA4, LinkedIn, Semrush, Slack, Notion y LLM Visibility.', href: '/app/marketing/integrations', icon: Plug, accent: T.fgMuted },
]

export default function MarketingPage() {
  const T = useThemeColors()
  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'summary'],
    queryFn: async () => {
      try {
        const res = await campaignsApi.list({ page_size: 1 })
        return res.data
      } catch {
        return { total: 0 }
      }
    },
  })

  const { data: alertsData } = useQuery({
    queryKey: ['marketing', 'alerts', 'stats'],
    queryFn: async () => {
      try {
        const res = await marketingAlertsApi.stats()
        return res.data
      } catch {
        return { total: 0, unread: 0 }
      }
    },
  })

  const kpis = [
    { label: 'Campañas', value: campaignsData?.total ?? 0, icon: Megaphone, color: T.cyan },
    { label: 'Activas', value: '-', icon: TrendingUp, color: T.success },
    { label: 'Alertas sin leer', value: alertsData?.unread ?? 0, icon: AlertTriangle, color: T.warning },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="w-7 h-7" style={{ color: T.cyan }} />
          Marketing Hub
        </h1>
        <p style={{ color: T.fgMuted }} className="text-sm mt-1">
          Gestión integral de campañas, funnels, assets, SEO y analytics de marketing B2B.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2.5">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-xs uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Módulos — {modules.length} disponibles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <Link key={mod.name} to={mod.href}>
                <div
                  className="rounded-xl p-5 transition-all group"
                  style={{
                    backgroundColor: T.card,
                    border: `1px solid ${T.border}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${mod.accent}40` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${mod.accent}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.accent }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                        {mod.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: mod.accent }} />
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: T.fgMuted }}>
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
