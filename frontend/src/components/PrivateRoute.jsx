import { useEffect, useState } from 'react'
import { Navigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [impersonating, setImpersonating] = useState(false)
  // null = unknown (still fetching), true/false = known
  const [onboardingDone, setOnboardingDone] = useState(() => {
    // Warm from localStorage to avoid flash on repeat visits
    return localStorage.getItem('st4rtup_onboarding_done') === 'true' ? true : null
  })

  // Handle impersonation token from admin
  // SECURITY: clean URL FIRST to prevent token leak via referer/history,
  // then exchange token via backend (validates signature + audit log)
  useEffect(() => {
    const token = searchParams.get('impersonate_token')
    if (!token || user) return

    // 1. Clean URL immediately so the token is gone from the address bar
    searchParams.delete('impersonate_token')
    setSearchParams(searchParams, { replace: true })

    setImpersonating(true)

    // 2. Exchange token with backend (verifies signature, expiry, and logs the action)
    fetch(`${import.meta.env.VITE_API_URL || ''}/auth/verify-impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Invalid impersonation token'))))
      .then(({ access_token, refresh_token }) => {
        if (!access_token) throw new Error('No session returned')
        return supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' })
      })
      .catch((err) => {
        console.error('Impersonation failed:', err)
      })
      .finally(() => setImpersonating(false))
  }, [searchParams, user, setSearchParams])

  // Check backend onboarding state on first mount (only if not cached locally)
  useEffect(() => {
    if (!user || onboardingDone !== null) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
        const r = await fetch(`${apiUrl}/users/me/onboarding`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (!r.ok) return
        const data = await r.json()
        if (cancelled) return
        setOnboardingDone(!!data.completed)
        if (data.completed) localStorage.setItem('st4rtup_onboarding_done', 'true')
      } catch {
        // On failure assume done to avoid a redirect loop
        if (!cancelled) setOnboardingDone(true)
      }
    })()
    return () => { cancelled = true }
  }, [user, onboardingDone])

  if (loading || impersonating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{impersonating ? 'Iniciando sesión como usuario...' : 'Cargando...'}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if not completed (except when already on onboarding page).
  // We re-check localStorage on every render so that finish() can mark the wizard
  // as done synchronously and the next navigation reflects it without waiting
  // for state propagation from the (now-stale) backend fetch result.
  const isOnboardingRoute = location.pathname.startsWith('/app/onboarding')
  const cachedDone = localStorage.getItem('st4rtup_onboarding_done') === 'true'
  if (onboardingDone === false && !cachedDone && !isOnboardingRoute) {
    return <Navigate to="/app/onboarding" replace />
  }

  return children
}
