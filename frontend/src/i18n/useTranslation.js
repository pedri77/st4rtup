import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'
import translations from './translations'

export function useTranslation() {
  const { language } = useUserPreferencesStore()
  const lang = language || 'es'

  function t(key, fallback) {
    return translations[lang]?.[key] || translations['es']?.[key] || fallback || key
  }

  return { t, lang }
}
