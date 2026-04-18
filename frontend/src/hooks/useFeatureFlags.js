import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/services/api'
import { gb } from '@/lib/growthbook'

const DEFAULTS = {
  inline_editing: true,
  activity_heatmap: true,
  email_tracking_pixel: true,
  hunter_verification: true,
  social_recurrence: true,
  whatsapp_channel: false,
  google_calendar_sync: false,
  ai_content_pipeline: false,
  dark_mode: false,
  pwa_mobile: false,
}

/**
 * Feature flags hook — merges 3 sources in priority order:
 * 1. GrowthBook SDK (if configured via VITE_GROWTHBOOK_CLIENT_KEY)
 * 2. Backend API (DB overrides + local flags)
 * 3. Hardcoded defaults
 */
export function useFeatureFlags() {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => settingsApi.featureFlags().then(r => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: DEFAULTS,
  })

  const backendFlags = data || DEFAULTS

  return {
    flags: backendFlags,
    isLoading,
    isEnabled: (flag) => {
      // GrowthBook takes priority if configured and has the feature
      if (gb.getFeatures()[flag] !== undefined) {
        return gb.isOn(flag)
      }
      return Boolean(backendFlags[flag])
    },
  }
}

export function useUpdateFeatureFlags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (flags) => settingsApi.updateFeatureFlags(flags),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
  })
}
