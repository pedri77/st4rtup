import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, X, Edit3, Trash2, Eye,
  ChevronLeft, ChevronRight, ArrowLeft, ExternalLink,
  Globe, MousePointer, BarChart3, Copy, Layout
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { marketingAssetsApi, campaignsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TYPE_CONFIG = {
  landing_page: { label: 'Landing Page', icon: Layout, color: 'hsl(210,70%,55%)' },
  cta_button: { label: 'Botón CTA', icon: MousePointer, color: T.success },
  cta_banner: { label: 'Banner CTA', icon: BarChart3, color: T.warning },
  cta_popup: { label: 'Popup CTA', icon: Layout, color: T.purple },
  cta_form: { label: 'Formulario CTA', icon: Layout, color: T.cyan },
}

const STATUS_CONFIG = {
  draft: { label: 'Borrador', bg: T.muted, color: T.fgMuted },
  active: { label: 'Activo', bg: 'hsla(142,71%,45%,0.15)', color: T.success },
  archived: { label: 'Archivado', bg: 'hsla(38,92%,50%,0.15)', color: T.warning },
}

const LANGUAGE_CONFIG = {
  es: { label: 'Español', flag: 'ES' },
  en: { label: 'English', flag: 'EN' },
  pt: { label: 'Portugues', flag: 'PT' },
}

const INITIAL_FORM = {
  type: 'landing_page',
  name: '',
  url: '',
  status: 'draft',
  language: 'es',
  has_hreflang: false,
  campaign_id: '',
  funnel_id: '',
}

const inputStyle = {
  width: '100%', padding: '8px 12px', backgroundColor: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
}
const selectStyle = { ...inputStyle }
const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

export default function AssetsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [viewingAsset, setViewingAsset] = useState(null)
  const [filters, setFilters] = useState({ status: '', type: '', language: '' })
  const [form, setForm] = useState(INITIAL_FORM)

  const queryParams = {
    page,
    page_size: 20,
    ...(filters.status && { status: filters.status }),
    ...(filters.type && { type: filters.type }),
    ...(filters.language && { language: filters.language }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'assets', queryParams],
    queryFn: () => marketingAssetsApi.list(queryParams).then(r => r.data),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'all'],
    queryFn: () => campaignsApi.list({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => marketingAssetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'assets'] })
      toast.success('Asset creado correctamente')
      closeModal()
    },
    onError: () => toast.error('Error al crear el asset'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => marketingAssetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'assets'] })
      toast.success('Asset actualizado')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingAssetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'assets'] })
      toast.success('Asset eliminado')
    },
    onError: () => toast.error('Error al eliminar'),
  })

  function closeModal() {
    setShowModal(false)
    setEditingAsset(null)
    setForm(INITIAL_FORM)
  }

  function openCreate() {
    setForm(INITIAL_FORM)
    setEditingAsset(null)
    setShowModal(true)
  }

  function openEdit(asset) {
    setForm({
      type: asset.type,
      name: asset.name,
      url: asset.url || '',
      status: asset.status,
      language: asset.language || 'es',
      has_hreflang: asset.has_hreflang || false,
      campaign_id: asset.campaign_id || '',
      funnel_id: asset.funnel_id || '',
    })
    setEditingAsset(asset)
    setShowModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      campaign_id: form.campaign_id || null,
      funnel_id: form.funnel_id || null,
    }
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(asset) {
    if (window.confirm(`¿Eliminar "${asset.name}"?`)) {
      deleteMutation.mutate(asset.id)
      if (viewingAsset?.id === asset.id) setViewingAsset(null)
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url)
    toast.success('URL copiada')
  }

  const items = data?.items || []
  const total = data?.total || 0
  const pages = data?.pages || 1
  const filtered = search
    ? items.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.url && a.url.toLowerCase().includes(search.toLowerCase())))
    : items
  const hasFilters = Object.values(filters).some(Boolean)

  // ─── Detail View ──────────────────────────────────────────────
  if (viewingAsset) {
    const a = viewingAsset
    const typeConf = TYPE_CONFIG[a.type] || { label: a.type, color: T.fgMuted }
    const statusConf = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft
    const langConf = LANGUAGE_CONFIG[a.language] || { label: a.language, flag: '??' }
    const convRate = a.visits > 0 ? ((a.conversions / a.visits) * 100).toFixed(1) : '0.0'
    const ctr = a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : '0.0'

    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div className="flex items-center gap-3">
          <button onClick={() => setViewingAsset(null)} className="p-2 rounded-lg" style={{ backgroundColor: T.card, color: T.fgMuted }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.fg }}>{a.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span style={{ fontSize: 14, color: typeConf.color }}>{typeConf.label}</span>
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 12, backgroundColor: statusConf.bg, color: statusConf.color }}>{statusConf.label}</span>
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 12, backgroundColor: T.muted, color: T.fg }}>{langConf.flag}</span>
              {a.has_hreflang && <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 12, backgroundColor: 'hsla(185,72%,48%,0.12)', color: T.cyan }}>hreflang</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {a.url && (
              <>
                <button onClick={() => copyUrl(a.url)} className="p-2 rounded-lg" style={{ backgroundColor: T.card, color: T.fgMuted }} title="Copiar URL">
                  <Copy size={16} />
                </button>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ backgroundColor: T.card, color: T.fgMuted }} title="Abrir página">
                  <ExternalLink size={16} />
                </a>
              </>
            )}
            <button onClick={() => openEdit(a)} className="p-2 rounded-lg" style={{ backgroundColor: 'hsla(185,72%,48%,0.12)', color: T.cyan }}>
              <Edit3 size={16} />
            </button>
          </div>
        </div>

        {a.url && (
          <div style={{ backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
            <p style={{ fontSize: 12, color: T.fgMuted, marginBottom: 4 }}>URL</p>
            <p style={{ fontSize: 14, color: T.cyan, wordBreak: 'break-all' }}>{a.url}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Visitas" value={a.visits.toLocaleString()} />
          <MetricCard label="Conversiones" value={a.conversions.toLocaleString()} />
          <MetricCard label="Tasa Conversión" value={`${convRate}%`} highlight={parseFloat(convRate) > 5} />
          <MetricCard label="Impresiones" value={a.impressions.toLocaleString()} />
          <MetricCard label="Clics" value={a.clicks.toLocaleString()} />
          <MetricCard label="CTR" value={`${ctr}%`} highlight={parseFloat(ctr) > 2} />
        </div>

        <div style={{ backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
          <p style={{ fontSize: 12, color: T.fgMuted, marginBottom: 8 }}>Información</p>
          <div className="grid grid-cols-2 gap-4" style={{ fontSize: 14 }}>
            <div>
              <span style={{ color: T.fgMuted }}>Tipo:</span>
              <span style={{ marginLeft: 8, color: typeConf.color }}>{typeConf.label}</span>
            </div>
            <div>
              <span style={{ color: T.fgMuted }}>Idioma:</span>
              <span style={{ marginLeft: 8, color: T.fg }}>{langConf.label}</span>
            </div>
            <div>
              <span style={{ color: T.fgMuted }}>hreflang:</span>
              <span style={{ marginLeft: 8, color: T.fg }}>{a.has_hreflang ? 'Configurado' : 'No configurado'}</span>
            </div>
            <div>
              <span style={{ color: T.fgMuted }}>Creado:</span>
              <span style={{ marginLeft: 8, color: T.fg }}>{new Date(a.created_at).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── List View ────────────────────────────────────────────────
  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="p-2 rounded-lg" style={{ backgroundColor: T.card, color: T.fgMuted }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.fg }}>Marketing Assets</h1>
            <p style={{ fontSize: 14, color: T.fgMuted }}>{total} assets</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2"
          style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          <Plus size={16} /> Nuevo Asset
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o URL..."
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14,
            border: `1px solid ${hasFilters ? T.cyan : T.border}`,
            color: hasFilters ? T.cyan : T.fgMuted,
            backgroundColor: hasFilters ? 'hsla(185,72%,48%,0.1)' : T.card,
          }}
        >
          <Filter size={16} /> Filtros {hasFilters && `(${Object.values(filters).filter(Boolean).length})`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3" style={{ padding: 16, backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
          <select id="assets-select-11" aria-label="Selector" value={filters.type} onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1) }}
            style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select id="assets-select-12" aria-label="Selector" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
            style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select id="assets-select-13" aria-label="Selector" value={filters.language} onChange={e => { setFilters(f => ({ ...f, language: e.target.value })); setPage(1) }}
            style={{ ...selectStyle, width: 'auto', padding: '6px 12px' }}>
            <option value="">Todos los idiomas</option>
            {Object.entries(LANGUAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilters({ status: '', type: '', language: '' }); setPage(1) }}
              className="flex items-center gap-1" style={{ padding: '6px 12px', fontSize: 14, color: T.destructive }}>
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: `2px solid ${T.cyan}`, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: T.fgMuted }}>
          <Globe size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay assets</p>
        </div>
      ) : (
        <div style={{ backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Idioma</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Visitas</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Conv.</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>CTR</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => {
                  const typeConf = TYPE_CONFIG[asset.type] || { label: asset.type, color: T.fgMuted }
                  const statusConf = STATUS_CONFIG[asset.status] || STATUS_CONFIG.draft
                  const langConf = LANGUAGE_CONFIG[asset.language] || { label: asset.language, flag: '??' }
                  const ctr = asset.impressions > 0 ? ((asset.clicks / asset.impressions) * 100).toFixed(1) : '—'
                  const convRate = asset.visits > 0 ? ((asset.conversions / asset.visits) * 100).toFixed(1) : '—'

                  return (
                    <tr key={asset.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <button onClick={() => setViewingAsset(asset)} className="font-medium text-left"
                            style={{ color: T.fg }}
                            onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                            onMouseLeave={e => e.currentTarget.style.color = T.fg}>
                            {asset.name}
                          </button>
                          {asset.url && (
                            <p className="truncate max-w-xs mt-0.5" style={{ fontSize: 12, color: T.fgMuted }}>{asset.url}</p>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, color: typeConf.color }}>{typeConf.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 12, backgroundColor: statusConf.bg, color: statusConf.color }}>{statusConf.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 12, backgroundColor: T.muted, color: T.fg }}>
                          {langConf.flag}
                          {asset.has_hreflang && <span style={{ marginLeft: 4, color: T.cyan }} title="hreflang configurado">*</span>}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: T.fg, fontFamily: fontMono }}>{asset.visits.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ color: T.fg, fontFamily: fontMono }}>{asset.conversions.toLocaleString()}</span>
                        {convRate !== '—' && <span style={{ fontSize: 12, color: T.fgMuted, marginLeft: 4 }}>({convRate}%)</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: T.fg, fontFamily: fontMono }}>{ctr !== '—' ? `${ctr}%` : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingAsset(asset)} className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Ver detalle">
                            <Eye size={14} />
                          </button>
                          {asset.url && (
                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Abrir URL">
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {asset.url && (
                            <button onClick={() => copyUrl(asset.url)} className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Copiar URL">
                              <Copy size={14} />
                            </button>
                          )}
                          <button onClick={() => openEdit(asset)} className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(asset)} className="p-1.5 rounded" style={{ color: T.fgMuted }} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p style={{ fontSize: 14, color: T.fgMuted }}>{total} resultados</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg disabled:opacity-50" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, color: T.fgMuted }}>Página {page} de {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 rounded-lg disabled:opacity-50" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between" style={{ padding: 16, borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.fg }}>
                {editingAsset ? 'Editar Asset' : 'Nuevo Asset'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded" style={{ color: T.fgMuted }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" style={{ padding: 16 }}>
              <div>
                <label style={labelStyle} htmlFor="assets-field-1">Nombre *</label>
                <input id="assets-field-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  style={inputStyle} placeholder="Ej: Landing NIS2 España" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="assets-field-2">Tipo *</label>
                  <select id="assets-field-2" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={selectStyle} disabled={!!editingAsset}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="assets-field-3">Estado</label>
                  <select id="assets-field-3" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={selectStyle}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="assets-field-4">URL</label>
                <input id="assets-field-4" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  style={inputStyle} placeholder="https://st4rtup.app/..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="assets-field-5">Idioma</label>
                  <select id="assets-field-5" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    style={selectStyle}>
                    {Object.entries(LANGUAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 cursor-pointer">
                    <input type="checkbox" checked={form.has_hreflang} onChange={e => setForm(f => ({ ...f, has_hreflang: e.target.checked }))}
                      style={{ accentColor: T.cyan }} />
                    <span style={{ fontSize: 14, color: T.fg }}>hreflang configurado</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="assets-field-6">Campaña asociada</label>
                <select id="assets-field-6" value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  style={selectStyle}>
                  <option value="">Sin campaña</option>
                  {(campaignsData?.items || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {editingAsset && (
                <>
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                    <p style={{ fontSize: 14, color: T.fgMuted, marginBottom: 12 }}>Métricas</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="assets-field-7">Visitas</label>
                        <input id="assets-field-7" type="number" min="0" value={form.visits ?? editingAsset.visits}
                          onChange={e => setForm(f => ({ ...f, visits: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="assets-field-8">Conversiones</label>
                        <input id="assets-field-8" type="number" min="0" value={form.conversions ?? editingAsset.conversions}
                          onChange={e => setForm(f => ({ ...f, conversions: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="assets-field-9">Impresiones</label>
                        <input id="assets-field-9" type="number" min="0" value={form.impressions ?? editingAsset.impressions}
                          onChange={e => setForm(f => ({ ...f, impressions: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="assets-field-10">Clics</label>
                        <input id="assets-field-10" type="number" min="0" value={form.clicks ?? editingAsset.clicks}
                          onChange={e => setForm(f => ({ ...f, clicks: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  style={{ padding: '8px 16px', fontSize: 14, color: T.fgMuted }}>
                  Cancelar
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="disabled:opacity-50"
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
                  {editingAsset ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, highlight }) {
  return (
    <div style={{ backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
      <p style={{ fontSize: 12, color: T.fgMuted }}>{label}</p>
      <p style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, marginTop: 4, color: highlight ? T.cyan : T.fg }}>{value}</p>
    </div>
  )
}
