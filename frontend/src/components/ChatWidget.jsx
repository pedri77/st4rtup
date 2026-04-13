import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, X, Send, Loader2, Bot, User, Sparkles,
  Plus, Trash2, ChevronDown, Minimize2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { chatApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


function MessageContent({ content }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '')
          return (
            <pre key={i} className="rounded p-2 my-1 overflow-x-auto text-[10px]"
              style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.fg, fontFamily: "'IBM Plex Mono', monospace" }}>
              {code}
            </pre>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1 py-0.5 rounded text-[10px]"
            style={{ backgroundColor: T.muted, color: T.cyan, fontFamily: "'IBM Plex Mono', monospace" }}>{part.slice(1, -1)}</code>
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: T.fg }} className="font-semibold">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

export default function ChatWidget() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { data: providers = [] } = useQuery({
    queryKey: ['chat-providers'],
    queryFn: () => chatApi.providers().then(r => r.data),
    enabled: isOpen,
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => chatApi.conversations({ is_archived: false }).then(r => r.data),
    enabled: isOpen && showHistory,
  })

  const { data: activeConversation } = useQuery({
    queryKey: ['chat-conversation', conversationId],
    queryFn: () => chatApi.getConversation(conversationId).then(r => r.data),
    enabled: !!conversationId,
  })

  const sendMsg = useMutation({
    mutationFn: ({ convId, data }) => chatApi.sendMessage(convId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
    onError: (err) => toast.error(`Error: ${err.response?.data?.detail || err.message}`),
  })

  const deleteConv = useMutation({
    mutationFn: (id) => chatApi.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      if (conversationId === deletedId) setConversationId(null)
    },
  })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeConversation?.messages])
  useEffect(() => { if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100) }, [isOpen])

  const getDefaultProvider = () => {
    const configured = providers.find(p => p.configured)
    return configured || providers[0]
  }

  const handleSend = async () => {
    if (!inputMessage.trim() || sendMsg.isPending) return
    let convId = conversationId
    if (!convId) {
      try {
        const provider = getDefaultProvider()
        if (!provider) { toast.error('No hay proveedores de IA configurados'); return }
        const res = await chatApi.createConversation({ provider: provider.id, model: provider.models[0] || '' })
        convId = res.data.id; setConversationId(convId)
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      } catch { toast.error('Error creando conversacion'); return }
    }
    const msg = inputMessage.trim(); setInputMessage('')
    const provider = getDefaultProvider()
    sendMsg.mutate({ convId, data: { message: msg, provider: provider?.id || 'openai', model: provider?.models[0] || undefined, temperature: 0.7 } })
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleNewChat = () => { setConversationId(null); setShowHistory(false); setInputMessage('') }

  const messages = activeConversation?.messages || []

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
        style={{
          background: isOpen ? T.muted : `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        {isOpen ? <X className="w-6 h-6" style={{ color: T.fg }} /> : <MessageSquare className="w-6 h-6 text-gray-800" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[520px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: `linear-gradient(135deg, ${T.cyan}10, ${T.purple}10)`, borderBottom: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: T.cyan }} />
              <h3 style={{ color: T.fg }} className="text-sm font-semibold">
                {activeConversation?.title || 'Asistente IA'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHistory(!showHistory)} title="Historial"
                className="p-1.5 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: showHistory ? 'rotate(180deg)' : 'none' }} />
              </button>
              <button onClick={handleNewChat} title="Nueva conversacion"
                className="p-1.5 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} title="Cerrar"
                className="p-1.5 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation history dropdown */}
          {showHistory && (
            <div className="max-h-48 overflow-y-auto" style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.muted }}>
              {conversations.length === 0 ? (
                <p className="p-3 text-xs text-center" style={{ color: T.fgMuted }}>Sin conversaciones</p>
              ) : (
                conversations.map((conv) => (
                  <button aria-label="Mensaje" key={conv.id}
                    onClick={() => { setConversationId(conv.id); setShowHistory(false) }}
                    className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2 group"
                    style={{ backgroundColor: conversationId === conv.id ? `${T.cyan}10` : 'transparent' }}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.fgMuted }} />
                    <span className="text-xs truncate flex-1" style={{ color: T.fg }}>{conv.title}</span>
                    <span className="text-[10px]" style={{ color: T.fgMuted }}>{conv.message_count}</span>
                    <button aria-label="Eliminar"
                      onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar esta conversacion?')) deleteConv.mutate(conv.id) }}
                      className="opacity-0 group-hover:opacity-100" style={{ color: T.fgMuted }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !sendMsg.isPending && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${T.cyan}15` }}>
                  <Sparkles className="w-6 h-6" style={{ color: T.cyan }} />
                </div>
                <p style={{ color: T.fg }} className="text-sm font-medium mb-1">Asistente de Ventas</p>
                <p style={{ color: T.fgMuted }} className="text-xs mb-4">
                  Pregunta sobre pipeline, clientes, campañas de marketing o estrategias de crecimiento.
                </p>
                <div className="space-y-1.5 w-full">
                  {['Redacta un email de seguimiento para Growth', 'Argumentos de venta para B2B en banca', 'Compara SaaS Best Practices vs SaaS'].map((suggestion, i) => (
                    <button key={i} onClick={() => setInputMessage(suggestion)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${T.cyan}15` }}>
                    <Bot className="w-3.5 h-3.5" style={{ color: T.cyan }} />
                  </div>
                )}
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs"
                  style={msg.role === 'user'
                    ? { backgroundColor: `${T.cyan}20`, color: T.fg }
                    : { backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}` }}>
                  <MessageContent content={msg.content} />
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: T.muted }}>
                    <User className="w-3.5 h-3.5" style={{ color: T.fgMuted }} />
                  </div>
                )}
              </div>
            ))}

            {sendMsg.isPending && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${T.cyan}15` }}>
                  <Bot className="w-3.5 h-3.5" style={{ color: T.cyan }} />
                </div>
                <div className="rounded-xl px-3 py-2" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef} value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 resize-none min-h-[36px] max-h-20 text-xs py-2 px-3 rounded-lg outline-none"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
                rows={1} disabled={sendMsg.isPending}
                aria-label="Mensaje de chat"
              />
              <button onClick={handleSend} disabled={!inputMessage.trim() || sendMsg.isPending}
                className="h-[36px] w-[36px] p-0 flex items-center justify-center rounded-lg disabled:opacity-50"
                style={{ backgroundColor: T.cyan, color: T.bg }}>
                {sendMsg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
