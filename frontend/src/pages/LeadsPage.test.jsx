import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import LeadsPage from './LeadsPage'

vi.mock('@/services/api', () => ({
  leadsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', company_name: 'Acme Corp', contact_name: 'Juan Perez', contact_email: 'juan@acme.com', status: 'new', score: 85, source: 'website', company_city: 'Madrid' },
          { id: '2', company_name: 'TechSolutions SL', contact_name: 'Maria Lopez', contact_email: 'maria@tech.com', status: 'qualified', score: 72, source: 'referral', company_city: 'Barcelona' },
          { id: '3', company_name: 'DataFlow SA', contact_name: 'Carlos Ruiz', contact_email: 'carlos@dataflow.com', status: 'contacted', score: 45, source: 'cold_outreach', company_city: 'Valencia' },
        ],
        total: 3,
        page: 1,
        page_size: 20,
        pages: 1,
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: { id: '4' } })),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  USE_MOCK_DATA: false,
  mockLeads: { items: [], total: 0 },
  mockDelay: () => Promise.resolve(),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LeadsPage', () => {
  it('renderiza titulo LEADS', () => {
    renderPage()
    expect(screen.getByText('LEADS')).toBeInTheDocument()
  })

  it('muestra estado de carga', () => {
    renderPage()
    expect(screen.getByText('Cargando registros...')).toBeInTheDocument()
  })

  it('muestra filas de leads despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('TechSolutions SL')).toBeInTheDocument()
    expect(screen.getByText('DataFlow SA')).toBeInTheDocument()
  })

  it('muestra contactos de los leads', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    })
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
  })

  it('muestra boton Nuevo para crear lead', () => {
    renderPage()
    expect(screen.getByText('Nuevo')).toBeInTheDocument()
  })
})
