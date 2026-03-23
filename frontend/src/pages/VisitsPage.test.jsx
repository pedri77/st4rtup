import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import VisitsPage from './VisitsPage'

vi.mock('@/services/api', () => ({
  visitsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', lead_id: 'l1', lead_name: 'Acme Corp', visit_type: 'presencial', visit_date: '2026-04-10T10:00:00Z', duration_minutes: 60, location: 'Madrid', result: 'positive', summary: 'Gran reunion', attendees_internal: ['David'], attendees_external: [], created_at: '2026-03-01' },
          { id: '2', lead_id: 'l2', lead_name: 'TechSolutions SL', visit_type: 'virtual', visit_date: '2026-03-20T14:00:00Z', duration_minutes: 45, location: 'Zoom', result: 'neutral', summary: 'Demo producto', attendees_internal: ['Ana'], attendees_external: [], created_at: '2026-03-15' },
        ],
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: { id: '3' } })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  USE_MOCK_DATA: false,
  mockVisits: { items: [] },
  mockDelay: () => Promise.resolve(),
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <VisitsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VisitsPage', () => {
  it('renderiza titulo Visitas', () => {
    renderPage()
    expect(screen.getByText('Visitas')).toBeInTheDocument()
  })

  it('muestra subtitulo de registro de visitas', () => {
    renderPage()
    expect(screen.getByText('Registro de visitas comerciales')).toBeInTheDocument()
  })

  it('muestra boton Nueva Visita', () => {
    renderPage()
    expect(screen.getByText('Nueva Visita')).toBeInTheDocument()
  })

  it('muestra datos de visitas despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('TechSolutions SL')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay visitas', async () => {
    const { visitsApi } = await import('@/services/api')
    visitsApi.list.mockImplementationOnce(() => Promise.resolve({ data: { items: [] } }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <VisitsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('Sin visitas registradas')).toBeInTheDocument()
    })
  })
})
