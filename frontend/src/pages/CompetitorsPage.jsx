import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Swords, Loader2, Download, ChevronDown, ChevronUp,
  LayoutGrid, List, X, ExternalLink, Search, Plus
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import toast from 'react-hot-toast'
import { competitorsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TIER_CONFIG = {
  critical: { label: 'Critica', color: T.destructive, bg: 'hsla(0,72%,51%,0.1)', border: 'hsla(0,72%,51%,0.3)' },
  high: { label: 'Alta', color: T.warning, bg: 'hsla(38,92%,50%,0.1)', border: 'hsla(38,92%,50%,0.3)' },
  medium: { label: 'Media', color: T.success, bg: 'hsla(142,71%,45%,0.1)', border: 'hsla(142,71%,45%,0.3)' },
  low: { label: 'Baja', color: T.fgMuted, bg: 'hsla(220,10%,55%,0.1)', border: 'hsla(220,10%,55%,0.3)' },
}

const REGION_CONFIG = {
  local: { label: '🇪🇸 España', color: 'hsl(210,80%,60%)', bg: 'hsla(210,80%,50%,0.1)' },
  europe: { label: '🇪🇺 Europa', color: 'hsl(170,60%,55%)', bg: 'hsla(170,60%,55%,0.1)' },
  global: { label: '🌐 Global', color: T.purple, bg: 'hsla(265,60%,58%,0.1)' },
}

function maturityColor(score) {
  if (score >= 75) return T.destructive
  if (score >= 50) return T.warning
  return T.success
}

function TierBadge({ plan }) {
  const c = TIER_CONFIG[plan] || TIER_CONFIG.medium
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>
}

function RegionBadge({ region }) {
  const c = REGION_CONFIG[region] || REGION_CONFIG.global
  return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>
}

// ─── Competitor Card ─────────────────────────────────────────

function CompetitorCard({ comp, onSelect }) {
  return (
    <div onClick={() => onSelect(comp)}
      className="rounded-xl p-4 cursor-pointer transition-colors"
      style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'hsla(185,72%,48%,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold leading-tight" style={{ color: T.fg }}>{comp.name}</h4>
        <TierBadge plan={comp.plan} />
      </div>
      <div className="flex gap-1 mb-2">
        <RegionBadge region={comp.region} />
      </div>
      <p className="text-xs line-clamp-2 mb-3" style={{ color: T.fgMuted }}>{comp.scope}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span style={{ color: T.fgMuted }}>Madurez plataforma</span>
          <span className="font-medium" style={{ color: '#94A3B8', fontFamily: fontMono }}>{comp.maturity_score}%</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'hsla(220,15%,20%,0.5)' }}>
          <div className="h-1.5 rounded-full" style={{ width: `${comp.maturity_score}%`, backgroundColor: maturityColor(comp.maturity_score) }} />
        </div>
      </div>
      {comp.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {comp.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded" style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail Drawer ───────────────────────────────────────────

function CompetitorDrawer({ comp, onClose }) {
  const [tab, setTab] = useState('summary')

  const downloadPDF = async () => {
    try {
      const resp = await competitorsApi.battleCardPDF(comp.id)
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a'); a.href = url; a.download = `battlecard_${comp.name}.pdf`; a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Battle card descargada')
    } catch { toast.error('Sin battle card') }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full overflow-y-auto" style={{ backgroundColor: T.bg, borderLeft: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
        <div className="p-5 flex items-start justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{comp.name}</h2>
            <div className="flex gap-2 mt-1">
              <TierBadge plan={comp.plan} />
              <RegionBadge region={comp.region} />
            </div>
            {comp.website && (
              <a href={`https://${comp.website}`} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline flex items-center gap-1 mt-1" style={{ color: T.cyan }}>
                {comp.website} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="hover:opacity-80" style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: `1px solid ${T.border}` }}>
          {[['summary', 'Resumen'], ['analysis', 'Análisis'], ['vs', 'vs. St4rtup']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: tab === key ? T.cyan : T.fgMuted,
                borderBottom: tab === key ? `2px solid ${T.cyan}` : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'summary' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Alcance</p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>{comp.scope}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Modelo de negocio</p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>{comp.model || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: T.fgMuted }}>Madurez de plataforma</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full h-3" style={{ backgroundColor: 'hsla(220,15%,20%,0.5)' }}>
                    <div className="h-3 rounded-full" style={{ width: `${comp.maturity_score}%`, backgroundColor: maturityColor(comp.maturity_score) }} />
                  </div>
                  <span className="font-bold text-lg" style={{ color: T.fg, fontFamily: fontMono }}>{comp.maturity_score}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between rounded p-2" style={{ backgroundColor: T.card }}><span style={{ color: T.fgMuted }}>Growth</span><span style={{ color: T.fg, fontFamily: fontMono }}>{comp.nis2_support}</span></div>
                <div className="flex justify-between rounded p-2" style={{ backgroundColor: T.card }}><span style={{ color: T.fgMuted }}>B2B</span><span style={{ color: T.fg, fontFamily: fontMono }}>{comp.dora_support}</span></div>
                <div className="flex justify-between rounded p-2" style={{ backgroundColor: T.card }}><span style={{ color: T.fgMuted }}>Evidencia</span><span style={{ color: T.fg, fontFamily: fontMono }}>{comp.auto_evidence}</span></div>
                <div className="flex justify-between rounded p-2" style={{ backgroundColor: T.card }}><span style={{ color: T.fgMuted }}>UX</span><span style={{ color: T.fg, fontFamily: fontMono }}>{comp.ux_midmarket}</span></div>
              </div>
              {comp.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {comp.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>{tag}</span>)}
                </div>
              )}
            </div>
          )}

          {tab === 'analysis' && (
            <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{comp.analysis || 'Sin análisis disponible.'}</p>
          )}

          {tab === 'vs' && (
            <div className="space-y-4">
              <div className="rounded-lg p-3" style={{ backgroundColor: 'hsla(0,72%,51%,0.05)', border: `1px solid hsla(0,72%,51%,0.2)` }}>
                <p className="text-xs font-medium mb-1" style={{ color: T.destructive }}>Debilidad del competidor</p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>{comp.weakness || '—'}</p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'hsla(142,71%,45%,0.05)', border: `1px solid hsla(142,71%,45%,0.2)` }}>
                <p className="text-xs font-medium mb-1" style={{ color: T.success }}>Ventaja St4rtup</p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>{comp.vs_st4rtup || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={downloadPDF} className="btn-secondary text-sm w-full flex items-center justify-center gap-1.5">
            <Download className="w-4 h-4" /> Descargar Battle Card PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export default function CompetitorsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [planFilter, setTierFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', region: 'local', plan: 'medium', scope: '', website: '', maturity_score: 50, analysis: '', weakness: '', vs_st4rtup: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: () => competitorsApi.list().then(r => r.data),
  })

  const { data: statsData } = useQuery({
    queryKey: ['competitors-stats'],
    queryFn: () => competitorsApi.stats().then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => competitorsApi.seed(),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['competitors'] }); toast.success(`${r.data.seeded} competidores cargados`) },
  })

  const createMutation = useMutation({
    mutationFn: (data) => competitorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
      toast.success('Competidor añadido')
      setShowAddForm(false)
      setAddForm({ name: '', region: 'local', plan: 'medium', scope: '', website: '', maturity_score: 50, analysis: '', weakness: '', vs_st4rtup: '' })
    },
    onError: () => toast.error('Error al crear'),
  })

  const allCompetitors = data?.competitors || []

  // Filter
  const filtered = allCompetitors.filter(c => {
    if (regionFilter !== 'all' && c.region !== regionFilter) return false
    if (planFilter !== 'all' && c.plan !== planFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || (c.scope || '').toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  // Sort by plan priority then maturity
  const planOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...filtered].sort((a, b) => (planOrder[a.plan] || 3) - (planOrder[b.plan] || 3) || (b.maturity_score || 0) - (a.maturity_score || 0))

  // Stats
  const criticalCount = allCompetitors.filter(c => c.plan === 'critical').length
  const highCount = allCompetitors.filter(c => c.plan === 'high').length
  const otherCount = allCompetitors.filter(c => c.plan === 'medium' || c.plan === 'low').length

  // CSV export
  const exportCSV = () => {
    const headers = ['Nombre', 'Región', 'Amenaza', 'Scope', 'Madurez', 'Website', 'Tags']
    const rows = sorted.map(c => [c.name, c.region, c.plan, c.scope, c.maturity_score, c.website, (c.tags || []).join(';')])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `st4rtup_competitors_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado')
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: "GTM", href: "/app/gtm" }, { label: "Competitive Intelligence" }]} />
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Swords className="w-7 h-7" style={{ color: T.cyan }} /> Competitive Intelligence
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddForm(true)} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Añadir</button>
          <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
            className="btn-secondary text-sm">{seedMutation.isPending ? 'Cargando...' : 'Cargar 18'}</button>
          <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <p className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{allCompetitors.length}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Total activos</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(0,72%,51%,0.05)', border: `1px solid hsla(0,72%,51%,0.2)` }}>
          <p className="text-xl font-bold" style={{ color: T.destructive, fontFamily: fontMono }}>{criticalCount}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Amenaza critica</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(38,92%,50%,0.05)', border: `1px solid hsla(38,92%,50%,0.2)` }}>
          <p className="text-xl font-bold" style={{ color: T.warning, fontFamily: fontMono }}>{highCount}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Amenaza alta</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <p className="text-xl font-bold" style={{ color: T.fgMuted, fontFamily: fontMono }}>{otherCount}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Media / Baja</p>
        </div>
      </div>

      {/* Win rate from pipeline */}
      {statsData?.by_competitor?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsData.by_competitor.slice(0, 4).map((cs, i) => (
            <div key={i} className="rounded-xl p-3" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
              <p className="text-xs truncate" style={{ color: T.fgMuted }}>{cs.name}</p>
              <p className="text-lg font-bold" style={{ color: cs.win_rate >= 50 ? T.success : T.destructive, fontFamily: fontMono }}>{cs.win_rate}% win</p>
              <p className="text-[10px]" style={{ color: T.fgMuted, fontFamily: fontMono }}>{cs.won}W / {cs.lost}L · €{cs.pipeline_value.toLocaleString('es-ES')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar competidor..." className="input pl-10 text-sm" />
        </div>
        {['all', 'local', 'europe', 'global'].map(r => (
          <button key={r} onClick={() => setRegionFilter(r)}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              backgroundColor: regionFilter === r ? 'hsla(185,72%,48%,0.2)' : T.card,
              border: `1px solid ${regionFilter === r ? 'hsla(185,72%,48%,0.5)' : T.border}`,
              color: regionFilter === r ? T.cyan : T.fgMuted,
            }}>
            {r === 'all' ? 'Todos' : REGION_CONFIG[r]?.label}
          </button>
        ))}
        {['all', 'critical', 'high', 'medium'].map(t => (
          <button key={t} onClick={() => setTierFilter(t)}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              backgroundColor: planFilter === t ? 'hsla(185,72%,48%,0.2)' : T.card,
              border: `1px solid ${planFilter === t ? 'hsla(185,72%,48%,0.5)' : T.border}`,
              color: planFilter === t ? T.cyan : T.fgMuted,
            }}>
            {t === 'all' ? 'Todos' : TIER_CONFIG[t]?.label}
          </button>
        ))}
        <button onClick={() => setView(v => v === 'grid' ? 'table' : 'grid')}
          className="btn-secondary text-sm p-2">
          {view === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: T.cyan }} /> : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(c => <CompetitorCard key={c.id} comp={c} onSelect={setSelected} />)}
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs" style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted }}>
              <th className="text-left p-3">Competidor</th><th className="p-3">Región</th><th className="p-3">Amenaza</th>
              <th className="text-left p-3">Scope</th><th className="p-3">Madurez</th><th className="p-3">Growth</th><th className="p-3">B2B</th>
            </tr></thead>
            <tbody>{sorted.map(c => (
              <tr key={c.id} className="cursor-pointer transition-colors"
                style={{ borderBottom: `1px solid hsla(220,15%,20%,0.5)` }}
                onClick={() => setSelected(c)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsla(220,15%,20%,0.2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td className="p-3">
                  <p className="font-medium" style={{ color: T.fg }}>{c.name}</p>
                  <p className="text-[10px]" style={{ color: T.fgMuted }}>{c.website}</p>
                </td>
                <td className="p-3 text-center"><RegionBadge region={c.region} /></td>
                <td className="p-3 text-center"><TierBadge plan={c.plan} /></td>
                <td className="p-3 text-xs max-w-48 truncate" style={{ color: T.fgMuted }}>{c.scope}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: 'hsla(220,15%,20%,0.5)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${c.maturity_score}%`, backgroundColor: maturityColor(c.maturity_score) }} />
                    </div>
                    <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{c.maturity_score}%</span>
                  </div>
                </td>
                <td className="p-3 text-center" style={{ color: T.fg, fontFamily: fontMono }}>{c.nis2_support}</td>
                <td className="p-3 text-center" style={{ color: T.fg, fontFamily: fontMono }}>{c.dora_support}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {sorted.length === 0 && !isLoading && (
        <p className="text-center text-sm py-8" style={{ color: T.fgMuted }}>Sin competidores. Usa "Cargar 18 competidores" para empezar.</p>
      )}

      {/* Detail Drawer */}
      {selected && <CompetitorDrawer comp={selected} onClose={() => setSelected(null)} />}

      {/* Add Competitor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
          <div className="rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Nuevo competidor</h3>
              <button aria-label="Cerrar" onClick={() => setShowAddForm(false)}><X className="w-5 h-5" style={{ color: T.fgMuted }} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre *" className="input text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select id="competitors-select-2" aria-label="Selector" value={addForm.region} onChange={e => setAddForm(f => ({ ...f, region: e.target.value }))} className="input text-sm">
                  <option value="local">🇪🇸 España</option><option value="europe">🇪🇺 Europa</option><option value="global">🌐 Global</option>
                </select>
                <select id="competitors-select-3" aria-label="Selector" value={addForm.plan} onChange={e => setAddForm(f => ({ ...f, plan: e.target.value }))} className="input text-sm">
                  <option value="critical">Critica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
                </select>
              </div>
              <input type="text" value={addForm.scope} onChange={e => setAddForm(f => ({ ...f, scope: e.target.value }))} placeholder="Alcance (ej: growth SaaS / Growth / SaaS Best Practices)" className="input text-sm" />
              <input type="text" value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} placeholder="Website" className="input text-sm" />
              <div>
                <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="competitors-field-1">Madurez plataforma: <span style={{ fontFamily: fontMono }}>{addForm.maturity_score}%</span></label>
                <input id="competitors-field-1" type="range" min={0} max={100} value={addForm.maturity_score} onChange={e => setAddForm(f => ({ ...f, maturity_score: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-500" />
              </div>
              <textarea id="competitors-textarea-4" aria-label="Texto" value={addForm.analysis} onChange={e => setAddForm(f => ({ ...f, analysis: e.target.value }))} placeholder="Análisis del competidor" rows={2} className="input text-sm" />
              <textarea id="competitors-textarea-5" aria-label="Texto" value={addForm.weakness} onChange={e => setAddForm(f => ({ ...f, weakness: e.target.value }))} placeholder="Debilidad vs St4rtup" rows={2} className="input text-sm" />
              <textarea id="competitors-textarea-6" aria-label="Texto" value={addForm.vs_st4rtup} onChange={e => setAddForm(f => ({ ...f, vs_st4rtup: e.target.value }))} placeholder="Ventaja St4rtup" rows={2} className="input text-sm" />
              <button onClick={() => addForm.name && createMutation.mutate(addForm)} disabled={!addForm.name || createMutation.isPending}
                className="btn-primary w-full text-sm">{createMutation.isPending ? 'Creando...' : 'Añadir competidor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
