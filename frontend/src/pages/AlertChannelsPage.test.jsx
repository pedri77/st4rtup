import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AlertChannelsPage from './AlertChannelsPage'

vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    testIntegration: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AlertChannelsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AlertChannelsPage', () => {
  it('renderiza titulo CANALES DE ALERTA', () => {
    renderPage()
    expect(screen.getByText('CANALES DE ALERTA')).toBeInTheDocument()
  })

  it('muestra los 4 canales', () => {
    renderPage()
    expect(screen.getByText('Telegram')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Microsoft Teams')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp Business')).toBeInTheDocument()
  })

  it('muestra seccion de eventos', () => {
    renderPage()
    expect(screen.getByText('Eventos que generan alertas')).toBeInTheDocument()
  })

  it('muestra categorias de eventos', () => {
    renderPage()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
    expect(screen.getByText('Emails')).toBeInTheDocument()
  })

  it('cada canal tiene boton Guardar y Test', () => {
    renderPage()
    const saveButtons = screen.getAllByText('Guardar')
    const testButtons = screen.getAllByText('Test')
    expect(saveButtons.length).toBe(4)
    expect(testButtons.length).toBe(4)
  })
})
