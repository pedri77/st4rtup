import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [impersonating, setImpersonating] = useState(false)

  // Handle impersonation token from admin
  useEffect(() => {
    const token = searchParams.get('impersonate_token')
    if (token && !user) {
      setImpersonating(true)
      // Set the token as session (admin-generated JWT)
      supabase.auth.setSession({ access_token: token, refresh_token: '' })
        .then(() => {
          // Clean URL
          searchParams.delete('impersonate_token')
          setSearchParams(searchParams, { replace: true })
          setImpersonating(false)
        })
        .catch(() => setImpersonating(false))
    }
  }, [searchParams])

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
