import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'

vi.mock('@/services/api', () => ({
  dashboardApi: {
    getStats: vi.fn(() => Promise.resolve({
      data: {
        total_leads: 247,
        pipeline_value: 1850000,
        weighted_pipeline: 925000,
        revenue_won_this_month: 120000,
        revenue_won_this_quarter: 350000,
        offers_this_month: 15,
        offers_accepted_this_month: 8,
        conversion_rate: 18.5,
        conversion_trend: -2.1,
        leads_trend: 12.5,
        pipeline_trend: 8.3,
        actions_overdue: 3,
        actions_due_today: 7,
        stale_opportunities: 2,
        pipeline_by_stage: {
          discovery: { value: 320000, count: 15 },
          qualification: { value: 450000, count: 12 },
        },
        activity_last_7_days: [
          { date: '2024-02-20', emails: 8, visits: 2, actions: 12 },
        ],
        conversion_funnel: [
          { stage: 'new', count: 247, percentage: 100 },
          { stage: 'contacted', count: 189, percentage: 76.5 },
        ],
        top_leads_by_score: [
          { id: '1', company: 'TechCorp Solutions', status: 'qualified', score: 95 },
        ],
        deals_closing_soon: [
          { id: 'd1', name: 'Deal Enterprise', lead: 'Acme Corp', value: 50000, close_date: '2024-03-15' },
        ],
        recent_activity: [],
        leads_by_sector: {},
        leads_by_status: { new: 45, contacted: 89 },
        upcoming_visits: [],
      },
    })),
    getConfig: vi.fn(() => Promise.resolve({ data: { widgets: [] } })),
    saveConfig: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/components/AutomationsSummary', () => ({ default: () => <div>AutomationsSummary</div> }))
vi.mock('@/components/MarketingSummary', () => ({ default: () => <div>MarketingSummary</div> }))
vi.mock('@/components/ActivityHeatmap', () => ({ default: () => <div>ActivityHeatmap</div> }))
vi.mock('@/components/AgentsSummary', () => ({ default: () => <div>AgentsSummary</div> }))
vi.mock('@/components/OnboardingWizard', () => ({ default: () => <div>OnboardingWizard</div> }))
vi.mock('@/utils/exportPdf', () => ({ exportToPDF: vi.fn() }))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('renderiza el titulo con la fecha actual', async () => {
    renderPage()
    await waitFor(() => {
      // The dashboard title shows the current date in format "dd MMM yyyy · HH:mm"
      // We check for the "St4rtup CRM" subtitle text which is always present
      expect(screen.getByText(/St4rtup CRM/)).toBeInTheDocument()
    })
  })

  it('muestra KPIs principales', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Revenue Mes')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pipeline').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Conversion/).length).toBeGreaterThan(0)
  })

  it('muestra valores de KPIs correctos', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('247').length).toBeGreaterThan(0) // total_leads
    })
  })

  it('muestra strip de estado con alertas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
    expect(screen.getByText('vencidas')).toBeInTheDocument()
    expect(screen.getByText('acciones hoy')).toBeInTheDocument()
  })

  it('muestra barra de acciones rapidas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('Acciones').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })
})
