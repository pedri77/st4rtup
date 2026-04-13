import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send, Plus, Trash2, MessageSquare, Loader2, Bot, User,
  ChevronLeft, Sparkles, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { chatApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function MessageContent({ content }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '')
          return (
            <pre key={i} className="rounded-lg p-3 my-2 overflow-x-auto text-xs"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, fontFamily: fontMono, color: T.fg }}>
              {code}
            </pre>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${T.cyan}15`, fontFamily: fontMono, color: T.cyan }}>{part.slice(1, -1)}</code>
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold" style={{ color: T.fg }}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

export default function ChatPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { data: providers = [] } = useQuery({
    queryKey: ['chat-providers'],
    queryFn: () => chatApi.providers().then(r => r.data),
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => chatApi.conversations({ is_archived: false }).then(r => r.data),
  })

  const { data: activeConversation, isLoading: loadingConv } = useQuery({
    queryKey: ['chat-conversation', selectedConversationId],
    queryFn: () => chatApi.getConversation(selectedConversationId).then(r => r.data),
    enabled: !!selectedConversationId,
  })

  const createConv = useMutation({
    mutationFn: (data) => chatApi.createConversation(data),
    onSuccess: (res) => { queryClient.invalidateQueries(['chat-conversations']); setSelectedConversationId(res.data.id) },
  })

  const sendMsg = useMutation({
    mutationFn: ({ conversationId, data }) => chatApi.sendMessage(conversationId, data),
    onSuccess: () => { queryClient.invalidateQueries(['chat-conversation', selectedConversationId]); queryClient.invalidateQueries(['chat-conversations']) },
    onError: (err) => { toast.error(`Error: ${err.response?.data?.detail || err.message}`) },
  })

  const deleteConv = useMutation({
    mutationFn: (id) => chatApi.deleteConversation(id),
    onSuccess: () => { queryClient.invalidateQueries(['chat-conversations']); if (selectedConversationId) setSelectedConversationId(null) },
  })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeConversation?.messages])

  useEffect(() => {
    const p = providers.find(p => p.id === selectedProvider)
    if (p && p.models.length > 0 && !selectedModel) setSelectedModel(p.models[0])
  }, [selectedProvider, providers])

  const handleNewChat = () => {
    const p = providers.find(p => p.id === selectedProvider)
    createConv.mutate({ provider: selectedProvider, model: selectedModel || p?.models[0] || '' })
  }

  const handleSend = async () => {
    if (!inputMessage.trim() || sendMsg.isPending) return
    let convId = selectedConversationId
    if (!convId) {
      try {
        const p = providers.find(p => p.id === selectedProvider)
        const res = await chatApi.createConversation({ provider: selectedProvider, model: selectedModel || p?.models[0] || '' })
        convId = res.data.id; setSelectedConversationId(convId); queryClient.invalidateQueries(['chat-conversations'])
      } catch (err) { toast.error('Error creando conversacion'); return }
    }
    const msg = inputMessage.trim(); setInputMessage('')
    sendMsg.mutate({ conversationId: convId, data: { message: msg, provider: selectedProvider, model: selectedModel || undefined, temperature } })
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const currentProvider = providers.find(p => p.id === selectedProvider)
  const configuredProviders = providers.filter(p => p.configured)

  const selectStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.375rem 0.5rem', fontSize: '0.75rem', width: '100%', outline: 'none' }

  return (
    <div className="flex -m-4 md:-m-8" style={{ height: 'calc(100vh - 4rem)', backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 flex flex-col" style={{ backgroundColor: T.card, borderRight: `1px solid ${T.border}` }}>
          <div className="p-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <button onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              <Plus className="w-4 h-4" /> Nueva conversacion
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: T.fgMuted }}>No hay conversaciones</div>
            ) : (
              conversations.map((conv) => (
                <button key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                  className="w-full text-left px-3 py-2.5 transition-colors group"
                  style={{
                    borderBottom: `1px solid ${T.border}40`,
                    backgroundColor: selectedConversationId === conv.id ? `${T.cyan}10` : 'transparent',
                    borderLeft: selectedConversationId === conv.id ? `2px solid ${T.cyan}` : '2px solid transparent',
                  }}>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.fgMuted }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: T.fg }}>{conv.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{conv.provider}</span>
                        <span className="text-xs" style={{ color: T.fgMuted }}>{conv.message_count} msgs</span>
                      </div>
                    </div>
                    <button aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar esta conversacion?')) deleteConv.mutate(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-all" style={{ color: T.fgMuted }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${T.border}` }}>
            <label htmlFor="chat-provider" className="block text-xs uppercase tracking-[0.1em]" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Proveedor</label>
            <select id="chat-provider" value={selectedProvider} onChange={(e) => { setSelectedProvider(e.target.value); setSelectedModel('') }} style={selectStyle}>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}{p.configured ? '' : ' (sin configurar)'}</option>)}
            </select>
            {currentProvider && (
              <select id="chat-model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={selectStyle} aria-label="Modelo">
                {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.card }}>
          <button aria-label="Anterior" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: T.fgMuted }}>
            <ChevronLeft className="w-5 h-5 transition-transform" style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)' }} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-4 h-4" style={{ color: T.cyan }} />
            <h1 className="text-sm font-medium" style={{ fontFamily: fontDisplay, color: T.fg }}>
              {activeConversation?.title || 'Chat IA'}
            </h1>
          </div>
          {activeConversation && (
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
              <span>{activeConversation.provider}/{activeConversation.model}</span>
              <span>{activeConversation.total_tokens?.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!selectedConversationId && !loadingConv && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${T.cyan}10` }}>
                  <Sparkles className="w-8 h-8" style={{ color: T.cyan }} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: fontDisplay, color: T.fg }}>Asistente de Ventas IA</h2>
                <p className="text-sm mb-6" style={{ color: T.fgMuted }}>
                  Pregunta sobre pipeline, clientes, campañas de marketing, estrategias de crecimiento o cualquier duda sobre tu negocio.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Redacta un email de seguimiento para un lead interesado en Growth',
                    'Compara SaaS Best Practices vs SaaS para una empresa mediana',
                    'Dame argumentos de venta para B2B en banca',
                    'Crea un plan de cuenta para una empresa del IBEX 35',
                  ].map((suggestion, i) => (
                    <button key={i} onClick={() => setInputMessage(suggestion)}
                      className="text-left p-3 rounded-lg text-xs transition-colors"
                      style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fg }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${T.cyan}40` }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loadingConv && selectedConversationId && (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
          )}

          {activeConversation?.messages?.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: `${T.cyan}10` }}>
                  <Bot className="w-4 h-4" style={{ color: T.cyan }} />
                </div>
              )}
              <div className="max-w-[75%] rounded-xl px-4 py-3 text-sm"
                style={msg.role === 'user'
                  ? { backgroundColor: `${T.cyan}15`, color: T.fg }
                  : { backgroundColor: T.card, color: T.fg, border: `1px solid ${T.border}` }
                }>
                <MessageContent content={msg.content} />
                {msg.role === 'assistant' && msg.duration_ms && (
                  <div className="flex items-center gap-3 mt-2 pt-2 text-xs" style={{ borderTop: `1px solid ${T.border}`, fontFamily: fontMono, color: T.fgMuted }}>
                    <span>{msg.provider}/{msg.model}</span>
                    <span>{msg.duration_ms}ms</span>
                    {(msg.tokens_input > 0 || msg.tokens_output > 0) && <span>{msg.tokens_input}+{msg.tokens_output} tokens</span>}
                  </div>
                )}
                {msg.error && (
                  <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: T.destructive }}>
                    <AlertTriangle className="w-3 h-3" />{msg.error}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: T.muted }}>
                  <User className="w-4 h-4" style={{ color: T.fgMuted }} />
                </div>
              )}
            </div>
          ))}

          {sendMsg.isPending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: `${T.cyan}10` }}>
                <Bot className="w-4 h-4" style={{ color: T.cyan }} />
              </div>
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: T.fgMuted }}>
                  <Loader2 className="w-4 h-4 animate-spin" />Pensando...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.card }}>
          <div className="flex gap-3 items-end">
            <textarea id="chat-message-input" ref={inputRef} value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje... (Enter para enviar)"
              className="flex-1 resize-none min-h-[44px] max-h-32 text-sm rounded-lg"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, padding: '0.625rem 0.75rem', outline: 'none' }}
              rows={1} disabled={sendMsg.isPending} aria-label="Mensaje de chat" />
            <button onClick={handleSend} disabled={!inputMessage.trim() || sendMsg.isPending}
              className="h-[44px] px-4 flex items-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {sendMsg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {configuredProviders.length === 0 && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: T.warning }}>
              <AlertTriangle className="w-3 h-3" />
              No hay proveedores de IA configurados. Ve a Integraciones para configurar al menos uno.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
