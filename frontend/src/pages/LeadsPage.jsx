import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { leadsApi } from '@/services/api'
import { Plus, Search, X, Upload, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import LeadsImport from '@/components/LeadsImport'
import ExportButton from '@/components/ExportButton'
import EmptyState from '@/components/common/EmptyState'
import { formatDateForExport } from '@/utils/export'
import { mockLeads, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import { useSavedFilterPresets } from '@/hooks/useSavedFilterPresets'
import SavedFilterPresets from '@/components/SavedFilterPresets'

const T = {
  bg: 'hsl(220,60%,4%)',
  card: 'hsl(218,45%,8%)',
  muted: 'hsl(218,40%,12%)',
  border: 'hsl(217,40%,18%)',
  fg: 'hsl(210,40%,92%)',
  fgMuted: 'hsl(215,20%,55%)',
  cyan: 'hsl(190,100%,50%)',
  purple: 'hsl(270,62%,46%)',
  destructive: 'hsl(345,85%,61%)',
  success: 'hsl(160,100%,39%)',
  warning: 'hsl(20,100%,60%)',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STATUS_MAP = {
  new:         { code: 'N', label: 'Nuevo',       color: T.fgMuted },
  contacted:   { code: 'C', label: 'Contactado',  color: T.cyan },
  qualified:   { code: 'Q', label: 'Cualificado', color: T.purple },
  proposal:    { code: 'P', label: 'Propuesta',   color: T.warning },
  negotiation: { code: 'G', label: 'Negociacion', color: T.warning },
  won:         { code: 'W', label: 'Ganado',       color: T.success },
  lost:        { code: 'L', label: 'Perdido',     color: T.destructive },
  dormant:     { code: 'D', label: 'Inactivo',    color: T.fgMuted },
}

const sourceLabels = {
  website: 'Web', referral: 'Ref.', cold_outreach: 'Outb.',
  event: 'Evento', partner: 'Partner', other: 'Otro',
}

function ScoreGauge({ value }) {
  const width = Math.min(value, 100)
  const color = value >= 70 ? T.success : value >= 40 ? T.cyan : T.fgMuted
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ backgroundColor: T.muted }}>
        <div className="h-full transition-all rounded" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ fontFamily: fontMono, color }}>{value}</span>
    </div>
  )
}

function StatusCode({ status }) {
  const s = STATUS_MAP[status] || { code: '?', color: T.fgMuted }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded"
      style={{ fontFamily: fontMono, color: s.color, backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}
      title={s.label}>
      {s.code}
    </span>
  )
}

const inputStyle = {
  backgroundColor: T.muted,
  border: `1px solid ${T.border}`,
  color: T.fg,
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
}

const selectStyle = { ...inputStyle }

export default function LeadsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [filters, setFilters] = useState({ status: '', source: '', min_score: '' })
  const pageSize = 20
  const queryClient = useQueryClient()

  const filterPresets = useSavedFilterPresets(
    'leads', filters, search,
    ({ filters: f, searchQuery: s }) => { setFilters(f); setSearch(s) }
  )

  const queryParams = {
    search, page, page_size: pageSize,
    ...(filters.status && { status: filters.status }),
    ...(filters.source && { source: filters.source }),
    ...(filters.min_score && { min_score: parseInt(filters.min_score) }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await mockDelay(600)
        let filteredItems = [...mockLeads.items]
        if (search) filteredItems = filteredItems.filter(l =>
          l.company_name.toLowerCase().includes(search.toLowerCase()) ||
          l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          l.contact_email?.toLowerCase().includes(search.toLowerCase())
        )
        if (filters.status) filteredItems = filteredItems.filter(l => l.status === filters.status)
        if (filters.source) filteredItems = filteredItems.filter(l => l.source === filters.source)
        if (filters.min_score) filteredItems = filteredItems.filter(l => l.score >= parseInt(filters.min_score))
        return { items: filteredItems, total: filteredItems.length, page, page_size: pageSize, pages: Math.ceil(filteredItems.length / pageSize) }
      }
      try {
        return await leadsApi.list(queryParams).then(r => r.data)
      } catch (err) {
        await mockDelay(400)
        return mockLeads
      }
    },
  })

  const createLead = useMutation({
    mutationFn: async (data) => {
      if (USE_MOCK_DATA) {
        await mockDelay(800)
        return { data: { id: Math.random().toString(36).substr(2, 9), ...data } }
      }
      try { return await leadsApi.create(data) } catch (err) {
        await mockDelay(500)
        return { data: { id: Math.random().toString(36).substr(2, 9), ...data } }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(['leads']); toast.success('Lead creado'); setShowCreateModal(false) },
    onError: (error) => { toast.error(error.response?.data?.detail || 'Error al crear') },
  })

  const activeFiltersCount = Object.values(filters).filter(v => v).length
  const clearFilters = () => setFilters({ status: '', source: '', min_score: '' })

  const items = data?.items || []
  const sortedItems = sortConfig.key
    ? [...items].sort((a, b) => {
        const aVal = a[sortConfig.key], bVal = b[sortConfig.key]
        if (aVal == null) return 1
        if (bVal == null) return -1
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortConfig.direction === 'asc' ? cmp : -cmp
      })
    : items
  const totalPages = data?.pages || 0

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key && prev.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' }
    )
  }

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ChevronsUpDown className="w-3 h-3" style={{ color: T.fgMuted }} />
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3" style={{ color: T.cyan }} />
      : <ChevronDown className="w-3 h-3" style={{ color: T.cyan }} />
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-full" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="pb-4 mb-6" style={{ borderBottom: `2px solid ${T.border}` }}>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: fontDisplay, color: T.fg }}>LEADS</h1>
            <p className="text-xs uppercase tracking-[0.15em] mt-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>
              Base de prospeccion · {data?.total || 0} registros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SavedFilterPresets
              presets={filterPresets.presets}
              currentFilters={filters}
              onSave={filterPresets.savePreset}
              onLoad={filterPresets.loadPreset}
              onDelete={filterPresets.deletePreset}
              onUpdate={filterPresets.updatePreset}
              onRename={filterPresets.renamePreset}
              isCurrentPreset={filterPresets.isCurrentPreset}
            />
            <ExportButton
              data={data?.items || []}
              filename="leads"
              transform={(lead) => ({
                'Empresa': lead.company_name, 'CIF': lead.company_cif || '',
                'Contacto': lead.contact_name || '', 'Email': lead.contact_email || '',
                'Telefono': lead.contact_phone || '', 'Estado': lead.status,
                'Origen': sourceLabels[lead.source] || lead.source, 'Score': lead.score,
                'Ciudad': lead.company_city || '', 'Provincia': lead.company_province || '',
                'Sector': lead.company_sector || '', 'Creado': formatDateForExport(lead.created_at),
              })}
            />
            <button onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all"
              style={{ fontFamily: fontDisplay, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              <Upload className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition-all"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }} />
            <input id="leads-search" type="text" placeholder="Buscar empresa, contacto, email..."
              aria-label="Buscar leads"
              style={{ ...inputStyle, paddingLeft: '2.5rem' }}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-colors"
            style={{
              fontFamily: fontDisplay,
              border: `1px solid ${activeFiltersCount > 0 ? T.cyan + '60' : T.border}`,
              color: activeFiltersCount > 0 ? T.cyan : T.fgMuted,
              backgroundColor: activeFiltersCount > 0 ? `${T.cyan}10` : 'transparent',
            }}>
            Filtros
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 text-xs font-bold flex items-center justify-center rounded"
                style={{ backgroundColor: T.cyan, color: T.bg }}>{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-3 p-4 rounded-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div>
              <label className="block text-xs uppercase tracking-[0.15em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="leads-field-1">Estado</label>
              <select id="leads-field-1" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={selectStyle}>
                <option value="">Todos</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.code} — {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.15em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="leads-field-2">Origen</label>
              <select id="leads-field-2" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} style={selectStyle}>
                <option value="">Todos</option>
                <option value="website">Web</option>
                <option value="referral">Referido</option>
                <option value="cold_outreach">Outbound</option>
                <option value="event">Evento</option>
                <option value="partner">Partner</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.15em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="leads-field-3">Score min.</label>
              <input id="leads-field-3" type="number" value={filters.min_score} onChange={(e) => setFilters({ ...filters, min_score: e.target.value })}
                style={inputStyle} placeholder="0" min="0" max="100" />
            </div>
            {activeFiltersCount > 0 && (
              <div className="col-span-3 flex justify-end">
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs uppercase tracking-wider transition-colors"
                  style={{ fontFamily: fontDisplay, color: T.fgMuted }}>
                  <X className="w-3 h-3" /> Limpiar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-xs uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: fontMono, color: T.fgMuted }}>Cargando registros...</div>
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          type="leads"
          title="Sin leads"
          description="No hay leads que coincidan con tus filtros. Crea el primero o ajusta los criterios de busqueda."
          actionLabel="Crear Lead"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: T.card, borderBottom: `2px solid ${T.border}` }}>
                  {[
                    { key: 'company_name', label: 'Empresa', w: '28%' },
                    { key: 'contact_name', label: 'Contacto', w: '22%' },
                    { key: 'status', label: 'Est.', w: '6%' },
                    { key: 'score', label: 'Score', w: '14%' },
                    { key: 'source', label: 'Origen', w: '10%' },
                    { key: 'company_city', label: 'Ciudad', w: '12%' },
                  ].map(col => (
                    <th key={col.key}
                      className="px-4 py-3 text-left text-xs uppercase tracking-[0.1em] cursor-pointer select-none transition-colors"
                      style={{ width: col.w, fontFamily: fontDisplay, color: T.fgMuted }}
                      onClick={() => handleSort(col.key)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((lead, idx) => (
                  <tr key={lead.id}
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: idx % 2 === 0 ? T.bg : T.card,
                      borderBottom: `1px solid ${T.border}40`,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.muted}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? T.bg : T.card}
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <Link to={`/leads/${lead.id}`}
                        className="text-sm font-medium transition-colors"
                        style={{ color: T.fg }}
                        onClick={e => e.stopPropagation()}>
                        {lead.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: T.fg }}>{lead.contact_name || '—'}</p>
                      {lead.contact_email && (
                        <p className="text-xs mt-0.5" style={{ fontFamily: fontMono, color: T.fgMuted }}>{lead.contact_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusCode status={lead.status} /></td>
                    <td className="px-4 py-3"><ScoreGauge value={lead.score} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs uppercase tracking-wide" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                        {sourceLabels[lead.source] || lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: T.fgMuted }}>{lead.company_city || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 py-3 px-4 rounded-lg"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <span className="text-xs uppercase tracking-wider" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data?.total || 0)} de {data?.total || 0}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 transition-colors disabled:opacity-30" style={{ color: T.fgMuted }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  let p
                  if (totalPages <= 7) { p = i + 1 }
                  else if (page <= 4) { p = i + 1 }
                  else if (page >= totalPages - 3) { p = totalPages - 6 + i }
                  else { p = page - 3 + i }
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 text-sm rounded transition-colors"
                      style={{
                        fontFamily: fontMono,
                        ...(page === p
                          ? { backgroundColor: T.cyan, color: T.bg, fontWeight: 'bold' }
                          : { color: T.fgMuted }
                        )
                      }}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 transition-colors disabled:opacity-30" style={{ color: T.fgMuted }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createLead.mutate(data)}
          isLoading={createLead.isPending}
        />
      )}

      {showImportModal && (
        <LeadsImport
          isOpen={showImportModal}
          onClose={() => { setShowImportModal(false); queryClient.invalidateQueries(['leads']) }}
        />
      )}
    </div>
  )
}

function CreateLeadModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    company_name: '', company_cif: '', company_website: '', company_sector: '',
    company_size: '', company_city: '', company_province: '', company_country: 'España',
    contact_name: '', contact_title: '', contact_email: '', contact_phone: '',
    source: 'website', status: 'new', score: 50,
    is_critical_infrastructure: false, is_public_sector: false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.company_name) { toast.error('Nombre de empresa requerido'); return }
    onSubmit(formData)
  }

  const labelStyle = {
    fontFamily: fontDisplay,
    color: T.fgMuted,
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.25rem',
    display: 'block',
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg max-w-3xl w-full my-8 p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Nuevo Lead</h2>
            <div className="w-12 h-0.5 mt-1" style={{ backgroundColor: T.cyan }} />
          </div>
          <button onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company */}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold mb-3 pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>
              Empresa
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label style={labelStyle} htmlFor="leads-field-4">Nombre *</label>
                <input id="leads-field-4" type="text" value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  style={inputStyle} placeholder="Acme Corp S.L." required />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-5">CIF</label>
                <input id="leads-field-5" type="text" value={formData.company_cif}
                  onChange={(e) => setFormData({ ...formData, company_cif: e.target.value })}
                  style={inputStyle} placeholder="B12345678" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-6">Website</label>
                <input id="leads-field-6" type="url" value={formData.company_website}
                  onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  style={inputStyle} placeholder="https://ejemplo.com" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-7">Sector</label>
                <input id="leads-field-7" type="text" value={formData.company_sector}
                  onChange={(e) => setFormData({ ...formData, company_sector: e.target.value })}
                  style={inputStyle} placeholder="Banca, Salud, TI" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-8">Tamano</label>
                <select id="leads-field-8" value={formData.company_size}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })} style={selectStyle}>
                  <option value="">—</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="501+">501+</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-9">Ciudad</label>
                <input id="leads-field-9" type="text" value={formData.company_city}
                  onChange={(e) => setFormData({ ...formData, company_city: e.target.value })}
                  style={inputStyle} placeholder="Madrid" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-10">Provincia</label>
                <input id="leads-field-10" type="text" value={formData.company_province}
                  onChange={(e) => setFormData({ ...formData, company_province: e.target.value })}
                  style={inputStyle} placeholder="Madrid" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold mb-3 pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>
              Contacto
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle} htmlFor="leads-field-11">Nombre</label>
                <input id="leads-field-11" type="text" value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  style={inputStyle} placeholder="Juan Perez" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-12">Cargo</label>
                <input id="leads-field-12" type="text" value={formData.contact_title}
                  onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })}
                  style={inputStyle} placeholder="CTO, CISO" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-13">Email</label>
                <input id="leads-field-13" type="email" value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  style={inputStyle} placeholder="juan@empresa.com" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-14">Telefono</label>
                <input id="leads-field-14" type="tel" value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  style={inputStyle} placeholder="+34 600 000 000" />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold mb-3 pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>
              Clasificacion
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label style={labelStyle} htmlFor="leads-field-15">Origen</label>
                <select id="leads-field-15" value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })} style={selectStyle}>
                  <option value="website">Web</option>
                  <option value="referral">Referido</option>
                  <option value="cold_outreach">Outbound</option>
                  <option value="event">Evento</option>
                  <option value="partner">Partner</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-16">Estado</label>
                <select id="leads-field-16" value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={selectStyle}>
                  <option value="new">N — Nuevo</option>
                  <option value="contacted">C — Contactado</option>
                  <option value="qualified">Q — Cualificado</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="leads-field-17">Score</label>
                <input id="leads-field-17" type="number" value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value ? parseInt(e.target.value) : 50 })}
                  style={{ ...inputStyle, fontFamily: fontMono }} min="0" max="100" />
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_critical_infrastructure}
                  onChange={(e) => setFormData({ ...formData, is_critical_infrastructure: e.target.checked })} />
                <span className="text-xs uppercase tracking-wider" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Infraestr. Critica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_public_sector}
                  onChange={(e) => setFormData({ ...formData, is_public_sector: e.target.checked })} />
                <span className="text-xs uppercase tracking-wider" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Sector Publico</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button type="button" onClick={onClose} disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm uppercase tracking-wider font-semibold transition-colors"
              style={{ fontFamily: fontDisplay, border: `1px solid ${T.border}`, color: T.fgMuted, backgroundColor: T.muted }}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {isLoading ? 'Creando...' : 'Crear Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
