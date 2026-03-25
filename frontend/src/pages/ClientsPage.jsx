import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import {
  Users, Plus, Search, Edit2, Trash2, Star, Phone, Mail,
  Linkedin, Building2, X, Crown,
  Network,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ExportButton from '@/components/ExportButton'
import { ListItemSkeleton } from '@/components/LoadingStates'

const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  border: '#E2E8F0',
  fg: '#0F172A',
  fgMuted: '#64748B',
  cyan: '#1E6FD9',
  purple: '#F5820B',
  destructive: 'hsl(0,70%,50%)',
  success: 'hsl(150,60%,40%)',
  warning: 'hsl(40,90%,50%)',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const ROLE_LABELS = {
  ceo: 'CEO', cto: 'CTO', ciso: 'CEO', dpo: 'DPO', cfo: 'CFO',
  cio: 'CIO', cco: 'CCO', coo: 'COO', it_director: 'Director IT',
  it_manager: 'IT Manager', security_manager: 'Security Manager',
  compliance_manager: 'Compliance Manager', legal: 'Legal',
  procurement: 'Procurement', other: 'Otro',
}

const INFLUENCE_LABELS = {
  decision_maker: 'Decision Maker', influencer: 'Influencer',
  gatekeeper: 'Gatekeeper', champion: 'Champion', user: 'Usuario',
  unknown: 'Desconocido',
}

const INFLUENCE_COLORS = {
  decision_maker: T.destructive,
  influencer: 'hsl(25,80%,50%)',
  gatekeeper: T.warning,
  champion: T.success,
  user: 'hsl(210,70%,55%)',
  unknown: T.fgMuted,
}

const RELATIONSHIP_LABELS = {
  champion: 'Champion', supporter: 'Supporter', neutral: 'Neutral',
  blocker: 'Blocker', unknown: 'Desconocido',
}

const RELATIONSHIP_COLORS = {
  champion: T.success,
  supporter: T.cyan,
  neutral: T.fgMuted,
  blocker: T.destructive,
  unknown: T.fgMuted,
}

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const { leads } = useLeadsSelect()

  const [search, setSearch] = useState('')
  const [filterLead, setFilterLead] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterInfluence, setFilterInfluence] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [viewMode, setViewMode] = useState('list')

  const queryParams = {
    page,
    page_size: 20,
    ...(search && { search }),
    ...(filterLead && { lead_id: filterLead }),
    ...(filterRole && { role_type: filterRole }),
    ...(filterInfluence && { influence_level: filterInfluence }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', queryParams],
    queryFn: () => contactsApi.list(queryParams).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['contacts-stats', filterLead || 'all'],
    queryFn: () => contactsApi.stats(filterLead ? { lead_id: filterLead } : {}).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => contactsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-stats'] })
      toast.success('Contacto creado')
      setShowForm(false)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al crear contacto'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contactsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-stats'] })
      toast.success('Contacto actualizado')
      setShowForm(false)
      setEditingContact(null)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-stats'] })
      toast.success('Contacto eliminado')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al eliminar'),
  })

  const contacts = data?.items || []
  const totalPages = data?.pages || 0

  const handleEdit = (contact) => {
    setEditingContact(contact)
    setShowForm(true)
  }

  const handleDelete = (contact) => {
    if (window.confirm(`Eliminar contacto "${contact.full_name}"?`)) {
      deleteMutation.mutate(contact.id)
    }
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg, color: T.fg, fontFamily: fontDisplay }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Contactos y Stakeholders</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>
            Mapa de poder y contactos clave de tus clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg p-1" style={{ backgroundColor: T.muted }}>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-sm rounded-md transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? `${T.cyan}20` : 'transparent',
                color: viewMode === 'list' ? T.cyan : T.fgMuted,
              }}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('powermap')}
              className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1"
              style={{
                backgroundColor: viewMode === 'powermap' ? `${T.cyan}20` : 'transparent',
                color: viewMode === 'powermap' ? T.cyan : T.fgMuted,
              }}
            >
              <Network className="w-4 h-4" />
              Power Map
            </button>
          </div>
          <ExportButton
            data={contacts || []}
            filename="contactos"
            transform={(c) => ({
              'Nombre': c.full_name || '',
              'Email': c.email || '',
              'Telefono': c.phone || '',
              'Cargo': c.job_title || '',
              'Empresa': c.lead_name || '',
              'Rol': c.role_type || '',
              'Influencia': c.influence_level || '',
              'Relacion': c.relationship_status || '',
            })}
            size="sm"
          />
          <button
            onClick={() => { setEditingContact(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: T.cyan, color: T.bg }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.fgMuted }}>Total Contactos</p>
            <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{stats.total || 0}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.fgMuted }}>Decision Makers</p>
            <p className="text-2xl font-bold" style={{ color: T.destructive, fontFamily: fontMono }}>{stats.by_influence?.decision_maker || 0}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.fgMuted }}>Champions</p>
            <p className="text-2xl font-bold" style={{ color: T.success, fontFamily: fontMono }}>{stats.by_influence?.champion || 0}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.fgMuted }}>Blockers</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(25,80%,50%)', fontFamily: fontMono }}>
              {stats.by_relationship?.blocker || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
            <input
              id="contacts-search"
              aria-label="Buscar contactos"
              type="text"
              placeholder="Buscar por nombre, email o cargo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ ...inputStyle, paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            id="contacts-filter-lead"
            aria-label="Filtrar por empresa"
            value={filterLead}
            onChange={(e) => { setFilterLead(e.target.value); setPage(1) }}
            style={{ ...inputStyle, width: '12rem' }}
          >
            <option value="">Todas las empresas</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.company_name}</option>
            ))}
          </select>
          <select
            id="contacts-filter-role"
            aria-label="Filtrar por rol"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}
            style={{ ...inputStyle, width: '10rem' }}
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            id="contacts-filter-influence"
            aria-label="Filtrar por influencia"
            value={filterInfluence}
            onChange={(e) => { setFilterInfluence(e.target.value); setPage(1) }}
            style={{ ...inputStyle, width: '11rem' }}
          >
            <option value="">Toda influencia</option>
            {Object.entries(INFLUENCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : viewMode === 'powermap' ? (
        <PowerMapView
          contacts={contacts}
          leads={leads}
          filterLead={filterLead}
          onEdit={handleEdit}
          onView={setSelectedContact}
        />
      ) : (
        <>
          {/* List View */}
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <Users className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
                <p style={{ color: T.fgMuted }}>No se encontraron contactos</p>
                <button
                  onClick={() => { setEditingContact(null); setShowForm(true) }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: T.cyan, color: T.bg }}
                >
                  <Plus className="w-4 h-4" />
                  Crear primer contacto
                </button>
              </div>
            ) : (
              contacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  leads={leads}
                  onEdit={() => handleEdit(contact)}
                  onDelete={() => handleDelete(contact)}
                  onView={() => setSelectedContact(contact)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
              >
                Anterior
              </button>
              <span className="text-sm" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Contact Form Modal */}
      {showForm && (
        <ContactFormModal
          contact={editingContact}
          leads={leads}
          onClose={() => { setShowForm(false); setEditingContact(null) }}
          onSubmit={(data) => {
            if (editingContact) {
              updateMutation.mutate({ id: editingContact.id, data })
            } else {
              createMutation.mutate(data)
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          leads={leads}
          onClose={() => setSelectedContact(null)}
          onEdit={() => { setSelectedContact(null); handleEdit(selectedContact) }}
        />
      )}
    </div>
  )
}


// ─── Contact Card ────────────────────────────────────────────────

function ContactCard({ contact, leads, onEdit, onDelete, onView }) {
  const lead = leads.find(l => l.id === contact.lead_id)
  const infColor = INFLUENCE_COLORS[contact.influence_level] || INFLUENCE_COLORS.unknown
  const relColor = RELATIONSHIP_COLORS[contact.relationship_status] || RELATIONSHIP_COLORS.unknown

  return (
    <div
      className="rounded-xl p-4 transition-colors cursor-pointer"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
      onClick={onView}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.fgMuted}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${T.cyan}20, ${T.purple}20)`, border: `1px solid ${T.border}` }}>
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="text-lg font-bold" style={{ color: T.cyan }}>
              {contact.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate" style={{ color: T.fg }}>{contact.full_name}</h3>
            {contact.is_primary && (
              <Star className="w-4 h-4 flex-shrink-0" style={{ color: T.warning }} fill="currentColor" />
            )}
            {contact.is_budget_holder && (
              <Crown className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(35,80%,50%)' }} title="Budget Holder" />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm mb-2" style={{ color: T.fgMuted }}>
            {contact.job_title && <span>{contact.job_title}</span>}
            {contact.department && <span>| {contact.department}</span>}
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: infColor, backgroundColor: `${infColor}15`, border: `1px solid ${infColor}30` }}>
              {INFLUENCE_LABELS[contact.influence_level] || 'Desconocido'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: T.fg, backgroundColor: T.muted }}>
              {ROLE_LABELS[contact.role_type] || contact.role_type}
            </span>
            <span className="text-xs" style={{ color: relColor }}>
              {RELATIONSHIP_LABELS[contact.relationship_status] || ''}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs" style={{ color: T.fgMuted }}>
            {lead && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {lead.company_name}
              </span>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:opacity-80" style={{ color: T.cyan }}>
                <Mail className="w-3 h-3" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {contact.phone}
              </span>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:opacity-80" style={{ color: T.cyan }}>
                <Linkedin className="w-3 h-3" />
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Editar">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Power Map View ──────────────────────────────────────────────

function PowerMapView({ contacts, leads, filterLead, onEdit, onView }) {
  const influenceLevels = ['decision_maker', 'influencer', 'gatekeeper', 'champion', 'user', 'unknown']

  const grouped = {}
  influenceLevels.forEach(level => {
    grouped[level] = contacts.filter(c => c.influence_level === level)
  })

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <Network className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
        <p style={{ color: T.fgMuted }}>
          {filterLead ? 'No hay contactos para esta empresa' : 'Selecciona una empresa para ver su mapa de poder'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {influenceLevels.map(level => {
        const levelContacts = grouped[level]
        if (levelContacts.length === 0) return null
        const levelColor = INFLUENCE_COLORS[level]

        return (
          <div key={level} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: levelColor, fontFamily: fontDisplay }}>
              {INFLUENCE_LABELS[level]}
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: T.fgMuted, backgroundColor: T.muted }}>
                {levelContacts.length}
              </span>
            </h3>

            <div className="space-y-2">
              {levelContacts.map(contact => {
                const lead = leads.find(l => l.id === contact.lead_id)
                const relColor = RELATIONSHIP_COLORS[contact.relationship_status] || RELATIONSHIP_COLORS.unknown
                return (
                  <div
                    key={contact.id}
                    onClick={() => onView(contact)}
                    className="p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ backgroundColor: T.muted }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = T.border}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = T.muted}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm" style={{ color: T.fg }}>{contact.full_name}</span>
                      {contact.is_primary && <Star className="w-3 h-3" style={{ color: T.warning }} fill="currentColor" />}
                    </div>
                    <p className="text-xs" style={{ color: T.fgMuted }}>{contact.job_title || ROLE_LABELS[contact.role_type]}</p>
                    {lead && <p className="text-xs mt-1" style={{ color: T.fgMuted }}>{lead.company_name}</p>}
                    <span className="text-xs mt-1 inline-block" style={{ color: relColor }}>
                      {RELATIONSHIP_LABELS[contact.relationship_status]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ─── Contact Form Modal ──────────────────────────────────────────

function ContactFormModal({ contact, leads, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    lead_id: contact?.lead_id || '',
    full_name: contact?.full_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    linkedin_url: contact?.linkedin_url || '',
    job_title: contact?.job_title || '',
    department: contact?.department || '',
    role_type: contact?.role_type || 'other',
    influence_level: contact?.influence_level || 'unknown',
    relationship_status: contact?.relationship_status || 'unknown',
    is_primary: contact?.is_primary || false,
    is_budget_holder: contact?.is_budget_holder || false,
    is_technical_evaluator: contact?.is_technical_evaluator || false,
    notes: contact?.notes || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.lead_id || !form.full_name) {
      toast.error('Empresa y nombre son obligatorios')
      return
    }
    const submitData = { ...form }
    Object.keys(submitData).forEach(k => {
      if (submitData[k] === '') submitData[k] = null
    })
    submitData.lead_id = form.lead_id
    submitData.full_name = form.full_name
    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }} onClick={onClose}>
      <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-lg font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Empresa */}
          {!contact && (
            <div>
              <label htmlFor="contact-lead-id" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Empresa *</label>
              <select id="contact-lead-id" value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} style={inputStyle} required>
                <option value="">Seleccionar empresa</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.company_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="contact-fullname" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Nombre completo *</label>
              <input id="contact-fullname" type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} required />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Email</label>
              <input id="contact-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="contact-linkedin" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>LinkedIn</label>
              <input id="contact-linkedin" type="url" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} style={inputStyle} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Telefono</label>
              <input id="contact-phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="contact-mobile" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Movil</label>
              <input id="contact-mobile" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Professional */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-job-title" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Cargo</label>
              <input id="contact-job-title" type="text" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} style={inputStyle} placeholder="Director de Seguridad" />
            </div>
            <div>
              <label htmlFor="contact-department" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Departamento</label>
              <input id="contact-department" type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle} placeholder="IT, Legal, Compliance..." />
            </div>
            <div>
              <label htmlFor="contact-role" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Rol</label>
              <select id="contact-role" value={form.role_type} onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))} style={inputStyle}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Power Map */}
          <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
              <Network className="w-4 h-4" />
              Mapa de Poder
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-influence" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Nivel de Influencia</label>
                <select id="contact-influence" value={form.influence_level} onChange={e => setForm(f => ({ ...f, influence_level: e.target.value }))} style={inputStyle}>
                  {Object.entries(INFLUENCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact-relationship" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Relacion</label>
                <select id="contact-relationship" value={form.relationship_status} onChange={e => setForm(f => ({ ...f, relationship_status: e.target.value }))} style={inputStyle}>
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.fg }}>
                <input id="contact-is-primary" type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
                Contacto Principal
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.fg }}>
                <input id="contact-is-budget-holder" type="checkbox" checked={form.is_budget_holder} onChange={e => setForm(f => ({ ...f, is_budget_holder: e.target.checked }))} />
                Budget Holder
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.fg }}>
                <input id="contact-is-technical" type="checkbox" checked={form.is_technical_evaluator} onChange={e => setForm(f => ({ ...f, is_technical_evaluator: e.target.checked }))} />
                Evaluador Tecnico
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="contact-notes" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Notas</label>
            <textarea id="contact-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} rows={3} placeholder="Notas sobre este contacto..." />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: T.cyan, color: T.bg }}>
              {isLoading ? 'Guardando...' : contact ? 'Actualizar' : 'Crear Contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ─── Contact Detail Modal ────────────────────────────────────────

function ContactDetailModal({ contact, leads, onClose, onEdit }) {
  const lead = leads.find(l => l.id === contact.lead_id)
  const infColor = INFLUENCE_COLORS[contact.influence_level] || INFLUENCE_COLORS.unknown
  const relColor = RELATIONSHIP_COLORS[contact.relationship_status] || RELATIONSHIP_COLORS.unknown

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }} onClick={onClose}>
      <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-lg font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>Detalle del Contacto</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 rounded-lg" style={{ color: T.fgMuted }} title="Editar">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.cyan}20, ${T.purple}20)`, border: `1px solid ${T.border}` }}>
              <span className="text-2xl font-bold" style={{ color: T.cyan }}>
                {contact.full_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{contact.full_name}</h3>
                {contact.is_primary && <Star className="w-4 h-4" style={{ color: T.warning }} fill="currentColor" />}
              </div>
              <p style={{ color: T.fgMuted }}>{contact.job_title || ROLE_LABELS[contact.role_type]}</p>
              {lead && (
                <p className="text-sm flex items-center gap-1 mt-1" style={{ color: T.fgMuted }}>
                  <Building2 className="w-3 h-3" />
                  {lead.company_name}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1 rounded-full" style={{ color: infColor, backgroundColor: `${infColor}15`, border: `1px solid ${infColor}30` }}>
              {INFLUENCE_LABELS[contact.influence_level]}
            </span>
            <span className="text-xs px-3 py-1 rounded-full" style={{ color: relColor, backgroundColor: T.muted }}>
              {RELATIONSHIP_LABELS[contact.relationship_status]}
            </span>
            {contact.is_budget_holder && (
              <span className="text-xs px-3 py-1 rounded-full" style={{ color: 'hsl(35,80%,50%)', backgroundColor: 'hsl(35,80%,50%,0.1)' }}>Budget Holder</span>
            )}
            {contact.is_technical_evaluator && (
              <span className="text-xs px-3 py-1 rounded-full" style={{ color: 'hsl(210,70%,55%)', backgroundColor: 'hsl(210,70%,55%,0.1)' }}>Evaluador Tecnico</span>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm" style={{ color: T.fg }}>
                <Mail className="w-4 h-4" style={{ color: T.fgMuted }} />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm" style={{ color: T.fg }}>
                <Phone className="w-4 h-4" style={{ color: T.fgMuted }} />
                {contact.phone}
              </a>
            )}
            {contact.mobile && (
              <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-sm" style={{ color: T.fg }}>
                <Phone className="w-4 h-4" style={{ color: T.fgMuted }} />
                {contact.mobile} (Movil)
              </a>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: T.cyan }}>
                <Linkedin className="w-4 h-4" style={{ color: T.fgMuted }} />
                Ver perfil en LinkedIn
              </a>
            )}
          </div>

          {/* Engagement */}
          {(contact.engagement_score > 0 || contact.last_contacted_at) && (
            <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>Engagement</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs" style={{ color: T.fgMuted }}>Score</p>
                  <p className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{contact.engagement_score}/100</p>
                </div>
                {contact.last_contacted_at && (
                  <div>
                    <p className="text-xs" style={{ color: T.fgMuted }}>Ultimo contacto</p>
                    <p className="text-sm" style={{ color: T.fg }}>
                      {new Date(contact.last_contacted_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>Notas</h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: T.fgMuted }}>{contact.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
