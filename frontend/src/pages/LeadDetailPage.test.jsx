import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import LeadDetailPage from './LeadDetailPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: 'lead-1' }) }
})

vi.mock('@/services/api', () => ({
  leadsApi: {
    get: vi.fn(() => Promise.resolve({
      data: {
        id: 'lead-1',
        company_name: 'Acme Corp',
        company_cif: 'B12345678',
        company_website: 'https://acme.com',
        company_sector: 'Tecnologia',
        company_city: 'Madrid',
        company_province: 'Madrid',
        contact_name: 'Juan Perez',
        contact_email: 'juan@acme.com',
        contact_phone: '+34 600 000 000',
        contact_title: 'CTO',
        status: 'qualified',
        source: 'website',
        score: 85,
        created_at: '2024-01-15T10:00:00Z',
      },
    })),
    enrich: vi.fn(),
    verifyEmail: vi.fn(),
  },
  automationTasksApi: {
    triggerEM01: vi.fn(),
  },
  contactsApi: {
    getByLead: vi.fn(() => Promise.resolve({ data: [] })),
  },
  visitsApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [] } })),
  },
  emailsApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [] } })),
  },
  callsApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [] } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LeadDetailPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LeadDetailPage', () => {
  it('muestra indicador de carga inicialmente', () => {
    renderPage()
    // The loading state shows a spinner div (no text), so we check it exists
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra el nombre de la empresa', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
  })

  it('muestra el estado del lead', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('qualified')).toBeInTheDocument()
    })
  })

  it('muestra el score del lead', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Score: 85/)).toBeInTheDocument()
    })
  })

  it('muestra enlace para volver a leads', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Volver a Leads')).toBeInTheDocument()
    })
  })
})
