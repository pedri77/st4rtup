import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AnalyticsPage from './AnalyticsPage'

const mockOverview = {
  campaigns: { total: 10, active: 3, by_channel: {}, by_status: {}, by_objective: {} },
  budget: { total: 5000, active: 2000, cpl_avg: 25, by_channel: {} },
  goals: { leads_goal: 100, mqls_goal: 50 },
  assets: { total: 8, visits: 500, conversions: 25, conversion_rate: 5, clicks: 100, impressions: 2000, ctr: 5, by_type: {}, by_language: {}, top: [] },
  counts: { funnels: 2, utm_codes: 15, calendar_events: 4, alerts_total: 7, alerts_unread: 3 },
  targeting: { by_persona: {}, by_regulatory: {} },
  top_campaigns: [],
  alerts_by_type: {},
}

vi.mock('@/services/api', () => ({
  marketingAnalyticsApi: {
    overview: vi.fn(() => Promise.resolve({ data: mockOverview })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AnalyticsPage', () => {
  it('muestra el titulo Analytics mientras carga', () => {
    renderPage()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('muestra el titulo Marketing Analytics tras cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Marketing Analytics')).toBeInTheDocument()
    })
  })

  it('muestra la descripcion del dashboard', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Dashboard unificado de métricas/)).toBeInTheDocument()
    })
  })

  it('muestra las KPI cards tras cargar datos', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/Campañas/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Presupuesto/).length).toBeGreaterThan(0)
    })
  })
})
