import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Loader2, ArrowUpRight, ArrowDownRight, Minus, DollarSign, Shield, BarChart3 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { gtmApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function statusStyle(status) {
  if (status === 'green') return { color: T.success, bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' }
  if (status === 'amber') return { color: T.warning, bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' }
  if (status === 'red') return { color: T.destructive, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' }
  return { color: T.fgMuted, bg: 'rgba(107,114,128,0.1)', border: T.border }
}

function statusBarColor(status) {
  if (status === 'green') return '#22c55e'
  if (status === 'amber') return '#eab308'
  if (status === 'red') return '#ef4444'
  return '#4b5563'
}

const INVESTOR_KPIS = ['arr', 'mrr_growth', 'win_rate', 'pipeline_velocity', 'acv', 'nrr', 'churn_rate', 'ltv_cac_ratio', 'cac', 'cac_payback']

function formatValue(value, unit) {
  if (value === null || value === undefined) return '\u2014'
  if (unit === 'eur') return `\€${Number(value).toLocaleString('es-ES')}`
  if (unit === 'eur_per_day') return `\€${Number(value).toLocaleString('es-ES')}/dia`
  if (unit === 'pct') return `${value}%`
  if (unit === 'days') return `${value} meses`
  if (unit === 'ratio') return `${value}x`
  if (unit === 'count') return value.toString()
  return value.toString()
}

function BigKPICard({ kpi }) {
  const s = statusStyle(kpi.status)
  const Icon = kpi.pct >= 80 ? ArrowUpRight : kpi.pct >= 50 ? Minus : ArrowDownRight
  const statusLabel = kpi.status === 'green' ? 'On Track' : kpi.status === 'amber' ? 'Riesgo' : kpi.status === 'red' ? 'Critico' : 'Sin datos'

  return (
    <div className="rounded-2xl border p-6 transition-all" style={{ backgroundColor: s.bg, borderColor: s.border }}>
      <p className="text-sm mb-1" style={{ color: T.fgMuted }}>{kpi.name}</p>
      <div className="flex items-end justify-between">
        <p className="text-4xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{formatValue(kpi.actual, kpi.unit)}</p>
        {kpi.actual !== null && (
          <div className="flex items-center gap-1 text-lg font-medium" style={{ color: s.color, fontFamily: fontMono }}>
            <Icon className="w-5 h-5" />
            {kpi.pct}%
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs" style={{ color: T.fgMuted }}>Target: {formatValue(kpi.target, kpi.unit)}</p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>
          {statusLabel}
        </span>
      </div>
      <div className="w-full rounded-full h-2 mt-3" style={{ backgroundColor: T.muted }}>
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(kpi.pct, 100)}%`, backgroundColor: statusBarColor(kpi.status) }} />
      </div>
    </div>
  )
}

export default function InvestorViewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['gtm-dashboard-investor'],
    queryFn: () => gtmApi.dashboard().then(r => r.data),
  })

  const exportPDF = async () => {
    try {
      const resp = await gtmApi.exportPDF()
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'riskitera_investor_pack.pdf'; a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Board pack descargado')
    } catch { toast.error('Error') }
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen" style={{ backgroundColor: T.bg }}><Loader2 className="w-10 h-10 animate-spin" style={{ color: T.cyan }} /></div>

  const kpis = (data?.kpis || []).filter(k => INVESTOR_KPIS.includes(k.id))
  const summary = data?.summary || {}

  // Star metrics
  const arr = kpis.find(k => k.id === 'arr')
  const nrr = kpis.find(k => k.id === 'nrr')
  const ltvCac = kpis.find(k => k.id === 'ltv_cac_ratio')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen" style={{ color: T.fg }}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
                <span className="font-bold text-lg" style={{ color: '#fff' }}>RS</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>St4rtup CRM</h1>
            <p className="mt-1" style={{ color: T.fgMuted }}>Investor Metrics Dashboard</p>
            <p className="text-xs mt-2" style={{ color: T.fgMuted }}>Plataforma SaaS growth de tecnología &middot; Enterprise &middot; NIS2 &middot; DORA</p>
          </div>

          {/* Hero metrics */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[arr, nrr, ltvCac].filter(Boolean).map(kpi => (
              <div key={kpi.id} className="text-center">
                <p className="text-sm mb-1" style={{ color: T.fgMuted }}>{kpi.name}</p>
                <p className="text-5xl font-bold" style={{ color: T.cyan, fontFamily: fontMono }}>{formatValue(kpi.actual, kpi.unit)}</p>
                <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Target: {formatValue(kpi.target, kpi.unit)}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex justify-center gap-4 mb-8">
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: T.success }}>{summary.green || 0} on track</span>
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: T.warning }}>{summary.amber || 0} riesgo</span>
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: T.destructive }}>{summary.red || 0} critico</span>
          </div>

          {/* All investor KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {kpis.map(kpi => <BigKPICard key={kpi.id} kpi={kpi} />)}
          </div>

          {/* Export */}
          <div className="text-center">
            <button onClick={exportPDF} className="btn-primary px-6 py-3 text-sm flex items-center gap-2 mx-auto">
              <BarChart3 className="w-4 h-4" /> Descargar Board Pack PDF
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8" style={{ borderTop: `1px solid ${T.border}` }}>
            <p className="text-xs" style={{ color: T.fgMuted }}>St4rtup &middot; Confidencial &middot; {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
