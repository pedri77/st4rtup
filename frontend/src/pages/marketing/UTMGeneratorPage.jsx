import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Link2, ArrowLeft, Plus, Copy, Trash2, X, ExternalLink,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { utmCodesApi, campaignsApi } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmDialog'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const COMMON_SOURCES = ['google', 'linkedin', 'twitter', 'facebook', 'email', 'newsletter', 'youtube']
const COMMON_MEDIUMS = ['cpc', 'cpm', 'social', 'email', 'organic', 'referral', 'display', 'video']

const INITIAL_FORM = {
  base_url: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
  campaign_id: '',
}

export default function UTMGeneratorPage() {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [filterCampaignId, setFilterCampaignId] = useState('')

  const queryParams = {
    page,
    page_size: 20,
    ...(filterCampaignId && { campaign_id: filterCampaignId }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'utm-codes', queryParams],
    queryFn: () => utmCodesApi.list(queryParams).then(r => r.data),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'all'],
    queryFn: () => campaignsApi.list({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => utmCodesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'utm-codes'] })
      toast.success('UTM creado')
      setShowModal(false)
      setForm(INITIAL_FORM)
    },
    onError: () => toast.error('Error al crear UTM'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => utmCodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'utm-codes'] })
      toast.success('UTM eliminado')
    },
    onError: () => toast.error('Error al eliminar UTM'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      campaign_id: form.campaign_id || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
    }
    createMutation.mutate(payload)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('URL copiada'),
      () => toast.error('No se pudo copiar')
    )
  }

  // Live preview
  function buildPreviewUrl() {
    if (!form.base_url || !form.utm_source || !form.utm_medium || !form.utm_campaign) return ''
    const params = new URLSearchParams()
    params.set('utm_source', form.utm_source)
    params.set('utm_medium', form.utm_medium)
    params.set('utm_campaign', form.utm_campaign)
    if (form.utm_content) params.set('utm_content', form.utm_content)
    if (form.utm_term) params.set('utm_term', form.utm_term)
    const sep = form.base_url.includes('?') ? '&' : '?'
    return `${form.base_url}${sep}${params.toString()}`
  }

  const utmCodes = data?.items || []
  const totalPages = data?.pages || 1
  const campaigns = campaignsData?.items || []
  const previewUrl = buildPreviewUrl()

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
  }
  const selectStyle = { ...inputStyle }
  const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/app/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 className="w-6 h-6" style={{ color: T.success }} />
              Generador UTM
            </h1>
            <p style={{ fontSize: 13, color: T.fgMuted, marginTop: 2 }}>
              {data?.total ?? 0} códigos UTM generados
            </p>
          </div>
        </div>
        <button
          onClick={() => { setForm(INITIAL_FORM); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          <Plus className="w-4 h-4" /> Nuevo UTM
        </button>
      </div>

      {/* Campaign filter */}
      <div className="flex gap-3">
        <select id="utmgenerator-select-8" aria-label="Selector" value={filterCampaignId}
          onChange={(e) => { setFilterCampaignId(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">Todas las campañas</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* UTM list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div className="h-5 rounded animate-pulse" style={{ backgroundColor: T.muted, width: '75%' }} />
            </div>
          ))
        ) : utmCodes.length === 0 ? (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <Link2 className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
            <p style={{ color: T.fgMuted }}>No hay códigos UTM</p>
            <button
              onClick={() => { setForm(INITIAL_FORM); setShowModal(true) }}
              style={{ marginTop: 8, color: T.cyan, fontSize: 14, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
            >
              Crear primer UTM
            </button>
          </div>
        ) : (
          utmCodes.map((utm) => (
            <div key={utm.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(59,130,246,0.15)', color: 'hsl(210,80%,55%)', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                      {utm.utm_source}
                    </span>
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(139,92,246,0.15)', color: T.purple, borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                      {utm.utm_medium}
                    </span>
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(34,197,94,0.15)', color: T.success, borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                      {utm.utm_campaign}
                    </span>
                    {utm.utm_content && (
                      <span style={{ padding: '2px 8px', backgroundColor: T.muted, color: T.fg, borderRadius: 4, fontSize: 12 }}>
                        {utm.utm_content}
                      </span>
                    )}
                    {utm.utm_term && (
                      <span style={{ padding: '2px 8px', backgroundColor: T.muted, color: T.fg, borderRadius: 4, fontSize: 12 }}>
                        {utm.utm_term}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: T.fg, wordBreak: 'break-all', fontFamily: fontMono }}>{utm.full_url}</p>
                  <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>
                    Base: {utm.base_url} · {new Date(utm.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(utm.full_url)}
                    title="Copiar URL"
                    style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={utm.full_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir URL"
                    style={{ padding: 6, borderRadius: 8, color: T.fgMuted, display: 'inline-flex' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={async () => {
                      if (await confirm({ title: '¿Eliminar?', description: '¿Eliminar este UTM?', confirmText: 'Eliminar' })) deleteMutation.mutate(utm.id)
                    }}
                    title="Eliminar"
                    style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14, color: T.fgMuted }}>
            Página {page} de {totalPages} ({data?.total} resultados)
          </span>
          <div className="flex items-center gap-1">
            <button aria-label="Anterior"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted, opacity: page <= 1 ? 0.3 : 1 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button aria-label="Siguiente"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted, opacity: page >= totalPages ? 0.3 : 1 }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 576, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>Nuevo Código UTM</h2>
              <button aria-label="Cerrar" onClick={() => setShowModal(false)} style={{ padding: 4, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label style={labelStyle} htmlFor="utmgenerator-field-1">URL Base *</label>
                <input id="utmgenerator-field-1" type="url"
                  required
                  value={form.base_url}
                  onChange={(e) => setForm(f => ({ ...f, base_url: e.target.value }))}
                  style={inputStyle}
                  placeholder="https://st4rtup.app/landing"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="utmgenerator-field-2">Source * (utm_source)</label>
                  <input id="utmgenerator-field-2" type="text"
                    required
                    list="sources-list"
                    value={form.utm_source}
                    onChange={(e) => setForm(f => ({ ...f, utm_source: e.target.value }))}
                    style={inputStyle}
                    placeholder="google, linkedin..."
                  />
                  <datalist id="sources-list">
                    {COMMON_SOURCES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="utmgenerator-field-3">Medium * (utm_medium)</label>
                  <input id="utmgenerator-field-3" type="text"
                    required
                    list="mediums-list"
                    value={form.utm_medium}
                    onChange={(e) => setForm(f => ({ ...f, utm_medium: e.target.value }))}
                    style={inputStyle}
                    placeholder="cpc, email..."
                  />
                  <datalist id="mediums-list">
                    {COMMON_MEDIUMS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="utmgenerator-field-4">Campaign * (utm_campaign)</label>
                <input id="utmgenerator-field-4" type="text"
                  required
                  value={form.utm_campaign}
                  onChange={(e) => setForm(f => ({ ...f, utm_campaign: e.target.value }))}
                  style={inputStyle}
                  placeholder="spring-2026-nis2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="utmgenerator-field-5">Content (utm_content)</label>
                  <input id="utmgenerator-field-5" type="text"
                    value={form.utm_content}
                    onChange={(e) => setForm(f => ({ ...f, utm_content: e.target.value }))}
                    style={inputStyle}
                    placeholder="banner-top, cta-footer..."
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="utmgenerator-field-6">Term (utm_term)</label>
                  <input id="utmgenerator-field-6" type="text"
                    value={form.utm_term}
                    onChange={(e) => setForm(f => ({ ...f, utm_term: e.target.value }))}
                    style={inputStyle}
                    placeholder="tecnología gratis..."
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="utmgenerator-field-7">Campaña asociada</label>
                <select id="utmgenerator-field-7" value={form.campaign_id}
                  onChange={(e) => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Sin campaña</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 12, color: T.fgMuted, marginBottom: 4 }}>Vista previa:</p>
                  <p style={{ fontSize: 14, color: T.cyan, wordBreak: 'break-all', fontFamily: fontMono }}>{previewUrl}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', color: T.fgMuted, fontSize: 14, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: createMutation.isPending ? 0.5 : 1 }}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear UTM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
