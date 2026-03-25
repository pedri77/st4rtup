import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { Link } from 'react-router-dom'
import {
  GitBranch, CalendarCheck, Calendar,
  FileText, Plus, Send, Receipt, Activity
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

const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  border: '#E2E8F0',
  fg: '#0F172A',
  fgMuted: '#64748B',
  cyan: '#1E6FD9',
  purple: '#F5820B',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const chartTooltipStyle = {
  backgroundColor: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: '6px',
  color: T.fg,
  fontSize: '12px',
  fontFamily: fontMono,
}

function Readout({ label, value, trend, subtext, color }) {
  const trendColor = !trend || trend === 0
    ? T.fgMuted
    : trend > 0 ? T.success : T.destructive
  const trendArrow = !trend || trend === 0 ? '' : trend > 0 ? '+' : ''

  return (
    <div className="px-4 py-3" style={{ backgroundColor: T.card }}>
      <p className="text-xs uppercase tracking-[0.15em]" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums" style={{ fontFamily: fontMono, color: color || T.fg }}>{value}</p>
      <div className="flex items-center gap-3 mt-0.5">
        {trend !== undefined && trend !== 0 && (
          <span className="text-xs" style={{ fontFamily: fontMono, color: trendColor }}>
            {trendArrow}{trend}%
          </span>
        )}
        {subtext && <span className="text-xs" style={{ color: T.fgMuted }}>{subtext}</span>}
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
    queryFn: () => dashboardApi.waterfall().then(r => r.data),
    staleTime: 120000,
  })

  const { data: radarData, isLoading: radarLoading } = useQuery({
    queryKey: ['dashboard-activity-radar'],
    queryFn: () => dashboardApi.activityRadar({ days: 7 }).then(r => r.data),
    staleTime: 120000,
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
              <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
              <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: T.muted }}
                formatter={(value) => [`${typeof value === 'number' ? value.toLocaleString('es-ES') : value}`, 'Valor']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} opacity={0.85}>
                {waterfallChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.type === 'increase' ? T.success : entry.type === 'decrease' ? T.destructive : T.cyan} />
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

export default function DashboardPage() {
  const { widgets, isVisible, getSize, toggle, setSize, reset, moveUp, moveDown } = useDashboardWidgets()

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
    <div className="space-y-5 -m-4 md:-m-8 p-4 md:p-8 min-h-full" style={{ backgroundColor: T.bg }}>
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
        <StatusIndicator label="vencidas" count={stats?.actions_overdue || 0} severity="danger" to="/actions" />
        <StatusIndicator label="acciones hoy" count={stats?.actions_due_today || 0} severity="warning" to="/actions" />
        <StatusIndicator label="deals estancados" count={stats?.stale_opportunities || 0} severity="info" to="/pipeline" />
        {(stats?.actions_overdue === 0 && stats?.actions_due_today === 0 && stats?.stale_opportunities === 0) && (
          <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>sin alertas</span>
        )}
      </div>

      {/* Command Strip */}
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <span className="text-xs uppercase tracking-[0.15em] px-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Acciones</span>
        <div className="w-px h-4" style={{ backgroundColor: T.border }} />
        {[
          { icon: Plus, label: 'Lead', to: '/leads?action=new' },
          { icon: CalendarCheck, label: 'Visita', to: '/visits?action=new' },
          { icon: Send, label: 'Email', to: '/emails?action=new' },
          { icon: GitBranch, label: 'Pipeline', to: '/pipeline' },
          { icon: Receipt, label: 'Ofertas', to: '/offers' },
          { icon: Activity, label: 'Informes', to: '/reports' },
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

      {/* Primary Readouts */}
      {isVisible('kpis') && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: T.border }}>
        <Readout label="Revenue Mes" value={`€${((stats?.revenue_won_this_month || 0) / 1000).toFixed(0)}K`} color={T.warning} subtext="cerrados este mes" />
        <Readout label="Revenue Trim." value={`€${((stats?.revenue_won_this_quarter || 0) / 1000).toFixed(0)}K`} subtext="Q actual" />
        <Readout label="Ofertas" value={stats?.offers_this_month || 0} subtext={`${stats?.offers_accepted_this_month || 0} aceptadas`} />
        <Readout label="Conversion" value={`${stats?.conversion_rate || 0}%`} trend={stats?.conversion_trend} color={T.success} />
        <Readout label="Leads" value={stats?.total_leads || 0} trend={stats?.leads_trend} subtext="total base" />
        <Readout label="Pipeline" value={`€${((stats?.pipeline_value || 0) / 1000).toFixed(0)}K`} trend={stats?.pipeline_trend} color={T.cyan} />
      </div>}

      {/* Secondary Readout */}
      <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: T.border }}>
        <Readout label="Pipeline Ponderado" value={`€${((stats?.weighted_pipeline || 0) / 1000).toFixed(0)}K`} subtext="prob. ponderada" />
        <Readout label="Visitas Prox. 7d" value={stats?.upcoming_visits?.length || 0} />
        <Readout label="Deals por Cerrar" value={stats?.deals_closing_soon?.length || 0} color={T.warning} subtext="proximos 14 dias" />
      </div>

      {/* Charts */}
      {isVisible('charts') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Pipeline por etapa">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} barCategoryGap="20%">
                <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
                <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false}
                  label={{ value: '€K', angle: 0, position: 'insideTopLeft', fontSize: 10, fill: T.fgMuted, fontFamily: fontMono, offset: -5 }} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: T.muted }} formatter={(value) => [`€${value.toFixed(1)}K`, 'Valor']} />
                <Bar dataKey="value" fill={T.cyan} radius={[4, 4, 0, 0]} opacity={0.8} />
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
                <CartesianGrid stroke={T.border} strokeDasharray="none" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
                <YAxis tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: T.border }} />
                <Area type="monotone" dataKey="Emails" stackId="1" stroke={T.cyan} fill={T.cyan} fillOpacity={0.15} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Visitas" stackId="1" stroke={T.warning} fill={T.warning} fillOpacity={0.12} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Acciones" stackId="1" stroke={T.purple} fill={T.purple} fillOpacity={0.1} strokeWidth={1} />
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
      </div>}

      {/* Revenue Waterfall & Team Activity Radar */}
      {isVisible('charts') && <WaterfallAndRadarSection />}

      {/* Activity Heatmap (GitHub-style) */}
      {isVisible('activity') && <ActivityHeatmap months={6} />}

      {/* Conversion Funnel + Deals */}
      {isVisible('pipeline') && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                <Link key={deal.id} to="/pipeline"
                  className="block px-3 py-2 rounded transition-colors -ml-px"
                  style={{ borderLeft: '2px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = T.muted; e.currentTarget.style.borderLeftColor = `${T.cyan}60` }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent' }}
                >
                  <div className="flex items-center justify-between">
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
      </div>}

      {/* Top Leads + Activity Feed */}
      {isVisible('activity') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top leads — score">
          {stats?.top_leads_by_score && stats.top_leads_by_score.length > 0 ? (
            <div className="space-y-0">
              {stats.top_leads_by_score.map((lead, idx) => (
                <div key={lead.id} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${T.border}40` }}>
                  <span className="text-xs w-4 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{lead.company}</p>
                    <p className="text-xs uppercase tracking-wide" style={{ color: T.fgMuted }}>{lead.status.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 rounded overflow-hidden" style={{ backgroundColor: T.muted }}>
                      <div className="h-full" style={{ width: `${Math.min(lead.score, 100)}%`, backgroundColor: `${T.cyan}80` }} />
                    </div>
                    <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ fontFamily: fontMono, color: T.fg }}>{lead.score}</span>
                  </div>
                </div>
              ))}
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
                  email: { char: 'E', color: T.cyan },
                  visit: { char: 'V', color: T.warning },
                  action: { char: 'A', color: T.purple },
                }[activity.type] || { char: '-', color: T.fgMuted }

                return (
                  <div key={idx} className="flex items-start gap-2.5 py-2" style={{ borderBottom: `1px solid ${T.border}40` }}>
                    <span className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                      style={{ fontFamily: fontMono, color: typeConfig.color, backgroundColor: `${typeConfig.color}15` }}>
                      {typeConfig.char}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: T.fg }}>{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium" style={{ color: T.fgMuted }}>{activity.lead}</span>
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
      </div>}

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
            <div className="grid grid-cols-2 gap-px rounded overflow-hidden" style={{ backgroundColor: T.border }}>
              {Object.entries(stats.leads_by_status).map(([status, count]) => (
                <div key={status} className="px-3 py-2.5 text-center" style={{ backgroundColor: T.card }}>
                  <p className="text-lg font-bold tabular-nums" style={{ fontFamily: fontMono, color: T.fg }}>{count}</p>
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
                <Link key={visit.id} to="/visits"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isVisible('marketing') && <div className={getSize('marketing') === 'lg' ? 'lg:col-span-2' : getSize('marketing') === 'sm' ? '' : ''}><MarketingSummary /></div>}
        {isVisible('automations') && <div className={getSize('automations') === 'lg' ? 'lg:col-span-2' : getSize('automations') === 'sm' ? '' : ''}><AutomationsSummary /></div>}
        {isVisible('agents') && <div className={getSize('agents') === 'lg' ? 'lg:col-span-2' : getSize('agents') === 'sm' ? '' : ''}><AgentsSummary /></div>}
      </div>
    </div>
  )
}
