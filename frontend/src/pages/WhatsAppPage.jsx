import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Loader2, Bot, Search, Phone, ToggleLeft, ToggleRight,
  Plus, X, Users, MessageCircle, ChevronLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { whatsappApi } from '@/services/api'
import { useTranslation } from '@/i18n/useTranslation'
import { useThemeColors, fontDisplay, fontMono } from '@/utils/theme'



function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return d.toLocaleDateString('es-ES', { weekday: 'short' })
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

export default function WhatsAppPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [mobileShowMessages, setMobileShowMessages] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: () => whatsappApi.stats().then(r => r.data),
    refetchInterval: 10000,
  })

  // Conversations list with 10s polling
  const { data: conversations = [], isLoading: loadingConvos } = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: () => whatsappApi.conversations({ page_size: 100 }).then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d.items || [])
    }),
    refetchInterval: 10000,
  })

  // Messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['whatsapp-messages', selectedId],
    queryFn: () => whatsappApi.messages(selectedId).then(r => {
      const d = r.data
      return Array.isArray(d) ? d : (d.items || [])
    }),
    enabled: !!selectedId,
    refetchInterval: 5000,
  })

  // Send message mutation
  const sendMsg = useMutation({
    mutationFn: (data) => whatsappApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-messages', selectedId])
      queryClient.invalidateQueries(['whatsapp-conversations'])
    },
    onError: (err) => toast.error(`Error: ${err.response?.data?.detail || err.message}`),
  })

  // Toggle bot mutation
  const toggleBot = useMutation({
    mutationFn: (id) => whatsappApi.toggleBot(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-conversations'])
      toast.success('Bot actualizado')
    },
    onError: () => toast.error('Error actualizando bot'),
  })

  // Create new conversation by sending a greeting
  const createConvo = useMutation({
    mutationFn: (data) => whatsappApi.send({ phone: data.phone, text: data.text || 'Hola desde St4rtup CRM' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['whatsapp-conversations'])
      const convId = res.data?.conversation_id
      if (convId) setSelectedId(convId)
      setShowNewConvo(false)
      setNewPhone('')
      setMobileShowMessages(true)
    },
    onError: (err) => toast.error(`Error: ${err.response?.data?.detail || err.message}`),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedId) inputRef.current?.focus()
  }, [selectedId])

  const selectedConvo = conversations.find(c => c.id === selectedId)

  const handleSend = useCallback(() => {
    if (!input.trim() || sendMsg.isPending || !selectedConvo) return
    const text = input.trim()
    setInput('')
    sendMsg.mutate({ phone: selectedConvo.phone, text, lead_id: selectedConvo.lead_id })
  }, [input, sendMsg, selectedConvo])

  const handleNewConvo = () => {
    if (!newPhone.trim()) return
    createConvo.mutate({ phone: newPhone.trim(), text: 'Hola desde St4rtup CRM' })
  }

  const handleSelectConvo = (id) => {
    setSelectedId(id)
    setMobileShowMessages(true)
  }

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (c.phone || '').toLowerCase().includes(term) ||
           (c.lead_name || '').toLowerCase().includes(term)
  })

  return (
    <div className="flex -m-4 md:-m-8" style={{ height: 'calc(100vh - 4rem)', backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Left panel — conversation list */}
      <div
        className={`w-full md:w-80 flex-shrink-0 flex flex-col ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}
        style={{ backgroundColor: T.card, borderRight: `1px solid ${T.border}` }}
      >
        {/* Stats bar */}
        <div className="px-4 py-3 flex items-center gap-4 text-xs" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: T.cyan }} />
            <span style={{ fontFamily: fontMono, color: T.fg }}>{stats?.total_conversations ?? stats?.total ?? 0}</span>
            <span style={{ color: T.fgMuted }}>convos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: T.warning }} />
            <span style={{ fontFamily: fontMono, color: T.fg }}>{stats?.unread ?? 0}</span>
            <span style={{ color: T.fgMuted }}>sin leer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" style={{ color: T.success }} />
            <span style={{ fontFamily: fontMono, color: T.fg }}>{stats?.bot_active ?? 0}</span>
            <span style={{ color: T.fgMuted }}>bot</span>
          </div>
        </div>

        {/* Search + New */}
        <div className="p-3 space-y-2" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.fgMuted }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar conversacion..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, outline: 'none' }}
              />
            </div>
            <button
              onClick={() => setShowNewConvo(!showNewConvo)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: showNewConvo ? `${T.cyan}20` : T.muted, border: `1px solid ${T.border}`, color: showNewConvo ? T.cyan : T.fgMuted }}
            >
              {showNewConvo ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* New conversation input */}
          {showNewConvo && (
            <div className="flex gap-2">
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNewConvo()}
                placeholder="+34 600 123 456"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, outline: 'none' }}
              />
              <button
                onClick={handleNewConvo}
                disabled={!newPhone.trim() || createConvo.isPending}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}
              >
                {createConvo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.cyan }} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: T.fgMuted }}>
              {searchTerm ? 'Sin resultados' : 'No hay conversaciones'}
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConvo(conv.id)}
                className="w-full text-left px-4 py-3 transition-colors group"
                style={{
                  borderBottom: `1px solid ${T.border}30`,
                  backgroundColor: selectedId === conv.id ? `${T.cyan}10` : 'transparent',
                  borderLeft: selectedId === conv.id ? `3px solid ${T.cyan}` : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: conv.bot_enabled ? `${T.success}15` : `${T.cyan}15` }}>
                    {conv.bot_enabled ? (
                      <Bot className="w-5 h-5" style={{ color: T.success }} />
                    ) : (
                      <Users className="w-5 h-5" style={{ color: T.cyan }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ fontFamily: fontDisplay, color: T.fg }}>
                        {conv.lead_name || conv.phone}
                      </p>
                      <span className="text-[10px] flex-shrink-0" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs truncate" style={{ color: T.fgMuted }}>
                        {conv.phone}
                      </p>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: T.cyan, color: T.bg }}>
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — messages */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.card }}>
              <button aria-label="Anterior"
                onClick={() => setMobileShowMessages(false)}
                className="md:hidden p-1 rounded"
                style={{ color: T.fgMuted }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${T.cyan}15` }}>
                <Phone className="w-4 h-4" style={{ color: T.cyan }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ fontFamily: fontDisplay, color: T.fg }}>
                  {selectedConvo.lead_name || selectedConvo.phone}
                </p>
                <p className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                  {selectedConvo.phone}
                </p>
              </div>

              {/* Bot toggle */}
              <button
                onClick={() => toggleBot.mutate(selectedConvo.id)}
                disabled={toggleBot.isPending}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  fontFamily: fontDisplay,
                  backgroundColor: selectedConvo.bot_enabled ? `${T.success}15` : T.muted,
                  color: selectedConvo.bot_enabled ? T.success : T.fgMuted,
                  border: `1px solid ${selectedConvo.bot_enabled ? T.success + '30' : T.border}`,
                }}
              >
                {selectedConvo.bot_enabled ? (
                  <><ToggleRight className="w-4 h-4" /> Bot IA</>
                ) : (
                  <><ToggleLeft className="w-4 h-4" /> Bot Off</>
                )}
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{ backgroundImage: `radial-gradient(${T.border}30 1px, transparent 1px)`, backgroundSize: '20px 20px' }}>
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: T.fgMuted, opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: T.fgMuted }}>Sin mensajes aun</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOutbound = msg.direction === 'outbound'
                  const isBot = msg.sender_name === 'Bot IA' || msg.metadata_?.is_bot || msg.metadata_?.bot
                  return (
                    <div key={msg.id || i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%] rounded-xl px-4 py-2.5"
                        style={{
                          backgroundColor: isOutbound ? `${T.cyan}20` : T.card,
                          border: isOutbound ? `1px solid ${T.cyan}30` : `1px solid ${T.border}`,
                          borderBottomRightRadius: isOutbound ? 4 : 12,
                          borderBottomLeftRadius: isOutbound ? 12 : 4,
                        }}>
                        {isBot && (
                          <div className="flex items-center gap-1 mb-1">
                            <Bot className="w-3 h-3" style={{ color: T.success }} />
                            <span className="text-[10px] font-bold" style={{ color: T.success }}>[Bot IA]</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words" style={{ color: T.fg }}>
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isOutbound && msg.status && (
                            <span className="text-[10px]" style={{
                              color: msg.status === 'read' ? T.cyan : msg.status === 'delivered' ? T.success : T.fgMuted
                            }}>
                              {msg.status === 'read' ? '\/\/' : msg.status === 'delivered' ? '\/\/' : msg.status === 'sent' ? '\/' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="p-3" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.card }}>
              <div className="flex gap-2 items-end">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, outline: 'none' }}
                  disabled={sendMsg.isPending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMsg.isPending}
                  className="h-[42px] px-4 flex items-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                  style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}
                >
                  {sendMsg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${T.success}10` }}>
                <MessageSquare className="w-8 h-8" style={{ color: T.success }} />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                WhatsApp Business
              </h2>
              <p className="text-sm mb-4" style={{ color: T.fgMuted }}>
                Selecciona una conversacion o inicia una nueva para comenzar a enviar mensajes via WhatsApp Business API.
              </p>
              <button
                onClick={() => { setShowNewConvo(true); setMobileShowMessages(false) }}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}
              >
                <Plus className="w-4 h-4 inline mr-1" /> Nueva conversacion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
