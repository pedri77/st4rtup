import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Theme toggle for public (unauthenticated) pages.
 * Uses the same localStorage key as the authenticated store
 * so the preference carries over after login.
 */
const STORAGE_KEY = 'user-preferences'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored?.state?.theme) return stored.state.theme
  } catch { /* ignore */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeTogglePublic() {
  const [theme, setTheme] = useState(getInitialTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Sync into the Zustand-persisted shape so authenticated pages pick it up
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { state: {}, version: 0 }
      stored.state.theme = theme
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch { /* ignore */ }

    // Apply CSS custom properties for public pages
    const palette = theme === 'dark'
      ? { bg: '#0F172A', card: '#1E293B', muted: '#334155', border: '#475569', fg: '#F1F5F9', fgMuted: '#94A3B8', primary: '#3B82F6', accent: '#F59E0B', destructive: '#EF4444', success: '#10B981', warning: '#F59E0B' }
      : { bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B', primary: '#1E6FD9', accent: '#F5820B', destructive: '#EF4444', success: '#10B981', warning: '#F59E0B' }
    const root = document.documentElement
    Object.entries(palette).forEach(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
      root.style.setProperty(`--color-${prop}`, v)
    })
  }, [theme])

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{
        padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
        backgroundColor: isDark ? '#334155' : '#F1F5F9',
        color: isDark ? '#F59E0B' : '#64748B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
