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
        // Fetch user data from backend to get role
        // Use /me/profile which auto-creates the user record if it doesn't exist yet
        const { default: api } = await import('@/services/api')
        const response = await api.get('/users/me/profile')
        setRole(response.data.role || 'viewer')
      } catch (error) {
        // Error fetching role — default to viewer (most restrictive)
        // Default to viewer if we can't fetch the role (most restrictive)
        setRole('viewer')
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return { role, loading }
}
