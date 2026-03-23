import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useLeadsSelect } from './useLeadsSelect'
import { leadsApi } from '@/services/api'

vi.mock('@/mocks/mockData', () => ({
  USE_MOCK_DATA: false,
  mockLeads: {
    items: [
      { id: '1', company_name: 'Empresa Mock A', contact_email: 'a@mock.com' },
      { id: '2', company_name: 'Empresa Mock B', contact_email: 'b@mock.com' },
    ],
  },
  mockDelay: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/services/api', () => ({
  leadsApi: {
    list: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLeadsSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve lista vacía mientras carga', () => {
    vi.mocked(leadsApi.list).mockReturnValue(new Promise(() => {})) // nunca resuelve

    const { result } = renderHook(() => useLeadsSelect(), { wrapper: createWrapper() })
    expect(result.current.leads).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('devuelve los leads cuando el API responde correctamente', async () => {
    const mockItems = [
      { id: '1', company_name: 'Acme Corp' },
      { id: '2', company_name: 'TechCo' },
    ]
    vi.mocked(leadsApi.list).mockResolvedValue({ data: { items: mockItems } })

    const { result } = renderHook(() => useLeadsSelect(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.leads).toEqual(mockItems)
    expect(leadsApi.list).toHaveBeenCalledWith({ page_size: 100 })
  })

  it('cae al fallback mock cuando el API falla', async () => {
    vi.mocked(leadsApi.list).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useLeadsSelect(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.leads).toHaveLength(2)
    expect(result.current.leads[0].company_name).toBe('Empresa Mock A')
  })

  it('llama al API con page_size 100', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({ data: { items: [] } })

    renderHook(() => useLeadsSelect(), { wrapper: createWrapper() })

    await waitFor(() => expect(leadsApi.list).toHaveBeenCalled())
    expect(leadsApi.list).toHaveBeenCalledWith({ page_size: 100 })
  })
})
