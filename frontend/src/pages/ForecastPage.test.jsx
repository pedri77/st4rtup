import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ForecastPage from './ForecastPage'

vi.mock('@/services/api', () => ({
  gtmApi: {
    forecast: vi.fn(() => Promise.resolve({
      data: {
        current_arr: 120000,
        current_pipeline: 350000,
        win_rate: 32,
        arr_12m: 280000,
        forecast: [
          { label: 'Abr 2026', projected_arr: 125000, projected_mrr: 10417 },
          { label: 'May 2026', projected_arr: 135000, projected_mrr: 11250 },
          { label: 'Jun 2026', projected_arr: 148000, projected_mrr: 12333 },
        ],
      },
    })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ForecastPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ForecastPage', () => {
  it('renderiza titulo Revenue Forecast', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('Revenue Forecast').length).toBeGreaterThan(0)
    })
  })

  it('muestra estadisticas actuales despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ARR actual')).toBeInTheDocument()
    })
    expect(screen.getByText('Pipeline activo')).toBeInTheDocument()
    expect(screen.getByText('Win rate')).toBeInTheDocument()
    expect(screen.getByText('ARR proyectado 12m')).toBeInTheDocument()
  })

  it('muestra valores de forecast', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('32%')).toBeInTheDocument()
    })
  })

  it('muestra tabla de proyeccion mensual', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Abr 2026')).toBeInTheDocument()
    })
    expect(screen.getByText('May 2026')).toBeInTheDocument()
    expect(screen.getByText('Jun 2026')).toBeInTheDocument()
  })

  it('muestra encabezado de proyeccion 12 meses', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Próximos 12 meses/)).toBeInTheDocument()
    })
  })
})
