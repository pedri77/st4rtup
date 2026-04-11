import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Lightweight hook that syncs setup progress to localStorage
 * so SetupChecklist can read it without extra API calls.
 * Runs in Layout — piggybacks on existing query cache.
 */
export function useSetupProgress() {
  // Check lead count
  const { data: leadsData } = useQuery({
    queryKey: ['leads', { page: 1, page_size: 1 }],
    queryFn: () => api.get('/api/v1/leads/?page=1&page_size=1'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  // Check opportunities
  const { data: oppsData } = useQuery({
    queryKey: ['opportunities', { page: 1, page_size: 1 }],
    queryFn: () => api.get('/api/v1/opportunities/?page=1&page_size=1'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  // Check settings for email provider
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/v1/settings/'),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })

  // Check automations
  const { data: autoData } = useQuery({
    queryKey: ['automations', { page: 1, page_size: 1, status: 'active' }],
    queryFn: () => api.get('/api/v1/automations/?page=1&page_size=1&status=active'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    // Leads
    const totalLeads = leadsData?.data?.total ?? leadsData?.data?.items?.length ?? 0
    if (totalLeads > 0) localStorage.setItem('st4rtup_lead_count', String(totalLeads))

    // Email connected
    const settings = settingsData?.data
    if (settings?.email_provider && settings.email_provider !== 'none') {
      localStorage.setItem('st4rtup_email_connected', 'true')
    }

    // First opportunity
    const totalOpps = oppsData?.data?.total ?? oppsData?.data?.items?.length ?? 0
    if (totalOpps > 0) localStorage.setItem('st4rtup_first_opportunity', 'true')

    // Automations active
    const totalAuto = autoData?.data?.total ?? autoData?.data?.items?.length ?? 0
    if (totalAuto > 0) localStorage.setItem('st4rtup_automations_active', 'true')
  }, [leadsData, settingsData, oppsData, autoData])
}
