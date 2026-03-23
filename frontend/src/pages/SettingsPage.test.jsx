import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from './SettingsPage'

vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { email: 'test@test.com', user_metadata: {} } } })),
      updateUser: vi.fn(() => Promise.resolve({ data: {} })),
    },
  },
}))

vi.mock('@/store/useUserPreferencesStore', () => ({
  useUserPreferencesStore: vi.fn(() => ({
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
    setLanguage: vi.fn(),
    setDateFormat: vi.fn(),
    setCurrency: vi.fn(),
  })),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SettingsPage', () => {
  it('muestra el titulo Configuracion', () => {
    renderPage()
    expect(screen.getByText('Configuracion')).toBeInTheDocument()
  })

  it('muestra la descripcion de la pagina', () => {
    renderPage()
    expect(screen.getByText(/Gestiona tu perfil, preferencias/)).toBeInTheDocument()
  })

  it('muestra las pestañas de navegacion', () => {
    renderPage()
    expect(screen.getAllByText('Perfil').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Notificaciones').length).toBeGreaterThan(0)
  })

  it('muestra la pestaña Perfil activa por defecto', () => {
    renderPage()
    const profileTab = screen.getByText('Perfil')
    expect(profileTab).toBeInTheDocument()
  })
})
