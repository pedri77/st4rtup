import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '@/services/api'
import {
  Search, Plus, Trash2, Edit3, Save, X, Loader2, Sprout, MapPin,
  TrendingUp, TrendingDown, Minus, Globe, Shield, ChevronDown, ChevronUp,
  ArrowLeft, BarChart3, Map, FileCheck, Hash
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TABS = [
  { id: 'keywords', label: 'Keywords', icon: Hash },
  { id: 'rankings', label: 'Rankings', icon: TrendingUp },
  { id: 'geo-pages', label: 'Geo Pages', icon: Map },
  { id: 'nap', label: 'NAP Audit', icon: FileCheck },
  { id: 'geo-rankings', label: 'Geo Rankings', icon: MapPin },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
]

const CATEGORIES = ['grc', 'compliance', 'ens', 'nis2', 'dora', 'iso27001', 'ai_act', 'brand']

const inputStyle = {
  padding: '8px 12px', backgroundColor: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
}
const selectStyle = { ...inputStyle }
const btnPrimary = { padding: '8px 12px', background: `linear-gradient(135deg, ${T.cyan}, hsl(220,72%,50%))`, color: '#fff', fontSize: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }
const btnSecondary = { padding: '8px 16px', backgroundColor: T.muted, color: T.fg, fontSize: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }

function PositionBadge({ position, previous }) {
  if (!position) return <span style={{ color: T.fgMuted, fontSize: 14 }}>-</span>
  const diff = previous ? previous - position : 0
  const color = diff > 0 ? T.success : diff < 0 ? T.destructive : T.fgMuted
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  return (
    <div className="flex items-center gap-1">
      <span style={{ fontFamily: fontMono, fontWeight: 700, color: position <= 10 ? T.success : position <= 30 ? T.warning : T.destructive }}>
        #{position}
      </span>
      {previous && (
        <span className="flex items-center" style={{ fontSize: 12, color }}>
          <Icon className="w-3 h-3" />
          {Math.abs(diff)}
        </span>
      )}
    </div>
  )
}

// ─── Keywords Tab ──────────────────────────────────────────────

function KeywordsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    keyword: '', language: 'es', location: 'Spain', search_volume: '',
    difficulty: '', cpc: '', category: 'grc', target_url: '', notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'keywords', { search, category }],
    queryFn: () => seoApi.listKeywords({ search: search || undefined, category: category || undefined, page_size: 100 }).then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => seoApi.seedKeywords(),
    onSuccess: (res) => {
      toast.success(`${res.data.created} keywords creadas`)
      queryClient.invalidateQueries({ queryKey: ['seo', 'keywords'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => editId ? seoApi.updateKeyword(editId, data) : seoApi.createKeyword(data),
    onSuccess: () => {
      toast.success(editId ? 'Keyword actualizada' : 'Keyword creada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'keywords'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => seoApi.deleteKeyword(id),
    onSuccess: () => {
      toast.success('Keyword eliminada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'keywords'] })
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm({ keyword: '', language: 'es', location: 'Spain', search_volume: '', difficulty: '', cpc: '', category: 'grc', target_url: '', notes: '' })
  }

  const startEdit = (kw) => {
    setEditId(kw.id)
    setForm({
      keyword: kw.keyword, language: kw.language, location: kw.location,
      search_volume: kw.search_volume || '', difficulty: kw.difficulty || '',
      cpc: kw.cpc || '', category: kw.category || 'grc',
      target_url: kw.target_url || '', notes: kw.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      search_volume: form.search_volume ? parseInt(form.search_volume) : null,
      difficulty: form.difficulty ? parseFloat(form.difficulty) : null,
      cpc: form.cpc ? parseFloat(form.cpc) : null,
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar keywords..."
            style={{ ...inputStyle, width: '100%', paddingLeft: 40 }}
          />
        </div>
        <select id="seo-select-1" aria-label="Selector" value={category} onChange={e => setCategory(e.target.value)}
          style={{ ...selectStyle, width: 'auto' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
          style={{ ...btnSecondary, backgroundColor: 'hsl(38,70%,40%)', color: '#fff' }}>
          <Sprout className="w-4 h-4" /> Seed
        </button>
        <button onClick={() => { resetForm(); setShowForm(true) }} style={btnPrimary}>
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.keyword} onChange={e => setForm({...form, keyword: e.target.value})} required
              placeholder="Keyword" style={inputStyle} />
            <select id="seo-select-2" aria-label="Selector" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
            <select id="seo-select-3" aria-label="Selector" value={form.language} onChange={e => setForm({...form, language: e.target.value})}
              style={selectStyle}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
            <input value={form.search_volume} onChange={e => setForm({...form, search_volume: e.target.value})} type="number"
              placeholder="Vol. búsqueda" style={inputStyle} />
            <input value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} type="number" step="0.1"
              placeholder="Dificultad (0-100)" style={inputStyle} />
            <input value={form.cpc} onChange={e => setForm({...form, cpc: e.target.value})} type="number" step="0.01"
              placeholder="CPC (€)" style={inputStyle} />
            <input value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})}
              placeholder="URL objetivo" style={inputStyle} className="md:col-span-2" />
            <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
              placeholder="Ubicación" style={inputStyle} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, fontSize: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save className="w-4 h-4" /> {editId ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={resetForm} style={btnSecondary}>
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: T.fgMuted }}>Keyword</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: T.fgMuted }}>Categoría</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: T.fgMuted }}>Idioma</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: T.fgMuted }}>Vol.</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: T.fgMuted }}>KD</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: T.fgMuted }}>CPC</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: T.fgMuted }}>Estado</th>
                <th style={{ padding: '12px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(kw => (
                <tr key={kw.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '8px 12px', color: T.fg, fontWeight: 500 }}>{kw.keyword}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 8px', backgroundColor: 'hsla(185,72%,48%,0.15)', color: T.cyan, borderRadius: 4, fontSize: 12 }}>{kw.category || '-'}</span>
                  </td>
                  <td style={{ padding: '8px', color: T.fgMuted }}>{kw.language}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: T.fg, fontFamily: fontMono }}>{kw.search_volume?.toLocaleString() || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <span style={{ fontFamily: fontMono, color: kw.difficulty > 70 ? T.destructive : kw.difficulty > 40 ? T.warning : T.success }}>
                      {kw.difficulty ?? '-'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: T.fg, fontFamily: fontMono }}>{kw.cpc ? `${kw.cpc}€` : '-'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, backgroundColor: kw.is_active ? 'hsla(142,71%,45%,0.15)' : T.muted, color: kw.is_active ? T.success : T.fgMuted }}>
                      {kw.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }} className="flex gap-1">
                    <button onClick={() => startEdit(kw)} className="p-1" style={{ color: T.fgMuted }}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(kw.id)} className="p-1" style={{ color: T.fgMuted }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.items?.length) && (
            <p className="text-center py-8" style={{ color: T.fgMuted }}>No hay keywords. Usa "Seed" para cargar keywords growth predefinidas.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Rankings Tab ──────────────────────────────────────────────

function RankingsTab() {
  const [keywordId, setKeywordId] = useState('')

  const { data: keywords } = useQuery({
    queryKey: ['seo', 'keywords', 'all'],
    queryFn: () => seoApi.listKeywords({ page_size: 200 }).then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'rankings', { keywordId }],
    queryFn: () => seoApi.listRankings({ keyword_id: keywordId || undefined, page_size: 100 }).then(r => r.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select id="seo-select-4" aria-label="Selector" value={keywordId} onChange={e => setKeywordId(e.target.value)}
          style={{ ...selectStyle, flex: 1 }}>
          <option value="">Todas las keywords</option>
          {keywords?.items?.map(kw => (
            <option key={kw.id} value={kw.id}>{kw.keyword}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted, textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px 8px' }}>Keyword</th>
                <th style={{ padding: '12px 8px' }}>Posición</th>
                <th style={{ padding: '12px 8px' }}>URL</th>
                <th style={{ padding: '12px 8px' }}>País</th>
                <th style={{ padding: '12px 8px' }}>Device</th>
                <th style={{ padding: '12px 8px' }}>Fuente</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(r => {
                const kw = keywords?.items?.find(k => k.id === r.keyword_id)
                return (
                  <tr key={r.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px 12px', color: T.fg }}>{r.check_date}</td>
                    <td style={{ padding: '8px', color: T.fg }}>{kw?.keyword || r.keyword_id?.slice(0, 8)}</td>
                    <td style={{ padding: '8px' }}><PositionBadge position={r.position} previous={r.previous_position} /></td>
                    <td style={{ padding: '8px', color: T.fgMuted }} className="truncate max-w-[200px]">{r.url_found || '-'}</td>
                    <td style={{ padding: '8px', color: T.fgMuted }}>{r.country}</td>
                    <td style={{ padding: '8px', color: T.fgMuted }}>{r.device}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ padding: '2px 8px', backgroundColor: T.muted, color: T.fg, borderRadius: 4, fontSize: 12 }}>{r.provider}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!data?.items?.length) && (
            <p className="text-center py-8" style={{ color: T.fgMuted }}>No hay rankings registrados. Los rankings se importan via crons/n8n o manualmente.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Geo Pages Tab ──────────────────────────────────────────────

function GeoPagesTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', url: '', country: 'ES', region: '', city: '',
    language: 'es', status: 'active', meta_title: '', meta_description: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'geo-pages'],
    queryFn: () => seoApi.listGeoPages({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => seoApi.createGeoPage(data),
    onSuccess: () => {
      toast.success('Geo page creada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'geo-pages'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => seoApi.deleteGeoPage(id),
    onSuccess: () => {
      toast.success('Geo page eliminada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'geo-pages'] })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
          <Plus className="w-4 h-4" /> Nueva Geo Page
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
              placeholder="Título" style={inputStyle} />
            <input value={form.url} onChange={e => setForm({...form, url: e.target.value})} required
              placeholder="URL" style={inputStyle} />
            <select id="seo-select-5" aria-label="Selector" value={form.country} onChange={e => setForm({...form, country: e.target.value})}
              style={selectStyle}>
              <option value="ES">España</option>
              <option value="PT">Portugal</option>
              <option value="MX">México</option>
              <option value="CO">Colombia</option>
              <option value="AR">Argentina</option>
              <option value="CL">Chile</option>
            </select>
            <input value={form.region} onChange={e => setForm({...form, region: e.target.value})}
              placeholder="Región / CC.AA." style={inputStyle} />
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
              placeholder="Ciudad" style={inputStyle} />
            <select id="seo-select-6" aria-label="Selector" value={form.language} onChange={e => setForm({...form, language: e.target.value})}
              style={selectStyle}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
            <input value={form.meta_title} onChange={e => setForm({...form, meta_title: e.target.value})}
              placeholder="Meta Title" style={inputStyle} className="md:col-span-3" />
            <textarea id="seo-textarea-9" aria-label="Texto" value={form.meta_description} onChange={e => setForm({...form, meta_description: e.target.value})}
              placeholder="Meta Description" rows={2} style={{ ...inputStyle, resize: 'none' }} className="md:col-span-3" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, fontSize: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save className="w-4 h-4" /> Crear
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.items?.map(p => (
            <div key={p.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div className="flex justify-between items-start mb-2">
                <h4 style={{ color: T.fg, fontWeight: 500 }}>{p.title}</h4>
                <div className="flex gap-1">
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, backgroundColor: p.status === 'active' ? 'hsla(142,71%,45%,0.15)' : T.muted, color: p.status === 'active' ? T.success : T.fgMuted }}>
                    {p.status}
                  </span>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-1" style={{ color: T.fgMuted }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="truncate block hover:underline" style={{ color: T.cyan, fontSize: 14 }}>{p.url}</a>
              <div className="flex gap-3 mt-2" style={{ fontSize: 12, color: T.fgMuted }}>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{p.country}</span>
                {p.region && <span>{p.region}</span>}
                {p.city && <span>{p.city}</span>}
                <span>{p.language}</span>
              </div>
              {p.meta_title && <p className="mt-2 truncate" style={{ fontSize: 12, color: T.fgMuted }}>Title: {p.meta_title}</p>}
            </div>
          ))}
          {(!data?.items?.length) && (
            <p className="text-center py-8 md:col-span-2" style={{ color: T.fgMuted }}>No hay geo pages. Crea páginas localizadas para cada mercado objetivo.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── NAP Audit Tab ──────────────────────────────────────────────

function NAPTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    source: '', source_url: '', business_name: '', address: '',
    phone: '', website: '', is_consistent: true, check_date: new Date().toISOString().split('T')[0], country: 'ES', notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'nap'],
    queryFn: () => seoApi.listNAP({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => seoApi.createNAP(data),
    onSuccess: () => {
      toast.success('NAP audit registrada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'nap'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => seoApi.deleteNAP(id),
    onSuccess: () => {
      toast.success('NAP audit eliminada')
      queryClient.invalidateQueries({ queryKey: ['seo', 'nap'] })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
          <Plus className="w-4 h-4" /> Nueva Auditoría
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select id="seo-select-7" aria-label="Selector" value={form.source} onChange={e => setForm({...form, source: e.target.value})} required
              style={selectStyle}>
              <option value="">Fuente...</option>
              <option value="google_business">Google Business</option>
              <option value="yelp">Yelp</option>
              <option value="paginas_amarillas">Páginas Amarillas</option>
              <option value="einforma">Einforma</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Otra</option>
            </select>
            <input value={form.source_url} onChange={e => setForm({...form, source_url: e.target.value})}
              placeholder="URL de la fuente" style={inputStyle} />
            <input value={form.check_date} onChange={e => setForm({...form, check_date: e.target.value})} type="date"
              style={inputStyle} />
            <input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})}
              placeholder="Nombre del negocio" style={inputStyle} />
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              placeholder="Dirección" style={inputStyle} />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="Teléfono" style={inputStyle} />
            <input value={form.website} onChange={e => setForm({...form, website: e.target.value})}
              placeholder="Website" style={inputStyle} />
            <label className="flex items-center gap-2" style={{ fontSize: 14, color: T.fg }}>
              <input type="checkbox" checked={form.is_consistent} onChange={e => setForm({...form, is_consistent: e.target.checked})}
                style={{ accentColor: T.cyan }} />
              NAP consistente
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, fontSize: 14, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save className="w-4 h-4" /> Registrar
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted, textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Fuente</th>
                <th style={{ padding: '12px 8px' }}>Negocio</th>
                <th style={{ padding: '12px 8px' }}>Dirección</th>
                <th style={{ padding: '12px 8px' }}>Teléfono</th>
                <th style={{ padding: '12px 8px' }}>Fecha</th>
                <th style={{ padding: '12px 8px' }}>Consistente</th>
                <th style={{ padding: '12px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(a => (
                <tr key={a.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '8px 12px', color: T.fg }}>{a.source.replace('_', ' ')}</td>
                  <td style={{ padding: '8px', color: T.fg }}>{a.business_name || '-'}</td>
                  <td style={{ padding: '8px', color: T.fgMuted }} className="truncate max-w-[200px]">{a.address || '-'}</td>
                  <td style={{ padding: '8px', color: T.fgMuted, fontFamily: fontMono }}>{a.phone || '-'}</td>
                  <td style={{ padding: '8px', color: T.fgMuted }}>{a.check_date}</td>
                  <td style={{ padding: '8px' }}>
                    {a.is_consistent === true && <span style={{ padding: '2px 8px', backgroundColor: 'hsla(142,71%,45%,0.15)', color: T.success, borderRadius: 4, fontSize: 12 }}>OK</span>}
                    {a.is_consistent === false && <span style={{ padding: '2px 8px', backgroundColor: 'hsla(0,72%,51%,0.15)', color: T.destructive, borderRadius: 4, fontSize: 12 }}>Inconsistente</span>}
                    {a.is_consistent === null && <span style={{ color: T.fgMuted, fontSize: 12 }}>-</span>}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => deleteMutation.mutate(a.id)} className="p-1" style={{ color: T.fgMuted }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.items?.length) && (
            <p className="text-center py-8" style={{ color: T.fgMuted }}>No hay auditorías NAP. Registra auditorías de consistencia NAP desde Google Business, Yelp, etc.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Geo Rankings Tab ──────────────────────────────────────────────

function GeoRankingsTab() {
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'geo-rankings', { keyword, location }],
    queryFn: () => seoApi.listGeoRankings({ keyword: keyword || undefined, location: location || undefined, page_size: 100 }).then(r => r.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Filtrar por keyword..."
          style={{ ...inputStyle, flex: 1 }} />
        <select id="seo-select-8" aria-label="Selector" value={location} onChange={e => setLocation(e.target.value)}
          style={{ ...selectStyle, width: 'auto' }}>
          <option value="">Todas las ubicaciones</option>
          <option value="Madrid">Madrid</option>
          <option value="Barcelona">Barcelona</option>
          <option value="Valencia">Valencia</option>
          <option value="Sevilla">Sevilla</option>
          <option value="Bilbao">Bilbao</option>
          <option value="Málaga">Málaga</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted, textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Keyword</th>
                <th style={{ padding: '12px 8px' }}>Ubicación</th>
                <th style={{ padding: '12px 8px' }}>País</th>
                <th style={{ padding: '12px 8px' }}>Posición</th>
                <th style={{ padding: '12px 8px' }}>Local Pack</th>
                <th style={{ padding: '12px 8px' }}>URL</th>
                <th style={{ padding: '12px 8px' }}>Fecha</th>
                <th style={{ padding: '12px 8px' }}>Device</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(r => (
                <tr key={r.id} className="transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '8px 12px', color: T.fg, fontWeight: 500 }}>{r.keyword}</td>
                  <td style={{ padding: '8px' }}>
                    <span className="flex items-center gap-1" style={{ color: T.fg }}><MapPin className="w-3 h-3" style={{ color: T.cyan }} />{r.location}</span>
                  </td>
                  <td style={{ padding: '8px', color: T.fgMuted }}>{r.country}</td>
                  <td style={{ padding: '8px' }}><PositionBadge position={r.position} /></td>
                  <td style={{ padding: '8px' }}>
                    {r.local_pack_position ? (
                      <span style={{ padding: '2px 8px', backgroundColor: 'rgba(30,111,217,0.1)', color: '#1E6FD9', borderRadius: 4, fontSize: 12, fontFamily: fontMono }}>#{r.local_pack_position}</span>
                    ) : <span style={{ color: T.fgMuted }}>-</span>}
                  </td>
                  <td style={{ padding: '8px', color: T.fgMuted }} className="truncate max-w-[200px]">{r.url_found || '-'}</td>
                  <td style={{ padding: '8px', color: T.fgMuted }}>{r.check_date}</td>
                  <td style={{ padding: '8px', color: T.fgMuted }}>{r.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.items?.length) && (
            <p className="text-center py-8" style={{ color: T.fgMuted }}>No hay rankings geo. Se importan via crons/n8n o manualmente.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard Tab ──────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo', 'stats'],
    queryFn: () => seoApi.stats().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>

  const seo = data?.seo || {}
  const geo = data?.geo || {}

  return (
    <div className="space-y-6">
      {/* SEO Organic */}
      <div>
        <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.fg }}>
          <Search className="w-5 h-5" style={{ color: T.cyan }} /> SEO Organic
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Keywords Total" value={seo.keywords_total} />
          <StatCard label="Keywords Activas" value={seo.keywords_active} color={T.success} />
          <StatCard label="Rankings Registrados" value={seo.rankings_total} />
          <StatCard label="Posición Media" value={seo.avg_position ? `#${seo.avg_position}` : '-'} color={T.warning} />
        </div>
        {seo.by_category && Object.keys(seo.by_category).length > 0 && (
          <div className="mt-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 14, color: T.fgMuted, marginBottom: 8 }}>Keywords por categoría</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(seo.by_category).map(([cat, count]) => (
                <span key={cat} style={{ padding: '4px 12px', backgroundColor: 'hsla(185,72%,48%,0.12)', color: T.cyan, borderRadius: 9999, fontSize: 14 }}>
                  {cat.toUpperCase()}: <strong style={{ fontFamily: fontMono }}>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Geo-SEO */}
      <div>
        <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.fg }}>
          <MapPin className="w-5 h-5" style={{ color: T.success }} /> Geo-SEO
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Geo Pages" value={geo.pages_total} />
          <StatCard label="NAP Audits" value={geo.nap_total} />
          <StatCard label="NAP Consistente" value={geo.nap_rate ? `${geo.nap_rate}%` : '-'} color={geo.nap_rate >= 80 ? T.success : T.destructive} />
          <StatCard label="Geo Rankings" value={geo.rankings_total} />
        </div>
        {geo.by_country && Object.keys(geo.by_country).length > 0 && (
          <div className="mt-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 14, color: T.fgMuted, marginBottom: 8 }}>Geo pages por país</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(geo.by_country).map(([country, count]) => (
                <span key={country} style={{ padding: '4px 12px', backgroundColor: 'hsla(142,71%,45%,0.12)', color: T.success, borderRadius: 9999, fontSize: 14 }}>
                  {country}: <strong style={{ fontFamily: fontMono }}>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* n8n Cron Info */}
      <div style={{ backgroundColor: T.card, border: `1px solid hsla(38,92%,50%,0.3)`, borderRadius: 12, padding: 16 }}>
        <h4 className="flex items-center gap-2 mb-2" style={{ color: T.warning, fontWeight: 500 }}>
          <Shield className="w-4 h-4" /> Integración n8n (pendiente configurar)
        </h4>
        <ul className="space-y-1 list-disc list-inside" style={{ fontSize: 14, color: T.fgMuted }}>
          <li><code style={{ color: T.fg, fontFamily: fontMono, fontSize: 13 }}>POST /marketing/seo/rankings/bulk</code> — Importar rankings SEO</li>
          <li><code style={{ color: T.fg, fontFamily: fontMono, fontSize: 13 }}>POST /marketing/seo/geo/rankings/bulk</code> — Importar rankings geo</li>
          <li>Proveedores soportados: DataForSEO, Semrush, Serper, manual</li>
          <li>Configurar API keys en Settings &gt; Integraciones</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = T.fg }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 12, color: T.fgMuted, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 700, color }}>{value ?? 0}</p>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────

export default function SEOPage() {
  const [activeTab, setActiveTab] = useState('keywords')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/marketing" className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-3" style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>
            <Search className="w-7 h-7" style={{ color: T.cyan }} />
            SEO & Geo-SEO
          </h1>
          <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 4 }}>
            Keywords, rankings, geo pages, NAP audits y rankings geo-localizados para growth España.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                backgroundColor: isActive ? T.cyan : 'transparent',
                color: isActive ? T.bg : T.fgMuted,
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'keywords' && <KeywordsTab />}
      {activeTab === 'rankings' && <RankingsTab />}
      {activeTab === 'geo-pages' && <GeoPagesTab />}
      {activeTab === 'nap' && <NAPTab />}
      {activeTab === 'geo-rankings' && <GeoRankingsTab />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  )
}
