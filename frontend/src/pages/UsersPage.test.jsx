import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import UsersPage from './UsersPage'

vi.mock('@/services/api', () => ({
  usersApi: {
    list: vi.fn(() => Promise.resolve({ data: { items: [] } })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UsersPage', () => {
  it('muestra el titulo Gestion de Usuarios', () => {
    renderPage()
    expect(screen.getByText('Gestion de Usuarios')).toBeInTheDocument()
  })

  it('muestra boton Invitar Usuario', () => {
    renderPage()
    expect(screen.getByText('Invitar Usuario')).toBeInTheDocument()
  })

  it('muestra las tarjetas de estadisticas', () => {
    renderPage()
    expect(screen.getByText('Total Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Activos')).toBeInTheDocument()
    expect(screen.getByText('Administradores')).toBeInTheDocument()
    expect(screen.getByText('Comerciales')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay usuarios', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No hay usuarios registrados')).toBeInTheDocument()
    })
  })
})
