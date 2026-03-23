import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ChatPage from './ChatPage'

// scrollIntoView not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

vi.mock('@/services/api', () => ({
  chatApi: {
    providers: vi.fn(() => Promise.resolve({ data: [
      { id: 'openai', name: 'OpenAI', configured: true, models: ['gpt-4o', 'gpt-4o-mini'] },
    ] })),
    conversations: vi.fn(() => Promise.resolve({ data: [] })),
    createConversation: vi.fn(() => Promise.resolve({ data: { id: '1', title: 'Nueva' } })),
    getConversation: vi.fn(() => Promise.resolve({ data: { title: 'Test', messages: [] } })),
    deleteConversation: vi.fn(() => Promise.resolve({ data: {} })),
    sendMessage: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ChatPage', () => {
  it('muestra el título Chat IA', () => {
    renderPage()
    expect(screen.getByText('Chat IA')).toBeInTheDocument()
  })

  it('muestra botón nueva conversación', () => {
    renderPage()
    expect(screen.getByText('Nueva conversacion')).toBeInTheDocument()
  })

  it('muestra el título Asistente de Ventas IA cuando no hay conversación seleccionada', () => {
    renderPage()
    expect(screen.getByText('Asistente de Ventas IA')).toBeInTheDocument()
  })

  it('muestra campo de entrada de mensaje', () => {
    renderPage()
    expect(screen.getByLabelText('Mensaje de chat')).toBeInTheDocument()
  })

  it('muestra estado vacío sin conversaciones', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No hay conversaciones')).toBeInTheDocument()
    })
  })
})
