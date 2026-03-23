import { describe, it, expect, beforeEach } from 'vitest'
import { useUserPreferencesStore } from './useUserPreferencesStore'

const DEFAULTS = {
  theme: 'light',
  language: 'es',
  date_format: 'DD/MM/YYYY',
  currency: 'EUR',
  week_start: 'monday',
  emailNotifications: true,
  desktopNotifications: false,
  email_new_lead: true,
  email_action_overdue: true,
  email_daily_summary: true,
  email_weekly_report: false,
  push_new_lead: false,
  push_action_overdue: true,
  push_email_received: false,
}

beforeEach(() => {
  useUserPreferencesStore.setState({ ...DEFAULTS })
  localStorage.clear()
})

describe('useUserPreferencesStore — valores por defecto', () => {
  it('tiene los defaults correctos', () => {
    const state = useUserPreferencesStore.getState()
    expect(state.theme).toBe('light')
    expect(state.language).toBe('es')
    expect(state.currency).toBe('EUR')
    expect(state.email_new_lead).toBe(true)
    expect(state.push_new_lead).toBe(false)
  })
})

describe('useUserPreferencesStore — setPreferences', () => {
  it('actualiza un campo sin afectar los demás', () => {
    useUserPreferencesStore.getState().setPreferences({ language: 'en' })
    const state = useUserPreferencesStore.getState()
    expect(state.language).toBe('en')
    expect(state.theme).toBe('light')
    expect(state.currency).toBe('EUR')
  })

  it('actualiza múltiples campos a la vez', () => {
    useUserPreferencesStore.getState().setPreferences({ currency: 'USD', week_start: 'sunday' })
    const state = useUserPreferencesStore.getState()
    expect(state.currency).toBe('USD')
    expect(state.week_start).toBe('sunday')
    expect(state.language).toBe('es')
  })

  it('actualiza preferencias de notificaciones', () => {
    useUserPreferencesStore.getState().setPreferences({ email_weekly_report: true, push_new_lead: true })
    const state = useUserPreferencesStore.getState()
    expect(state.email_weekly_report).toBe(true)
    expect(state.push_new_lead).toBe(true)
    expect(state.email_new_lead).toBe(true) // sin cambios
  })

  it('no sobreescribe setPreferences al hacer merge', () => {
    useUserPreferencesStore.getState().setPreferences({ theme: 'dark' })
    expect(typeof useUserPreferencesStore.getState().setPreferences).toBe('function')
  })
})
