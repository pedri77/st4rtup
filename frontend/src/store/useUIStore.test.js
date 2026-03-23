import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './useUIStore'

// Resetear el store antes de cada test
beforeEach(() => {
  useUIStore.setState({ searchOpen: false, notificationsOpen: false })
})

describe('useUIStore', () => {
  it('estado inicial: paneles cerrados', () => {
    const { searchOpen, notificationsOpen } = useUIStore.getState()
    expect(searchOpen).toBe(false)
    expect(notificationsOpen).toBe(false)
  })

  it('setSearchOpen(true) abre la búsqueda', () => {
    useUIStore.getState().setSearchOpen(true)
    expect(useUIStore.getState().searchOpen).toBe(true)
  })

  it('setSearchOpen(false) cierra la búsqueda', () => {
    useUIStore.setState({ searchOpen: true })
    useUIStore.getState().setSearchOpen(false)
    expect(useUIStore.getState().searchOpen).toBe(false)
  })

  it('setNotificationsOpen(true) abre el panel de notificaciones', () => {
    useUIStore.getState().setNotificationsOpen(true)
    expect(useUIStore.getState().notificationsOpen).toBe(true)
  })

  it('búsqueda y notificaciones son independientes', () => {
    useUIStore.getState().setSearchOpen(true)
    expect(useUIStore.getState().notificationsOpen).toBe(false)

    useUIStore.getState().setNotificationsOpen(true)
    expect(useUIStore.getState().searchOpen).toBe(true)
  })
})
