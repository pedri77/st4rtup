import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Decode a JWT payload client-side without verification (used only to read
// claims from an impersonation token we received from our own backend).
function _decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for an active impersonation session in localStorage first.
    // If present, build a synthetic user from the JWT claims and skip Supabase.
    const impersonateToken = sessionStorage.getItem('st4rtup_impersonate_token')
    if (impersonateToken) {
      const payload = _decodeJwtPayload(impersonateToken)
      const exp = payload?.exp ? payload.exp * 1000 : 0
      if (payload && exp > Date.now()) {
        setUser({
          id: payload.sub,
          email: payload.email,
          user_metadata: {
            impersonated_by: payload.impersonated_by,
            org_id: payload.org_id,
          },
        })
        setSession({ access_token: impersonateToken, refresh_token: '' })
        setLoading(false)
        return  // Don't subscribe to Supabase auth changes during impersonation
      }
      // Token expired → clean up
      localStorage.removeItem('st4rtup_impersonate_token')
    }

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name || '',
          company_name: metadata.company_name || '',
        },
      },
    })
    if (error) throw error

    // Call backend to provision org + user record
    if (data.user) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1'
        const token = data.session?.access_token
        if (token) {
          await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              full_name: metadata.full_name,
              company_name: metadata.company_name,
            }),
          })
        }
      } catch (e) {
        // Backend registration failed — non-blocking
      }
    }

    return data
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
