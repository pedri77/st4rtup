import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Loader2, DollarSign, Target, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import { gtmApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

export default function ForecastPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => gtmApi.forecast().then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  const f = data || {}
  const forecast = f.forecast || []
  const maxArr = Math.max(...forecast.map(m => m.projected_arr), 1)

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Breadcrumbs items={[{ label: 'GTM', href: '/gtm' }, { label: 'Revenue Forecast' }]} />
      <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <TrendingUp className="w-7 h-7" style={{ color: T.cyan }} /> Revenue Forecast
      </h1>

      {/* Current stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>€{(f.current_arr || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>ARR actual</p>
        </div>
        <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>€{(f.current_pipeline || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Pipeline activo</p>
        </div>
        <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.success }}>{f.win_rate || 0}%</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Win rate</p>
        </div>
        <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.purple }}>€{(f.arr_12m || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>ARR proyectado 12m</p>
        </div>
      </div>

      {/* Forecast chart (bar chart) */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Proyección ARR — Próximos 12 meses</h3>
        <div className="flex items-end gap-2 h-48">
          {forecast.map((m, i) => {
            const height = (m.projected_arr / maxArr) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{(m.projected_arr / 1000).toFixed(0)}k</span>
                <div className="w-full rounded-t relative" style={{ height: `${height}%` }}>
                  <div className="w-full h-full rounded-t" style={{ backgroundColor: T.cyan, opacity: i < 3 ? 0.6 : i < 6 ? 0.4 : 0.25 }} />
                </div>
                <span className="text-[8px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>{m.label.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs" style={{ borderColor: T.border, color: T.fgMuted }}>
            <th className="text-left p-3" style={{ fontFamily: fontMono }}>Mes</th>
            <th className="text-right p-3" style={{ fontFamily: fontMono }}>ARR proyectado</th>
            <th className="text-right p-3" style={{ fontFamily: fontMono }}>MRR proyectado</th>
          </tr></thead>
          <tbody>
            {forecast.map((m, i) => (
              <tr key={i} className="border-b" style={{ borderColor: `${T.border}80` }}>
                <td className="p-3" style={{ color: T.fg }}>{m.label}</td>
                <td className="p-3 text-right font-medium" style={{ fontFamily: fontMono, color: T.fg }}>€{m.projected_arr.toLocaleString('es-ES')}</td>
                <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{m.projected_mrr.toLocaleString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
