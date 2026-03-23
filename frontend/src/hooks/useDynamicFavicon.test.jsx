import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useDynamicFavicon from './useDynamicFavicon'

const mockCtx = {
  fillStyle: '', font: '', textAlign: '', textBaseline: '',
  fillText: vi.fn(), fill: vi.fn(), beginPath: vi.fn(),
  arc: vi.fn(), roundRect: vi.fn(),
}

// Mock createElement to return a mock canvas when 'canvas' is requested
const originalCreateElement = document.createElement.bind(document)
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'canvas') {
    return {
      width: 32, height: 32,
      getContext: () => mockCtx,
      toDataURL: () => 'data:image/png;base64,mock',
    }
  }
  return originalCreateElement(tag)
})

vi.mock('@/services/api', () => ({
  dashboardApi: {
    getStats: vi.fn(() => Promise.resolve({
      data: { actions_overdue: 3 }
    })),
  },
}))

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useDynamicFavicon', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    mockCtx.fillText.mockClear()
  })

  it('se ejecuta sin errores', () => {
    const { result } = renderHook(() => useDynamicFavicon(), { wrapper })
    expect(result).toBeDefined()
  })

  it('crea un canvas para el favicon', async () => {
    renderHook(() => useDynamicFavicon(), { wrapper })
    // The hook creates a canvas on mount
    await vi.waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('canvas')
    })
  })
})
