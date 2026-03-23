import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ClientsPage from './ClientsPage'

vi.mock('@/services/api', () => ({
  contactsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', full_name: 'Juan Perez', email: 'juan@acme.com', phone: '+34600111222', job_title: 'CTO', lead_name: 'Acme Corp', lead_id: 'l1', role_type: 'cto', influence_level: 'decision_maker', relationship_status: 'champion' },
          { id: '2', full_name: 'Maria Lopez', email: 'maria@tech.com', phone: '+34600333444', job_title: 'CISO', lead_name: 'TechSolutions SL', lead_id: 'l2', role_type: 'ciso', influence_level: 'influencer', relationship_status: 'supporter' },
        ],
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      },
    })),
    stats: vi.fn(() => Promise.resolve({
      data: { total: 2, by_role: {}, by_influence: {}, by_relationship: {} },
    })),
    create: vi.fn(() => Promise.resolve({ data: { id: '3' } })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [
    { id: 'l1', company_name: 'Acme Corp' },
    { id: 'l2', company_name: 'TechSolutions SL' },
  ] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClientsPage', () => {
  it('renderiza titulo Contactos y Stakeholders', () => {
    renderPage()
    expect(screen.getByText('Contactos y Stakeholders')).toBeInTheDocument()
  })

  it('muestra subtitulo mapa de poder', () => {
    renderPage()
    expect(screen.getByText(/Mapa de poder y contactos clave/)).toBeInTheDocument()
  })

  it('muestra contactos despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    })
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
  })

  it('muestra boton para crear nuevo contacto', () => {
    renderPage()
    expect(screen.getByText('Nuevo Contacto')).toBeInTheDocument()
  })

  it('muestra opciones de vista lista y power map', () => {
    renderPage()
    expect(screen.getByText('Lista')).toBeInTheDocument()
    expect(screen.getByText('Power Map')).toBeInTheDocument()
  })
})
