import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import OffersPage from './OffersPage'

vi.mock('@/services/api', () => ({
  offersApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', reference: 'OFF-001', lead_name: 'Acme Corp', status: 'draft', total_amount: 15000, valid_until: '2026-06-01', created_at: '2026-03-01' },
          { id: '2', reference: 'OFF-002', lead_name: 'TechSolutions SL', status: 'sent', total_amount: 28000, valid_until: '2026-07-01', created_at: '2026-03-10' },
          { id: '3', reference: 'OFF-003', lead_name: 'DataFlow SA', status: 'accepted', total_amount: 42000, valid_until: '2026-05-15', created_at: '2026-02-20' },
        ],
        total: 3,
        page: 1,
        page_size: 20,
        pages: 1,
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: { id: '4' } })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OffersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OffersPage', () => {
  it('renderiza titulo Ofertas', () => {
    renderPage()
    expect(screen.getByText('Ofertas')).toBeInTheDocument()
  })

  it('muestra subtitulo de propuestas comerciales', () => {
    renderPage()
    expect(screen.getByText('Propuestas comerciales')).toBeInTheDocument()
  })

  it('muestra boton Nueva Oferta', () => {
    renderPage()
    expect(screen.getByText('Nueva Oferta')).toBeInTheDocument()
  })

  it('muestra filas de ofertas despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('TechSolutions SL')).toBeInTheDocument()
    expect(screen.getByText('DataFlow SA')).toBeInTheDocument()
  })

  it('muestra filtro de busqueda', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Buscar por titulo o referencia/)).toBeInTheDocument()
  })
})
