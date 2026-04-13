import { useQuery } from '@tanstack/react-query'
import { BarChart3, Phone, Clock, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { callsApi } from '@/services/api'
import { useThemeColors, fontDisplay, fontMono } from '@/utils/theme'



const RESULTADO_COLORS = {
  demo_agendada: '#22c55e',
  interesado: '#06b6d4',
  propuesta_solicitada: '#3b82f6',
  callback: '#eab308',
  sin_respuesta: '#6b7280',
  no_interesado: '#ef4444',
  buzon: '#a855f7',
}

const RESULTADO_LABELS = {
  demo_agendada: 'Demo agendada',
  interesado: 'Interesado',
  propuesta_solicitada: 'Propuesta',
  callback: 'Callback',
  sin_respuesta: 'Sin respuesta',
  no_interesado: 'No interesado',
  buzon: 'Buzon',
}

export default function CallsDashboardPage() {
  const T = useThemeColors()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['calls', 'stats'],
    queryFn: () => callsApi.stats().then(r => r.data),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>
  }

  const resultadosChart = stats?.resultados
    ? Object.entries(stats.resultados).filter(([, count]) => count > 0)
        .map(([key, count]) => ({ name: RESULTADO_LABELS[key] || key, value: count, fill: RESULTADO_COLORS[key] || '#6b7280' }))
    : []

  const barData = stats?.resultados
    ? Object.entries(stats.resultados).map(([key, count]) => ({
        name: RESULTADO_LABELS[key] || key, cantidad: count, fill: RESULTADO_COLORS[key] || '#6b7280',
      }))
    : []

  const conversionRate = stats && stats.total > 0
    ? (((stats.resultados?.demo_agendada || 0) + (stats.resultados?.propuesta_solicitada || 0)) / stats.total * 100).toFixed(1)
    : 0

  const kpis = [
    { icon: Phone, label: 'Total llamadas', value: stats?.total || 0, color: T.cyan },
    { icon: TrendingUp, label: 'Tasa conversion', value: `${conversionRate}%`, color: T.success },
    { icon: Clock, label: 'Duracion media', value: stats?.avg_duration_seconds ? `${Math.round(stats.avg_duration_seconds / 60)}m ${Math.round(stats.avg_duration_seconds % 60)}s` : '—', color: 'hsl(210,70%,55%)' },
    { icon: DollarSign, label: 'Coste total', value: stats?.total_cost_eur ? `${stats.total_cost_eur.toFixed(2)}€` : '0€', color: T.purple },
    { icon: Phone, label: 'Activas ahora', value: stats?.activas || 0, color: T.warning },
  ]

  const linkStyle = {
    backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted,
    borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 space-y-6" style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"
            style={{ fontFamily: fontDisplay, color: T.fg }}>
            <BarChart3 className="w-7 h-7" style={{ color: T.cyan }} />
            Dashboard Llamadas IA
          </h1>
          <p className="mt-1 text-sm" style={{ color: T.fgMuted }}>Metricas y rendimiento de llamadas con Retell AI</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/calls" style={linkStyle}>Consola</Link>
          <Link to="/app/calls/queues" style={linkStyle}>Colas</Link>
          <Link to="/app/calls/history" style={linkStyle}>Historial</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: `${kpi.color}10` }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-sm" style={{ color: T.fgMuted }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: T.fg }}>Resultados por tipo</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <defs>
                  {Object.entries(RESULTADO_COLORS).map(([key, color]) => (
                    <linearGradient key={`gradRes-${key}`} id={`gradRes-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.fgMuted }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fill: T.fgMuted }} />
                <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.fg }} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => {
                    const gradKey = Object.entries(RESULTADO_LABELS).find(([, label]) => label === entry.name)?.[0]
                    return <Cell key={i} fill={gradKey ? `url(#gradRes-${gradKey})` : entry.fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: T.fgMuted }}>Sin datos aun</div>
          )}
        </div>

        <div className="rounded-xl p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: T.fg }}>Distribucion de resultados</h3>
          {resultadosChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={resultadosChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  {resultadosChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.fg }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: T.fgMuted }}>Sin datos aun</div>
          )}
        </div>
      </div>

      {/* Retell status */}
      {stats && (
        <div className="rounded-xl p-4"
          style={{
            backgroundColor: stats.retell_configured ? `${T.success}10` : `${T.warning}10`,
            border: `1px solid ${stats.retell_configured ? `${T.success}30` : `${T.warning}30`}`,
          }}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${!stats.retell_configured ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: stats.retell_configured ? T.success : T.warning }} />
            <span className="text-sm font-medium"
              style={{ color: stats.retell_configured ? T.success : T.warning }}>
              {stats.retell_configured ? 'Retell AI conectado' : 'Retell AI no configurado — las llamadas se simularan'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
