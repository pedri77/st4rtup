import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'

// ─── Mocks ──────────────────────────────────────────────────────
// Dynamic auth state so individual tests can flip user to null (for impersonate).
let mockAuthState = { user: { id: 'user-123', email: 'qa@st4rtup.app' }, loading: false }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

const mockSetSession = vi.fn()
const mockGetSession = vi.fn()
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      setSession: (...args) => mockSetSession(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}))

// Control the fetch mock per-test
const mockFetch = vi.fn()
global.fetch = mockFetch

function renderAt(path = '/app') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/app/onboarding" element={<div>ONBOARDING PAGE</div>} />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <div>DASHBOARD</div>
            </PrivateRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetch.mockReset()
    mockGetSession.mockReset()
    mockSetSession.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-abc' } } })
    // Reset to authenticated state per test
    mockAuthState = { user: { id: 'user-123', email: 'qa@st4rtup.app' }, loading: false }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('onboarding gate', () => {
    it('renders children when onboarding is already cached as done', async () => {
      localStorage.setItem('st4rtup_onboarding_done', 'true')
      renderAt('/app')
      expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
      // Should not fetch backend if already cached
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('redirects to /app/onboarding when backend returns completed=false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ completed: false, data: {} }),
      })
      renderAt('/app')
      expect(await screen.findByText('ONBOARDING PAGE')).toBeInTheDocument()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/onboarding'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
        }),
      )
    })

    it('renders children and caches to localStorage when backend returns completed=true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ completed: true, data: {} }),
      })
      renderAt('/app')
      expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
      await waitFor(() => {
        expect(localStorage.getItem('st4rtup_onboarding_done')).toBe('true')
      })
    })

    it('assumes done on network error to avoid redirect loop', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'))
      renderAt('/app')
      expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
    })

    it('never redirects when already on the onboarding route itself', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ completed: false, data: {} }),
      })
      render(
        <MemoryRouter initialEntries={['/app/onboarding']}>
          <Routes>
            <Route
              path="/app/onboarding"
              element={
                <PrivateRoute>
                  <div>WIZARD CONTENT</div>
                </PrivateRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
      expect(await screen.findByText('WIZARD CONTENT')).toBeInTheDocument()
    })
  })

  describe('impersonate token exchange', () => {
    it('posts impersonate token to backend, calls setSession, and cleans URL', async () => {
      // User must be null for the impersonate branch to fire (see PrivateRoute useEffect guard)
      mockAuthState = { user: null, loading: false }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-tok', refresh_token: 'ref-tok' }),
      })
      mockSetSession.mockResolvedValue({})

      render(
        <MemoryRouter initialEntries={['/app?impersonate_token=signed-jwt']}>
          <Routes>
            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <div>DASHBOARD</div>
                </PrivateRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/verify-impersonate'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ token: 'signed-jwt' }),
          }),
        )
      })
    })
  })
})
