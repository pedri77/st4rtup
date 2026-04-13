import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Webhook, Plus, Trash2, Send, Check, X, Loader2, ToggleLeft, ToggleRight, Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { webhooksApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}
const btnStyle = (color) => ({
  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
  backgroundColor: color + '22', color, border: `1px solid ${color}44`,
  borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
})

export default function WebhooksPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] })
  const [testingId, setTestingId] = useState(null)

  const { data: subs = [] } = useQuery({
    queryKey: ['webhook-subscriptions'],
    queryFn: () => webhooksApi.subscriptions().then(r => r.data),
  })

  const { data: eventsData } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => webhooksApi.availableEvents().then(r => r.data),
  })
  const availableEvents = eventsData?.events || []

  const createMut = useMutation({
    mutationFn: (data) => webhooksApi.createSubscription(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] }); setShowCreate(false); setForm({ name: '', url: '', secret: '', events: [] }); toast.success('Webhook creado') },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => webhooksApi.deleteSubscription(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] }); toast.success('Eliminado') },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => webhooksApi.updateSubscription(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] }),
  })

  const handleTest = async (id) => {
    setTestingId(id)
    try {
      const res = await webhooksApi.testSubscription(id)
      if (res.data.success) toast.success(`Test OK (${res.data.status_code})`)
      else toast.error(res.data.error || `Error ${res.data.status_code}`)
    } catch (e) { toast.error('Error al enviar test') }
    setTestingId(null)
  }

  const toggleEvent = (ev) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev],
    }))
  }

  const inboundUrl = `${window.location.origin.replace('app.st4rtup.app', 'api.st4rtup.com')}/api/v1/webhooks/generic`

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Webhook size={24} color={T.cyan} />
          <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>
            WEBHOOKS ZAPIER / MAKE
          </h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={btnStyle(T.cyan)}>
          <Plus size={14} /> Nueva suscripcion
        </button>
      </div>

      {/* Inbound webhook URL */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: '0.9rem', color: T.fg, margin: '0 0 0.5rem 0' }}>Webhook entrante (Zapier/Make envia datos aqui)</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <code style={{ fontFamily: fontMono, fontSize: '0.8rem', color: T.cyan, backgroundColor: T.muted, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', flex: 1 }}>
            POST {inboundUrl}
          </code>
          <button aria-label="Copiar" onClick={() => { navigator.clipboard.writeText(inboundUrl); toast.success('URL copiada') }} style={{ ...btnStyle(T.fgMuted), padding: '0.5rem' }}>
            <Copy size={14} />
          </button>
        </div>
        <p style={{ color: T.fgMuted, fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
          Envia un JSON con campos como: empresa, email, nombre, telefono, sector, ciudad, web. Se creara un lead automaticamente.
        </p>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: '1rem', color: T.fg, margin: '0 0 1rem 0' }}>Nuevo webhook saliente</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem' }} htmlFor="webhooks-field-1">Nombre</label>
              <input id="webhooks-field-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mi webhook Zapier" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem' }} htmlFor="webhooks-field-2">URL destino</label>
              <input id="webhooks-field-2" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.zapier.com/..." style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem' }} htmlFor="webhooks-field-3">Secret HMAC (opcional)</label>
              <input id="webhooks-field-3" value={form.secret} onChange={e => setForm(p => ({ ...p, secret: e.target.value }))} placeholder="Opcional — se usará para firmar payloads con HMAC-SHA256" style={inputStyle} />
              <p style={{ color: T.fgMuted, fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>Si se configura, los webhooks se firmaran con HMAC-SHA256</p>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.5rem' }}>Eventos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {availableEvents.map(ev => (
                <button
                  key={ev}
                  onClick={() => toggleEvent(ev)}
                  style={{
                    padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.7rem', cursor: 'pointer',
                    backgroundColor: form.events.includes(ev) ? T.cyan + '22' : T.muted,
                    color: form.events.includes(ev) ? T.cyan : T.fgMuted,
                    border: `1px solid ${form.events.includes(ev) ? T.cyan + '44' : T.border}`,
                  }}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.url} style={{ ...btnStyle(T.success), opacity: !form.name || !form.url ? 0.4 : 1 }}>
              <Check size={14} /> Crear
            </button>
            <button onClick={() => setShowCreate(false)} style={btnStyle(T.fgMuted)}>
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions list */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {subs.length === 0 && !showCreate && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: T.fgMuted }}>
            No hay suscripciones configuradas. Crea una para enviar eventos del CRM a Zapier, Make u otros servicios.
          </div>
        )}
        {subs.map(sub => (
          <div key={sub.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => toggleMut.mutate({ id: sub.id, is_active: !sub.is_active })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: sub.is_active ? T.success : T.fgMuted }}
            >
              {sub.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 700, color: T.fg, fontSize: '0.95rem' }}>{sub.name}</div>
              <div style={{ fontFamily: fontMono, fontSize: '0.7rem', color: T.fgMuted }}>{sub.url}</div>
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                {(sub.events || []).map(ev => (
                  <span key={ev} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>{ev}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: T.fgMuted }}>
              <div>{sub.total_sent || 0} enviados</div>
              {sub.last_status && (
                <div style={{ color: sub.last_status === 'success' ? T.success : T.destructive }}>
                  {sub.last_status}
                </div>
              )}
            </div>
            <button onClick={() => handleTest(sub.id)} disabled={testingId === sub.id} style={{ ...btnStyle(T.purple), padding: '0.375rem 0.75rem' }}>
              {testingId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
            <button aria-label="Eliminar" onClick={() => { if (confirm('Eliminar?')) deleteMut.mutate(sub.id) }} style={{ ...btnStyle(T.destructive), padding: '0.375rem 0.75rem' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
