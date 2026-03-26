import { useQuery } from '@tanstack/react-query'
import { orgApi } from '@/services/api'

export function useOrganization() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: () => orgApi.me().then(r => r.data),
    staleTime: 300000, // 5 min cache
    retry: 1,
  })

  const { data: plan } = useQuery({
    queryKey: ['organization', 'plan'],
    queryFn: () => orgApi.plan().then(r => r.data),
    staleTime: 300000,
    retry: 1,
  })

  return {
    org: org || { name: '', plan: 'starter' },
    plan: plan?.plan || 'starter',
    limits: plan?.limits || { users: 1, leads: 100, price: 0 },
    isLoading,
  }
}
