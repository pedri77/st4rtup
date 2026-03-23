import { describe, it, expect, vi } from 'vitest'

// Mock supabase before importing api
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

// Suppress the console.log from api.js during tests
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('api service', () => {
  let api, leadsApi, dashboardApi, visitsApi, emailsApi, opportunitiesApi, contactsApi

  beforeEach(async () => {
    const module = await import('./api.js')
    api = module.default
    leadsApi = module.leadsApi
    dashboardApi = module.dashboardApi
    visitsApi = module.visitsApi
    emailsApi = module.emailsApi
    opportunitiesApi = module.opportunitiesApi
    contactsApi = module.contactsApi
  })

  it('axios instance tiene baseURL configurada', () => {
    // baseURL comes from VITE_API_URL env var or falls back to '/api/v1'
    expect(api.defaults.baseURL).toBeDefined()
    expect(api.defaults.baseURL).toMatch(/\/api\/v1$/)
  })

  it('axios instance tiene Content-Type JSON por defecto', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('tiene interceptores de request configurados', () => {
    // axios stores interceptors internally; request interceptors should have at least 1
    expect(api.interceptors.request.handlers.length).toBeGreaterThanOrEqual(1)
  })

  it('tiene interceptores de response configurados', () => {
    expect(api.interceptors.response.handlers.length).toBeGreaterThanOrEqual(1)
  })

  it('leadsApi expone los metodos CRUD esperados', () => {
    expect(typeof leadsApi.list).toBe('function')
    expect(typeof leadsApi.get).toBe('function')
    expect(typeof leadsApi.create).toBe('function')
    expect(typeof leadsApi.update).toBe('function')
    expect(typeof leadsApi.delete).toBe('function')
  })

  it('dashboardApi expone getStats y calendar', () => {
    expect(typeof dashboardApi.getStats).toBe('function')
    expect(typeof dashboardApi.calendar).toBe('function')
  })

  it('contactsApi expone getByLead y stats', () => {
    expect(typeof contactsApi.getByLead).toBe('function')
    expect(typeof contactsApi.stats).toBe('function')
  })
})
