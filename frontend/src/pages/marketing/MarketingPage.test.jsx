import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MarketingPage from './MarketingPage'

vi.mock('@/services/api', () => ({
  campaignsApi: {
    list: vi.fn(() => Promise.resolve({ data: { total: 5 } })),
  },
  marketingAlertsApi: {
    stats: vi.fn(() => Promise.resolve({ data: { total: 3, unread: 1 } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarketingPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MarketingPage', () => {
  it('muestra el titulo Marketing Hub', () => {
    renderPage()
    expect(screen.getByText('Marketing Hub')).toBeInTheDocument()
  })

  it('muestra la descripcion del hub', () => {
    renderPage()
    expect(screen.getByText(/Gestión integral de campañas/)).toBeInTheDocument()
  })

  it('muestra los modulos principales', () => {
    renderPage()
    expect(screen.getAllByText(/Campañas/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Generador UTM/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Calendario/).length).toBeGreaterThan(0)
  })

  it('muestra las KPI cards de resumen', () => {
    renderPage()
    expect(screen.getByText('Activas')).toBeInTheDocument()
    expect(screen.getByText('Alertas sin leer')).toBeInTheDocument()
  })

  it('muestra enlaces a modulos', () => {
    renderPage()
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(5)
  })
})
