import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ActionsKanbanPage from './ActionsKanbanPage'

vi.mock('@/services/api', () => ({
  actionsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: '1', title: 'Tarea pendiente', status: 'pending', priority: 'high', due_date: '2099-12-31' },
          { id: '2', title: 'Tarea en curso', status: 'in_progress', priority: 'medium', due_date: '2099-12-31' },
          { id: '3', title: 'Tarea completada', status: 'completed', priority: 'low', due_date: '2024-06-01' },
        ],
      },
    })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ActionsKanbanPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ActionsKanbanPage', () => {
  it('renderiza el titulo Acciones — Kanban', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acciones — Kanban')).toBeInTheDocument()
    })
  })

  it('muestra las 4 columnas del kanban', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument()
      expect(screen.getByText('En curso')).toBeInTheDocument()
      expect(screen.getByText('Completada')).toBeInTheDocument()
      expect(screen.getByText('Vencida')).toBeInTheDocument()
    })
  })

  it('muestra enlace a vista lista', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Vista lista')).toBeInTheDocument()
    })
  })

  it('muestra las acciones en sus columnas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Tarea pendiente')).toBeInTheDocument()
      expect(screen.getByText('Tarea en curso')).toBeInTheDocument()
      expect(screen.getByText('Tarea completada')).toBeInTheDocument()
    })
  })
})
