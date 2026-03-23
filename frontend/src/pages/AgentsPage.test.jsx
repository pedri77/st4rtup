import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AgentsPage from './AgentsPage'

vi.mock('@/services/api', () => ({
  agentsApi: {
    list: vi.fn(() => Promise.resolve({ data: { agents: [
      { id: 'AGENT-LEAD-001', name: 'Lead Intelligence', description: 'ICP scoring', status: 'active', model: 'gpt-4o', version: '1.0', cost_per_run: 0.05 },
      { id: 'AGENT-QUALIFY-001', name: 'BANT Qualifier', description: 'Qualificación BANT', status: 'active', model: 'gpt-4o', version: '1.0', cost_per_run: 0.08 },
    ] } })),
    audit: vi.fn(() => Promise.resolve({ data: { entries: [] } })),
    scoreLeadICP: vi.fn(() => Promise.resolve({ data: {} })),
    qualifyCall: vi.fn(() => Promise.resolve({ data: {} })),
    generateProposal: vi.fn(() => Promise.resolve({ data: {} })),
    analyzeCustomer: vi.fn(() => Promise.resolve({ data: {} })),
  },
  leadsApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [] } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AgentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AgentsPage', () => {
  it('muestra el título Agentes IA', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Agentes IA')).toBeInTheDocument()
    })
  })

  it('muestra loading mientras carga', () => {
    renderPage()
    // El componente muestra un spinner Loader2 mientras isLoading es true
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra agentes después de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Lead Intelligence')).toBeInTheDocument()
      expect(screen.getByText('BANT Qualifier')).toBeInTheDocument()
    })
  })

  it('muestra contadores de agentes', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Agentes')).toBeInTheDocument()
      expect(screen.getByText('Activos')).toBeInTheDocument()
    })
  })

  it('muestra descripción de la página', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/4 agentes LangGraph/)).toBeInTheDocument()
    })
  })
})
