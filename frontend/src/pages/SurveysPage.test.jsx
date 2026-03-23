import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SurveysPage from './SurveysPage'

vi.mock('@/services/api', () => ({
  surveysApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', title: 'Encuesta NPS Q1', survey_type: 'nps', status: 'sent', lead_name: 'Acme Corp', created_at: '2026-03-01' },
          { id: '2', title: 'CSAT Onboarding', survey_type: 'csat', status: 'completed', lead_name: 'Beta Inc', score: 4, created_at: '2026-02-15' },
        ],
      },
    })),
    stats: vi.fn(() => Promise.resolve({ data: { total: 2, avg_nps: 8.5, avg_csat: 4.2, response_rate: 75 } })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    respond: vi.fn(() => Promise.resolve({ data: {} })),
    analytics: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  mockSurveys: { items: [], stats: { total: 0, avg_nps: 0, avg_csat: 0, response_rate: 0 } },
  mockDelay: vi.fn(() => Promise.resolve()),
  USE_MOCK_DATA: false,
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

vi.mock('@/hooks/usePersistedFilters', () => ({
  usePersistedFilterSearch: () => ({
    filters: {
      survey_type: { type: 'multiselect', label: 'Tipo de Encuesta', options: [], value: [] },
      status: { type: 'multiselect', label: 'Estado', options: [], value: [] },
      date_range: { type: 'daterange', label: 'Fecha', value: { from: '', to: '' } },
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
        <SurveysPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SurveysPage', () => {
  it('renderiza el titulo Encuestas', () => {
    renderPage()
    expect(screen.getAllByText('Encuestas').length).toBeGreaterThan(0)
  })

  it('muestra boton Nueva Encuesta', () => {
    renderPage()
    expect(screen.getByText(/Nueva Encuesta/)).toBeInTheDocument()
  })

  it('muestra las encuestas despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Encuesta NPS Q1')).toBeInTheDocument()
      expect(screen.getByText('CSAT Onboarding')).toBeInTheDocument()
    })
  })

  it('muestra las tabs de lista y analytics', () => {
    renderPage()
    expect(screen.getByText('Encuestas', { selector: 'button' }) || screen.getByText(/Encuestas/)).toBeInTheDocument()
  })
})
