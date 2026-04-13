/**
 * useRealtimeNotifications — WebSocket hook for real-time push notifications.
 * Connects to /ws/notifications with JWT auth. Auto-reconnects on disconnect.
 * Dispatches custom events that components can listen to.
 */
import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

const WS_BASE = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws').replace(/\/api\/v\d+\/?.*$/, '')

const EVENT_HANDLERS = {
  'lead.created': (data) => ({
    toast: `Nuevo lead: ${data.company_name || 'Sin nombre'}`,
    invalidate: ['leads', 'dashboard'],
  }),
  'opportunity.stage_changed': (data) => ({
    toast: `Deal movido a ${data.new_stage}: ${data.company_name || ''}`,
    invalidate: ['opportunities', 'pipeline', 'dashboard'],
  }),
  'email.opened': (data) => ({
    toast: `Email abierto por ${data.contact_name || 'lead'}`,
    invalidate: ['emails', 'leads'],
  }),
  'email.clicked': (data) => ({
    toast: `Click en email: ${data.url?.substring(0, 40) || ''}`,
    invalidate: ['emails'],
  }),
  'notification.new': (data) => ({
    toast: data.message || 'Nueva notificacion',
    invalidate: ['notifications'],
  }),
}

export function useRealtimeNotifications() {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const queryClient = useQueryClient()

  const connect = useCallback(async () => {
    if (!WS_BASE) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    // Close existing connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}/ws/notifications?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      // Send ping every 25s to keep alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        else clearInterval(pingInterval)
      }, 25000)
      ws._pingInterval = pingInterval
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'pong') return

        const handler = EVENT_HANDLERS[msg.type]
        if (handler) {
          const { toast: toastMsg, invalidate } = handler(msg.data || {})
          if (toastMsg) toast(toastMsg, { icon: '🔔', duration: 4000 })
          if (invalidate) {
            invalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }))
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      clearInterval(ws._pingInterval)
      // Auto-reconnect after 5s
      reconnectRef.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])
}
