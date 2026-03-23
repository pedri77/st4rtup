import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SEOPage from './SEOPage'

vi.mock('@/services/api', () => ({
  seoApi: {
    listKeywords: vi.fn(() => Promise.resolve({ data: { items: [], total: 0 } })),
    createKeyword: vi.fn(() => Promise.resolve({ data: {} })),
    updateKeyword: vi.fn(() => Promise.resolve({ data: {} })),
    deleteKeyword: vi.fn(() => Promise.resolve({ data: {} })),
    seedKeywords: vi.fn(() => Promise.resolve({ data: { created: 0 } })),
    listRankings: vi.fn(() => Promise.resolve({ data: { items: [], total: 0 } })),
    listGeoPages: vi.fn(() => Promise.resolve({ data: { items: [], total: 0 } })),
    listNapAudits: vi.fn(() => Promise.resolve({ data: { items: [], total: 0 } })),
    listGeoRankings: vi.fn(() => Promise.resolve({ data: { items: [], total: 0 } })),
    dashboard: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SEOPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SEOPage', () => {
  it('muestra el titulo SEO & Geo-SEO', () => {
    renderPage()
    expect(screen.getByText('SEO & Geo-SEO')).toBeInTheDocument()
  })

  it('muestra la descripcion de la pagina', () => {
    renderPage()
    expect(screen.getByText(/Keywords, rankings, geo pages/)).toBeInTheDocument()
  })

  it('muestra las pestañas de navegacion', () => {
    renderPage()
    expect(screen.getByText('Keywords')).toBeInTheDocument()
    expect(screen.getByText('Rankings')).toBeInTheDocument()
    expect(screen.getByText('Geo Pages')).toBeInTheDocument()
    expect(screen.getByText('NAP Audit')).toBeInTheDocument()
  })

  it('muestra la pestaña Keywords activa por defecto', () => {
    renderPage()
    const keywordsTab = screen.getByText('Keywords')
    expect(keywordsTab).toBeInTheDocument()
  })
})
