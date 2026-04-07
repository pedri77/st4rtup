import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [impersonating, setImpersonating] = useState(false)

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

  return children
}
