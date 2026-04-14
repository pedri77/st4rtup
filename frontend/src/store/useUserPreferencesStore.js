import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de preferencias de usuario — persiste en localStorage bajo la
 * clave 'user-preferences' (compatible con el valor previo guardado manualmente).
 */

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUserPreferencesStore = create(
  persist(
    (set) => ({
      // Apariencia — defaults to system preference, overridden once persisted
      theme: getSystemTheme(),
      // Localización
      language: 'es',
      date_format: 'DD/MM/YYYY',
      currency: 'EUR',
      week_start: 'monday',
      // Navigation
      favorites: [],     // [{href, name, icon}] — max 5
      recents: [],       // [{href, name, ts}] — max 8, auto-tracked

      addFavorite: (item) => set((state) => {
        if (state.favorites.some(f => f.href === item.href)) return state
        return { favorites: [...state.favorites, item].slice(0, 5) }
      }),
      removeFavorite: (href) => set((state) => ({
        favorites: state.favorites.filter(f => f.href !== href),
      })),
      addRecent: (item) => set((state) => {
        const filtered = state.recents.filter(r => r.href !== item.href)
        return { recents: [{ ...item, ts: Date.now() }, ...filtered].slice(0, 8) }
      }),

      // Notificaciones
      emailNotifications: true,
      desktopNotifications: false,
      email_new_lead: true,
      email_action_overdue: true,
      email_daily_summary: true,
      email_weekly_report: false,
      push_new_lead: false,
      push_action_overdue: true,
      push_email_received: false,

      setPreferences: (partial) => set((state) => ({ ...state, ...partial })),
    }),
    {
      name: 'user-preferences',
    }
  )
)
