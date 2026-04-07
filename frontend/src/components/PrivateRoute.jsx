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

  // Handle impersonation token from admin.
  //
  // The token is a backend-issued JWT (not a Supabase JWT), so we cannot
  // use supabase.auth.setSession() — it would reject the signature.
  // Instead we store the token in localStorage under a known key. The
  // axios interceptor uses it for backend calls, and AuthContext reads
  // it on next mount to populate the user state from the JWT claims.
  //
  // SECURITY: clean URL FIRST so the token is gone from the address bar
  // (no leak via referer/history), then exchange via backend audit log,
  // then persist + reload.
  useEffect(() => {
    const token = searchParams.get('impersonate_token')
    if (!token) return

    // 1. Clean URL immediately
    searchParams.delete('impersonate_token')
    setSearchParams(searchParams, { replace: true })

    setImpersonating(true)

    // 2. Sign out the admin's Supabase session in this tab so it doesn't
    //    interfere with the impersonated session
    supabase.auth.signOut({ scope: 'local' }).catch(() => {})

    // 3. Exchange the token with backend (verifies signature + jti single-use + audit log)
    fetch(`${import.meta.env.VITE_API_URL || ''}/auth/verify-impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Invalid impersonation token'))))
      .then(({ access_token }) => {
        if (!access_token) throw new Error('No token returned from /verify-impersonate')
        // 4. Persist the token under our own key (NOT the supabase key)
        localStorage.setItem('st4rtup_impersonate_token', access_token)
        // 5. Hard reload so AuthContext re-mounts and reads the new token
        window.location.reload()
      })
      .catch((err) => {
        console.error('Impersonation failed:', err)
        setImpersonating(false)
      })
  }, [searchParams, setSearchParams])

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
