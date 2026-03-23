import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CallsDashboardPage from './CallsDashboardPage'

vi.mock('@/services/api', () => ({
  callsApi: {
    stats: vi.fn(() => Promise.resolve({
      data: {
        total: 42,
        finalizadas: 30,
        activas: 2,
        avg_duration_seconds: 185,
        total_cost_eur: 12.50,
        retell_configured: true,
        resultados: {
          demo_agendada: 8,
          interesado: 10,
          propuesta_solicitada: 3,
          callback: 5,
          sin_respuesta: 12,
          no_interesado: 4,
          buzon: 0,
        },
      },
    })),
  },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CallsDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CallsDashboardPage', () => {
  it('renderiza titulo Dashboard Llamadas IA', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Dashboard Llamadas IA')).toBeInTheDocument()
    })
  })

  it('muestra KPIs con datos', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
    expect(screen.getByText('Total llamadas')).toBeInTheDocument()
    expect(screen.getByText('Tasa conversion')).toBeInTheDocument()
    expect(screen.getByText('Duracion media')).toBeInTheDocument()
    expect(screen.getByText('Coste total')).toBeInTheDocument()
    expect(screen.getByText('Activas ahora')).toBeInTheDocument()
  })

  it('muestra coste total formateado', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('12.50€')).toBeInTheDocument()
    })
  })

  it('muestra estado Retell AI conectado', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Retell AI conectado')).toBeInTheDocument()
    })
  })

  it('muestra enlaces de navegacion', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Consola')).toBeInTheDocument()
    })
    expect(screen.getByText('Historial')).toBeInTheDocument()
  })
})
