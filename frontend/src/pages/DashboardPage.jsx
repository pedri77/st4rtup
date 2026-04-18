import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  GitBranch, CalendarCheck, Calendar,
  FileText, Plus, Send, Receipt, Activity, GripVertical
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import AutomationsSummary from '@/components/AutomationsSummary'
import MarketingSummary from '@/components/MarketingSummary'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import AgentsSummary from '@/components/AgentsSummary'
import { DashboardSkeleton, ErrorState } from '@/components/LoadingStates'
import OnboardingWizard from '@/components/OnboardingWizard'
import DashboardCustomizer, { useDashboardWidgets } from '@/components/DashboardCustomizer'
import { exportToPDF } from '@/utils/exportPdf'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'


const chartTooltipStyle = {
  backgroundColor: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: '6px',
  color: T.fg,
  fontSize: '12px',
  fontFamily: fontMono,
}

const KPI_THEMES = [
  { gradient: 'linear-gradient(135deg, #EBF4FF, #F0F0FF)', accent: '#1E6FD9', iconBg: '#1E6FD915' },
  { gradient: 'linear-gradient(135deg, #ECFDF5, #F0FFF4)', accent: '#10B981', iconBg: '#10B98115' },
  { gradient: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', accent: '#F59E0B', iconBg: '#F59E0B15' },
  { gradient: 'linear-gradient(135deg, #F5F3FF, #FDF4FF)', accent: '#8B5CF6', iconBg: '#8B5CF615' },
  { gradient: 'linear-gradient(135deg, #FEF2F2, #FFF1F2)', accent: '#EF4444', iconBg: '#EF444415' },
  { gradient: 'linear-gradient(135deg, #ECFEFF, #F0F9FF)', accent: '#0891B2', iconBg: '#0891B215' },
]
let _kpiIdx = 0

function MiniSparkline({ color = '#1E6FD9' }) {
  // Decorative sparkline — generates consistent "up trend" path
  const points = [4, 6, 3, 7, 5, 8, 6, 9, 7, 10]
  const w = 60, h = 24, max = Math.max(...points), min = Math.min(...points)
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((p - min) / (max - min)) * h
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Readout({ label, value, trend, subtext, color, icon: Icon }) {
  const trendColor = !trend || trend === 0 ? T.fgMuted : trend > 0 ? T.success : T.destructive
  const trendArrow = !trend || trend === 0 ? '' : trend > 0 ? '↑' : '↓'
  const theme = KPI_THEMES[_kpiIdx++ % KPI_THEMES.length]
  const accentColor = color || theme.accent

  return (
    <div style={{
      background: theme.gradient, borderRadius: 16, padding: '16px 18px',
      border: `1px solid ${accentColor}10`,
      borderLeft: `3px solid ${accentColor}40`,
      transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s',
      cursor: 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 12px 30px ${accentColor}12` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none' }}>
      {/* Decorative circle */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${accentColor}06`, pointerEvents: 'none' }} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {Icon && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={accentColor} />
              </div>
            )}
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{label}</p>
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ fontFamily: fontMono, color: T.fg }}>{value}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {trend !== undefined && trend !== 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{
                fontFamily: fontMono, color: trendColor,
                backgroundColor: `${trendColor}12`,
              }}>
                {trendArrow} {Math.abs(trend)}%
              </span>
            )}
            {subtext && <span className="text-[11px]" style={{ color: T.fgMuted }}>{subtext}</span>}
          </div>
        </div>
        <MiniSparkline color={accentColor} />
      </div>
    </div>
  )
}

function StatusIndicator({ label, count, severity, to }) {
  if (count === 0) return null
  const color = { danger: T.destructive, warning: T.warning, info: T.fgMuted }[severity] || T.fgMuted

  const inner = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, ...(severity === 'danger' ? { animation: 'pulse 2s infinite' } : {}) }} />
      <span className="text-sm font-bold" style={{ fontFamily: fontMono, color }}>{count}</span>
      <span className="text-xs uppercase tracking-[0.1em]" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{label}</span>
    </div>
  )

  return to ? <Link to={to}>{inner}</Link> : inner
}

function Panel({ title, children, className = '' }) {
  return (
    <div className={`rounded-lg ${className}`} style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <h2 className="text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: fontDisplay, color: T.fg }}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function WaterfallAndRadarSection() {
  const { data: waterfallData, isLoading: wfLoading } = useQuery({
    queryKey: ['dashboard-waterfall'],
    queryFn: () => dashboardApi.waterfall().then(r => r.data).catch(() => ({ bars: [] })),
    retry: 0, staleTime: 120000,
  })

  const { data: radarData, isLoading: radarLoading } = useQuery({
    queryKey: ['dashboard-activity-radar'],
    queryFn: () => dashboardApi.activityRadar({ days: 7 }).then(r => r.data).catch(() => ({ axes: [] })),
    retry: 0, staleTime: 120000,
  })

  const waterfallItems = waterfallData?.items || waterfallData || []
  const radarItems = radarData?.metrics || radarData || []

  const waterfallChartData = Array.isArray(waterfallItems) ? waterfallItems.map(item => ({
    name: item.label || item.name || '',
    value: item.value || 0,
    type: item.type || 'total',
  })) : []

  const radarChartData = Array.isArray(radarItems) ? radarItems.map(item => ({
    metric: item.label || item.metric || item.name || '',
    value: item.value || item.count || 0,
    fullMark: item.max || 100,
  })) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Revenue Waterfall">
        {wfLoading ? (
          <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>CARGANDO...</div>
        ) : waterfallChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={waterfallChartData} barCategoryGap="20%">
              <defs>
                <linearGradient id="gradIncrease" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.success} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.success} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradDecrease" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.destructive} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.destructive} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
              <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: T.muted }}
                formatter={(value) => [`${typeof value === 'number' ? value.toLocaleString('es-ES') : value}`, 'Valor']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {waterfallChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.type === 'increase' ? 'url(#gradIncrease)' : entry.type === 'decrease' ? 'url(#gradDecrease)' : 'url(#gradTotal)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN DATOS</div>
        )}
        {waterfallChartData.length > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: T.cyan }} /> Total</span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: T.success }} /> Incremento</span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: T.destructive }} /> Decremento</span>
          </div>
        )}
      </Panel>

      <Panel title="Actividad semanal">
        {radarLoading ? (
          <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>CARGANDO...</div>
        ) : radarChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarChartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={T.border} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: T.fgMuted }} stroke={T.border} />
              <Radar dataKey="value" stroke={T.cyan} fill={T.cyan} fillOpacity={0.2} strokeWidth={1.5} />
              <Tooltip contentStyle={chartTooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN DATOS</div>
        )}
      </Panel>
    </div>
  )
}

function DraggableSection({ id, draggedWidget, setDraggedWidget, dragOverWidget, setDragOverWidget, onReorder, widgets, children }) {
  const handleDragStart = (e) => {
    setDraggedWidget(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    requestAnimationFrame(() => {
      e.currentTarget.style.opacity = '0.4'
    })
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedWidget && draggedWidget !== id) {
      setDragOverWidget(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverWidget(prev => prev === id ? null : prev)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const fromId = e.dataTransfer.getData('text/plain')
    if (fromId && fromId !== id) {
      onReorder(fromId, id)
    }
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const isOver = dragOverWidget === id && draggedWidget !== id

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="group/drag relative"
      style={{
        transition: 'border-color 0.2s, box-shadow 0.2s, order 0.3s',
        borderRadius: 8,
        border: isOver ? `2px dashed ${T.cyan}` : '2px solid transparent',
        boxShadow: isOver ? `0 0 0 3px ${T.cyan}15` : 'none',
        order: widgets?.find(w => w.id === id)?.position ?? 0,
      }}
    >
      <div
        className="absolute top-2 left-2 z-10 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4" style={{ color: T.fgMuted }} />
      </div>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const T = useThemeColors()
  const { isEnabled } = useFeatureFlags()
  const { widgets, isVisible, getSize, toggle, setSize, reset, moveUp, moveDown, reorder } = useDashboardWidgets()
  const [draggedWidget, setDraggedWidget] = useState(null)
  const [dragOverWidget, setDragOverWidget] = useState(null)

  const MOCK_STATS = {
    total_leads: 0, leads_by_status: {}, total_opportunities: 0,
    pipeline_value: 0, weighted_pipeline: 0, pipeline_by_stage: {},
    actions_overdue: 0, actions_due_today: 0, conversion_rate: 0,
    revenue_won_this_month: 0, revenue_won_this_quarter: 0,
    offers_this_month: 0, offers_accepted_this_month: 0,
    activity_last_7_days: [], upcoming_visits: [], deals_closing_soon: [],
    stale_opportunities: [], top_leads_by_score: [], recent_activity: [],
    leads_by_sector: {},
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data).catch(() => MOCK_STATS),
    staleTime: 60000,
    refetchInterval: 300000,
    placeholderData: MOCK_STATS,
  })

  if (isLoading) return <DashboardSkeleton />

  const pipelineChartData = Object.entries(stats?.pipeline_by_stage || {}).map(([stage, data]) => ({
    stage: stage.replace('_', ' ').toUpperCase(),
    value: data.value / 1000,
    count: data.count,
  }))

  const activityChartData = (stats?.activity_last_7_days || []).map(day => ({
    date: format(parseISO(day.date), 'dd MMM', { locale: es }),
    Emails: day.emails,
    Visitas: day.visits,
    Acciones: day.actions,
  }))

  const handleExportPDF = () => {
    const sections = []
    sections.push({
      heading: 'Resumen de KPIs',
      type: 'metrics',
      data: [
        { label: 'Total Leads', value: stats?.total_leads || 0, color: '#1E6FD9' },
        { label: 'Pipeline Activo', value: `€${((stats?.pipeline_value || 0) / 1000).toFixed(0)}K`, color: '#10B981' },
        { label: 'Pipeline Ponderado', value: `€${((stats?.weighted_pipeline || 0) / 1000).toFixed(0)}K`, color: '#059669' },
        { label: 'Revenue Mes', value: `€${((stats?.revenue_won_this_month || 0) / 1000).toFixed(0)}K`, color: '#F59E0B' },
        { label: 'Ofertas Mes', value: stats?.offers_this_month || 0, color: '#F5820B' },
        { label: 'Tasa de Conversion', value: `${stats?.conversion_rate || 0}%`, color: '#0891B2' },
      ],
    })
    if (pipelineChartData.length > 0) {
      sections.push({
        heading: 'Pipeline por Etapa',
        type: 'table',
        data: {
          rows: pipelineChartData.map(d => ({ Etapa: d.stage, 'Valor (€K)': d.value.toFixed(1), Deals: d.count })),
          headers: [{ key: 'Etapa', label: 'Etapa' }, { key: 'Valor (€K)', label: 'Valor (€K)' }, { key: 'Deals', label: 'Deals' }],
        },
      })
    }
    if (stats?.top_leads_by_score?.length > 0) {
      sections.push({
        heading: 'Top Leads por Score',
        type: 'table',
        data: {
          rows: stats.top_leads_by_score.map((lead, idx) => ({ '#': idx + 1, Empresa: lead.company, Estado: lead.status.replace('_', ' '), Score: lead.score })),
          headers: [{ key: '#', label: '#' }, { key: 'Empresa', label: 'Empresa' }, { key: 'Estado', label: 'Estado' }, { key: 'Score', label: 'Score' }],
        },
      })
    }
    if (stats?.deals_closing_soon?.length > 0) {
      sections.push({
        heading: 'Deals por Cerrar (proximos 14 dias)',
        type: 'table',
        data: {
          rows: stats.deals_closing_soon.map(d => ({ Deal: d.name, Cuenta: d.lead, 'Valor (€)': d.value.toLocaleString('es-ES'), Cierre: d.close_date })),
          headers: [{ key: 'Deal', label: 'Deal' }, { key: 'Cuenta', label: 'Cuenta' }, { key: 'Valor (€)', label: 'Valor (€)' }, { key: 'Cierre', label: 'Cierre' }],
        },
      })
    }
    if (stats?.conversion_funnel?.length > 0) {
      sections.push({
        heading: 'Embudo de Conversion',
        type: 'table',
        data: {
          rows: stats.conversion_funnel.map(s => ({ Etapa: s.stage.replace('_', ' '), Cantidad: s.count, Porcentaje: `${s.percentage}%` })),
          headers: [{ key: 'Etapa', label: 'Etapa' }, { key: 'Cantidad', label: 'Cantidad' }, { key: 'Porcentaje', label: 'Porcentaje' }],
        },
      })
    }
    exportToPDF('Informe Dashboard Comercial', sections)
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-full flex flex-col gap-5" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Onboarding */}
      {isVisible('onboarding') && <OnboardingWizard />}

      {/* Header */}
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="text-xs uppercase tracking-[0.15em]" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>
            St4rtup CRM — Centro de Operaciones
          </p>
          <h1 className="text-3xl font-bold mt-1 tracking-tight" style={{ fontFamily: fontDisplay, color: T.fg }}>
            {format(new Date(), "dd MMM yyyy · HH:mm", { locale: es }).toUpperCase()}
          </h1>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all"
          style={{ fontFamily: fontDisplay, border: `1px solid ${T.border}`, color: T.fgMuted, backgroundColor: T.muted }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${T.cyan}40`; e.currentTarget.style.color = T.fg }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.fgMuted }}
        >
          <FileText className="w-3.5 h-3.5" />
          Exportar
        </button>
        <DashboardCustomizer widgets={widgets} onToggle={toggle} onReset={reset} onMoveUp={moveUp} onMoveDown={moveDown} onSetSize={setSize} />
      </div>

      {/* Status Strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-[0.15em] mr-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Estado</span>
        <StatusIndicator label="vencidas" count={stats?.actions_overdue || 0} severity="danger" to="/app/actions" />
        <StatusIndicator label="acciones hoy" count={stats?.actions_due_today || 0} severity="warning" to="/app/actions" />
        <StatusIndicator label="deals estancados" count={stats?.stale_opportunities || 0} severity="info" to="/app/pipeline" />
        {(stats?.actions_overdue === 0 && stats?.actions_due_today === 0 && stats?.stale_opportunities === 0) && (
          <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>sin alertas</span>
        )}
      </div>

      {/* Command Strip */}
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <span className="text-xs uppercase tracking-[0.15em] px-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Acciones</span>
        <div className="w-px h-4" style={{ backgroundColor: T.border }} />
        {[
          { icon: Plus, label: 'Lead', to: '/app/leads?action=new' },
          { icon: CalendarCheck, label: 'Visita', to: '/app/visits?action=new' },
          { icon: Send, label: 'Email', to: '/app/emails?action=new' },
          { icon: GitBranch, label: 'Pipeline', to: '/app/pipeline' },
          { icon: Receipt, label: 'Ofertas', to: '/app/offers' },
          { icon: Activity, label: 'Informes', to: '/app/reports' },
        ].map(({ icon: Icon, label, to }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded transition-colors"
            style={{ color: T.fgMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.fg; e.currentTarget.style.backgroundColor = T.muted }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.fgMuted; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Bento KPI Grid */}
      {isVisible('kpis') && <DraggableSection id="kpis" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <Readout label="Revenue Mes" value={`€${((stats?.revenue_won_this_month || 0) / 1000).toFixed(0)}K`} color={T.warning} subtext="cerrados este mes" icon={Activity} />
          </div>
          <Readout label="Revenue Trim." value={`€${((stats?.revenue_won_this_quarter || 0) / 1000).toFixed(0)}K`} subtext="Q actual" icon={Activity} />
          <Readout label="Ofertas" value={stats?.offers_this_month || 0} subtext={`${stats?.offers_accepted_this_month || 0} aceptadas`} icon={FileText} />
          <Readout label="Conversion" value={`${stats?.conversion_rate || 0}%`} trend={stats?.conversion_trend} color={T.success} icon={GitBranch} />
          <Readout label="Leads" value={stats?.total_leads || 0} trend={stats?.leads_trend} subtext="total base" icon={Send} />
          <div className="col-span-2">
            <Readout label="Pipeline Activo" value={`€${((stats?.pipeline_value || 0) / 1000).toFixed(0)}K`} trend={stats?.pipeline_trend} color={T.cyan} icon={GitBranch} />
          </div>
          <div className="col-span-2">
            <Readout label="Pipeline Ponderado" value={`€${((stats?.weighted_pipeline || 0) / 1000).toFixed(0)}K`} subtext="prob. ponderada" icon={GitBranch} />
          </div>
          <Readout label="Visitas Prox. 7d" value={stats?.upcoming_visits?.length || 0} icon={CalendarCheck} />
          <Readout label="Deals por Cerrar" value={stats?.deals_closing_soon?.length || 0} color={T.warning} subtext="proximos 14 dias" icon={Receipt} />
        </div>
      </DraggableSection>}

      {/* Charts */}
      {isVisible('charts') && <DraggableSection id="charts" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Pipeline por etapa">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
                <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false}
                  label={{ value: '€K', angle: 0, position: 'insideTopLeft', fontSize: 10, fill: T.fgMuted, fontFamily: fontMono, offset: -5 }} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: T.muted }} formatter={(value) => [`€${value.toFixed(1)}K`, 'Valor']} />
                <Bar dataKey="value" fill="url(#gradPipeline)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN DATOS</div>
          )}
        </Panel>

        <Panel title="Actividad — ultimos 7 dias">
          {activityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activityChartData}>
                <defs>
                  <linearGradient id="gradEmails" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.cyan} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={T.cyan} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.warning} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={T.warning} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradAcciones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.purple} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={T.purple} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
                <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: T.border }} />
                <Area type="monotone" dataKey="Emails" stackId="1" stroke={T.cyan} fill="url(#gradEmails)" strokeWidth={2} />
                <Area type="monotone" dataKey="Visitas" stackId="1" stroke={T.warning} fill="url(#gradVisitas)" strokeWidth={2} />
                <Area type="monotone" dataKey="Acciones" stackId="1" stroke={T.purple} fill="url(#gradAcciones)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN ACTIVIDAD</div>
          )}
          <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: T.cyan }} /> Emails</span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: T.warning }} /> Visitas</span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: T.purple }} /> Acciones</span>
          </div>
        </Panel>
      </div>
      </DraggableSection>}

      {/* Revenue Waterfall & Team Activity Radar */}
      {isVisible('charts') && <DraggableSection id="charts" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <WaterfallAndRadarSection />
      </DraggableSection>}

      {/* Activity Heatmap (GitHub-style) — gated by feature flag */}
      {isEnabled('activity_heatmap') && isVisible('activity') && <DraggableSection id="activity" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <ActivityHeatmap months={6} />
      </DraggableSection>}

      {/* Conversion Funnel + Deals */}
      {isVisible('pipeline') && <DraggableSection id="pipeline" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Embudo de conversion" className="lg:col-span-2">
          {stats?.conversion_funnel && stats.conversion_funnel.length > 0 ? (
            <div className="space-y-2">
              {stats.conversion_funnel.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="text-xs uppercase w-24 text-right shrink-0 tracking-wide" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                    {stage.stage.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: T.muted }}>
                    <div className="h-full transition-all" style={{ width: `${Math.max(stage.percentage, 3)}%`, backgroundColor: `${T.cyan}40`, borderRight: `2px solid ${T.cyan}80` }} />
                  </div>
                  <span className="text-sm w-10 text-right tabular-nums" style={{ fontFamily: fontMono, color: T.fg }}>{stage.count}</span>
                  <span className="text-xs w-12 text-right tabular-nums" style={{ fontFamily: fontMono, color: T.fgMuted }}>({stage.percentage}%)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN DATOS</div>
          )}
        </Panel>

        <Panel title="Deals por cerrar — 14d">
          {stats?.deals_closing_soon && stats.deals_closing_soon.length > 0 ? (
            <div className="space-y-1">
              {stats.deals_closing_soon.map((deal) => (
                <Link key={deal.id} to="/app/pipeline"
                  className="block px-3 py-2 rounded transition-colors -ml-px"
                  style={{ borderLeft: '2px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = T.muted; e.currentTarget.style.borderLeftColor = `${T.cyan}60` }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{deal.name}</p>
                    <span className="text-sm tabular-nums ml-2" style={{ fontFamily: fontMono, color: T.warning }}>€{(deal.value / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs" style={{ color: T.fgMuted }}>{deal.lead}</p>
                    <p className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                      {deal.close_date && formatDistanceToNow(parseISO(deal.close_date), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN DEALS PROX.</div>
          )}
        </Panel>
      </div>
      </DraggableSection>}

      {/* Top Leads + Activity Feed */}
      {isVisible('activity') && <DraggableSection id="activity" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top leads — score">
          {stats?.top_leads_by_score && stats.top_leads_by_score.length > 0 ? (
            <div className="space-y-0">
              {stats.top_leads_by_score.map((lead, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                const scoreColor = lead.score >= 80 ? T.success : lead.score >= 50 ? T.warning : T.fgMuted
                return (
                  <div key={lead.id}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg transition-all cursor-default group"
                    style={{ borderBottom: `1px solid ${T.border}20` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${T.cyan}06`; e.currentTarget.style.borderBottomColor = `${T.cyan}15` }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderBottomColor = `${T.border}20` }}
                  >
                    <span className="text-sm w-6 text-center shrink-0" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                      {medal || (idx + 1)}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: `linear-gradient(135deg, ${T.cyan}20, ${T.purple}15)`, color: T.cyan }}>
                      {lead.company?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{lead.company}</p>
                      <p className="text-xs uppercase tracking-wide" style={{ color: T.fgMuted }}>{lead.status.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: T.muted }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(lead.score, 100)}%`, background: `linear-gradient(90deg, ${scoreColor}60, ${scoreColor})` }} />
                      </div>
                      <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ fontFamily: fontMono, color: scoreColor }}>{lead.score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN LEADS</div>
          )}
        </Panel>

        <Panel title="Registro de actividad">
          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="space-y-0">
              {stats.recent_activity.map((activity, idx) => {
                const typeConfig = {
                  email: { char: 'E', color: T.cyan, label: 'Email' },
                  visit: { char: 'V', color: T.warning, label: 'Visita' },
                  action: { char: 'A', color: T.purple, label: 'Accion' },
                }[activity.type] || { char: '-', color: T.fgMuted, label: '' }

                return (
                  <div key={idx}
                    className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg transition-all"
                    style={{ borderBottom: `1px solid ${T.border}20` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${typeConfig.color}06` }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <span className="text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ fontFamily: fontMono, color: typeConfig.color, backgroundColor: `${typeConfig.color}12`, border: `1px solid ${typeConfig.color}20` }}>
                      {typeConfig.char}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: T.fg }}>{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium" style={{ color: T.fgMuted }}>{activity.lead}</span>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: T.border }} />
                        <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                          {activity.timestamp && new Date(activity.timestamp).toLocaleDateString('es-ES', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN ACTIVIDAD</div>
          )}
        </Panel>
      </div>
      </DraggableSection>}

      {/* Distribution Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {stats?.leads_by_sector && Object.keys(stats.leads_by_sector).length > 0 && (
          <Panel title="Distribucion sectorial">
            <div className="space-y-2">
              {Object.entries(stats.leads_by_sector).sort(([,a], [,b]) => b - a).slice(0, 6).map(([sector, count]) => {
                const total = Object.values(stats.leads_by_sector).reduce((sum, val) => sum + val, 0)
                const pct = (count / total * 100).toFixed(0)
                return (
                  <div key={sector} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate text-right shrink-0" style={{ color: T.fgMuted }}>{sector}</span>
                    <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ backgroundColor: T.muted }}>
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: `${T.cyan}40` }} />
                    </div>
                    <span className="text-xs tabular-nums w-6 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        {stats?.leads_by_status && Object.keys(stats.leads_by_status).length > 0 && (
          <Panel title="Leads por estado">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.leads_by_status).map(([status, count]) => (
                <div key={status}
                  className="px-3 py-3 rounded-lg text-center transition-all cursor-default"
                  style={{ backgroundColor: T.muted }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${T.cyan}08`; e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = T.muted; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: fontMono, color: T.fg }}>{count}</p>
                  <p className="text-xs uppercase tracking-[0.15em] mt-0.5" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="Proximas visitas — 7d">
          {stats?.upcoming_visits && stats.upcoming_visits.length > 0 ? (
            <div className="space-y-0">
              {stats.upcoming_visits.map((visit) => (
                <Link key={visit.id} to="/app/visits"
                  className="flex items-center gap-3 py-2 transition-colors -mx-1 px-1 rounded"
                  style={{ borderBottom: `1px solid ${T.border}40` }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.muted}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: T.muted }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: T.fgMuted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{visit.company}</p>
                    <p className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                      {format(parseISO(visit.date), "dd MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  {visit.attendees && visit.attendees.length > 0 && (
                    <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{visit.attendees.length}p</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>SIN VISITAS</div>
          )}
        </Panel>
      </div>

      {/* Marketing, Automations & Agents */}
      {isVisible('marketing') && <DraggableSection id="marketing" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className={getSize('marketing') === 'lg' ? 'lg:col-span-2' : getSize('marketing') === 'sm' ? '' : ''}><MarketingSummary /></div>
      </DraggableSection>}
      {isVisible('automations') && <DraggableSection id="automations" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className={getSize('automations') === 'lg' ? 'lg:col-span-2' : getSize('automations') === 'sm' ? '' : ''}><AutomationsSummary /></div>
      </DraggableSection>}
      {isVisible('agents') && <DraggableSection id="agents" draggedWidget={draggedWidget} setDraggedWidget={setDraggedWidget} dragOverWidget={dragOverWidget} setDragOverWidget={setDragOverWidget} onReorder={reorder} widgets={widgets}>
        <div className={getSize('agents') === 'lg' ? 'lg:col-span-2' : getSize('agents') === 'sm' ? '' : ''}><AgentsSummary /></div>
      </DraggableSection>}
    </div>
  )
}
