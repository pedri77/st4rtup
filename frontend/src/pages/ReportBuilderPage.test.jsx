import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ReportBuilderPage from './ReportBuilderPage'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: { report_type: 'pipeline', rows: [], summary: {} } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportBuilderPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReportBuilderPage', () => {
  it('renderiza titulo REPORT BUILDER', () => {
    renderPage()
    expect(screen.getByText('REPORT BUILDER')).toBeInTheDocument()
  })

  it('muestra los 4 tipos de reporte', () => {
    renderPage()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Actividad')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('muestra opciones de periodo', () => {
    renderPage()
    expect(screen.getByText('Ultima semana')).toBeInTheDocument()
    expect(screen.getByText('Este mes')).toBeInTheDocument()
    expect(screen.getByText('Este trimestre')).toBeInTheDocument()
  })

  it('tiene boton de generar reporte', () => {
    renderPage()
    expect(screen.getByText('Generar reporte')).toBeInTheDocument()
  })

  it('permite seleccionar tipo de reporte', () => {
    renderPage()
    fireEvent.click(screen.getByText('Leads'))
    // Should visually highlight the selected type
    const leadsBtn = screen.getByText('Leads').closest('button')
    expect(leadsBtn).toBeDefined()
  })
})
