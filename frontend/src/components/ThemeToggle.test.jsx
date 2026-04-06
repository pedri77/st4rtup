import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useUserPreferencesStore.setState({ theme: 'dark' })
    document.documentElement.style.filter = ''
  })

  it('renderiza el boton', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('muestra titulo correcto en modo oscuro', () => {
    render(<ThemeToggle />)
    expect(screen.getByTitle('Modo claro')).toBeInTheDocument()
  })

  it('cambia a light al hacer click', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    const state = useUserPreferencesStore.getState()
    expect(state.theme).toBe('light')
  })

  it('cambia de light a dark al hacer click', () => {
    useUserPreferencesStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    expect(screen.getByTitle('Modo oscuro')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    const state = useUserPreferencesStore.getState()
    expect(state.theme).toBe('dark')
  })
})
