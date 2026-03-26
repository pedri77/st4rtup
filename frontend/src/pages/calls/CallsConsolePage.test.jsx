import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CallsConsolePage from './CallsConsolePage'

vi.mock('@/services/api', () => ({
  callsApi: {
    stats: vi.fn(() => Promise.resolve({
      data: {
        total: 15,
        finalizadas: 10,
        avg_duration_seconds: 120,
        total_cost_eur: 5.25,
        retell_configured: false,
      },
    })),
    initiate: vi.fn(() => Promise.resolve({ data: {} })),
    complete: vi.fn(() => Promise.resolve({ data: {} })),
  },
  callPromptsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: 'p1', nombre: 'Prospeccion SaaS', objetivo: 'prospecting', version: 1 },
        ],
        total: 1,
        pages: 1,
      },
    })),
  },
  leadsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: 'l1', company_name: 'Acme Corp', contact_name: 'Juan Perez' },
        ],
        total: 1,
        pages: 1,
      },
    })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CallsConsolePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CallsConsolePage', () => {
  it('renderiza titulo Consola de Llamadas IA', () => {
    renderPage()
    expect(screen.getByText('Consola de Llamadas IA')).toBeInTheDocument()
  })

  it('muestra panel de nueva llamada', () => {
    renderPage()
    expect(screen.getByText('Nueva llamada')).toBeInTheDocument()
    expect(screen.getByText('Iniciar llamada')).toBeInTheDocument()
  })

  it('muestra estado sin llamada activa', () => {
    renderPage()
    expect(screen.getByText('Sin llamada activa')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un lead y un prompt para iniciar una llamada')).toBeInTheDocument()
  })

  it('muestra aviso Retell no configurado', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Retell AI no configurado/)).toBeInTheDocument()
    })
  })

  it('muestra enlaces de navegacion', () => {
    renderPage()
    expect(screen.getByText('Prompts')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Historial')).toBeInTheDocument()
  })
})
