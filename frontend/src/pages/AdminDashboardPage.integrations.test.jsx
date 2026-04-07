import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks for the many external imports of AdminDashboardPage ─────
// Mock the default `api` client. AdminDashboardPage calls api.get(...) for
// many URLs; we dispatch on the URL and return JSON fixtures only for
// the ones we care about (integration-health). Everything else returns {}.
const mockApi = {
  get: vi.fn((url) => {
    if (url === '/admin/integration-health') {
      return Promise.resolve({
        data: {
          orgs: [
            {
              org_id: 'aaaaaaaa-1111-1111-1111-111111111111',
              name: 'Acme Test Co',
              slug: 'acme-test',
              plan: 'growth',
              integrations: {
                gmail: { connected: true, email: 'ops@acme.test', token_age_days: 3 },
                gsc: { connected: false, site_url: null, token_age_days: null },
                linkedin: { connected: true, name: 'Acme HQ', token_age_days: 45 },
              },
              automations: { total: 33, active: 22, failing_24h: 2 },
            },
            {
              org_id: 'dddddddd-2222-2222-2222-222222222222',
              name: 'Empty Co',
              slug: 'empty',
              plan: 'starter',
              integrations: {
                gmail: { connected: false, email: null, token_age_days: null },
              },
              automations: { total: 0, active: 0, failing_24h: 0 },
            },
          ],
          summary: { total_orgs: 2, orgs_with_oauth: 1, active_automations: 22 },
        },
      })
    }
    // Everything else: return empty success
    return Promise.resolve({ data: {} })
  }),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
}
vi.mock('@/services/api', () => ({ default: mockApi }))

// Mock react-hot-toast (AdminDashboardPage uses it for mutations)
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock recharts to prevent heavy rendering
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}))

// Import AFTER the mocks are set up
import AdminDashboardPage from './AdminDashboardPage'

function renderAt(tab = 'integrations') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/admin?tab=${tab}`]}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminDashboardPage — Integraciones tab', () => {
  beforeEach(() => {
    mockApi.get.mockClear()
  })

  it('renders the tab header', async () => {
    renderAt('integrations')
    expect(await screen.findByText('Salud de Integraciones')).toBeInTheDocument()
  })

  it('fetches /admin/integration-health when the tab is active', async () => {
    renderAt('integrations')
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/admin/integration-health')
    })
  })

  it('shows the three summary cards with the totals', async () => {
    renderAt('integrations')
    // Wait for the data to load, then assert the summary values appear.
    await waitFor(() => {
      expect(screen.getByText('Orgs totales')).toBeInTheDocument()
    })
    expect(screen.getByText('Orgs con OAuth')).toBeInTheDocument()
    expect(screen.getByText('Automations activas')).toBeInTheDocument()
    // 2 total orgs from fixture
    expect(screen.getByText('2')).toBeInTheDocument()
    // 22 active automations from fixture
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('renders per-org cards with name and automation counts', async () => {
    renderAt('integrations')
    expect(await screen.findByText('Acme Test Co')).toBeInTheDocument()
    expect(screen.getByText('Empty Co')).toBeInTheDocument()
    // Active/total auto badge
    expect(screen.getByText('22/33 auto')).toBeInTheDocument()
    expect(screen.getByText('0/0 auto')).toBeInTheDocument()
  })

  it('flags orgs with failing automations in the last 24h', async () => {
    renderAt('integrations')
    expect(await screen.findByText('2 failing')).toBeInTheDocument()
  })

  it('does not fetch integration-health when a different tab is active', async () => {
    renderAt('overview')
    // Give React Query a tick
    await new Promise((r) => setTimeout(r, 50))
    const calls = mockApi.get.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('/admin/integration-health')
  })
})
