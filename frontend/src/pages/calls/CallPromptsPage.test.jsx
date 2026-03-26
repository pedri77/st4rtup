import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CallPromptsPage from './CallPromptsPage'

vi.mock('@/services/api', () => ({
  callPromptsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          {
            id: 'p1',
            nombre: 'Prospeccion SaaS',
            objetivo: 'prospecting',
            persona_target: ['CEO', 'DPO'],
            regulatory_focus: ['Growth'],
            idioma: 'es',
            voz_id: '',
            system_prompt: 'Eres un agente de ventas...',
            primer_mensaje: 'Hola {{lead_nombre}}',
            variables_dinamicas: ['lead_nombre', 'lead_empresa'],
            objetivo_llamada: 'Agendar demo',
            duracion_objetivo_min: 5,
            max_duracion_min: 15,
            activo: true,
            version: 1,
          },
          {
            id: 'p2',
            nombre: 'Seguimiento B2B',
            objetivo: 'followup_demo',
            persona_target: ['CTO'],
            regulatory_focus: ['B2B'],
            idioma: 'es',
            voz_id: '',
            system_prompt: 'Eres un agente de seguimiento...',
            primer_mensaje: 'Hola {{lead_nombre}}, le llamo para...',
            variables_dinamicas: ['lead_nombre'],
            objetivo_llamada: 'Cerrar demo',
            duracion_objetivo_min: 5,
            max_duracion_min: 10,
            activo: true,
            version: 2,
          },
        ],
        total: 2,
        pages: 1,
      },
    })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    seed: vi.fn(() => Promise.resolve({ data: { detail: 'Seed completado' } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CallPromptsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CallPromptsPage', () => {
  it('renderiza titulo Prompts de Llamadas', () => {
    renderPage()
    expect(screen.getByText('Prompts de Llamadas')).toBeInTheDocument()
  })

  it('muestra lista de prompts tras carga', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Prospeccion SaaS')).toBeInTheDocument()
    })
    expect(screen.getByText('Seguimiento B2B')).toBeInTheDocument()
  })

  it('muestra botones de accion', () => {
    renderPage()
    expect(screen.getByText('Nuevo prompt')).toBeInTheDocument()
    expect(screen.getByText('Seed growth')).toBeInTheDocument()
  })

  it('muestra filtros de objetivo', () => {
    renderPage()
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('Prospeccion')).toBeInTheDocument()
    expect(screen.getByText('Seguimiento demo')).toBeInTheDocument()
    expect(screen.getByText('Cierre')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay prompts', async () => {
    const { callPromptsApi } = await import('@/services/api')
    callPromptsApi.list.mockImplementationOnce(() =>
      Promise.resolve({ data: { items: [], total: 0, pages: 0 } })
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CallPromptsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByText(/No hay prompts/)).toBeInTheDocument()
    })
  })
})
