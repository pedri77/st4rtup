import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import WebhooksPage from './WebhooksPage'

vi.mock('@/services/api', () => ({
  webhooksApi: {
    subscriptions: vi.fn(() => Promise.resolve({ data: [] })),
    availableEvents: vi.fn(() => Promise.resolve({ data: { events: ['lead.created', 'opportunity.won'] } })),
    createSubscription: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'Test' } })),
    deleteSubscription: vi.fn(() => Promise.resolve({ data: { deleted: true } })),
    testSubscription: vi.fn(() => Promise.resolve({ data: { success: true, status_code: 200 } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('WebhooksPage', () => {
  it('renderiza titulo WEBHOOKS', () => {
    renderPage()
    expect(screen.getByText('WEBHOOKS ZAPIER / MAKE')).toBeInTheDocument()
  })

  it('muestra boton nueva suscripcion', () => {
    renderPage()
    expect(screen.getByText('Nueva suscripcion')).toBeInTheDocument()
  })

  it('muestra URL de webhook entrante', () => {
    renderPage()
    expect(screen.getByText(/POST/)).toBeInTheDocument()
  })

  it('abre formulario al clickar nueva suscripcion', () => {
    renderPage()
    fireEvent.click(screen.getByText('Nueva suscripcion'))
    expect(screen.getByText('Nuevo webhook saliente')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mi webhook Zapier')).toBeInTheDocument()
  })
})
