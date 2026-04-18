import { useQuery } from '@tanstack/react-query'
import { dashboardApi, settingsApi } from '@/services/api'
import { useThemeColors, fontDisplay, fontMono } from '@/utils/theme'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, DollarSign, Users, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

function KpiHero({ label, value, trend, prefix = '', color }) {
  const T = useThemeColors()
  const trendColor = !trend || trend === 0 ? T.fgMuted : trend > 0 ? '#10B981' : '#EF4444'
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: T.fgMuted }}>{label}</p>
      <div className="flex items-end gap-3">
        <p className="text-4xl font-bold" style={{ fontFamily: fontMono, color: color || T.fg }}>{prefix}{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className="flex items-center gap-1 text-sm font-bold mb-1" style={{ color: trendColor }}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}

function RetentionDonut({ value = 89.1 }) {
  const T = useThemeColors()
  const data = [{ name: 'Retained', value }, { name: 'Churned', value: 100 - value }]
  const COLORS = ['#10B981', `${T.border}`]
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ fontFamily: fontMono, color: '#10B981' }}>{value}%</span>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: T.fgMuted }}>Retención</span>
        </div>
      </div>
    </div>
  )
}

function RiskItem({ type, title, description, severity }) {
  const colors = { risk: '#EF4444', opportunity: '#10B981', warning: '#F59E0B' }
  const icons = { risk: AlertTriangle, opportunity: Target, warning: AlertTriangle }
  const Icon = icons[type] || AlertTriangle
  const color = colors[type] || '#F59E0B'
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}15` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{description}</p>
      </div>
    </div>
  )
}

export default function ExecutivePage() {
  const T = useThemeColors()
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
  })
  const { data: costs } = useQuery({
    queryKey: ['platform-costs'],
    queryFn: () => settingsApi.platformCosts().then(r => r.data),
  })

  const pipeline = stats?.pipeline_value || 0
  const weighted = stats?.weighted_pipeline || 0
  const leads = stats?.total_leads || 0
  const conversion = stats?.conversion_rate || 0
  const monthlySpend = costs?.total_monthly || 0

  // Mock retention — in real app this comes from churn_records
  const retention = 89.1

  // Revenue trend mini chart
  const revenueTrend = [
    { m: 'Oct', v: 0 }, { m: 'Nov', v: 0 }, { m: 'Dec', v: 2 },
    { m: 'Ene', v: 5 }, { m: 'Feb', v: 8 }, { m: 'Mar', v: 12 },
    { m: 'Abr', v: stats?.revenue_won_this_month || 0 },
  ]

  // Risks & Opportunities
  const risks = []
  const opportunities = []

  if (stats?.actions_overdue > 0)
    risks.push({ type: 'risk', title: `${stats.actions_overdue} acciones vencidas`, description: 'Acciones sin completar pasada su fecha límite.' })
  if (stats?.deals_closing_soon?.length > 0)
    opportunities.push({ type: 'opportunity', title: `${stats.deals_closing_soon.length} deals por cerrar`, description: 'Oportunidades que cierran en los próximos 14 días.' })
  if (conversion < 10)
    risks.push({ type: 'warning', title: `Conversión baja: ${conversion}%`, description: 'La tasa de conversión está por debajo del 10%. Revisar cualificación de leads.' })
  if (leads > 0 && stats?.upcoming_visits?.length === 0)
    risks.push({ type: 'warning', title: 'Sin visitas programadas', description: 'No hay visitas próximas. Considera agendar reuniones con leads cualificados.' })
  if (pipeline > 20000)
    opportunities.push({ type: 'opportunity', title: `Pipeline de €${(pipeline/1000).toFixed(0)}K`, description: 'Pipeline sano. Focalizar esfuerzo en deals en negociación.' })
  if (monthlySpend < 30)
    opportunities.push({ type: 'opportunity', title: `Costes controlados: €${monthlySpend.toFixed(0)}/mes`, description: 'Infraestructura muy eficiente. Margen operativo alto.' })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: fontDisplay }}>Resumen Ejecutivo</h1>
        <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Indicadores clave y métricas de rendimiento para decisiones ejecutivas.</p>
      </div>

      {/* Executive Summary banner */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: `${T.primary}08`, border: `1px solid ${T.primary}15` }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4" style={{ color: T.primary }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.primary }}>Executive Summary</span>
        </div>
        <p className="text-sm" style={{ color: T.fg }}>
          Pipeline activo de €{(pipeline/1000).toFixed(0)}K con {leads} leads.
          {conversion > 0 ? ` Conversión del ${conversion}%.` : ''}
          {monthlySpend > 0 ? ` Costes operativos: €${monthlySpend.toFixed(0)}/mes.` : ''}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiHero label="Pipeline" value={`${(pipeline/1000).toFixed(0)}K`} prefix="€" trend={stats?.pipeline_trend} color={T.primary} />
        <KpiHero label="Ponderado" value={`${(weighted/1000).toFixed(0)}K`} prefix="€" color="#8B5CF6" />
        <KpiHero label="Leads" value={leads} trend={stats?.leads_trend} color="#F59E0B" />
        <KpiHero label="Conversión" value={`${conversion}%`} trend={stats?.conversion_trend} color="#10B981" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-bold mb-4">Evolución Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={T.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.fgMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.fgMuted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="v" stroke={T.primary} fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Retention donut */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-bold mb-2">Retención</h3>
          <p className="text-xs mb-4" style={{ color: T.fgMuted }}>Porcentaje de clientes retenidos últimos 12 meses</p>
          <RetentionDonut value={retention} />
        </div>
      </div>

      {/* Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} /> Risks
          </h3>
          <div className="space-y-2">
            {risks.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>Sin riesgos detectados</p>
            ) : risks.map((r, i) => <RiskItem key={i} {...r} />)}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: '#10B981' }} /> Opportunities
          </h3>
          <div className="space-y-2">
            {opportunities.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>Sin oportunidades detectadas</p>
            ) : opportunities.map((o, i) => <RiskItem key={i} {...o} />)}
          </div>
        </div>
      </div>

      {/* Costs overview */}
      {costs && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: '#F59E0B' }} /> Costes Operativos
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.primary }}>€{monthlySpend.toFixed(0)}</p>
              <p className="text-xs" style={{ color: T.fgMuted }}>Mensual</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: fontMono }}>€{(monthlySpend * 12).toFixed(0)}</p>
              <p className="text-xs" style={{ color: T.fgMuted }}>Anual</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: '#10B981' }}>{(costs.costs || []).filter(c => c.is_active).length}</p>
              <p className="text-xs" style={{ color: T.fgMuted }}>Servicios</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
