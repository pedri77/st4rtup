import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useNotificationStream() {
  const queryClient = useQueryClient()
  const abortRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function connect() {
      if (cancelled) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || cancelled) return

      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
      const url = `${baseUrl}/notifications/stream`

      try {
        const controller = new AbortController()
        abortRef.current = controller

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          signal: controller.signal,
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                JSON.parse(line.slice(6))
                // Invalidate notification query to update badge
                queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] })
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        if (cancelled) return
        // Reconnect after 30s on error
        setTimeout(connect, 30000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [queryClient])
}
