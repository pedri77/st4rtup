import { create } from 'zustand'

/**
 * Store de UI global — controla la visibilidad de paneles/modales
 * que pueden abrirse desde cualquier parte de la app.
 */
export const useUIStore = create((set) => ({
  searchOpen: false,
  notificationsOpen: false,

  setSearchOpen: (open) => set({ searchOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
}))
