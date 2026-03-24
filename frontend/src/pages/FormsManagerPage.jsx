import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Send, Copy, Plus, Trash2, Loader2, Link, Clock, Mail, X,
  BarChart3, CheckCircle, AlertTriangle, Inbox, Search, ExternalLink, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  success: '#10B981', warning: '#F59E0B', destructive: '#EF4444',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const formsApi = {
  list: () => api.get('/public-forms/forms-list'),
  stats: () => api.get('/public-forms/stats'),
  tokens: (formId, page = 1) => api.get('/public-forms/tokens', { params: { ...(formId ? { form_id: formId } : {}), page, page_size: 20 } }),
  submissions: (formId, page = 1) => api.get('/public-forms/submissions', { params: { ...(formId ? { form_id: formId } : {}), page, page_size: 20 } }),
  createToken: (data) => api.post('/public-forms/tokens', data),
  revokeToken: (id) => api.delete(`/public-forms/tokens/${id}`),
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{label}</span>
        <Icon size={16} color={color || T.fgMuted} />
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: fontDisplay, color: color || T.fg }}>{value}</div>
    </div>
  )
}

export default function FormsManagerPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedForm, setSelectedForm] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ recipient_email: '', recipient_name: '', expires_days: 7, max_uses: 1, send_email: true })
  const [searchToken, setSearchToken] = useState('')
  const [tokenPage, setTokenPage] = useState(1)
  const [subPage, setSubPage] = useState(1)

  const { data: forms } = useQuery({ queryKey: ['forms-list'], queryFn: () => formsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['form-stats'], queryFn: () => formsApi.stats().then(r => r.data), staleTime: 0 })
  const { data: tokensData } = useQuery({ queryKey: ['form-tokens', selectedForm, tokenPage], queryFn: () => formsApi.tokens(selectedForm, tokenPage).then(r => r.data) })
  const { data: subsData } = useQuery({ queryKey: ['form-submissions', selectedForm, subPage], queryFn: () => formsApi.submissions(selectedForm, subPage).then(r => r.data), enabled: activeTab === 'responses' })
  const tokens = tokensData?.items || tokensData || []
  const submissions = subsData?.items || subsData || []
  const tokenPages = tokensData?.pages || 1
  const subPages = subsData?.pages || 1

  const createMut = useMutation({
    mutationFn: (data) => formsApi.createToken({ ...data, form_id: selectedForm || data.form_id }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['form-tokens'] })
      queryClient.invalidateQueries({ queryKey: ['form-stats'] })
      setShowCreate(false)
      setCreateForm({ recipient_email: '', recipient_name: '', expires_days: 7, max_uses: 1, send_email: true })
      if (res.data.sent) toast.success(`Email enviado a ${createForm.recipient_email}`)
      else if (res.data.email_error) toast.error(`Token creado pero email fallo: ${res.data.email_error}`)
      else toast.success('Token creado — copia el enlace')
    },
  })

  const revokeMut = useMutation({
    mutationFn: (id) => formsApi.revokeToken(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['form-tokens'] }); queryClient.invalidateQueries({ queryKey: ['form-stats'] }); toast.success('Revocado') },
  })

  const copyUrl = (url) => { navigator.clipboard.writeText(url); toast.success('URL copiada') }

  const getTokenStatus = (t) => {
    if (!t.is_active) return { label: 'Revocado', color: T.destructive }
    if (new Date(t.expires_at) < new Date()) return { label: 'Expirado', color: T.destructive }
    if (t.max_uses && t.uses >= t.max_uses) return { label: 'Usado', color: T.fgMuted }
    if (t.submitted_at) return { label: 'Completado', color: T.success }
    if (t.email_error) return { label: 'Error envio', color: T.destructive }
    if (t.sent_at) return { label: 'Enviado', color: T.cyan }
    return { label: 'Pendiente', color: T.warning }
  }

  const filteredTokens = (tokens || []).filter(t => {
    if (selectedForm && t.form_id !== selectedForm) return false
    if (searchToken && !t.recipient_email?.includes(searchToken) && !t.recipient_name?.includes(searchToken)) return false
    return true
  })

  const TABS = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'tokens', label: 'Enlaces enviados', icon: Link },
    { id: 'responses', label: 'Respuestas', icon: Inbox },
  ]

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={24} color={T.cyan} />
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>FORMULARIOS</h1>
            <p style={{ fontSize: '0.8rem', color: T.fgMuted, margin: 0 }}>Genera, envia y rastrea formularios seguros</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
          color: T.bg, border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
          fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.9rem',
        }}>
          <Plus size={16} /> Enviar formulario
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Enviados" value={stats?.tokens_sent || 0} icon={Send} color={T.cyan} />
        <KpiCard label="Completados" value={stats?.tokens_completed || 0} icon={CheckCircle} color={T.success} />
        <KpiCard label="Pendientes" value={stats?.tokens_pending || 0} icon={Clock} color={T.warning} />
        <KpiCard label="Expirados" value={stats?.tokens_expired || 0} icon={AlertTriangle} color={T.destructive} />
        <KpiCard label="Tasa respuesta" value={`${stats?.response_rate || 0}%`} icon={BarChart3} color={T.purple} />
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select id="form-filter" aria-label="Filtrar por formulario" value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
          style={{ ...inputStyle, width: 250 }}>
          <option value="">Todos los formularios</option>
          {(forms || []).map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.fgMuted }} />
          <input id="token-search" type="text" value={searchToken} onChange={e => setSearchToken(e.target.value)}
            placeholder="Buscar por email o nombre..." aria-label="Buscar tokens"
            style={{ ...inputStyle, paddingLeft: '2rem' }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem', borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
              backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? T.cyan : T.fgMuted,
              borderBottom: `2px solid ${activeTab === tab.id ? T.cyan : 'transparent'}`,
              fontFamily: fontDisplay, fontWeight: 600, fontSize: '0.85rem',
            }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {(forms || []).map(form => {
            const count = stats?.by_form?.[form.id] || 0
            return (
              <div key={form.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontFamily: fontDisplay, fontSize: '0.95rem', fontWeight: 700, color: T.fg, margin: 0 }}>{form.title}</h3>
                    <p style={{ fontSize: '0.7rem', color: T.fgMuted, margin: '2px 0 0 0' }}>{form.subtitle}</p>
                  </div>
                  <span style={{ fontFamily: fontMono, fontSize: '1.1rem', fontWeight: 700, color: count > 0 ? T.cyan : T.fgMuted }}>{count}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button onClick={() => { setSelectedForm(form.id); setShowCreate(true) }} style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                    backgroundColor: T.cyan + '22', color: T.cyan, border: `1px solid ${T.cyan}44`,
                    borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    <Send size={12} /> Enviar
                  </button>
                  <button onClick={() => copyUrl(form.url)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                    backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`,
                    borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.7rem',
                  }}>
                    <Copy size={12} /> URL
                  </button>
                  <a href={form.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                    backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`,
                    borderRadius: '0.375rem', fontSize: '0.7rem', textDecoration: 'none',
                  }}>
                    <ExternalLink size={12} /> Preview
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Tokens */}
      {activeTab === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredTokens.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: T.fgMuted }}>Sin enlaces generados</div>
          )}
          {filteredTokens.map(token => {
            const status = getTokenStatus(token)
            const formTitle = (forms || []).find(f => f.id === token.form_id)?.title || token.form_id
            return (
              <div key={token.id} style={{
                backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.5rem',
                padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <Mail size={16} color={status.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: T.fg, fontWeight: 600 }}>{token.recipient_name || token.recipient_email}</span>
                    <span style={{ fontSize: '0.65rem', color: T.fgMuted, backgroundColor: T.muted, padding: '1px 6px', borderRadius: 4 }}>{formTitle}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: T.fgMuted }}>{token.recipient_email}</div>
                </div>
                <span style={{
                  fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontWeight: 600,
                  color: status.color, backgroundColor: status.color + '15', border: `1px solid ${status.color}33`,
                }}>{status.label}</span>
                <span style={{ fontSize: '0.65rem', color: T.fgMuted, fontFamily: fontMono }}>
                  {new Date(token.expires_at).toLocaleDateString('es-ES')}
                </span>
                <button onClick={() => copyUrl(`https://app.st4rtup.app/form/${token.form_id}?token=${token.token}`)}
                  style={{ background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer', padding: 4 }} title="Copiar enlace">
                  <Link size={14} />
                </button>
                {token.is_active && (
                  <button onClick={() => { if (confirm('Revocar?')) revokeMut.mutate(token.id) }}
                    style={{ background: 'none', border: 'none', color: T.destructive, cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
          {/* Pagination tokens */}
          {tokenPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setTokenPage(p => Math.max(1, p - 1))} disabled={tokenPage === 1}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.8rem', opacity: tokenPage === 1 ? 0.4 : 1 }}>Anterior</button>
              <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', color: T.fgMuted, fontFamily: fontMono }}>{tokenPage} / {tokenPages}</span>
              <button onClick={() => setTokenPage(p => Math.min(tokenPages, p + 1))} disabled={tokenPage === tokenPages}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.8rem', opacity: tokenPage === tokenPages ? 0.4 : 1 }}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Responses */}
      {activeTab === 'responses' && (
        <div>
          {(submissions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: T.fgMuted }}>Sin respuestas recibidas</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Formulario', 'Email', 'Datos clave', 'Entidad', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: `1px solid ${T.border}`,
                        fontFamily: fontMono, fontSize: '0.7rem', color: T.fgMuted, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(submissions || []).map(sub => {
                    const formTitle = (forms || []).find(f => f.id === sub.form_id)?.title || sub.form_id
                    return (
                      <tr key={sub.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: T.cyan, fontWeight: 600 }}>{formTitle}</span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: T.fg }}>{sub.submitted_email || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {Object.entries(sub.data_summary || {}).slice(0, 4).map(([k, v]) => (
                              <span key={k} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, backgroundColor: T.muted, color: T.fgMuted }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {sub.entity_type && (
                            <span style={{ fontSize: '0.7rem', color: T.purple }}>{sub.entity_type}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: T.fgMuted, fontFamily: fontMono }}>
                          {sub.created_at ? new Date(sub.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination responses */}
          {subPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage === 1}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.8rem', opacity: subPage === 1 ? 0.4 : 1 }}>Anterior</button>
              <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', color: T.fgMuted, fontFamily: fontMono }}>{subPage} / {subPages} ({subsData?.total || 0} total)</span>
              <button onClick={() => setSubPage(p => Math.min(subPages, p + 1))} disabled={subPage === subPages}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.8rem', opacity: subPage === subPages ? 0.4 : 1 }}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      {/* Create token modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowCreate(false)}>
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: fontDisplay, fontSize: '1.1rem', fontWeight: 700, color: T.fg, margin: 0 }}>Enviar formulario</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="create-form-select" style={{ display: 'block', fontSize: '0.7rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>Formulario *</label>
              <select id="create-form-select" value={selectedForm} onChange={e => setSelectedForm(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {(forms || []).map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label htmlFor="create-email" style={{ display: 'block', fontSize: '0.7rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>Email *</label>
                <input id="create-email" type="email" value={createForm.recipient_email} onChange={e => setCreateForm(p => ({ ...p, recipient_email: e.target.value }))}
                  placeholder="cliente@empresa.com" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="create-name" style={{ display: 'block', fontSize: '0.7rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>Nombre</label>
                <input id="create-name" value={createForm.recipient_name} onChange={e => setCreateForm(p => ({ ...p, recipient_name: e.target.value }))}
                  placeholder="Juan Perez" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="create-days" style={{ display: 'block', fontSize: '0.7rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>Expira en (dias)</label>
                <input id="create-days" type="number" value={createForm.expires_days} onChange={e => setCreateForm(p => ({ ...p, expires_days: Number(e.target.value) }))}
                  min={1} max={90} style={inputStyle} />
              </div>
              <div>
                <label htmlFor="create-uses" style={{ display: 'block', fontSize: '0.7rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }}>Max usos</label>
                <input id="create-uses" type="number" value={createForm.max_uses} onChange={e => setCreateForm(p => ({ ...p, max_uses: Number(e.target.value) }))}
                  min={1} max={10} style={inputStyle} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: T.fg, marginBottom: '1rem' }}>
              <input type="checkbox" checked={createForm.send_email} onChange={e => setCreateForm(p => ({ ...p, send_email: e.target.checked }))} />
              Enviar email automaticamente
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => createMut.mutate(createForm)} disabled={!selectedForm || !createForm.recipient_email || createMut.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                  background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
                  color: T.bg, border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                  fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.9rem',
                  opacity: !selectedForm || !createForm.recipient_email ? 0.4 : 1,
                }}>
                {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {createForm.send_email ? 'Enviar' : 'Generar enlace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
