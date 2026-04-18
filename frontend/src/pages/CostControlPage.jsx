import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, AlertTriangle, TrendingUp, ArrowLeft, Shield,
  Loader2, BarChart3
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import Sparkline from '@/components/Sparkline'
import { costControlApi, settingsApi } from '@/services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'



export default function CostControlPage() {
  const T = useThemeColors()
  const { data: summary, isLoading } = useQuery({
    queryKey: ['cost-summary'],
    queryFn: () => costControlApi.summary().then(r => r.data),
  })

  const { data: predictive } = useQuery({
    queryKey: ['cost-predictive'],
    queryFn: () => costControlApi.predictive().then(r => r.data),
  })

  const { data: roi } = useQuery({
    queryKey: ['cost-roi'],
    queryFn: () => costControlApi.roi().then(r => r.data),
  })

  const { data: burnRate } = useQuery({
    queryKey: ['cost-burn-rate'],
    queryFn: () => costControlApi.burnRate().then(r => r.data).catch(() => null),
    staleTime: 120000,
  })

  const { data: platformCosts } = useQuery({
    queryKey: ['platform-costs'],
    queryFn: () => settingsApi.platformCosts().then(r => r.data),
  })

  const queryClient = useQueryClient()
  const collectMutation = useMutation({
    mutationFn: () => settingsApi.collectCosts(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['platform-costs'] })
      const updates = res.data?.updates || []
      toast.success(`Costes actualizados: ${updates.length} proveedores`)
    },
    onError: () => toast.error('Error al recoger costes'),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  const tools = summary?.tools || []
  const predictions = predictive?.predictions || []

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="flex items-center gap-3 mb-1">
        <Link to="/app/dashboard" className="transition-colors hover:opacity-80" style={{ color: T.fgMuted }}><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
          <DollarSign className="w-7 h-7" style={{ color: T.cyan }} /> Cost Control
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>€{(summary?.total_spent || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Gasto mes</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>€{(summary?.total_cap || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Cap total</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: (summary?.total_pct || 0) > 80 ? T.destructive : T.success }}>{summary?.total_pct || 0}%</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Consumido</p>
        </div>
        {roi && (
          <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: roi.overall_roi_pct > 0 ? T.success : T.destructive }}>{roi.overall_roi_pct}%</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>ROI global</p>
          </div>
        )}
      </div>

      {/* Guardrail levels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: `${T.success}08`, borderColor: `${T.success}33` }}>
          <p className="font-bold" style={{ color: T.success }}>OK</p>
          <p className="text-xs" style={{ color: T.fgMuted }}>&lt; Aviso · Pipeline normal</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: `${T.warning}08`, borderColor: `${T.warning}33` }}>
          <div className="font-bold flex items-center justify-center gap-1" style={{ color: T.warning }}><AlertTriangle className="w-4 h-4" /> Aviso</div>
          <p className="text-xs" style={{ color: T.fgMuted }}>≥ 70% · Notificación</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: `${T.destructive}08`, borderColor: `${T.destructive}33` }}>
          <p className="font-bold" style={{ color: T.destructive }}>Corte</p>
          <p className="text-xs" style={{ color: T.fgMuted }}>≥ 90% · Bloqueo automático</p>
        </div>
      </div>

      {/* Tools current spend */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
          <TrendingUp className="w-4 h-4" style={{ color: T.fgMuted }} /> Gasto actual por herramienta
        </h2>
        <div className="space-y-2">
          {tools.map((tool, i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-4 border"
              style={{
                backgroundColor: T.card,
                borderColor: tool.level === 'cut' ? `${T.destructive}4D` : tool.level === 'warn' ? `${T.warning}4D` : T.border
              }}>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: T.fg }}>{tool.tool_name}</span>
                  <span className="text-xs font-medium" style={{
                    fontFamily: fontMono,
                    color: tool.level === 'cut' ? T.destructive : tool.level === 'warn' ? T.warning : T.success
                  }}>
                    €{tool.spent} / €{tool.cap} ({tool.pct}%)
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: `${T.border}80` }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(tool.pct, 100)}%`,
                      backgroundColor: tool.pct >= 90 ? T.destructive : tool.pct >= 70 ? T.warning : T.success
                    }} />
                </div>
              </div>
              <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{tool.events} eventos</span>
            </div>
          ))}
          {tools.length === 0 && <p className="text-center py-4" style={{ color: T.fgMuted }}>Sin datos de costes. Registra costes via POST /costs/record.</p>}
        </div>
      </div>

      {/* Cost Burn Rate Chart */}
      <CostBurnRateChart data={burnRate} />

      {/* Predictive alerts */}
      {predictions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <AlertTriangle className="w-4 h-4" style={{ color: T.warning }} /> Alertas predictivas (proyección fin de mes)
          </h2>
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs" style={{ borderColor: T.border, color: T.fgMuted }}>
                <th className="text-left p-3" style={{ fontFamily: fontMono }}>Herramienta</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Gasto actual</th>
                <th className="text-right p-3" style={{ fontFamily: fontMono }}>€/día</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Proyección</th>
                <th className="text-right p-3" style={{ fontFamily: fontMono }}>Cap</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>%</th><th className="p-3" style={{ fontFamily: fontMono }}>Alerta</th>
              </tr></thead>
              <tbody>{predictions.map((p, i) => (
                <tr key={i} className="border-b" style={{ borderColor: `${T.border}80` }}>
                  <td className="p-3" style={{ color: T.fg }}>{p.tool_name}</td>
                  <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{p.current_spend}</td>
                  <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{p.daily_rate}</td>
                  <td className="p-3 text-right font-medium" style={{ fontFamily: fontMono, color: T.fg }}>€{p.projected_eom}</td>
                  <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{p.cap}</td>
                  <td className="p-3 text-right font-medium" style={{ fontFamily: fontMono, color: p.pct_projected >= 90 ? T.destructive : p.pct_projected >= 70 ? T.warning : T.success }}>{p.pct_projected}%</td>
                  <td className="p-3 text-center">
                    {p.alert === 'critical' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.destructive}18`, color: T.destructive }}>Critico</span>}
                    {p.alert === 'warning' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.warning}18`, color: T.warning }}>Aviso</span>}
                    {!p.alert && <span className="text-[10px]" style={{ color: T.fgMuted }}>OK</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROI */}
      {roi && roi.by_tool?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <BarChart3 className="w-4 h-4" style={{ color: T.cyan }} /> ROI por herramienta
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
              <p className="text-sm" style={{ color: T.fgMuted }}>Revenue</p>
              <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.success }}>€{roi.total_revenue.toLocaleString('es-ES')}</p>
            </div>
            <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
              <p className="text-sm" style={{ color: T.fgMuted }}>Coste total</p>
              <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.destructive }}>€{roi.total_cost.toLocaleString('es-ES')}</p>
            </div>
            <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
              <p className="text-sm" style={{ color: T.fgMuted }}>ROI</p>
              <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: roi.overall_roi_pct > 0 ? T.success : T.destructive }}>{roi.overall_roi_pct}%</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {roi.by_tool.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-32 truncate" style={{ color: T.fgMuted }}>{t.tool}</span>
                <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: `${T.border}80` }}>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: T.cyan, width: `${t.pct_of_total}%` }} />
                </div>
                <span className="text-xs w-16 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>€{t.cost}</span>
                <span className="text-xs w-10 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>{t.pct_of_total}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Costs — Real infrastructure costs */}
      {platformCosts && (
        <div>
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: fontDisplay }}>Costes de Plataforma</h2>
          <button onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: T.cyan, color: '#fff', boxShadow: `0 4px 12px ${T.cyan}40` }}>
            {collectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {collectMutation.isPending ? 'Recogiendo...' : 'Recoger costes'}
          </button>
        </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Coste mensual', value: `€${(platformCosts.total_monthly || 0).toFixed(2)}`, color: T.primary || T.cyan },
              { label: 'Coste anual', value: `€${(platformCosts.total_annual || 0).toFixed(2)}`, color: T.success },
              { label: 'Servicios activos', value: (platformCosts.costs || []).filter(c => c.is_active).length, color: T.warning },
              { label: 'Variables', value: (platformCosts.costs || []).filter(c => c.is_variable).length, color: '#8B5CF6' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: T.fgMuted }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-sm font-bold mb-3">Por categoria</h3>
              <div className="space-y-2">
                {Object.entries(platformCosts.by_category || {}).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                  const colors = { ai: '#8B5CF6', compute: '#3B82F6', database: '#10B981', hosting: '#F59E0B', auth: '#0891B2', analytics: '#EC4899', email: '#F97316', automation: '#EF4444', dns: '#6B7280', devtools: '#6B7280', gpu: '#EF4444' }
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[cat] || '#6B7280' }} />
                        <span className="text-sm capitalize">{cat}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ fontFamily: fontMono }}>€{amt.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-sm font-bold mb-3">Por proveedor</h3>
              <div className="space-y-2">
                {Object.entries((platformCosts.costs || []).reduce((acc, c) => {
                  acc[c.provider] = (acc[c.provider] || 0) + c.amount_eur
                  return acc
                }, {})).sort((a, b) => b[1] - a[1]).map(([prov, amt]) => (
                  <div key={prov} className="flex items-center justify-between">
                    <span className="text-sm">{prov}</span>
                    <span className="text-sm font-bold" style={{ fontFamily: fontMono }}>€{amt.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: T.muted }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: T.fgMuted }}>Servicio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: T.fgMuted }}>Proveedor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: T.fgMuted }}>Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: T.fgMuted }}>€/mes</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: T.fgMuted }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(platformCosts.costs || []).map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? T.card : T.bg, borderBottom: `1px solid ${T.border}20` }}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.name}</span>
                      {c.notes && <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3" style={{ color: T.fgMuted }}>{c.provider}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: c.is_variable ? '#F59E0B15' : `${T.cyan}15`,
                        color: c.is_variable ? '#F59E0B' : T.cyan,
                      }}>
                        {c.is_variable ? 'Variable' : 'Fijo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: fontMono }}>
                      {c.amount_eur > 0 ? `€${c.amount_eur.toFixed(2)}` : <span style={{ color: T.success }}>Free</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.is_active ? T.success : T.fgMuted }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const BURN_TOOL_COLORS = {
  OpenAI: T.cyan,
  Retell: T.purple,
  Mistral: T.success,
  Anthropic: T.warning,
  Google: 'hsl(210,70%,55%)',
  Whisper: 'hsl(330,60%,55%)',
  Cohere: 'hsl(25,80%,50%)',
}

function CostBurnRateChart({ data }) {
  if (!data?.daily?.length) return null

  const daily = data.daily
  const toolNames = data.tools || [...new Set(daily.flatMap(d => Object.keys(d).filter(k => k !== 'date')))]

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <TrendingUp className="w-4 h-4" style={{ color: T.warning }} /> Burn Rate diario por herramienta
      </h2>
      <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              {toolNames.map((tool, i) => {
                const color = BURN_TOOL_COLORS[tool] || `hsl(${(i * 60) % 360}, 60%, 50%)`
                const gradId = `gradBurn-${tool.replace(/\s+/g, '-')}`
                return (
                  <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`${T.border}80`} />
            <XAxis
              dataKey="date" tick={{ fill: T.fgMuted, fontSize: 10 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }}
            />
            <YAxis
              tick={{ fill: T.fgMuted, fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `€${v}`}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                    <p style={{ color: T.fg, fontWeight: 600, marginBottom: 4 }}>{label}</p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color, margin: '2px 0' }}>
                        {p.name}: <span style={{ fontFamily: fontMono }}>€{p.value?.toFixed(2)}</span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            {toolNames.map((tool, i) => {
              const color = BURN_TOOL_COLORS[tool] || `hsl(${(i * 60) % 360}, 60%, 50%)`
              const gradId = `gradBurn-${tool.replace(/\s+/g, '-')}`
              return (
                <Area
                  key={tool}
                  type="monotone"
                  dataKey={tool}
                  name={tool}
                  stackId="1"
                  stroke={color}
                  fill={`url(#${gradId})`}
                  fillOpacity={1}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-3">
          {toolNames.map((tool, i) => {
            const color = BURN_TOOL_COLORS[tool] || `hsl(${(i * 60) % 360}, 60%, 50%)`
            return (
              <div key={tool} className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                <span style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>{tool}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
