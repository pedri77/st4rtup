import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import PipelinePage from './PipelinePage'

vi.mock('@/services/api', () => ({
  opportunitiesApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: 'opp-1', name: 'Implementacion GRC Enterprise', lead_id: 'l1', lead_name: 'Acme Corp', stage: 'discovery', value: 50000, probability: 30, expected_close_date: '2024-06-01', products: [] },
          { id: 'opp-2', name: 'Auditoria ISO 27001', lead_id: 'l2', lead_name: 'TechSolutions', stage: 'proposal', value: 25000, probability: 60, expected_close_date: '2024-05-15', products: [] },
          { id: 'opp-3', name: 'SGSI Completo', lead_id: 'l3', lead_name: 'DataFlow', stage: 'closed_won', value: 80000, probability: 100, expected_close_date: '2024-04-01', products: [] },
        ],
      },
    })),
    create: vi.fn(),
    update: vi.fn(),
  },
  agentsApi: {
    generateProposal: vi.fn(),
    exportPDF: vi.fn(),
  },
  contractsApi: {
    generate: vi.fn(),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  USE_MOCK_DATA: false,
  mockOpportunities: { items: [] },
  mockDelay: () => Promise.resolve(),
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

vi.mock('@/hooks/useLeadsByIds', () => ({
  useLeadsByIds: () => ({ data: {} }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PipelinePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PipelinePage', () => {
  it('renderiza titulo Pipeline', () => {
    renderPage()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })

  it('muestra estadisticas del pipeline', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PIPELINE TOTAL')).toBeInTheDocument()
    })
    expect(screen.getByText('PONDERADO')).toBeInTheDocument()
    expect(screen.getByText('CERRADAS WON')).toBeInTheDocument()
    expect(screen.getByText('WIN RATE')).toBeInTheDocument()
  })

  it('muestra columnas de etapas del kanban', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('DISCOVERY')).toBeInTheDocument()
    })
    expect(screen.getByText('QUALIFICATION')).toBeInTheDocument()
    expect(screen.getByText('PROPOSAL')).toBeInTheDocument()
    expect(screen.getByText('NEGOTIATION')).toBeInTheDocument()
  })

  it('muestra nombre de oportunidades', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Implementacion GRC Enterprise')).toBeInTheDocument()
    })
    expect(screen.getByText('Auditoria ISO 27001')).toBeInTheDocument()
  })

  it('muestra boton Nueva Op.', () => {
    renderPage()
    expect(screen.getByText('Nueva Op.')).toBeInTheDocument()
  })
})
