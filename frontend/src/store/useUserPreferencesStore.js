import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de preferencias de usuario — persiste en localStorage bajo la
 * clave 'user-preferences' (compatible con el valor previo guardado manualmente).
 */
export const useUserPreferencesStore = create(
  persist(
    (set) => ({
      // Apariencia
      theme: 'light',
      // Localización
      language: 'es',
      date_format: 'DD/MM/YYYY',
      currency: 'EUR',
      week_start: 'monday',
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
