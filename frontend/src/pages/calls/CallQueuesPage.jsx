import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ListOrdered, Play, Pause, XCircle, RotateCcw, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { callQueuesApi, callPromptsApi, leadsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const STATUS_COLORS = {
  pending: T.warning,
  running: T.cyan,
  paused: T.purple,
  completed: T.success,
  failed: T.destructive,
  cancelled: T.fgMuted,
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  running: 'En ejecucion',
  paused: 'Pausada',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || T.fgMuted
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: `${color}15` }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ProgressBar({ completed, failed, total }) {
  if (!total) return null
  const pctOk = (completed / total) * 100
  const pctFail = (failed / total) * 100
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: T.muted }}>
      <div className="h-full flex">
        <div style={{ width: `${pctOk}%`, backgroundColor: T.success }} />
        <div style={{ width: `${pctFail}%`, backgroundColor: T.destructive }} />
      </div>
    </div>
  )
}

export default function CallQueuesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [page, setPage] = useState(1)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formPromptId, setFormPromptId] = useState('')
  const [formLeadSearch, setFormLeadSearch] = useState('')
  const [formSelectedLeads, setFormSelectedLeads] = useState([])
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [formDelay, setFormDelay] = useState(30)
  const [formMaxRetries, setFormMaxRetries] = useState(2)
  const [formNotes, setFormNotes] = useState('')

  const { data: queuesData, isLoading } = useQuery({
    queryKey: ['call-queues', page],
    queryFn: () => callQueuesApi.list({ page }).then(r => r.data),
    refetchInterval: 10000,
  })

  const { data: queueStats } = useQuery({
    queryKey: ['call-queues', 'stats'],
    queryFn: () => callQueuesApi.stats().then(r => r.data),
    refetchInterval: 10000,
  })

  const { data: prompts } = useQuery({
    queryKey: ['call-prompts-active'],
    queryFn: () => callPromptsApi.list({ activo: true, page_size: 100 }).then(r => r.data?.items || []),
  })

  const { data: leadsSearch } = useQuery({
    queryKey: ['leads-search-queue', formLeadSearch],
    queryFn: () => leadsApi.list({ search: formLeadSearch, page_size: 50 }).then(r => r.data?.items || []),
    enabled: formLeadSearch.length >= 2,
  })

  const { data: expandedQueue } = useQuery({
    queryKey: ['call-queue-detail', expandedId],
    queryFn: () => callQueuesApi.get(expandedId).then(r => r.data),
    enabled: !!expandedId,
  })

  const createMut = useMutation({
    mutationFn: (data) => callQueuesApi.create(data),
    onSuccess: () => {
      toast.success('Cola creada')
      queryClient.invalidateQueries({ queryKey: ['call-queues'] })
      setShowCreate(false)
      resetForm()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const actionMut = useMutation({
    mutationFn: ({ id, action }) => callQueuesApi[action](id),
    onSuccess: () => {
      toast.success('Accion realizada')
      queryClient.invalidateQueries({ queryKey: ['call-queues'] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => callQueuesApi.delete(id),
    onSuccess: () => {
      toast.success('Cola eliminada')
      queryClient.invalidateQueries({ queryKey: ['call-queues'] })
      setExpandedId(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  function resetForm() {
    setFormName(''); setFormPromptId(''); setFormLeadSearch('')
    setFormSelectedLeads([]); setFormScheduledAt('')
    setFormDelay(30); setFormMaxRetries(2); setFormNotes('')
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!formPromptId || formSelectedLeads.length === 0) {
      toast.error('Selecciona prompt y al menos un lead')
      return
    }
    createMut.mutate({
      name: formName || `Cola ${new Date().toLocaleDateString('es')}`,
      prompt_id: formPromptId,
      lead_ids: formSelectedLeads.map(l => l.id),
      scheduled_at: formScheduledAt || null,
      delay_between_calls_s: formDelay,
      max_retries: formMaxRetries,
      notes: formNotes || null,
    })
  }

  function toggleLead(lead) {
    setFormSelectedLeads(prev => {
      const exists = prev.find(l => l.id === lead.id)
      return exists ? prev.filter(l => l.id !== lead.id) : [...prev, lead]
    })
  }

  const queues = queuesData?.items || []
  const stats = queueStats || {}

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <ListOrdered className="w-6 h-6 inline mr-2" style={{ color: T.cyan }} />
            Colas de Llamadas
          </h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Batch calling — crea colas, programa y ejecuta llamadas masivas</p>
        </div>
        <div className="flex gap-2">
          <Link to="/calls" className="px-3 py-2 rounded-lg text-sm border transition-colors" style={{ borderColor: T.border, color: T.fgMuted }}>
            Consola
          </Link>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            style={{ backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nueva Cola
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total colas', value: stats.total_queues || 0 },
          { label: 'Activas', value: stats.active_queues || 0, color: T.cyan },
          { label: 'Llamadas en cola', value: stats.total_calls_queued || 0 },
          { label: 'Completadas', value: stats.total_calls_completed || 0, color: T.success },
          { label: 'Fallidas', value: stats.total_calls_failed || 0, color: T.destructive },
          { label: 'Coste total', value: `${(stats.total_cost_eur || 0).toFixed(2)} EUR` },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-lg p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: T.fgMuted }}>{kpi.label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: kpi.color || T.fg }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg p-5 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: T.fg }}>Crear nueva cola</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Nombre</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Cola prospecting marzo" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Prompt</label>
              <select value={formPromptId} onChange={e => setFormPromptId(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar prompt...</option>
                {prompts?.map(p => <option key={p.id} value={p.id} style={{ backgroundColor: T.muted }}>{p.nombre} ({p.objetivo})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Programar (opcional)</label>
              <input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Delay (s)</label>
                <input type="number" value={formDelay} onChange={e => setFormDelay(+e.target.value)} min={5} max={300} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Max reintentos</label>
                <input type="number" value={formMaxRetries} onChange={e => setFormMaxRetries(+e.target.value)} min={0} max={5} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Lead Selector */}
          <div>
            <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>
              Leads ({formSelectedLeads.length} seleccionados)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
              <input value={formLeadSearch} onChange={e => setFormLeadSearch(e.target.value)} placeholder="Buscar leads por empresa..."
                style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
            </div>
            {leadsSearch?.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                {leadsSearch.map(lead => {
                  const selected = formSelectedLeads.find(l => l.id === lead.id)
                  return (
                    <button key={lead.id} type="button" onClick={() => toggleLead(lead)}
                      className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:opacity-80"
                      style={{ color: selected ? T.cyan : T.fg, borderBottom: `1px solid ${T.border}` }}>
                      <span>{lead.company_name} — {lead.contact_name || 'Sin contacto'}</span>
                      {selected && <span className="text-xs">&#10003;</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {formSelectedLeads.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formSelectedLeads.map(l => (
                  <span key={l.id} className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 cursor-pointer"
                    onClick={() => toggleLead(l)}
                    style={{ backgroundColor: `${T.cyan}20`, color: T.cyan, border: `1px solid ${T.cyan}30` }}>
                    {l.company_name} &times;
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: T.fgMuted }}>Notas (opcional)</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} style={inputStyle} placeholder="Notas de la cola..." />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={createMut.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: T.cyan, color: T.bg }}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear cola
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm() }}
              className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: T.border, color: T.fgMuted }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Queues List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} />
        </div>
      ) : queues.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <ListOrdered className="w-10 h-10 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>No hay colas de llamadas. Crea una para empezar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queues.map(q => (
            <div key={q.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              {/* Queue Row */}
              <div className="p-4 flex items-center gap-4 cursor-pointer hover:opacity-90"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                {expandedId === q.id ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.fgMuted }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.fgMuted }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: T.fg }}>{q.name}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: T.fgMuted }}>{q.total_leads} leads</span>
                    <span className="text-xs" style={{ color: T.success }}>{q.completed_calls} OK</span>
                    {q.failed_calls > 0 && <span className="text-xs" style={{ color: T.destructive }}>{q.failed_calls} fail</span>}
                    <span className="text-xs" style={{ color: T.fgMuted }}>{q.actual_cost_eur?.toFixed(2)} EUR</span>
                  </div>
                </div>
                <div className="w-32">
                  <ProgressBar completed={q.completed_calls} failed={q.failed_calls} total={q.total_leads} />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {q.status === 'pending' && (
                    <button onClick={e => { e.stopPropagation(); actionMut.mutate({ id: q.id, action: 'start' }) }}
                      className="p-1.5 rounded" style={{ color: T.success }} title="Iniciar"><Play className="w-4 h-4" /></button>
                  )}
                  {q.status === 'running' && (
                    <button onClick={e => { e.stopPropagation(); actionMut.mutate({ id: q.id, action: 'pause' }) }}
                      className="p-1.5 rounded" style={{ color: T.warning }} title="Pausar"><Pause className="w-4 h-4" /></button>
                  )}
                  {q.status === 'paused' && (
                    <button onClick={e => { e.stopPropagation(); actionMut.mutate({ id: q.id, action: 'start' }) }}
                      className="p-1.5 rounded" style={{ color: T.success }} title="Reanudar"><Play className="w-4 h-4" /></button>
                  )}
                  {['running', 'paused', 'pending'].includes(q.status) && (
                    <button onClick={e => { e.stopPropagation(); actionMut.mutate({ id: q.id, action: 'cancel' }) }}
                      className="p-1.5 rounded" style={{ color: T.destructive }} title="Cancelar"><XCircle className="w-4 h-4" /></button>
                  )}
                  {['completed', 'failed'].includes(q.status) && q.failed_calls > 0 && (
                    <button onClick={e => { e.stopPropagation(); actionMut.mutate({ id: q.id, action: 'retryFailed' }) }}
                      className="p-1.5 rounded" style={{ color: T.warning }} title="Reintentar fallidos"><RotateCcw className="w-4 h-4" /></button>
                  )}
                  {q.status !== 'running' && (
                    <button onClick={e => { e.stopPropagation(); deleteMut.mutate(q.id) }}
                      className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === q.id && expandedQueue && (
                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: T.border }}>
                  <div className="mt-3 space-y-1.5">
                    {(expandedQueue.items || []).map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3 px-3 py-1.5 rounded text-xs"
                        style={{ backgroundColor: T.muted }}>
                        <span className="w-6 text-right" style={{ color: T.fgMuted }}>{i + 1}</span>
                        <span className="flex-1 truncate" style={{ color: T.fg }}>{item.lead_id}</span>
                        <StatusBadge status={item.status} />
                        {item.retry_count > 0 && <span style={{ color: T.warning }}>retry {item.retry_count}</span>}
                        {item.error_message && <span className="truncate max-w-[200px]" style={{ color: T.destructive }}>{item.error_message}</span>}
                      </div>
                    ))}
                  </div>
                  {expandedQueue.notes && (
                    <p className="mt-3 text-xs italic" style={{ color: T.fgMuted }}>{expandedQueue.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {queuesData && queuesData.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>
            Anterior
          </button>
          <span className="text-xs" style={{ color: T.fgMuted }}>{page} / {queuesData.pages}</span>
          <button disabled={page >= queuesData.pages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
