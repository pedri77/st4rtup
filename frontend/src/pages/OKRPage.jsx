import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Target, Loader2, Plus, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { okrApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function categoryColor(cat) {
  const map = { pipeline: 'hsl(217,91%,60%)', revenue: T.success, marketing: T.purple, product: T.cyan }
  return map[cat] || T.fgMuted
}

function progressBarColor(pct) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#eab308'
  return '#ef4444'
}

function ObjectiveCard({ obj, onUpdateKR }) {
  const [expanded, setExpanded] = useState(true)
  const avgProgress = obj.progress || 0

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.muted }}>
          <span className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{Math.round(avgProgress)}%</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{obj.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: categoryColor(obj.category) }}>{obj.category}</span>
            <span className="text-xs" style={{ color: T.border }}>&middot;</span>
            <span className="text-xs" style={{ color: T.fgMuted }}>{obj.quarter}</span>
            {obj.owner && <><span className="text-xs" style={{ color: T.border }}>&middot;</span><span className="text-xs" style={{ color: T.fgMuted }}>{obj.owner}</span></>}
          </div>
        </div>
        <div className="w-24">
          <div className="w-full rounded-full h-2" style={{ backgroundColor: T.muted }}>
            <div className="h-2 rounded-full" style={{ width: `${avgProgress}%`, backgroundColor: progressBarColor(avgProgress) }} />
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T.fgMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.fgMuted }} />}
      </button>

      {expanded && obj.key_results?.length > 0 && (
        <div className="px-5 pb-5 space-y-3">
          {obj.key_results.map((kr) => (
            <div key={kr.id} className="rounded-lg p-3" style={{ backgroundColor: T.bg }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: T.fg }}>{kr.title}</span>
                  {kr.kpi_id && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,188,212,0.1)', color: T.cyan }}>
                      KPI: {kr.kpi_id}
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{kr.progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: T.muted }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${kr.progress}%`, backgroundColor: progressBarColor(kr.progress) }} />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    defaultValue={kr.current_value || 0}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) onUpdateKR(kr.id, val)
                    }}
                    className="w-16 text-xs rounded px-1.5 py-0.5 text-right"
                    style={{ backgroundColor: T.card, borderColor: T.border, border: '1px solid', color: T.fg, fontFamily: fontMono }}
                  />
                  <span className="text-[10px]" style={{ color: T.fgMuted, fontFamily: fontMono }}>/ {kr.target_value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OKRPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', quarter: '2026-Q2', category: 'revenue', owner: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['okr'],
    queryFn: () => okrApi.list().then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => okrApi.seed(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['okr'] }); toast.success('OKRs cargados') },
  })

  const createMutation = useMutation({
    mutationFn: (d) => okrApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['okr'] }); toast.success('Objetivo creado'); setShowAdd(false) },
  })

  const updateKRMutation = useMutation({
    mutationFn: ({ id, value }) => okrApi.updateKeyResult(id, { current_value: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['okr'] }),
  })

  const objectives = data?.objectives || []
  const avgProgress = objectives.length > 0 ? Math.round(objectives.reduce((s, o) => s + (o.progress || 0), 0) / objectives.length) : 0

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Breadcrumbs items={[{ label: 'GTM', href: '/gtm' }, { label: 'OKRs' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
          <Target className="w-7 h-7" style={{ color: T.cyan }} /> OKRs
        </h1>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border px-3 py-2 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-lg font-bold" style={{ color: T.cyan, fontFamily: fontMono }}>{avgProgress}%</p>
            <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Progreso</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Objetivo</button>
          {objectives.length === 0 && <button onClick={() => seedMutation.mutate()} className="btn-secondary text-sm">Cargar OKRs Q2</button>}
        </div>
      </div>

      <div className="space-y-4">
        {objectives.map(obj => (
          <ObjectiveCard key={obj.id} obj={obj} onUpdateKR={(id, val) => updateKRMutation.mutate({ id, value: val })} />
        ))}
      </div>

      {objectives.length === 0 && <p className="text-center text-sm py-8" style={{ color: T.fgMuted }}>Sin OKRs. Usa "Cargar OKRs Q2" para empezar.</p>}

      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => setShowAdd(false)}>
          <div className="rounded-xl border p-6 w-full max-w-md" style={{ backgroundColor: T.bg, borderColor: T.border }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Nuevo objetivo</h3>
            <div className="space-y-3">
              <input type="text" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="Titulo del objetivo" className="input text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select id="okr-select-1" aria-label="Selector" value={addForm.quarter} onChange={e => setAddForm(f => ({ ...f, quarter: e.target.value }))} className="input text-sm">
                  <option value="2026-Q1">Q1 2026</option><option value="2026-Q2">Q2 2026</option>
                  <option value="2026-Q3">Q3 2026</option><option value="2026-Q4">Q4 2026</option>
                </select>
                <select id="okr-select-2" aria-label="Selector" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} className="input text-sm">
                  <option value="revenue">Revenue</option><option value="pipeline">Pipeline</option>
                  <option value="marketing">Marketing</option><option value="product">Product</option>
                </select>
              </div>
              <input type="text" value={addForm.owner} onChange={e => setAddForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner" className="input text-sm" />
              <button onClick={() => addForm.title && createMutation.mutate(addForm)} disabled={!addForm.title} className="btn-primary w-full text-sm">Crear objetivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
