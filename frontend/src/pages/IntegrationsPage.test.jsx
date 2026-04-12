import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import IntegrationsPage from './IntegrationsPage'

vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    envStatus: vi.fn(() => Promise.resolve({ data: {} })),
    testIntegration: vi.fn(() => Promise.resolve({ data: { success: true } })),
    gmailOAuthStatus: vi.fn(() => Promise.resolve({ data: null })),
  },
}))

vi.mock('@/components/RoleGuard', () => ({
  useHasRole: vi.fn(() => ({
    hasRole: vi.fn(() => true),
    currentRole: 'admin',
  })),
}))

// Mock toast to capture messages
const toastMock = { success: vi.fn(), error: vi.fn() }
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Re-import to get hoisted mock references
beforeEach(async () => {
  const mod = await import('react-hot-toast')
  toastMock.success = mod.default.success
  toastMock.error = mod.default.error
})

function renderPage(initialUrl = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <IntegrationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('IntegrationsPage', () => {
  it('muestra el titulo Integraciones mientras carga', () => {
    renderPage()
    expect(screen.getByText('Integraciones')).toBeInTheDocument()
  })

  it('muestra la descripcion de la pagina', () => {
    renderPage()
    expect(screen.getByText(/Configura proveedores de email/)).toBeInTheDocument()
  })

  it('muestra el titulo Integraciones tras cargar datos', async () => {
    renderPage()
    await waitFor(() => {
      const headings = screen.getAllByText('Integraciones')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('muestra las pestañas de configuracion tras cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })
})

describe('IntegrationsPage — OAuth CSRF state validation', () => {
  let replaceStateSpy

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  afterEach(() => {
    replaceStateSpy.mockRestore()
    sessionStorage.clear()
  })

  it('rejects OAuth callback when state does not match', async () => {
    // Simulate: sessionStorage has one state, URL has a different one
    sessionStorage.setItem('oauth_state', 'expected-state-abc')

    // Override window.location.search for the component
    const originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?oauth=success&state=wrong-state-xyz', pathname: '/integrations' },
    })

    renderPage()

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining('CSRF')
      )
    })

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: originalSearch },
    })
  })

  it('rejects OAuth callback when no state stored in session', async () => {
    // No sessionStorage state set — should reject
    const originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?oauth=success&state=some-state', pathname: '/integrations' },
    })

    renderPage()

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining('CSRF')
      )
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: originalSearch },
    })
  })

  it('accepts OAuth callback when state matches', async () => {
    sessionStorage.setItem('oauth_state', 'valid-state-123')

    const originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?oauth=success&state=valid-state-123', pathname: '/integrations' },
    })

    renderPage()

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Gmail OAuth2')
      )
    })
    // State should have been removed from sessionStorage
    expect(sessionStorage.getItem('oauth_state')).toBeNull()

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: originalSearch },
    })
  })
})
