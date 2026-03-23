import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ActionsPage from './ActionsPage'

vi.mock('@/services/api', () => ({
  actionsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', title: 'Llamar a cliente', status: 'pending', priority: 'high', due_date: '2099-12-31', assigned_to: 'David' },
          { id: '2', title: 'Enviar propuesta', status: 'in_progress', priority: 'medium', due_date: '2099-12-31', assigned_to: 'Ana' },
          { id: '3', title: 'Revisar contrato', status: 'completed', priority: 'low', due_date: '2024-01-01', completed_date: '2024-01-02' },
        ],
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/mocks/mockData', () => ({
  mockActions: { items: [] },
  mockDelay: vi.fn(() => Promise.resolve()),
  USE_MOCK_DATA: false,
}))

vi.mock('@/hooks/useLeadsSelect', () => ({
  useLeadsSelect: () => ({ leads: [] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ActionsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ActionsPage', () => {
  it('renderiza el titulo Acciones', () => {
    renderPage()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
  })

  it('muestra el subtitulo descriptivo', () => {
    renderPage()
    expect(screen.getByText('Task management & tracking')).toBeInTheDocument()
  })

  it('muestra boton Nueva Accion', () => {
    renderPage()
    expect(screen.getByText('Nueva Accion')).toBeInTheDocument()
  })

  it('muestra las columnas del kanban despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument()
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })
  })

  it('muestra las acciones despues de cargar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Llamar a cliente')).toBeInTheDocument()
      expect(screen.getByText('Enviar propuesta')).toBeInTheDocument()
      expect(screen.getByText('Revisar contrato')).toBeInTheDocument()
    })
  })
})
