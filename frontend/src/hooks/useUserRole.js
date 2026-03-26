import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { USE_MOCK_DATA } from '@/mocks/mockData'

/**
 * Hook to fetch the current user's role from the backend
 * Returns: { role: 'admin' | 'comercial' | 'viewer', loading: boolean }
 */
export function useUserRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchUserRole = async () => {
      // En modo MOCK, todos los usuarios son admin
      if (USE_MOCK_DATA) {
        setRole('admin')
        setLoading(false)
        return
      }

      try {
        // First check Supabase user_metadata for role (always available, no API call)
        const supabaseRole = user?.user_metadata?.role
        if (supabaseRole) {
          setRole(supabaseRole)
          setLoading(false)
          return
        }

        // Fallback: fetch from backend
        const { default: api } = await import('@/services/api')
        const response = await api.get('/users/me/profile')
        setRole(response.data.role || 'viewer')
      } catch (error) {
        // If backend fails, check Supabase metadata as last resort
        const fallbackRole = user?.user_metadata?.role || 'viewer'
        setRole(fallbackRole)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return { role, loading }
}
