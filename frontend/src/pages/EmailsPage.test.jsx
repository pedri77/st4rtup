import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import EmailsPage from './EmailsPage'

vi.mock('@/services/api', () => ({
  emailsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', subject: 'Propuesta comercial St4rtup', to_email: 'juan@acme.com', lead_name: 'Acme Corp', lead_id: 'l1', status: 'sent', is_follow_up: false, sent_at: '2026-03-15T09:00:00Z', created_at: '2026-03-14' },
          { id: '2', subject: 'Seguimiento demo', to_email: 'maria@tech.com', lead_name: 'TechSolutions SL', lead_id: 'l2', status: 'opened', is_follow_up: true, follow_up_sequence: 2, sent_at: '2026-03-18T11:00:00Z', opened_at: '2026-03-18T14:00:00Z', created_at: '2026-03-17' },
          { id: '3', subject: 'Info adicional SaaS', to_email: 'carlos@dataflow.com', lead_name: 'DataFlow SA', lead_id: 'l3', status: 'draft', is_follow_up: false, created_at: '2026-03-20' },
        ],
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: { id: '4' } })),
    send: vi.fn(() => Promise.resolve({ data: { id: '3', status: 'sent' } })),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  USE_MOCK_DATA: false,
  mockEmails: { items: [] },
  mockDelay: () => Promise.resolve(),
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EmailsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EmailsPage', () => {
  it('renderiza titulo Emails', () => {
    renderPage()
    expect(screen.getByText('Emails')).toBeInTheDocument()
  })

  it('muestra subtitulo centro de comunicaciones', () => {
    renderPage()
    expect(screen.getByText('Centro de comunicaciones')).toBeInTheDocument()
  })

  it('muestra boton Nuevo Email', () => {
    renderPage()
    expect(screen.getByText('Nuevo Email')).toBeInTheDocument()
  })

  it('muestra filas de emails despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Propuesta comercial St4rtup')).toBeInTheDocument()
    })
    expect(screen.getByText('Seguimiento demo')).toBeInTheDocument()
    expect(screen.getByText('Info adicional SaaS')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay emails', async () => {
    const { emailsApi } = await import('@/services/api')
    emailsApi.list.mockImplementationOnce(() => Promise.resolve({ data: { items: [] } }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <EmailsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('Sin emails')).toBeInTheDocument()
    })
  })
})
