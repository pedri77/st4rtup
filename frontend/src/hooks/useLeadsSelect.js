import { useQuery } from '@tanstack/react-query'
import { leadsApi } from '@/services/api'
import { mockLeads, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'

/**
 * Hook para obtener todos los leads como lista plana para selectores/dropdowns.
 * Usa queryKey 'leads-all' compartida, por lo que múltiples componentes
 * comparten la misma caché sin peticiones duplicadas.
 *
 * @returns {{ leads: Array, isLoading: boolean }}
 */
export function useLeadsSelect() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-all'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await mockDelay(400)
        return mockLeads.items
      }
      try {
        const response = await leadsApi.list({ page_size: 100 })
        return response.data.items || []
      } catch {
        return mockLeads.items
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min — los leads no cambian tan frecuentemente
  })

  return { leads, isLoading }
}
