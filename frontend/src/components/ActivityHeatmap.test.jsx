import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActivityHeatmap from './ActivityHeatmap'

// Mock the API
vi.mock('@/services/api', () => ({
  dashboardApi: {
    heatmap: vi.fn(() => Promise.resolve({
      data: {
        heatmap: { '2026-03-01': 5, '2026-03-02': 12, '2026-03-10': 3 },
        breakdown: { emails: {}, visits: {}, actions: {}, leads: {} },
        start_date: '2025-09-21',
        total_days: 3,
        max_activity: 12,
      }
    })),
  },
}))

function renderWithQuery(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ActivityHeatmap', () => {
  it('renderiza sin errores', () => {
    const { container } = renderWithQuery(<ActivityHeatmap months={3} />)
    expect(container).toBeDefined()
  })

  it('muestra leyenda Menos/Mas', async () => {
    renderWithQuery(<ActivityHeatmap months={3} />)
    // Wait for query to resolve
    await vi.waitFor(() => {
      expect(screen.getByText('Menos')).toBeInTheDocument()
      expect(screen.getByText('Mas')).toBeInTheDocument()
    })
  })
})
