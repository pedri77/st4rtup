import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, Package, ArrowLeft, Sparkles } from 'lucide-react'
import { serviceCatalogApi } from '@/services/api'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%' }

const BILLING_LABELS = { one_time: 'Pago único', monthly: 'Mensual', annual: 'Anual' }
const BILLING_COLORS = { one_time: T.fgMuted, monthly: T.cyan, annual: T.success }

export default function ServiceCatalogPage() {
  const T = useThemeColors()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: 0, currency: 'EUR', billing_type: 'one_time', category: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data, isLoading } = useQuery({
    queryKey: ['service-catalog'],
    queryFn: () => serviceCatalogApi.list().then(r => r.data).catch(() => ({ items: [], total: 0 })),
    retry: 0,
  })

  const createMut = useMutation({
    mutationFn: (params) => serviceCatalogApi.create(params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-catalog'] }); setShowForm(false); resetForm() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...params }) => serviceCatalogApi.update(id, params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-catalog'] }); setEditId(null); resetForm() },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => serviceCatalogApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-catalog'] }),
  })

  const seedMut = useMutation({
    mutationFn: () => serviceCatalogApi.seed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-catalog'] }),
  })

  function resetForm() { setForm({ name: '', description: '', price: 0, currency: 'EUR', billing_type: 'one_time', category: '' }) }

  function startEdit(item) {
    setEditId(item.id)
    setForm({ name: item.name, description: item.description || '', price: item.price, currency: item.currency, billing_type: item.billing_type, category: item.category || '' })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editId) updateMut.mutate({ id: editId, ...form })
    else createMut.mutate(form)
  }

  const items = data?.items || []
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/app/offers" style={{ color: T.fgMuted, textDecoration: 'none', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><ArrowLeft size={14} /> Ofertas</Link>
          <h1 style={{ fontFamily: fontDisplay, fontSize: '1.6rem', fontWeight: 700, color: T.fg, display: 'flex', alignItems: 'center', gap: 8 }}><Package size={24} style={{ color: T.cyan }} /> Catálogo de Servicios</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => seedMut.mutate()} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.fgMuted, fontSize: '.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={14} /> Seed datos ejemplo
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); resetForm() }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.cyan, color: '#fff', fontSize: '.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> Nuevo servicio
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          ['Total servicios', items.length, T.cyan],
          ['Activos', items.filter(i => i.is_active).length, T.success],
          ['Categorías', categories.length, T.purple],
        ].map(([label, value, color], i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '.7rem', color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: fontMono }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color, fontFamily: fontMono }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {(showForm || editId) && (
        <form onSubmit={handleSubmit} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 600, marginBottom: 16, color: T.fg }}>{editId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.8rem', color: T.fgMuted, display: 'block', marginBottom: 4 }}>Nombre *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nombre del servicio" />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: T.fgMuted, display: 'block', marginBottom: 4 }}>Categoría</label>
              <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Servicios, Software, Soporte..." />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: T.fgMuted, display: 'block', marginBottom: 4 }}>Precio</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', +e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: T.fgMuted, display: 'block', marginBottom: 4 }}>Facturación</label>
              <select style={inputStyle} value={form.billing_type} onChange={e => set('billing_type', e.target.value)}>
                <option value="one_time">Pago único</option>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '.8rem', color: T.fgMuted, display: 'block', marginBottom: 4 }}>Descripción</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descripción del servicio..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: T.cyan, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Guardar' : 'Crear'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); resetForm() }} style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.fgMuted, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Servicio', 'Precio', 'Facturación', 'Categoría', 'Estado', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: fontMono, fontSize: '.75rem', color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: T.fg }}>{item.name}</div>
                  {item.description && <div style={{ fontSize: '.78rem', color: T.fgMuted, marginTop: 2 }}>{item.description.slice(0, 60)}</div>}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: fontMono, fontWeight: 600, color: T.fg }}>{item.price} {item.currency}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: BILLING_COLORS[item.billing_type] + '15', color: BILLING_COLORS[item.billing_type] }}>{BILLING_LABELS[item.billing_type] || item.billing_type}</span>
                </td>
                <td style={{ padding: '12px 16px', color: T.fgMuted, fontSize: '.85rem' }}>{item.category || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: item.is_active ? T.success + '15' : T.fgMuted + '15', color: item.is_active ? T.success : T.fgMuted }}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td style={{ padding: '12px 16px', display: 'flex', gap: 4 }}>
                  <button aria-label="Editar" onClick={() => startEdit(item)} style={{ padding: 6, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.fgMuted }}><Edit2 size={14} /></button>
                  <button aria-label="Eliminar" onClick={() => { if (confirm('Eliminar?')) deleteMut.mutate(item.id) }} style={{ padding: 6, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.destructive }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: T.fgMuted }}>Sin servicios. Crea uno o usa "Seed datos ejemplo".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
