import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, Megaphone, Search, Filter, X, Edit3, Trash2, Eye,
  ChevronLeft, ChevronRight, ArrowLeft, Calendar, Target,
  DollarSign, Users as UsersIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { campaignsApi, dashboardApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STATUS_CONFIG = {
  draft: { label: 'Borrador', bg: T.muted, color: T.fgMuted },
  active: { label: 'Activa', bg: 'hsla(142,71%,45%,0.15)', color: T.success },
  paused: { label: 'Pausada', bg: 'hsla(38,92%,50%,0.15)', color: T.warning },
  finished: { label: 'Finalizada', bg: 'hsla(220,60%,50%,0.15)', color: 'hsl(220,60%,60%)' },
}

const CHANNEL_CONFIG = {
  linkedin_ads: { label: 'LinkedIn Ads', color: 'hsl(210,70%,55%)' },
  google_ads: { label: 'Google Ads', color: T.success },
  seo: { label: 'SEO', color: T.warning },
  email: { label: 'Email', color: T.cyan },
  youtube: { label: 'YouTube', color: T.destructive },
  webinar: { label: 'Webinar', color: T.purple },
  event: { label: 'Evento', color: 'hsl(330,60%,55%)' },
}

const OBJECTIVE_CONFIG = {
  lead_gen: { label: 'Generación Leads' },
  brand: { label: 'Marca' },
  nurturing: { label: 'Nurturing' },
  reactivation: { label: 'Reactivación' },
}

const INITIAL_FORM = {
  name: '',
  objective: 'lead_gen',
  channel: 'linkedin_ads',
  status: 'draft',
  budget_total: 0,
  persona_target: '',
  regulatory_focus: '',
  geo_target: [],
  start_date: '',
  end_date: '',
  leads_goal: 0,
  mqls_goal: 0,
  max_cpl: '',
  days_without_leads_alert: '',
}

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [viewingCampaign, setViewingCampaign] = useState(null)
  const [filters, setFilters] = useState({ status: '', channel: '', objective: '' })
  const [form, setForm] = useState(INITIAL_FORM)
  const [geoInput, setGeoInput] = useState('')

  const queryParams = {
    page,
    page_size: 20,
    ...(filters.status && { status: filters.status }),
    ...(filters.channel && { channel: filters.channel }),
    ...(filters.objective && { objective: filters.objective }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'campaigns', queryParams],
    queryFn: () => campaignsApi.list(queryParams).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => campaignsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'campaigns'] })
      toast.success('Campaña creada')
      closeModal()
    },
    onError: () => toast.error('Error al crear campaña'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => campaignsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'campaigns'] })
      toast.success('Campaña actualizada')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar campaña'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'campaigns'] })
      toast.success('Campaña eliminada')
    },
    onError: () => toast.error('Error al eliminar campaña'),
  })

  function closeModal() {
    setShowModal(false)
    setEditingCampaign(null)
    setForm(INITIAL_FORM)
    setGeoInput('')
  }

  function openCreate() {
    setForm(INITIAL_FORM)
    setEditingCampaign(null)
    setGeoInput('')
    setShowModal(true)
  }

  function openEdit(campaign) {
    setEditingCampaign(campaign)
    setForm({
      name: campaign.name,
      objective: campaign.objective,
      channel: campaign.channel,
      status: campaign.status,
      budget_total: campaign.budget_total || 0,
      persona_target: campaign.persona_target || '',
      regulatory_focus: campaign.regulatory_focus || '',
      geo_target: campaign.geo_target || [],
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      leads_goal: campaign.leads_goal || 0,
      mqls_goal: campaign.mqls_goal || 0,
      max_cpl: campaign.max_cpl ?? '',
      days_without_leads_alert: campaign.days_without_leads_alert ?? '',
    })
    setGeoInput('')
    setShowModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      budget_total: parseFloat(form.budget_total) || 0,
      leads_goal: parseInt(form.leads_goal) || 0,
      mqls_goal: parseInt(form.mqls_goal) || 0,
      max_cpl: form.max_cpl ? parseFloat(form.max_cpl) : null,
      days_without_leads_alert: form.days_without_leads_alert ? parseInt(form.days_without_leads_alert) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      persona_target: form.persona_target || null,
      regulatory_focus: form.regulatory_focus || null,
      geo_target: form.geo_target.length > 0 ? form.geo_target : null,
    }

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(campaign) {
    if (window.confirm(`¿Eliminar la campaña "${campaign.name}"?`)) {
      deleteMutation.mutate(campaign.id)
    }
  }

  function addGeoTag() {
    const tag = geoInput.trim()
    if (tag && !form.geo_target.includes(tag)) {
      setForm(f => ({ ...f, geo_target: [...f.geo_target, tag] }))
    }
    setGeoInput('')
  }

  function removeGeoTag(tag) {
    setForm(f => ({ ...f, geo_target: f.geo_target.filter(t => t !== tag) }))
  }

  const campaigns = data?.items || []
  const totalPages = data?.pages || 1
  const hasActiveFilters = filters.status || filters.channel || filters.objective

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.card, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
  }
  const selectStyle = { ...inputStyle }
  const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

  // Detail view
  if (viewingCampaign) {
    const sc = STATUS_CONFIG[viewingCampaign.status] || STATUS_CONFIG.draft
    const cc = CHANNEL_CONFIG[viewingCampaign.channel]
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <button
          onClick={() => setViewingCampaign(null)}
          className="flex items-center gap-2 transition-colors"
          style={{ color: T.fgMuted }}
          onMouseEnter={e => e.currentTarget.style.color = T.fg}
          onMouseLeave={e => e.currentTarget.style.color = T.fgMuted}
        >
          <ArrowLeft className="w-4 h-4" /> Volver a campañas
        </button>

        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>{viewingCampaign.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, backgroundColor: sc.bg, color: sc.color }}>
                  {sc.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: cc?.color || T.fgMuted }}>
                  {cc?.label || viewingCampaign.channel}
                </span>
                <span style={{ fontSize: 14, color: T.fgMuted }}>
                  {OBJECTIVE_CONFIG[viewingCampaign.objective]?.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setViewingCampaign(null); openEdit(viewingCampaign) }}
                style={{ padding: '6px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 14 }}
                className="transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailCard icon={DollarSign} label="Presupuesto" value={`€${(viewingCampaign.budget_total || 0).toLocaleString()}`} />
            <DetailCard icon={UsersIcon} label="Meta Leads" value={viewingCampaign.leads_goal || 0} />
            <DetailCard icon={Target} label="Meta MQLs" value={viewingCampaign.mqls_goal || 0} />
            <DetailCard icon={DollarSign} label="CPL Máx." value={viewingCampaign.max_cpl ? `€${viewingCampaign.max_cpl}` : '-'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h4 style={{ fontSize: 14, color: T.fgMuted, marginBottom: 4 }}>Fechas</h4>
              <p style={{ color: T.fg }}>
                {viewingCampaign.start_date || '-'} → {viewingCampaign.end_date || '-'}
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, color: T.fgMuted, marginBottom: 4 }}>Persona Target</h4>
              <p style={{ color: T.fg }}>{viewingCampaign.persona_target || '-'}</p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, color: T.fgMuted, marginBottom: 4 }}>Foco Regulatorio</h4>
              <p style={{ color: T.fg }}>{viewingCampaign.regulatory_focus || '-'}</p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, color: T.fgMuted, marginBottom: 4 }}>Geo Target</h4>
              <div className="flex flex-wrap gap-1">
                {viewingCampaign.geo_target?.length > 0
                  ? viewingCampaign.geo_target.map(g => (
                    <span key={g} style={{ padding: '2px 8px', backgroundColor: T.muted, color: T.fg, borderRadius: 4, fontSize: 12 }}>{g}</span>
                  ))
                  : <span style={{ color: T.fgMuted }}>-</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/marketing" style={{ color: T.fgMuted }} className="transition-colors hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2" style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>
              <Megaphone className="w-6 h-6" style={{ color: T.cyan }} />
              Campañas
            </h1>
            <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 2 }}>
              {data?.total ?? 0} campañas en total
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 transition-colors"
          style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
        >
          <Plus className="w-4 h-4" /> Nueva Campaña
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input id="campaigns-input-17" aria-label="Buscar campañas..." type="text"
            placeholder="Buscar campañas..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 transition-colors"
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14,
            border: `1px solid ${hasActiveFilters ? T.cyan : T.border}`,
            color: hasActiveFilters ? T.cyan : T.fgMuted,
            backgroundColor: hasActiveFilters ? 'hsla(185,72%,48%,0.1)' : 'transparent',
          }}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span style={{ width: 20, height: 20, backgroundColor: T.cyan, color: T.bg, fontSize: 12, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[filters.status, filters.channel, filters.objective].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="campaigns-field-1">Estado</label>
            <select id="campaigns-field-1" value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
              style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="campaigns-field-2">Canal</label>
            <select id="campaigns-field-2" value={filters.channel}
              onChange={(e) => { setFilters(f => ({ ...f, channel: e.target.value })); setPage(1) }}
              style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}
            >
              <option value="">Todos</option>
              {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="campaigns-field-3">Objetivo</label>
            <select id="campaigns-field-3" value={filters.objective}
              onChange={(e) => { setFilters(f => ({ ...f, objective: e.target.value })); setPage(1) }}
              style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}
            >
              <option value="">Todos</option>
              {Object.entries(OBJECTIVE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilters({ status: '', channel: '', objective: '' }); setPage(1) }}
              className="self-end flex items-center gap-1"
              style={{ fontSize: 12, color: T.fgMuted }}
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Campaign ROI Bubble Chart */}
      <CampaignRoiBubble />

      {/* Table */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Nombre</th>
                <th className="hidden md:table-cell" style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Canal</th>
                <th className="hidden lg:table-cell" style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Objetivo</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Estado</th>
                <th className="hidden lg:table-cell" style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Presupuesto</th>
                <th className="hidden xl:table-cell" style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Fechas</th>
                <th className="hidden xl:table-cell" style={{ textAlign: 'left', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Leads / MQLs</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: T.fgMuted, fontWeight: 500 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td colSpan={8} style={{ padding: '12px 16px' }}>
                      <div className="h-5 rounded animate-pulse" style={{ backgroundColor: T.muted }} />
                    </td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: '48px 16px', color: T.fgMuted }}>
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay campañas{hasActiveFilters ? ' con estos filtros' : ''}</p>
                    {!hasActiveFilters && (
                      <button onClick={openCreate} className="mt-2" style={{ color: T.cyan, fontSize: 14 }}>
                        Crear primera campaña
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft
                  const cc = CHANNEL_CONFIG[c.channel]
                  return (
                    <tr key={c.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setViewingCampaign(c)}
                          className="transition-colors text-left font-medium"
                          style={{ color: T.fg }}
                          onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                          onMouseLeave={e => e.currentTarget.style.color = T.fg}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="hidden md:table-cell" style={{ padding: '12px 16px', fontWeight: 500, color: cc?.color || T.fgMuted }}>
                        {cc?.label || c.channel}
                      </td>
                      <td className="hidden lg:table-cell" style={{ padding: '12px 16px', color: T.fg }}>
                        {OBJECTIVE_CONFIG[c.objective]?.label || c.objective}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, backgroundColor: sc.bg, color: sc.color }}>
                          {sc.label || c.status}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell" style={{ padding: '12px 16px', color: T.fg, fontFamily: fontMono }}>
                        €{(c.budget_total || 0).toLocaleString()}
                      </td>
                      <td className="hidden xl:table-cell" style={{ padding: '12px 16px', color: T.fgMuted, fontSize: 12 }}>
                        {c.start_date || '-'} → {c.end_date || '-'}
                      </td>
                      <td className="hidden xl:table-cell" style={{ padding: '12px 16px', color: T.fg, fontFamily: fontMono }}>
                        {c.leads_goal || 0} / {c.mqls_goal || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingCampaign(c)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: T.fgMuted }}
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: T.fgMuted }}
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: T.fgMuted }}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 14, color: T.fgMuted }}>
              Página {page} de {totalPages} ({data?.total} resultados)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{ color: T.fgMuted }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{ color: T.fgMuted }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <div className="flex items-center justify-between" style={{ padding: 20, borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.fg }}>
                {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg transition-colors">
                <X className="w-5 h-5" style={{ color: T.fgMuted }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" style={{ padding: 20 }}>
              {/* Name */}
              <div>
                <label style={labelStyle} htmlFor="campaigns-field-4">Nombre *</label>
                <input id="campaigns-field-4" type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Ej: LinkedIn Ads Q1 2026 - CEO España"
                />
              </div>

              {/* Objective + Channel + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-5">Objetivo *</label>
                  <select id="campaigns-field-5" value={form.objective}
                    onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(OBJECTIVE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-6">Canal *</label>
                  <select id="campaigns-field-6" value={form.channel}
                    onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-7">Estado</label>
                  <select id="campaigns-field-7" value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget + CPL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-8">Presupuesto Total (€)</label>
                  <input id="campaigns-field-8" type="number" min="0" step="0.01"
                    value={form.budget_total}
                    onChange={(e) => setForm(f => ({ ...f, budget_total: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-9">Meta Leads</label>
                  <input id="campaigns-field-9" type="number" min="0"
                    value={form.leads_goal}
                    onChange={(e) => setForm(f => ({ ...f, leads_goal: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-10">Meta MQLs</label>
                  <input id="campaigns-field-10" type="number" min="0"
                    value={form.mqls_goal}
                    onChange={(e) => setForm(f => ({ ...f, mqls_goal: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-11">CPL Máximo (€)</label>
                  <input id="campaigns-field-11" type="number" min="0" step="0.01"
                    value={form.max_cpl}
                    onChange={(e) => setForm(f => ({ ...f, max_cpl: e.target.value }))}
                    style={inputStyle}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-12">Alerta sin leads (días)</label>
                  <input id="campaigns-field-12" type="number" min="1"
                    value={form.days_without_leads_alert}
                    onChange={(e) => setForm(f => ({ ...f, days_without_leads_alert: e.target.value }))}
                    style={inputStyle}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-13">Fecha Inicio</label>
                  <input id="campaigns-field-13" type="date"
                    value={form.start_date}
                    onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-14">Fecha Fin</label>
                  <input id="campaigns-field-14" type="date"
                    value={form.end_date}
                    onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Persona + Regulatory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-15">Persona Target</label>
                  <input id="campaigns-field-15" type="text"
                    value={form.persona_target}
                    onChange={(e) => setForm(f => ({ ...f, persona_target: e.target.value }))}
                    style={inputStyle}
                    placeholder="Ej: CEO, CTO, DPO"
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="campaigns-field-16">Foco Regulatorio</label>
                  <input id="campaigns-field-16" type="text"
                    value={form.regulatory_focus}
                    onChange={(e) => setForm(f => ({ ...f, regulatory_focus: e.target.value }))}
                    style={inputStyle}
                    placeholder="Ej: ENS, NIS2, DORA"
                  />
                </div>
              </div>

              {/* Geo Target tags */}
              <div>
                <label style={labelStyle}>Geo Target</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={geoInput}
                    onChange={(e) => setGeoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGeoTag() } }}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Ej: España, Portugal... (Enter para añadir)"
                  />
                  <button
                    type="button"
                    onClick={addGeoTag}
                    className="transition-colors"
                    style={{ padding: '8px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 14 }}
                  >
                    Añadir
                  </button>
                </div>
                {form.geo_target.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.geo_target.map(tag => (
                      <span key={tag} className="flex items-center gap-1" style={{ padding: '2px 8px', backgroundColor: T.muted, color: T.fg, borderRadius: 4, fontSize: 12 }}>
                        {tag}
                        <button type="button" onClick={() => removeGeoTag(tag)} style={{ color: T.destructive }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="transition-colors"
                  style={{ padding: '8px 16px', color: T.fgMuted, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="disabled:opacity-50 transition-colors"
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingCampaign ? 'Guardar Cambios' : 'Crear Campaña'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const BUBBLE_COLORS = [T.cyan, T.purple, T.success, T.warning, 'hsl(210,70%,55%)', T.destructive, 'hsl(330,60%,55%)']

function CampaignRoiBubble() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'campaign-roi'],
    queryFn: () => dashboardApi.campaignRoi().then(r => r.data).catch(() => null),
    staleTime: 120000,
  })

  if (isLoading) return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <div className="h-4 w-48 rounded animate-pulse mb-4" style={{ backgroundColor: T.muted }} />
      <div className="h-[280px] rounded animate-pulse" style={{ backgroundColor: T.muted }} />
    </div>
  )

  const campaigns = data?.campaigns || data || []
  if (!campaigns?.length) return null

  const bubbleData = campaigns.map(c => ({
    name: c.name,
    budget: c.budget || c.budget_total || 0,
    leads: c.leads || c.leads_goal || 0,
    roi: c.roi || 0,
    channel: c.channel || '',
  }))

  const maxRoi = Math.max(...bubbleData.map(d => Math.abs(d.roi)), 1)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target className="w-4 h-4" style={{ color: T.purple }} />
        ROI por Campaña
        <span style={{ fontSize: 11, fontWeight: 400, color: T.fgMuted, marginLeft: 'auto' }}>
          Tamaño = ROI · X = Presupuesto · Y = Leads
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <XAxis
            type="number" dataKey="budget" name="Presupuesto"
            tick={{ fill: T.fgMuted, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={v => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <YAxis
            type="number" dataKey="leads" name="Leads"
            tick={{ fill: T.fgMuted, fontSize: 10 }} axisLine={false} tickLine={false}
          />
          <ZAxis type="number" dataKey="roi" range={[60, 600]} name="ROI" />
          <RechartsTooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                  <p style={{ color: T.fg, fontWeight: 600, marginBottom: 4 }}>{d?.name}</p>
                  <p style={{ color: T.fgMuted }}>Presupuesto: <span style={{ color: T.fg }}>€{d?.budget?.toLocaleString()}</span></p>
                  <p style={{ color: T.fgMuted }}>Leads: <span style={{ color: T.fg }}>{d?.leads}</span></p>
                  <p style={{ color: T.fgMuted }}>ROI: <span style={{ color: d?.roi >= 0 ? T.success : T.destructive }}>{d?.roi}%</span></p>
                </div>
              )
            }}
          />
          <Scatter data={bubbleData} shape="circle">
            {bubbleData.map((entry, i) => (
              <Cell key={i} fill={BUBBLE_COLORS[i % BUBBLE_COLORS.length]} fillOpacity={0.75} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
      <div className="flex items-center gap-2" style={{ color: T.fgMuted, fontSize: 12, marginBottom: 4 }}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p style={{ fontFamily: fontMono, fontSize: 18, fontWeight: 600, color: T.fg }}>{value}</p>
    </div>
  )
}
