import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import PipelineKanbanPage from './PipelineKanbanPage'

vi.mock('@/services/api', () => ({
  opportunitiesApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: 'opp-1', name: 'Deal Alpha', lead_name: 'Acme Corp', stage: 'discovery', value: 30000, probability: 20, expected_close_date: '2024-06-01' },
          { id: 'opp-2', name: 'Deal Beta', lead_name: 'TechSolutions', stage: 'qualification', value: 45000, probability: 40, expected_close_date: '2024-05-15' },
          { id: 'opp-3', name: 'Deal Gamma', lead_name: 'DataFlow', stage: 'proposal', value: 60000, probability: 65, expected_close_date: '2024-04-20' },
        ],
      },
    })),
    update: vi.fn(),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PipelineKanbanPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PipelineKanbanPage', () => {
  it('renderiza titulo PIPELINE KANBAN', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PIPELINE KANBAN')).toBeInTheDocument()
    })
  })

  it('muestra columnas de etapas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Discovery')).toBeInTheDocument()
    })
    expect(screen.getByText('Qualification')).toBeInTheDocument()
    expect(screen.getByText('Proposal')).toBeInTheDocument()
    expect(screen.getByText('Negotiation')).toBeInTheDocument()
    expect(screen.getByText('Won')).toBeInTheDocument()
    expect(screen.getByText('Lost')).toBeInTheDocument()
  })

  it('muestra tarjetas de oportunidades', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Deal Alpha')).toBeInTheDocument()
    })
    expect(screen.getByText('Deal Beta')).toBeInTheDocument()
    expect(screen.getByText('Deal Gamma')).toBeInTheDocument()
  })

  it('muestra enlace a vista tabla', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Vista tabla')).toBeInTheDocument()
    })
  })

  it('muestra valores en EUR de las oportunidades', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/30\.000/).length).toBeGreaterThan(0)
    })
  })
})
