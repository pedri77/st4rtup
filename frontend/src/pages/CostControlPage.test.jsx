import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CostControlPage from './CostControlPage'

vi.mock('@/services/api', () => ({
  costControlApi: {
    summary: vi.fn(() => Promise.resolve({ data: {
      total_spent: 120.5,
      total_cap: 500,
      total_pct: 24,
      tools: [
        { tool_name: 'OpenAI', spent: 80, cap: 300, pct: 27, level: 'ok', events: 150 },
        { tool_name: 'Retell AI', spent: 40.5, cap: 200, pct: 20, level: 'ok', events: 30 },
      ],
    } })),
    predictive: vi.fn(() => Promise.resolve({ data: { predictions: [] } })),
    roi: vi.fn(() => Promise.resolve({ data: null })),
  },
}))

vi.mock('@/components/Sparkline', () => ({
  default: () => <div data-testid="sparkline" />,
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CostControlPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CostControlPage', () => {
  it('muestra el título Cost Control', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Cost Control')).toBeInTheDocument()
    })
  })

  it('muestra loading mientras carga', () => {
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra resumen de costes después de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Gasto mes')).toBeInTheDocument()
      expect(screen.getByText('Cap total')).toBeInTheDocument()
      expect(screen.getByText('Consumido')).toBeInTheDocument()
    })
  })

  it('muestra herramientas con gasto actual', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Retell AI')).toBeInTheDocument()
    })
  })

  it('muestra niveles de guardrail', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument()
      expect(screen.getByText('Aviso')).toBeInTheDocument()
      expect(screen.getByText('Corte')).toBeInTheDocument()
    })
  })
})
