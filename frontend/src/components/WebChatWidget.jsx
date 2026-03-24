import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9',
}

export default function WebChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy el asistente de St4rtup. En que puedo ayudarte con cumplimiento normativo o ventas B2B?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/chat/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.content || 'Lo siento, no pude procesar tu mensaje.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexion. Intentalo de nuevo o escribenos a hello@st4rtup.app' }])
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        width: 56, height: 56, borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.cyan}, #F5820B)`,
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <MessageCircle size={24} color="white" />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      width: 380, height: 520, borderRadius: 16,
      backgroundColor: T.bg, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', backgroundColor: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.fg, margin: 0 }}>St4rtup</p>
          <p style={{ fontSize: 11, color: T.fgMuted, margin: 0 }}>Asistente growth</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color={T.fgMuted} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
            backgroundColor: msg.role === 'user' ? T.cyan : T.card,
            color: msg.role === 'user' ? T.bg : T.fg,
            fontSize: 13, lineHeight: 1.5,
            borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
            borderBottomLeftRadius: msg.role === 'user' ? 12 : 4,
          }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px', backgroundColor: T.card, borderRadius: 12, fontSize: 13, color: T.fgMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Loader2 size={14} color={T.cyan} className="animate-spin" /> Escribiendo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribe tu pregunta..."
          style={{ flex: 1, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
        <button onClick={handleSend} disabled={loading}
          style={{ backgroundColor: T.cyan, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={16} color={T.bg} />
        </button>
      </div>
    </div>
  )
}
