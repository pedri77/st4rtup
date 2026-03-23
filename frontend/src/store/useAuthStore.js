import { create } from 'zustand'

/**
 * Store de perfil de usuario — cachea los datos del backend (/users/me/profile)
 * para evitar re-renders innecesarios del AuthContext.
 * No persiste en localStorage (session-scoped).
 */
export const useAuthStore = create((set) => ({
  userProfile: null,
  role: null,
  isProfileLoaded: false,

  setProfile: (profile) =>
    set({
      userProfile: profile,
      role: profile?.role ?? null,
      isProfileLoaded: true,
    }),

  clearProfile: () =>
    set({
      userProfile: null,
      role: null,
      isProfileLoaded: false,
    }),
}))
