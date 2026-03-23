import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CalendarPage from './CalendarPage'

vi.mock('@/services/api', () => ({
  dashboardApi: {
    calendar: vi.fn(() => Promise.resolve({
      data: [
        { type: 'visit', title: 'Visita cliente ABC', date: '2026-03-22T10:00:00', lead: 'ABC Corp' },
        { type: 'action', title: 'Enviar informe', date: '2026-03-22T14:00:00', status: 'pending' },
      ],
    })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CalendarPage', () => {
  it('renderiza el titulo Calendario de Actividad', () => {
    renderPage()
    expect(screen.getByText('Calendario de Actividad')).toBeInTheDocument()
  })

  it('muestra la descripcion del calendario', () => {
    renderPage()
    expect(screen.getByText('Visitas, acciones, oportunidades y eventos de marketing')).toBeInTheDocument()
  })

  it('muestra los filtros de tipo de evento', () => {
    renderPage()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Visitas')).toBeInTheDocument()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('muestra los dias de la semana', () => {
    renderPage()
    expect(screen.getByText('Lun')).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
    expect(screen.getByText('Vie')).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
  })

  it('muestra boton Hoy', () => {
    renderPage()
    expect(screen.getByText('Hoy')).toBeInTheDocument()
  })
})
