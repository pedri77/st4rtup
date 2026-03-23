import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ReviewsPage from './ReviewsPage'

vi.mock('@/services/api', () => ({
  reviewsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', lead_name: 'Acme Corp', health_score: 85, review_year: 2026, review_month: 3, notes: 'Todo bien', improvements_identified: [] },
          { id: '2', lead_name: 'Beta Inc', health_score: 30, review_year: 2026, review_month: 2, notes: 'Riesgo alto', improvements_identified: ['Mejorar soporte'] },
        ],
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

vi.mock('@/hooks/usePersistedFilters', () => ({
  usePersistedFilterSearch: () => ({
    filters: {
      health_status: { type: 'multiselect', label: 'Estado de Salud', options: [], value: [] },
      has_issues: { type: 'multiselect', label: 'Issues', options: [], value: [] },
      date_range: { type: 'daterange', label: 'Periodo', value: { from: '', to: '' } },
    },
    setFilters: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSavedFilterPresets', () => ({
  useSavedFilterPresets: () => ({
    presets: [],
    savePreset: vi.fn(),
    loadPreset: vi.fn(),
    deletePreset: vi.fn(),
    updatePreset: vi.fn(),
    renamePreset: vi.fn(),
    isCurrentPreset: vi.fn(),
  }),
  hasActiveFilters: () => false,
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReviewsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReviewsPage', () => {
  it('renderiza el titulo Seguimiento Mensual', () => {
    renderPage()
    expect(screen.getByText('Seguimiento Mensual')).toBeInTheDocument()
  })

  it('muestra boton Nuevo Review', () => {
    renderPage()
    expect(screen.getByText('Nuevo Review')).toBeInTheDocument()
  })

  it('muestra las stats cards', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Total Reviews')).toBeInTheDocument()
      expect(screen.getByText('Salud Promedio')).toBeInTheDocument()
      expect(screen.getByText('Cuentas Criticas')).toBeInTheDocument()
      expect(screen.getByText('Mejoras Identificadas')).toBeInTheDocument()
    })
  })

  it('muestra los reviews despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Beta Inc')).toBeInTheDocument()
    })
  })
})
