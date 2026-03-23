import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import PlaybookPage from './PlaybookPage'

vi.mock('@/services/api', () => ({
  playbookApi: {
    list: vi.fn(() => Promise.resolve({ data: { tactics: [
      { id: '1', name: 'SEO GRC', description: 'Posicionamiento orgánico', category: 'inbound', status: 'active', channel: 'web', responsible: 'Marketing', leads_generated: 12, metrics_target: {}, metrics_actual: {} },
      { id: '2', name: 'Cold Email', description: 'Email en frío a CISOs', category: 'outbound', status: 'planned', channel: 'email', responsible: 'SDR', leads_generated: 0, metrics_target: {}, metrics_actual: {} },
    ] } })),
    stats: vi.fn(() => Promise.resolve({ data: { stats: [
      { tactic_id: '1', leads_generated: 12 },
    ] } })),
    seed: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    exportPDF: vi.fn(() => Promise.resolve({ data: new Blob() })),
  },
}))

vi.mock('@/components/Breadcrumbs', () => ({
  default: ({ items }) => <nav data-testid="breadcrumbs">{items.map(i => i.label).join(' > ')}</nav>,
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlaybookPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PlaybookPage', () => {
  it('muestra el título Sales Playbook', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Sales Playbook')).toBeInTheDocument()
    })
  })

  it('muestra tácticas después de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('SEO GRC')).toBeInTheDocument()
      expect(screen.getByText('Cold Email')).toBeInTheDocument()
    })
  })

  it('muestra filtros de categoría', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/Todas/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Inbound/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Outbound/).length).toBeGreaterThan(0)
    })
  })

  it('muestra contadores de activas y leads', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Activas')).toBeInTheDocument()
      expect(screen.getByText('Leads generados')).toBeInTheDocument()
    })
  })

  it('muestra sección explicativa', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Cómo funciona el Sales Playbook/)).toBeInTheDocument()
    })
  })
})
