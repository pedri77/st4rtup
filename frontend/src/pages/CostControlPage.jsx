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
import { costControlApi } from '@/services/api'
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
      <div className="grid grid-cols-3 gap-3">
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
