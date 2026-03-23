import { useQuery } from '@tanstack/react-query'
import { leadsApi } from '@/services/api'

/**
 * Hook para obtener múltiples leads en batch y eliminar N+1 queries
 * @param {Array<string>} leadIds - Array de IDs de leads a obtener
 * @returns {Object} - { data: { [leadId]: leadData }, isLoading, error }
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useLeadsByIds(leadIds = []) {
  const uniqueIds = [...new Set(leadIds.filter(id => id && UUID_REGEX.test(id)))]

  return useQuery({
    queryKey: ['leads-batch', uniqueIds.sort()],
    queryFn: async () => {
      if (!uniqueIds.length) return {}

      // Hacer requests en paralelo (React Query deduplica automáticamente)
      const results = await Promise.all(
        uniqueIds.map(id =>
          leadsApi.get(id)
            .then(r => r.data)
            .catch(err => {
              // Individual lead fetch failed — skip
              return null
            })
        )
      )

      // Retornar mapa: { [leadId]: leadData }
      return Object.fromEntries(
        uniqueIds.map((id, i) => [id, results[i]]).filter(([_, data]) => data !== null)
      )
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000, // 10 min garbage collection
  })
}
