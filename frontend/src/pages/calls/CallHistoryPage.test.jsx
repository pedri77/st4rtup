import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CallHistoryPage from './CallHistoryPage'

vi.mock('@/services/api', () => ({
  callsApi: {
    list: vi.fn(() => Promise.resolve({
      data: {
        items: [
          {
            id: 'c1',
            lead_id: 'lead-0001-abcd-efgh',
            estado: 'finalizada',
            resultado: 'demo_agendada',
            fecha_inicio: '2026-03-20T10:30:00Z',
            duracion_segundos: 245,
            score_antes: 40,
            score_despues: 65,
            coste_eur: 0.125,
            resumen_ia: 'Llamada exitosa',
            notas_agente: 'Interesado en demo',
            siguiente_accion: 'Enviar propuesta',
            sentiment: 'positivo',
            sentiment_score: 0.8,
            turnos_conversacion: 12,
            latencia_media_ms: 450,
            minutos_facturados: 4.08,
            transcripcion: 'Hola, buenos dias...',
          },
          {
            id: 'c2',
            lead_id: 'lead-0002-abcd-efgh',
            estado: 'fallida',
            resultado: 'sin_respuesta',
            fecha_inicio: '2026-03-21T14:00:00Z',
            duracion_segundos: 30,
            score_antes: 20,
            score_despues: 20,
            coste_eur: 0.015,
            resumen_ia: null,
            notas_agente: null,
            siguiente_accion: null,
            sentiment: null,
            sentiment_score: null,
            turnos_conversacion: null,
            latencia_media_ms: null,
            minutos_facturados: null,
            transcripcion: null,
          },
        ],
        total: 2,
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
        <CallHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CallHistoryPage', () => {
  it('renderiza titulo Historial de Llamadas', () => {
    renderPage()
    expect(screen.getByText('Historial de Llamadas')).toBeInTheDocument()
  })

  it('muestra filas de llamadas tras carga', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/lead-000/).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/finalizada/).length).toBeGreaterThan(0)
  })

  it('muestra total de llamadas registradas', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('2 llamadas registradas')).toBeInTheDocument()
    })
  })

  it('muestra cabeceras de tabla', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Fecha')).toBeInTheDocument()
    })
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Resultado')).toBeInTheDocument()
    expect(screen.getByText('Duracion')).toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay llamadas', async () => {
    const { callsApi } = await import('@/services/api')
    callsApi.list.mockImplementationOnce(() =>
      Promise.resolve({ data: { items: [], total: 0, pages: 0 } })
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CallHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('No hay llamadas registradas')).toBeInTheDocument()
    })
  })
})
