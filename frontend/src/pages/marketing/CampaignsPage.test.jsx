import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CampaignsPage from './CampaignsPage'

vi.mock('@/services/api', () => ({
  campaignsApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [], total: 0, page: 1, pages: 1 } })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CampaignsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CampaignsPage', () => {
  it('muestra el titulo Campañas', () => {
    renderPage()
    expect(screen.getByText('Campañas')).toBeInTheDocument()
  })

  it('muestra boton de nueva campaña', () => {
    renderPage()
    expect(screen.getByText('Nueva Campaña')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay campañas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No hay campañas/)).toBeInTheDocument()
    })
  })

  it('muestra campo de busqueda', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument()
  })
})
