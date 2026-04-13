import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Loader2, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import { gtmApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STAGE_COLORS = {
  discovery: 'hsl(217,91%,60%)', qualification: T.purple,
  proposal: T.warning, negotiation: 'hsl(45,93%,47%)',
  closed_won: T.success, closed_lost: T.destructive,
}

const STAGE_LABELS = {
  discovery: 'Discovery', qualification: 'Qualification',
  proposal: 'Proposal', negotiation: 'Negotiation',
  closed_won: 'Won', closed_lost: 'Lost',
}

export default function PipelineFunnelPage() {
  const T = useThemeColors()
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-analytics'],
    queryFn: () => gtmApi.pipelineAnalytics().then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  const stages = data?.stages || []
  const conversions = data?.conversions || []
  const maxCount = Math.max(...stages.map(s => s.count), 1)

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Breadcrumbs items={[{ label: 'GTM', href: '/app/gtm' }, { label: 'Pipeline Funnel' }]} />
      <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <TrendingUp className="w-7 h-7" style={{ color: T.cyan }} /> Pipeline Funnel
      </h1>

      {/* Visual funnel */}
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const width = Math.max((stage.count / maxCount) * 100, 5)
          const color = STAGE_COLORS[stage.stage] || T.fgMuted
          const conversion = conversions[i]
          return (
            <div key={stage.stage}>
              <div className="flex items-center gap-3">
                <span className="text-xs w-24 text-right" style={{ color: T.fgMuted }}>{STAGE_LABELS[stage.stage] || stage.stage}</span>
                <div className="flex-1 relative">
                  <div className="h-10 rounded-lg flex items-center px-3 transition-all"
                    style={{ width: `${width}%`, minWidth: '60px', backgroundColor: color }}>
                    <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: fontMono }}>{stage.count}</span>
                    <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: fontMono }}>\€{(stage.value / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>
              {conversion && (
                <div className="flex items-center gap-3 ml-24 my-1">
                  <ArrowRight className="w-3 h-3" style={{ color: T.fgMuted }} />
                  <span className="text-xs font-medium" style={{
                    color: conversion.rate >= 50 ? T.success : conversion.rate >= 25 ? T.warning : T.destructive,
                    fontFamily: fontMono,
                  }}>
                    {conversion.rate}% conversion
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Conversion table */}
      {conversions.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th className="text-left p-3 text-xs" style={{ color: T.fgMuted }}>De</th>
              <th className="text-left p-3 text-xs" style={{ color: T.fgMuted }}>A</th>
              <th className="text-right p-3 text-xs" style={{ color: T.fgMuted }}>Conversion</th>
            </tr></thead>
            <tbody>{conversions.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.muted}` }}>
                <td className="p-3" style={{ color: T.fg }}>{STAGE_LABELS[c.from] || c.from}</td>
                <td className="p-3" style={{ color: T.fg }}>{STAGE_LABELS[c.to] || c.to}</td>
                <td className="p-3 text-right font-medium" style={{
                  color: c.rate >= 50 ? T.success : c.rate >= 25 ? T.warning : T.destructive,
                  fontFamily: fontMono,
                }}>{c.rate}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
