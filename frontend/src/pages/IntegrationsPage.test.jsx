import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import IntegrationsPage from './IntegrationsPage'

vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    envStatus: vi.fn(() => Promise.resolve({ data: {} })),
    testIntegration: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}))

vi.mock('@/components/RoleGuard', () => ({
  useHasRole: vi.fn(() => ({
    hasRole: vi.fn(() => true),
    currentRole: 'admin',
  })),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('IntegrationsPage', () => {
  it('muestra el titulo Integraciones mientras carga', () => {
    renderPage()
    expect(screen.getByText('Integraciones')).toBeInTheDocument()
  })

  it('muestra la descripcion de la pagina', () => {
    renderPage()
    expect(screen.getByText(/Configura proveedores de email/)).toBeInTheDocument()
  })

  it('muestra el titulo Integraciones tras cargar datos', async () => {
    renderPage()
    await waitFor(() => {
      const headings = screen.getAllByText('Integraciones')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('muestra las pestañas de configuracion tras cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })
})
