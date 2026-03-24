import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { visitsApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { Plus, Calendar, MapPin, Users, Clock, Video, Phone, Building2, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { mockVisits, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import { SearchWithFilters, FilterSummary } from '@/components/AdvancedFilters'
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters'
import ExportButton from '@/components/ExportButton'
import { formatDateForExport } from '@/utils/export'
import { ListItemSkeleton } from '@/components/LoadingStates'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#8B5CF6', destructive: '#EF4444',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const VISIT_TYPES = {
  presencial: { icon: Building2, label: 'Presencial', color: T.success },
  virtual: { icon: Video, label: 'Virtual', color: T.cyan },
  telefonica: { icon: Phone, label: 'Telefonica', color: T.warning },
}

const RESULT_MAP = {
  positive: { label: 'Positiva', color: T.success, bg: `${T.success}15` },
  neutral: { label: 'Neutral', color: T.fgMuted, bg: `${T.fgMuted}15` },
  negative: { label: 'Negativa', color: T.destructive, bg: `${T.destructive}15` },
  follow_up: { label: 'Seguimiento', color: T.warning, bg: `${T.warning}15` },
  no_show: { label: 'No Show', color: T.fgMuted, bg: `${T.fgMuted}15` },
}

function formatVisitDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function shortDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function VisitsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()

  const { filters, setFilters, searchQuery, setSearchQuery } = usePersistedFilterSearch('visits', {
    visit_type: { type: 'multiselect', label: 'Tipo de Visita', options: [{ value: 'presencial', label: 'Presencial' }, { value: 'virtual', label: 'Online' }, { value: 'telefonica', label: 'Telefono' }], value: [] },
    result: { type: 'multiselect', label: 'Resultado', options: [{ value: 'positive', label: 'Positiva' }, { value: 'neutral', label: 'Neutral' }, { value: 'negative', label: 'Negativa' }, { value: 'follow_up', label: 'Seguimiento' }, { value: 'no_show', label: 'No Show' }], value: [] },
    time_range: { type: 'multiselect', label: 'Periodo', options: [{ value: 'upcoming', label: 'Proximas' }, { value: 'past', label: 'Pasadas' }], value: [] },
    date_range: { type: 'daterange', label: 'Rango de Fechas', value: { from: '', to: '' } },
  })

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      if (USE_MOCK_DATA) { await mockDelay(600); return mockVisits.items }
      try { return await visitsApi.list().then(r => r.data.items || r.data || []) }
      catch { await mockDelay(400); return mockVisits.items }
    },
  })

  const createVisit = useMutation({
    mutationFn: (data) => visitsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['visits']); toast.success('Visita creada'); setShowCreateModal(false) },
    onError: (error) => { toast.error(`Error: ${error.response?.data?.detail || 'No se pudo crear la visita'}`) },
  })

  const deleteVisit = useMutation({
    mutationFn: (id) => visitsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['visits']); toast.success('Visita eliminada') },
  })

  const handleFiltersChange = (key, value) => { setFilters({ ...filters, [key]: { ...filters[key], value } }) }

  const now = new Date()
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const visitDate = new Date(visit.visit_date)
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!visit.lead_name?.toLowerCase().includes(q) && !visit.location?.toLowerCase().includes(q) && !visit.summary?.toLowerCase().includes(q)) return false
      }
      if (filters.visit_type.value.length > 0 && !filters.visit_type.value.includes(visit.visit_type)) return false
      if (filters.result.value.length > 0 && !filters.result.value.includes(visit.result)) return false
      if (filters.time_range.value.length > 0) {
        if (filters.time_range.value.includes('upcoming') && visitDate < now) return false
        if (filters.time_range.value.includes('past') && visitDate > now) return false
      }
      if (filters.date_range.value.from || filters.date_range.value.to) {
        const from = filters.date_range.value.from ? new Date(filters.date_range.value.from) : null
        const to = filters.date_range.value.to ? new Date(filters.date_range.value.to) : null
        if (from && visitDate < from) return false
        if (to && visitDate > to) return false
      }
      return true
    })
  }, [visits, searchQuery, filters, now])

  const sortedVisits = useMemo(() => [...filteredVisits].sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date)), [filteredVisits])

  const upcomingCount = visits.filter(v => new Date(v.visit_date) > now).length
  const positiveCount = visits.filter(v => v.result === 'positive').length
  const totalDurationMin = visits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0)

  const resultLabelsExport = { positive: 'Positiva', neutral: 'Neutral', negative: 'Negativa', follow_up: 'Seguimiento', no_show: 'No Show' }

  const statCards = [
    { label: 'Total', value: visits.length },
    { label: 'Pendientes', value: upcomingCount },
    { label: 'Positivas', value: positiveCount },
    { label: 'Tiempo Total', value: `${Math.floor(totalDurationMin / 60)}h ${totalDurationMin % 60}m` },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Visitas</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Registro de visitas comerciales</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={sortedVisits}
            filename="visitas"
            transform={(visit) => ({
              'Empresa': visit.lead_name,
              'Tipo': VISIT_TYPES[visit.visit_type]?.label || visit.visit_type,
              'Fecha': formatDateForExport(visit.visit_date),
              'Ubicacion': visit.location || '',
              'Duracion (min)': visit.duration_minutes || '',
              'Resultado': resultLabelsExport[visit.result] || visit.result,
              'Asistentes Internos': visit.attendees_internal?.join(', ') || '',
              'Resumen': visit.summary || '',
              'Proximos Pasos': visit.next_steps?.join('; ') || '',
              'Creado': formatDateForExport(visit.created_at),
            })}
          />
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nueva Visita
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs uppercase tracking-widest" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <SearchWithFilters searchValue={searchQuery} onSearchChange={setSearchQuery} placeholder="Buscar por empresa, ubicacion, resumen..." filters={filters} onFiltersChange={handleFiltersChange} className="mb-4" />
      <FilterSummary filters={filters} onClear={handleFiltersChange} resultsCount={sortedVisits.length} />

      <div className="flex items-center gap-2 mb-4 mt-2">
        <div className="h-px flex-1" style={{ borderTop: `1px dashed ${T.border}` }} />
        <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{sortedVisits.length} registro{sortedVisits.length !== 1 ? 's' : ''}</span>
        <div className="h-px flex-1" style={{ borderTop: `1px dashed ${T.border}` }} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : sortedVisits.length === 0 ? (
        <div className="rounded-lg py-16 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Sin visitas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedVisits.map((visit) => (
            <VisitEntry key={visit.id} visit={visit} onDelete={(id) => deleteVisit.mutate(id)} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateVisitModal onClose={() => setShowCreateModal(false)} onSubmit={(data) => createVisit.mutate(data)} isLoading={createVisit.isPending} />
      )}
    </div>
  )
}

function VisitEntry({ visit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isPast = new Date(visit.visit_date) < new Date()
  const typeInfo = VISIT_TYPES[visit.visit_type] || VISIT_TYPES.presencial
  const TypeIcon = typeInfo.icon
  const result = RESULT_MAP[visit.result]

  return (
    <div className="rounded-lg transition-all" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-0 cursor-pointer p-4" onClick={() => setExpanded(!expanded)}>
        {/* Type icon */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-4" style={{ backgroundColor: `${typeInfo.color}15` }}>
          <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
        </div>

        {/* Date */}
        <div className="w-44 flex-shrink-0 pr-4">
          <div className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{formatVisitDate(visit.visit_date)}</div>
          {visit.duration_minutes && (
            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: T.fgMuted }}>
              <Clock className="w-3 h-3" /> {visit.duration_minutes} min
            </div>
          )}
        </div>

        {/* Lead / info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold truncate" style={{ color: T.fg }}>
              {visit.lead_id ? (
                <Link to={`/leads/${visit.lead_id}`} className="transition-colors" style={{ color: T.fg }} onClick={e => e.stopPropagation()}>
                  {visit.lead_name || '—'}
                </Link>
              ) : (visit.lead_name || '—')}
            </span>
            {result && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: result.color, backgroundColor: result.bg }}>{result.label}</span>}
            {!isPast && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: T.cyan, backgroundColor: `${T.cyan}15` }}>Pendiente</span>}
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: T.fgMuted }}>
            <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
            {visit.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {visit.location}</span>}
            {(visit.attendees_internal?.length > 0 || visit.attendees_external?.length > 0) && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {visit.attendees_internal?.length || 0}i / {visit.attendees_external?.length || 0}e</span>
            )}
          </div>
          {visit.summary && <p className="text-xs mt-1 line-clamp-1" style={{ color: T.fgMuted }}>{visit.summary}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-3 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onDelete(visit.id) }} className="p-1.5 transition-colors" style={{ color: T.fgMuted }}>
            <X className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T.fgMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.fgMuted }} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="ml-14 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              {visit.summary && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Resumen</p>
                  <p className="text-sm leading-relaxed pl-3" style={{ color: T.fg, borderLeft: `2px solid ${T.border}` }}>{visit.summary}</p>
                </div>
              )}
              {visit.key_findings?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Hallazgos</p>
                  <ul className="space-y-1">
                    {visit.key_findings.map((f, i) => <li key={i} className="text-xs flex items-start gap-2" style={{ color: T.fgMuted }}><span style={{ color: T.cyan }}>{'>'}</span> {f}</li>)}
                  </ul>
                </div>
              )}
              {visit.pain_points?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Puntos Criticos</p>
                  <ul className="space-y-1">
                    {visit.pain_points.map((p, i) => <li key={i} className="text-xs flex items-start gap-2" style={{ color: T.warning }}>! {p}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {visit.next_steps?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Proximas Acciones</p>
                  <ul className="space-y-1">
                    {visit.next_steps.map((s, i) => <li key={i} className="text-xs flex items-start gap-2" style={{ color: T.fgMuted }}><span style={{ fontFamily: fontMono, color: T.fgMuted }}>{String(i + 1).padStart(2, '0')}.</span> {s}</li>)}
                  </ul>
                </div>
              )}
              {visit.follow_up_date && (
                <div className="rounded-lg p-3" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Seguimiento Programado</p>
                  <p className="text-sm" style={{ fontFamily: fontMono, color: T.cyan }}>{shortDate(visit.follow_up_date)}</p>
                  {visit.follow_up_notes && <p className="text-xs mt-1" style={{ color: T.fgMuted }}>{visit.follow_up_notes}</p>}
                </div>
              )}
              {(visit.attendees_internal?.length > 0 || visit.attendees_external?.length > 0) && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Personal</p>
                  <div className="grid grid-cols-2 gap-3">
                    {visit.attendees_internal?.length > 0 && (
                      <div>
                        <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Internos</p>
                        {visit.attendees_internal.map((name, i) => (
                          <div key={i} className="text-xs flex items-center gap-1" style={{ color: T.fg }}>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: T.cyan }} /> {name}
                          </div>
                        ))}
                      </div>
                    )}
                    {visit.attendees_external?.length > 0 && (
                      <div>
                        <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Externos</p>
                        {visit.attendees_external.map((att, i) => (
                          <div key={i} className="text-xs" style={{ color: T.fg }}>
                            <span className="w-1 h-1 rounded-full inline-block mr-1" style={{ backgroundColor: T.purple }} />
                            {att.name}{att.title ? ` — ${att.title}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateVisitModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    lead_id: '', visit_date: '', visit_type: 'presencial', duration_minutes: 60, location: '', result: 'positive',
    summary: '', key_findings: [], pain_points: [], next_steps: [], attendees_internal: [], attendees_external: [],
    follow_up_date: '', follow_up_notes: '',
  })
  const [currentInput, setCurrentInput] = useState({ key_finding: '', pain_point: '', next_step: '', attendee_internal: '', attendee_external_name: '', attendee_external_title: '' })
  const { leads } = useLeadsSelect()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.lead_id || !formData.visit_date) { toast.error('Completa los campos requeridos'); return }
    onSubmit({ ...formData, visit_date: new Date(formData.visit_date).toISOString(), follow_up_date: formData.follow_up_date || null })
  }

  const addToList = (listName, inputName, value) => {
    if (value.trim()) { setFormData({ ...formData, [listName]: [...formData[listName], value.trim()] }); setCurrentInput({ ...currentInput, [inputName]: '' }) }
  }

  const addExternalAttendee = () => {
    if (currentInput.attendee_external_name.trim()) {
      setFormData({ ...formData, attendees_external: [...formData.attendees_external, { name: currentInput.attendee_external_name.trim(), title: currentInput.attendee_external_title.trim() }] })
      setCurrentInput({ ...currentInput, attendee_external_name: '', attendee_external_title: '' })
    }
  }

  const removeFromList = (listName, index) => { setFormData({ ...formData, [listName]: formData[listName].filter((_, i) => i !== index) }) }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }}>
      <div className="rounded-lg max-w-3xl w-full my-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Nueva Visita</h2>
          <button onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div className="h-0.5" style={{ backgroundColor: T.cyan }} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Target */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Objetivo</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="visit-lead" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Lead <span style={{ color: T.destructive }}>*</span></label>
                <select id="visit-lead" value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} style={inputStyle} required>
                  <option value="">Seleccionar...</option>
                  {leads.map(lead => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="visit-date" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Fecha / Hora <span style={{ color: T.destructive }}>*</span></label>
                <input id="visit-date" type="datetime-local" value={formData.visit_date} onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })} style={inputStyle} required />
              </div>
              <div>
                <label htmlFor="visit-type" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Tipo</label>
                <select id="visit-type" value={formData.visit_type} onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })} style={inputStyle}>
                  <option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="telefonica">Telefonica</option>
                </select>
              </div>
              <div>
                <label htmlFor="visit-duration" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Duracion (min)</label>
                <input id="visit-duration" type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} style={inputStyle} min="5" />
              </div>
              <div>
                <label htmlFor="visit-location" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Ubicacion / URL</label>
                <input id="visit-location" type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={inputStyle} placeholder="Ubicacion..." />
              </div>
              <div>
                <label htmlFor="visit-result" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Resultado</label>
                <select id="visit-result" value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} style={inputStyle}>
                  <option value="positive">Positiva</option><option value="neutral">Neutral</option><option value="negative">Negativa</option><option value="follow_up">Seguimiento</option><option value="no_show">No Show</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="visit-summary" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Resumen</label>
                <textarea id="visit-summary" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Resumen de la visita..." />
              </div>
            </div>
          </div>

          {/* Personnel */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Personal</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="visit-attendee-internal" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Internos</label>
                <div className="flex gap-2">
                  <input id="visit-attendee-internal" type="text" value={currentInput.attendee_internal} onChange={(e) => setCurrentInput({ ...currentInput, attendee_internal: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('attendees_internal', 'attendee_internal', currentInput.attendee_internal))} style={inputStyle} placeholder="Nombre" />
                  <button type="button" onClick={() => addToList('attendees_internal', 'attendee_internal', currentInput.attendee_internal)}
                    className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>+</button>
                </div>
                {formData.attendees_internal.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.attendees_internal.map((name, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ color: T.cyan, backgroundColor: `${T.cyan}15` }}>
                        {name} <button type="button" onClick={() => removeFromList('attendees_internal', idx)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="visit-attendee-name" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Externos</label>
                <div className="flex gap-2">
                  <input id="visit-attendee-name" type="text" value={currentInput.attendee_external_name} onChange={(e) => setCurrentInput({ ...currentInput, attendee_external_name: e.target.value })} style={inputStyle} placeholder="Nombre" />
                  <input id="visit-attendee-title" type="text" value={currentInput.attendee_external_title} onChange={(e) => setCurrentInput({ ...currentInput, attendee_external_title: e.target.value })} style={inputStyle} placeholder="Cargo" />
                  <button type="button" onClick={addExternalAttendee} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>+</button>
                </div>
                {formData.attendees_external.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {formData.attendees_external.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: T.muted }}>
                        <span className="text-xs" style={{ color: T.fg }}>{att.name}{att.title ? ` — ${att.title}` : ''}</span>
                        <button type="button" onClick={() => removeFromList('attendees_external', idx)}><X className="w-3 h-3" style={{ color: T.fgMuted }} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Seguimiento</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="visit-follow-up-date" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Fecha</label>
                <input id="visit-follow-up-date" type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label htmlFor="visit-follow-up-notes" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Notas</label>
                <input id="visit-follow-up-notes" type="text" value={formData.follow_up_notes} onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })} style={inputStyle} placeholder="Notas de seguimiento..." />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button type="button" onClick={onClose} disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {isLoading ? 'Creando...' : 'Crear Visita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
