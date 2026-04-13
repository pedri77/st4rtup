import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Loader2, Play, Pause, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import toast from 'react-hot-toast'
import { playbookApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const CAT_COLORS = {
  inbound: T.success,
  outbound: T.cyan,
  relacional: T.purple,
  transaccional: T.warning,
}

const CATEGORIES = [
  { id: 'inbound', label: 'Inbound', color: CAT_COLORS.inbound },
  { id: 'outbound', label: 'Outbound', color: CAT_COLORS.outbound },
  { id: 'relacional', label: 'Relacional', color: CAT_COLORS.relacional },
  { id: 'transaccional', label: 'Transaccional', color: CAT_COLORS.transaccional },
]

const STATUS_CONFIG = {
  active: { icon: Play, color: T.success, label: 'Activa' },
  planned: { icon: Clock, color: T.fgMuted, label: 'Planificada' },
  paused: { icon: Pause, color: T.warning, label: 'Pausada' },
}

function TacticCard({ tactic, onStatusChange }) {
  const s = STATUS_CONFIG[tactic.status] || STATUS_CONFIG.planned
  const StatusIcon = s.icon

  const nextStatus = tactic.status === 'planned' ? 'active' : tactic.status === 'active' ? 'paused' : 'active'

  return (
    <div className="rounded-xl p-4 transition-colors border hover:opacity-90" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{tactic.name}</h4>
        <button onClick={() => onStatusChange(tactic.id, nextStatus)}
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors"
          style={{ backgroundColor: `${s.color}18`, color: s.color }}>
          <StatusIcon className="w-3 h-3" /> {s.label}
        </button>
      </div>
      <p className="text-xs mb-2" style={{ color: T.fgMuted }}>{tactic.description}</p>
      {/* Stats row */}
      <div className="flex items-center gap-3 mb-2 text-[10px]" style={{ color: T.fgMuted }}>
        {tactic.responsible && <span>{tactic.responsible}</span>}
        {tactic.leads_generated > 0 && <span style={{ color: T.cyan }}>{tactic.leads_generated} leads</span>}
        {(tactic.metrics_target?.leads_month || tactic.metrics_actual?.leads_month) && (
          <span style={{ fontFamily: fontMono, color: T.fgMuted }}>{tactic.metrics_actual?.leads_month || 0}/{tactic.metrics_target?.leads_month || '—'} leads/mes</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {tactic.channel && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: T.muted, color: T.fgMuted }}>{tactic.channel}</span>}
        </div>
        <Link to={`/app/gtm/playbook/${tactic.id}`}
          className="text-[10px] flex items-center gap-0.5 hover:opacity-80" style={{ color: T.cyan }}>
          Abrir <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

export default function PlaybookPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['playbook', filter],
    queryFn: () => playbookApi.list(filter ? { category: filter } : {}).then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => playbookApi.seed(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['playbook'] }); toast.success('Tácticas cargadas') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => playbookApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playbook'] }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['playbook-stats'],
    queryFn: () => playbookApi.stats().then(r => r.data),
  })

  const tactics = data?.tactics || []
  const activeCount = tactics.filter(t => t.status === 'active').length
  const tacticStats = statsData?.stats || []
  const totalLeads = tacticStats.reduce((sum, t) => sum + (t.leads_generated || 0), 0)

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: "GTM", href: "/app/gtm" }, { label: "Sales Playbook" }]} />
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <BookOpen className="w-7 h-7" style={{ color: T.cyan }} /> Sales Playbook
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg px-3 py-2 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-lg font-bold" style={{ fontFamily: fontMono, color: T.success }}>{activeCount}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Activas</p>
          </div>
          <div className="rounded-lg px-3 py-2 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-lg font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>{totalLeads}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Leads generados</p>
          </div>
          {tactics.length === 0 && (
            <button onClick={() => seedMutation.mutate()} className="btn-primary text-sm">Cargar tácticas</button>
          )}
          {tactics.length > 0 && (
            <button onClick={async () => {
              try {
                const resp = await playbookApi.exportPDF()
                const url = window.URL.createObjectURL(new Blob([resp.data]))
                const a = document.createElement('a'); a.href = url; a.download = 'st4rtup_playbook.pdf'; a.click()
                window.URL.revokeObjectURL(url)
                toast.success('Playbook exportado')
              } catch { toast.error('Error exportando') }
            }} className="btn-secondary text-xs">PDF</button>
          )}
        </div>
      </div>

      {/* How it works */}
      <details className="rounded-xl border" style={{ backgroundColor: `${T.card}50`, borderColor: `${T.border}80` }}>
        <summary className="p-4 text-sm cursor-pointer" style={{ color: T.fgMuted }}>¿Cómo funciona el Sales Playbook?</summary>
        <div className="px-4 pb-4 text-xs space-y-2" style={{ color: T.fgMuted }}>
          <p>14 tácticas de venta organizadas en 4 categorías: <strong style={{ color: T.success }}>Inbound</strong>, <strong style={{ color: T.cyan }}>Outbound</strong>, <strong style={{ color: T.purple }}>Relacional</strong>, <strong style={{ color: T.warning }}>Transaccional</strong>.</p>
          <p>Cada lead tiene un <strong style={{ color: T.fg }}>canal de adquisición</strong> que se vincula automáticamente a la táctica correspondiente.</p>
          <p>Las tácticas alimentan: <strong style={{ color: T.cyan }}>MOD-AICALLS-001</strong> (outbound calls), <strong style={{ color: T.cyan }}>Lemlist</strong> (cold email), <strong style={{ color: T.cyan }}>Brevo</strong> (nurturing), <strong style={{ color: T.cyan }}>n8n</strong> (workflows).</p>
        </div>
      </details>

      {/* Category filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilter(null)}
          className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
          style={!filter ? { backgroundColor: `${T.cyan}33`, borderColor: `${T.cyan}80`, color: T.cyan } : { backgroundColor: T.muted, borderColor: T.border, color: T.fgMuted }}>
          Todas ({tactics.length})
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setFilter(cat.id)}
            className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
            style={filter === cat.id ? { backgroundColor: `${cat.color}18`, borderColor: cat.color, color: cat.color } : { backgroundColor: T.muted, borderColor: T.border, color: T.fgMuted }}>
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: T.cyan }} /> : (
        <>
          {CATEGORIES.filter(cat => !filter || filter === cat.id).map(cat => {
            const catTactics = tactics.filter(t => t.category === cat.id)
            if (catTactics.length === 0) return null
            return (
              <div key={cat.id}>
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: cat.color }}>
                  {cat.label} ({catTactics.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catTactics.map(t => (
                    <TacticCard key={t.id} tactic={t}
                      onStatusChange={(id, status) => updateMutation.mutate({ id, status })} />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
