import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ContentPipelinePage from './ContentPipelinePage'

vi.mock('@/services/api', () => ({
  contentPipelineApi: {
    run: vi.fn(() => Promise.resolve({ data: { stages: {}, status: 'completed' } })),
    keywords: vi.fn(() => Promise.resolve({ data: { output: 'test keywords' } })),
    draft: vi.fn(() => Promise.resolve({ data: { output: 'test draft' } })),
    seo: vi.fn(() => Promise.resolve({ data: { output: 'test seo' } })),
    meta: vi.fn(() => Promise.resolve({ data: { output: 'test meta' } })),
  },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ContentPipelinePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ContentPipelinePage', () => {
  it('renderiza titulo CONTENT PIPELINE', () => {
    renderPage()
    expect(screen.getByText('CONTENT PIPELINE')).toBeInTheDocument()
  })

  it('muestra los 4 agentes', () => {
    renderPage()
    expect(screen.getByText('Keyword Agent')).toBeInTheDocument()
    expect(screen.getByText('Draft Agent')).toBeInTheDocument()
    expect(screen.getByText('SEO Agent')).toBeInTheDocument()
    expect(screen.getByText('Meta Agent')).toBeInTheDocument()
  })

  it('tiene campo de tema del articulo', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/implementar ENS/i)).toBeInTheDocument()
  })

  it('tiene boton ejecutar pipeline', () => {
    renderPage()
    expect(screen.getByText('Ejecutar pipeline completo')).toBeInTheDocument()
  })

  it('boton deshabilitado sin topic', () => {
    renderPage()
    const btn = screen.getByText('Ejecutar pipeline completo').closest('button')
    expect(btn.style.cursor).toBe('not-allowed')
  })

  it('muestra flow con botones individuales de agentes', () => {
    renderPage()
    expect(screen.getByText('Keyword')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('SEO')).toBeInTheDocument()
    expect(screen.getByText('Meta')).toBeInTheDocument()
  })
})
