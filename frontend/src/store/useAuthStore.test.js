import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearProfile()
  })

  it('has correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.userProfile).toBeNull()
    expect(state.role).toBeNull()
    expect(state.isProfileLoaded).toBe(false)
  })

  it('setProfile sets all fields correctly', () => {
    const profile = { id: 1, name: 'Test User', role: 'admin' }

    useAuthStore.getState().setProfile(profile)

    const state = useAuthStore.getState()
    expect(state.userProfile).toEqual(profile)
    expect(state.role).toBe('admin')
    expect(state.isProfileLoaded).toBe(true)
  })

  it('setProfile extracts role from profile', () => {
    useAuthStore.getState().setProfile({ id: 2, role: 'comercial' })
    expect(useAuthStore.getState().role).toBe('comercial')

    useAuthStore.getState().setProfile({ id: 3, role: 'viewer' })
    expect(useAuthStore.getState().role).toBe('viewer')
  })

  it('clearProfile resets to initial state', () => {
    useAuthStore.getState().setProfile({ id: 1, role: 'admin' })
    useAuthStore.getState().clearProfile()

    const state = useAuthStore.getState()
    expect(state.userProfile).toBeNull()
    expect(state.role).toBeNull()
    expect(state.isProfileLoaded).toBe(false)
  })
})
