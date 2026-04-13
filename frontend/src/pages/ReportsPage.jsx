import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  FileText, Download, Calendar, TrendingUp,
  Target, Activity, DollarSign, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '@/services/api'
import { exportToPDF } from '@/utils/exportPdf'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const REPORT_TYPES = [
  { id: 'sales', name: 'Rendimiento de Ventas', icon: DollarSign, color: T.success },
  { id: 'conversion', name: 'Embudo de Conversion', icon: TrendingUp, color: T.cyan },
  { id: 'pipeline', name: 'Salud del Pipeline', icon: Target, color: T.purple },
  { id: 'activity', name: 'Actividad Comercial', icon: Activity, color: T.warning },
  { id: 'leaderboard', name: 'Top Cuentas', icon: Award, color: 'hsl(45,100%,55%)' },
]

const PERIODS = [
  { id: 'last_7', name: '7 dias' },
  { id: 'last_30', name: '30 dias' },
  { id: 'last_90', name: '90 dias' },
  { id: 'this_month', name: 'Este mes' },
  { id: 'last_month', name: 'Mes anterior' },
  { id: 'this_year', name: 'Este ano' },
]

const PIPELINE_COLORS = [T.cyan, T.success, T.warning, T.purple, '#10B981', T.destructive, 'hsl(330,80%,55%)']

const TOOLTIP_STYLE = { backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fg, borderRadius: 8 }

function downloadCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const T = useThemeColors()
  const [selectedReport, setSelectedReport] = useState('sales')
  const [period, setPeriod] = useState('last_30')

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', period],
    queryFn: () => reportsApi.salesPerformance(period).then(r => r.data),
    enabled: selectedReport === 'sales',
  })

  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ['reports', 'funnel', period],
    queryFn: () => reportsApi.conversionFunnel(period).then(r => r.data),
    enabled: selectedReport === 'conversion',
  })

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['reports', 'activity', period],
    queryFn: () => reportsApi.activity(period).then(r => r.data),
    enabled: selectedReport === 'activity',
  })

  const { data: topData, isLoading: topLoading } = useQuery({
    queryKey: ['reports', 'top-accounts'],
    queryFn: () => reportsApi.topAccounts(10).then(r => r.data),
    enabled: selectedReport === 'leaderboard',
  })

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['reports', 'sources'],
    queryFn: () => reportsApi.leadsBySource().then(r => r.data),
    enabled: selectedReport === 'pipeline',
  })

  const isLoading = (selectedReport === 'sales' && salesLoading) ||
    (selectedReport === 'conversion' && funnelLoading) ||
    (selectedReport === 'activity' && activityLoading) ||
    (selectedReport === 'leaderboard' && topLoading) ||
    (selectedReport === 'pipeline' && sourcesLoading)

  const handleExportCSV = () => {
    const reportName = REPORT_TYPES.find(r => r.id === selectedReport)?.name || selectedReport
    let rows = []
    if (selectedReport === 'sales' && salesData) rows = [salesData.offers]
    else if (selectedReport === 'conversion' && funnelData) rows = funnelData.funnel
    else if (selectedReport === 'activity' && activityData) rows = [activityData.totals]
    else if (selectedReport === 'leaderboard' && topData) rows = topData.accounts
    else if (selectedReport === 'pipeline' && sourcesData) rows = sourcesData.sources
    if (rows.length) {
      downloadCSV(rows, `st4rtup_${selectedReport}_${period}.csv`)
      toast.success(`Exportado "${reportName}"`)
    }
  }

  const handleExportPDF = () => {
    const reportName = REPORT_TYPES.find(r => r.id === selectedReport)?.name || selectedReport
    const sections = []

    if (selectedReport === 'sales' && salesData) {
      sections.push({
        heading: 'KPIs de Ventas', type: 'metrics',
        data: [
          { label: 'Ofertas totales', value: salesData.offers.total, color: T.cyan },
          { label: 'Aceptadas', value: salesData.offers.accepted, color: T.success },
          { label: 'Conversion', value: `${salesData.offers.conversion_rate}%`, color: T.warning },
          { label: 'Valor ganado', value: `${salesData.offers.won_value.toLocaleString()} EUR`, color: T.purple },
        ],
      })
    } else if (selectedReport === 'conversion' && funnelData) {
      sections.push({
        heading: 'Embudo de Conversion', type: 'table',
        data: { rows: funnelData.funnel, headers: [{ key: 'stage', label: 'Etapa' }, { key: 'count', label: 'Cantidad' }, { key: 'rate', label: '% del Total' }] },
      })
    } else if (selectedReport === 'leaderboard' && topData) {
      sections.push({
        heading: 'Top Cuentas', type: 'table',
        data: {
          rows: topData.accounts.map((a, i) => ({ '#': i + 1, Cuenta: a.company_name, Pipeline: `${a.pipeline_value.toLocaleString()} EUR`, Ganado: `${a.won_value.toLocaleString()} EUR`, Score: a.score })),
          headers: [{ key: '#', label: '#' }, { key: 'Cuenta', label: 'Cuenta' }, { key: 'Pipeline', label: 'Pipeline' }, { key: 'Ganado', label: 'Ganado' }, { key: 'Score', label: 'Score' }],
        },
      })
    }

    exportToPDF(reportName, sections)
    toast.success(`Generando PDF "${reportName}"...`)
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Informes Avanzados</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Analisis detallado de rendimiento comercial</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {REPORT_TYPES.map((report) => (
          <button key={report.id} onClick={() => setSelectedReport(report.id)}
            className="p-4 rounded-lg text-left transition-all"
            style={{
              backgroundColor: selectedReport === report.id ? `${T.cyan}10` : T.card,
              border: `2px solid ${selectedReport === report.id ? T.cyan : T.border}`,
            }}>
            <report.icon className="w-6 h-6 mb-2" style={{ color: report.color }} />
            <p className="text-sm font-semibold" style={{ color: T.fg }}>{report.name}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5" style={{ color: T.fgMuted }} />
          <span className="text-sm font-medium" style={{ color: T.fgMuted }}>Periodo:</span>
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={period === p.id
                  ? { backgroundColor: T.cyan, color: T.bg, fontFamily: fontDisplay }
                  : { backgroundColor: T.muted, color: T.fgMuted, fontFamily: fontDisplay }
                }>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: T.cyan, borderTopColor: 'transparent' }} />
            <p style={{ color: T.fgMuted }}>Generando informe...</p>
          </div>
        </div>
      ) : (
        <>
          {selectedReport === 'sales' && <SalesReport data={salesData} />}
          {selectedReport === 'conversion' && <ConversionReport data={funnelData} />}
          {selectedReport === 'pipeline' && <PipelineReport data={salesData} sourcesData={sourcesData} />}
          {selectedReport === 'activity' && <ActivityReport data={activityData} />}
          {selectedReport === 'leaderboard' && <LeaderboardReport data={topData} />}
        </>
      )}
    </div>
  )
}

function SalesReport({ data }) {
  if (!data) return null
  const { offers, pipeline, leads } = data

  const kpis = [
    { label: 'Ofertas Creadas', value: offers.total, icon: FileText, color: T.cyan },
    { label: 'Ofertas Aceptadas', value: offers.accepted, icon: TrendingUp, color: T.success },
    { label: 'Conversion', value: `${offers.conversion_rate}%`, icon: Target, color: T.warning },
    { label: 'Valor Ganado', value: `${offers.won_value.toLocaleString()} EUR`, icon: DollarSign, color: T.purple },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: T.fgMuted }}>{kpi.label}</p>
                <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pipeline.by_stage.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-base font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Pipeline por Etapa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipeline.by_stage}>
              <defs>
                <linearGradient id="gradCyanPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="stage" tick={{ fill: T.fgMuted, fontSize: 12 }} stroke={T.border} />
              <YAxis tick={{ fill: T.fgMuted }} stroke={T.border} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v.toLocaleString()} EUR`} />
              <Bar dataKey="value" fill="url(#gradCyanPipeline)" name="Valor (EUR)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Nuevos Leads', value: leads.new, color: T.cyan },
          { label: 'Cualificados', value: leads.qualified, color: T.success },
          { label: 'Pipeline Total', value: `${pipeline.total_value.toLocaleString()} EUR`, color: T.purple },
        ].map((s, i) => (
          <div key={i} className="rounded-lg p-4 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm mb-1" style={{ color: T.fgMuted }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConversionReport({ data }) {
  if (!data?.funnel) return null

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-base font-bold mb-6" style={{ fontFamily: fontDisplay, color: T.fg }}>Embudo de Conversion</h3>
        <div className="space-y-4">
          {data.funnel.map((stage, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: T.fgMuted }}>{stage.stage}</span>
                <span className="text-sm font-bold" style={{ fontFamily: fontMono, color: T.fg }}>
                  {stage.count} ({stage.rate}%)
                </span>
              </div>
              <div className="w-full rounded-full h-8 overflow-hidden" style={{ backgroundColor: T.muted }}>
                <div className="h-full flex items-center px-3 text-xs font-bold transition-all"
                  style={{ width: `${Math.max(stage.rate, 3)}%`, background: `linear-gradient(90deg, ${T.cyan}, ${T.purple})`, color: T.bg }}>
                  {stage.rate > 5 ? `${stage.rate}%` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.funnel.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          {data.funnel.slice(1).map((stage, idx) => {
            const prev = data.funnel[idx]
            const dropoff = prev.count > 0 ? Math.round((1 - stage.count / prev.count) * 100) : 0
            const dropColor = dropoff > 50 ? T.destructive : dropoff > 30 ? T.warning : T.success
            return (
              <div key={idx} className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p className="text-xs mb-1" style={{ color: T.fgMuted }}>{prev.stage} → {stage.stage}</p>
                <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: dropColor }}>-{dropoff}% drop</p>
                <p className="text-xs mt-1" style={{ color: T.fgMuted }}>{prev.count - stage.count} perdidos</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PipelineReport({ data, sourcesData }) {
  const pipelineStages = data?.pipeline?.by_stage || []
  const sources = sourcesData?.sources || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pipelineStages.length > 0 && (
          <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-base font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Pipeline por Etapa</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pipelineStages} cx="50%" cy="50%" labelLine={false}
                  label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="count" nameKey="stage">
                  {pipelineStages.map((_, index) => (
                    <Cell key={index} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {sources.length > 0 && (
          <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-base font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Leads por Fuente</h3>
            <div className="space-y-3">
              {sources.map((src, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm capitalize" style={{ color: T.fgMuted }}>{src.source}</span>
                    <span className="text-sm" style={{ fontFamily: fontMono, color: T.fg }}>{src.count} leads ({src.conversion_rate}% conv.)</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: T.muted }}>
                    <div className="h-2 rounded-full" style={{
                      width: `${Math.max((src.count / (sources[0]?.count || 1)) * 100, 3)}%`,
                      backgroundColor: PIPELINE_COLORS[idx % PIPELINE_COLORS.length],
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityReport({ data }) {
  if (!data) return null
  const { totals, daily } = data

  const allDates = new Set([
    ...daily.emails.map(d => d.date),
    ...daily.visits.map(d => d.date),
    ...daily.actions_completed.map(d => d.date),
  ])
  const chartData = [...allDates].sort().map(date => ({
    date: date.slice(5),
    emails: daily.emails.find(d => d.date === date)?.count || 0,
    visitas: daily.visits.find(d => d.date === date)?.count || 0,
    acciones: daily.actions_completed.find(d => d.date === date)?.count || 0,
  }))

  const activityStats = [
    { label: 'Emails', value: totals.emails, color: T.cyan },
    { label: 'Visitas', value: totals.visits, color: T.warning },
    { label: 'Acciones Creadas', value: totals.actions, color: T.purple },
    { label: 'Acciones Completadas', value: totals.actions_completed, color: T.success },
  ]

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-base font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Actividad Diaria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="gradCyanActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradWarningActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.warning} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.warning} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradPurpleActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.purple} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={T.purple} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.fgMuted, fontSize: 11 }} stroke={T.border} />
              <YAxis tick={{ fill: T.fgMuted }} stroke={T.border} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: T.fgMuted }} />
              <Bar dataKey="emails" fill="url(#gradCyanActivity)" name="Emails" radius={[6, 6, 0, 0]} />
              <Bar dataKey="visitas" fill="url(#gradWarningActivity)" name="Visitas" radius={[6, 6, 0, 0]} />
              <Bar dataKey="acciones" fill="url(#gradPurpleActivity)" name="Acciones Completadas" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activityStats.map((s, i) => (
          <div key={i} className="rounded-lg p-4 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm mb-1" style={{ color: T.fgMuted }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeaderboardReport({ data }) {
  if (!data?.accounts) return null

  const medalColors = [
    { border: `${T.warning}40`, bg: `${T.warning}10`, badge: `${T.warning}20`, text: T.warning },
    { border: `${T.fgMuted}40`, bg: `${T.fgMuted}10`, badge: `${T.fgMuted}20`, text: T.fgMuted },
    { border: `${T.warning}40`, bg: `${T.warning}08`, badge: `${T.warning}15`, text: T.warning },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-base font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Top Cuentas por Valor de Pipeline</h3>
        <div className="space-y-3">
          {data.accounts.map((account, idx) => {
            const medal = medalColors[idx] || { border: T.border, bg: 'transparent', badge: T.muted, text: T.fgMuted }
            return (
              <div key={account.id} className="flex items-center gap-4 p-4 rounded-lg"
                style={{ backgroundColor: medal.bg, border: `2px solid ${medal.border}` }}>
                <div className="text-xl font-bold w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: medal.badge, color: medal.text, fontFamily: fontMono }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" style={{ color: T.fg }}>{account.company_name}</h4>
                  <p className="text-sm" style={{ color: T.fgMuted }}>
                    {account.opportunity_count} oportunidades - {account.offer_count} ofertas - Score: {account.score}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>{account.pipeline_value.toLocaleString()} EUR</p>
                  {account.won_value > 0 && (
                    <p className="text-sm" style={{ fontFamily: fontMono, color: T.success }}>{account.won_value.toLocaleString()} EUR ganado</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
