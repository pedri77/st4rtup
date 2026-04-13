import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Target, Loader2, ArrowUpRight, ArrowDownRight, Minus,
  DollarSign, TrendingUp, Users, BarChart3, Shield, Zap, Download
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { gtmApi } from '@/services/api'
import { SkeletonPage } from '@/components/SkeletonLoader'
import Sparkline from '@/components/Sparkline'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'



const STATUS_COLORS = {
  green: { label: 'On Track' },
  amber: { label: 'En Riesgo' },
  red: { label: 'Critico' },
  gray: { label: 'Sin datos' },
}

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

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: BarChart3 },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'activity', label: 'Actividad', icon: Users },
  { id: 'marketing', label: 'Marketing', icon: Zap },
  { id: 'retention', label: 'Retencion', icon: Shield },
  { id: 'unit', label: 'Unit Economics', icon: BarChart3 },
]

function priorityStyle(priority) {
  if (priority === 'critical') return { color: T.destructive, bg: 'rgba(239,68,68,0.1)' }
  if (priority === 'high') return { color: T.warning, bg: 'rgba(234,179,8,0.1)' }
  return { color: T.fgMuted, bg: 'rgba(107,114,128,0.1)' }
}

function formatValue(value, unit) {
  if (value === null || value === undefined) return '\u2014'
  if (unit === 'eur') return `\€${Number(value).toLocaleString('es-ES')}`
  if (unit === 'eur_per_day') return `\€${Number(value).toLocaleString('es-ES')}/dia`
  if (unit === 'pct') return `${value}%`
  if (unit === 'days') return `${value} dias`
  if (unit === 'ratio') return `${value}x`
  if (unit === 'count') return value.toString()
  return value.toString()
}

function KPICard({ kpi, onUpdateTarget }) {
  const [editing, setEditing] = useState(false)
  const [newTarget, setNewTarget] = useState(kpi.target)
  const s = statusStyle(kpi.status)
  const label = (STATUS_COLORS[kpi.status] || STATUS_COLORS.gray).label
  const Icon = kpi.pct >= 80 ? ArrowUpRight : kpi.pct >= 50 ? Minus : ArrowDownRight
  const ps = priorityStyle(kpi.priority)

  const saveTarget = () => {
    onUpdateTarget(kpi.id, parseFloat(newTarget) || 0)
    setEditing(false)
  }

  return (
    <div className="rounded-xl border p-4 transition-all" style={{ backgroundColor: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium" style={{ color: T.fg }}>{kpi.name}</h3>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: ps.color, backgroundColor: ps.bg }}>
            {kpi.priority === 'critical' ? 'CRIT' : kpi.priority === 'high' ? 'ALTA' : 'MED'}
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{formatValue(kpi.actual, kpi.unit)}</p>
          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)}
                className="rounded px-2 py-0.5 text-xs w-20" style={{ backgroundColor: T.card, borderColor: T.border, border: '1px solid', color: T.fg }}
                onKeyDown={e => e.key === 'Enter' && saveTarget()} autoFocus />
              <button onClick={saveTarget} className="text-[10px]" style={{ color: T.cyan }}>&#10003;</button>
              <button onClick={() => setEditing(false)} className="text-[10px]" style={{ color: T.fgMuted }}>&#10007;</button>
            </div>
          ) : (
            <p className="text-xs mt-0.5 cursor-pointer hover:opacity-80" style={{ color: T.fgMuted }} onClick={() => setEditing(true)}>
              Target: {formatValue(kpi.target, kpi.unit)} &#9998;
            </p>
          )}
        </div>
        {kpi.actual !== null && (
          <div className="flex items-center gap-1 text-sm font-medium" style={{ color: s.color, fontFamily: fontMono }}>
            <Icon className="w-4 h-4" />
            {kpi.pct}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: T.muted }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(kpi.pct, 100)}%`, backgroundColor: statusBarColor(kpi.status) }} />
        </div>
        {kpi.history?.length > 1 && (
          <Sparkline data={kpi.history} color={kpi.status === 'green' ? '#22c55e' : kpi.status === 'amber' ? '#eab308' : '#ef4444'} />
        )}
      </div>
    </div>
  )
}

export default function GTMDashboardPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const seedAllMutation = useMutation({
    mutationFn: () => gtmApi.seedAll(),
    onSuccess: (r) => {
      const d = r.data
      queryClient.invalidateQueries()
      toast.success(`Datos cargados: ${d.total} items (${d.seeded.competitors} competidores, ${d.seeded.pricing_plans} plans, ${d.seeded.sales_tactics} tacticas, ${d.seeded.ad_campaigns} campanas)`)
    },
    onError: () => toast.error('Error cargando datos'),
  })

  const prevStatusRef = useRef({})

  const { data, isLoading } = useQuery({
    queryKey: ['gtm-dashboard'],
    queryFn: () => gtmApi.dashboard().then(r => r.data),
    refetchInterval: 60000,
  })

  // Detect KPI status changes and show toast
  useEffect(() => {
    if (!data?.kpis) return
    const prev = prevStatusRef.current
    for (const kpi of data.kpis) {
      if (prev[kpi.id] && prev[kpi.id] !== kpi.status) {
        if (kpi.status === 'red') toast.error(`${kpi.name} \u2192 Critico`)
        else if (kpi.status === 'green' && prev[kpi.id] === 'red') toast.success(`${kpi.name} \u2192 On Track`)
      }
      prev[kpi.id] = kpi.status
    }
    prevStatusRef.current = prev
  }, [data?.kpis])

  const updateTargetMutation = useMutation({
    mutationFn: ({ kpiId, value }) => gtmApi.updateTarget(kpiId, { target_value: value, target_label: String(value) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gtm-dashboard'] }); toast.success('Target actualizado') },
  })

  if (isLoading) {
    return <SkeletonPage />
  }

  const kpis = data?.kpis || []
  const summary = data?.summary || {}

  const starIds = ['arr', 'win_rate', 'pipeline_velocity', 'mql_to_sql']
  const starKpis = kpis.filter(k => starIds.includes(k.id))

  const filtered = kpis.filter(k => {
    if (categoryFilter !== 'all' && k.category !== categoryFilter) return false
    if (priorityFilter !== 'all' && k.priority !== priorityFilter) return false
    return true
  })

  const handleUpdateTarget = (kpiId, value) => {
    updateTargetMutation.mutate({ kpiId, value })
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/app/dashboard" className="transition-colors hover:opacity-80" style={{ color: T.fgMuted }}><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              <Target className="w-7 h-7" style={{ color: T.cyan }} /> GTM Dashboard
            </h1>
          </div>
          <p className="text-sm ml-8" style={{ color: T.fgMuted }}>20 KPIs comerciales con semaforo RAG</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: T.success }}>{summary.green || 0} on track</span>
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: T.warning }}>{summary.amber || 0} riesgo</span>
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: T.destructive }}>{summary.red || 0} critico</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => seedAllMutation.mutate()} disabled={seedAllMutation.isPending}
          className="btn-primary text-xs">{seedAllMutation.isPending ? 'Cargando...' : 'Cargar todos los datos GTM'}</button>
        <button onClick={async () => {
          try {
            const resp = await gtmApi.exportPDF()
            const url = window.URL.createObjectURL(new Blob([resp.data]))
            const a = document.createElement('a'); a.href = url; a.download = `st4rtup_gtm_boardpack.pdf`; a.click()
            window.URL.revokeObjectURL(url)
            toast.success('Board pack descargado')
          } catch { toast.error('Error generando PDF') }
        }} className="btn-secondary text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Board Pack PDF</button>
        <Link to="/app/gtm/pricing" className="btn-secondary text-xs">Pricing</Link>
        <Link to="/app/gtm/competitors" className="btn-secondary text-xs">Competidores</Link>
        <Link to="/app/gtm/playbook" className="btn-secondary text-xs">Playbook</Link>
        <Link to="/app/gtm/brand" className="btn-secondary text-xs">Brand</Link>
        <Link to="/app/gtm/media" className="btn-secondary text-xs">Media Trifecta</Link>
        <Link to="/app/gtm/okr" className="btn-secondary text-xs">OKRs</Link>
        <Link to="/app/gtm/forecast" className="btn-secondary text-xs">Forecast</Link>
        <Link to="/app/gtm/poc-tracker" className="btn-secondary text-xs">PoC Tracker</Link>
        <Link to="/app/gtm/investor" className="btn-secondary text-xs">Investor View</Link>
      </div>

      {/* Star KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {starKpis.map(kpi => <KPICard key={kpi.id} kpi={kpi} onUpdateTarget={handleUpdateTarget} />)}
      </div>

      {/* Budget */}
      {data?.budget && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              <DollarSign className="w-4 h-4" style={{ color: T.cyan }} /> Presupuesto GTM
            </h3>
            <span className="text-sm font-bold" style={{ color: data.budget.pct_used > 80 ? T.destructive : T.success, fontFamily: fontMono }}>
              {data.budget.pct_used}% consumido
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: T.fgMuted }}>Total: <span style={{ color: T.fg, fontFamily: fontMono }} className="font-medium">\€{data.budget.annual.toLocaleString('es-ES')}</span></span>
            <span style={{ color: T.fgMuted }}>Gastado: <span style={{ color: T.cyan, fontFamily: fontMono }}>\€{data.budget.total_spent.toLocaleString('es-ES')}</span></span>
            <span style={{ color: T.fgMuted }}>Disponible: <span style={{ color: T.success, fontFamily: fontMono }}>\€{data.budget.remaining.toLocaleString('es-ES')}</span></span>
          </div>
          <div className="w-full rounded-full h-2 mt-2" style={{ backgroundColor: T.muted }}>
            <div className="h-2 rounded-full"
              style={{ width: `${Math.min(data.budget.pct_used, 100)}%`, backgroundColor: data.budget.pct_used > 80 ? '#ef4444' : '#22c55e' }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(cat => {
          const CatIcon = cat.icon
          const active = categoryFilter === cat.id
          return (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: active ? 'rgba(0,188,212,0.2)' : T.card,
                borderColor: active ? 'rgba(0,188,212,0.5)' : T.border,
                color: active ? T.cyan : T.fgMuted,
              }}>
              <CatIcon className="w-3.5 h-3.5" /> {cat.label}
            </button>
          )
        })}
        <div className="ml-auto flex gap-1">
          {['all', 'critical', 'high'].map(p => {
            const active = priorityFilter === p
            return (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className="px-2 py-1 text-xs rounded border transition-colors"
                style={{
                  backgroundColor: active ? 'rgba(0,188,212,0.2)' : T.card,
                  borderColor: active ? 'rgba(0,188,212,0.5)' : T.border,
                  color: active ? T.cyan : T.fgMuted,
                }}>
                {p === 'all' ? 'Todos' : p === 'critical' ? 'Criticos' : 'Alta'}
              </button>
            )
          })}
        </div>
      </div>

      {/* All KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(kpi => <KPICard key={kpi.id} kpi={kpi} onUpdateTarget={handleUpdateTarget} />)}
      </div>
    </div>
  )
}
