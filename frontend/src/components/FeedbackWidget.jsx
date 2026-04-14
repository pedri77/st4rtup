import { useState } from 'react'
import { MessageCircleQuestion, X, Send } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

export default function FeedbackWidget() {
  const T = useThemeColors()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [category, setCategory] = useState('funcionalidad')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!message.trim()) return
    // Store locally until backend is deployed
    const queue = JSON.parse(localStorage.getItem('st4rtup_feedback_queue') || '[]')
    queue.push({ category, message, email, date: new Date().toISOString() })
    localStorage.setItem('st4rtup_feedback_queue', JSON.stringify(queue))
    setSent(true)
    setTimeout(() => { setSent(false); setOpen(false); setMessage(''); setEmail('') }, 2000)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 40,
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        backgroundColor: T.primary, color: 'white', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(30,111,217,0.3)',
      }}>
        <MessageCircleQuestion size={20} />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 24, zIndex: 40,
      width: 320, backgroundColor: T.card, borderRadius: 16,
      border: `1px solid ${T.border}`, boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.fg }}>¿Qué mejorarías?</h4>
        <button aria-label="Cerrar" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#94A3B8" /></button>
      </div>

      {sent ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>🎉</p>
          <p style={{ fontWeight: 600, color: '#10B981' }}>¡Gracias por tu feedback!</p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ padding: 18 }}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
            fontSize: 13, marginBottom: 10, color: T.fgMuted, backgroundColor: T.card,
          }}>
            <option value="funcionalidad">Nueva funcionalidad</option>
            <option value="bug">Bug / Error</option>
            <option value="ux">Experiencia de usuario</option>
            <option value="otro">Otro</option>
          </select>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Escribe tu feedback..." rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', marginBottom: 10, backgroundColor: T.card, color: T.fg }} />
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email (opcional)" type="email"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, marginBottom: 12, backgroundColor: T.card, color: T.fg }} />
          <button type="submit" disabled={!message.trim()} style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            backgroundColor: T.primary, color: 'white', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: message.trim() ? 1 : 0.5,
          }}>
            <Send size={14} /> Enviar
          </button>
        </form>
      )}
    </div>
  )
}
