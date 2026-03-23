import '@testing-library/jest-dom'

// Supabase requiere localStorage — disponible en jsdom
// Zustand persist usa localStorage internamente
Object.defineProperty(window, 'localStorage', {
  value: (() => {
    let store = {}
    return {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => { store[key] = String(value) },
      removeItem: (key) => { delete store[key] },
      clear: () => { store = {} },
    }
  })(),
  writable: true,
})

// URL.createObjectURL no existe en jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()
