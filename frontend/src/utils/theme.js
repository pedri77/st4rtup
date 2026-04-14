/**
 * Theme-aware color tokens.
 * Drop-in replacement for the hardcoded T objects in every page.
 * Usage: import { useThemeColors } from '@/utils/theme'
 *        const T = useThemeColors()
 *
 * This makes the existing inline style={{ backgroundColor: T.card }}
 * automatically switch between light and dark palettes.
 *
 * Also sets CSS custom properties on :root so Tailwind and plain CSS
 * can consume the same palette via var(--color-bg), var(--color-card), etc.
 */
import { useEffect } from 'react'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

const LIGHT = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  border: '#E2E8F0',
  fg: '#0F172A',
  fgMuted: '#64748B',
  primary: '#1E6FD9',
  accent: '#F5820B',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  // Backward-compat aliases (deprecated — migrate to primary/accent)
  get cyan() { return this.primary },
  get purple() { return this.accent },
}

const DARK = {
  bg: '#0F172A',
  card: '#1E293B',
  muted: '#334155',
  border: '#475569',
  fg: '#F1F5F9',
  fgMuted: '#94A3B8',
  primary: '#3B82F6',
  accent: '#F59E0B',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  get cyan() { return this.primary },
  get purple() { return this.accent },
}

/**
 * Apply current palette as CSS custom properties on :root.
 * This allows index.css and Tailwind to consume theme colors.
 */
function applyCSSVars(palette) {
  const root = document.documentElement
  root.style.setProperty('--color-bg', palette.bg)
  root.style.setProperty('--color-card', palette.card)
  root.style.setProperty('--color-muted', palette.muted)
  root.style.setProperty('--color-border', palette.border)
  root.style.setProperty('--color-fg', palette.fg)
  root.style.setProperty('--color-fg-muted', palette.fgMuted)
  root.style.setProperty('--color-primary', palette.primary)
  root.style.setProperty('--color-accent', palette.accent)
  root.style.setProperty('--color-destructive', palette.destructive)
  root.style.setProperty('--color-success', palette.success)
  root.style.setProperty('--color-warning', palette.warning)
}

export function useThemeColors() {
  const theme = useUserPreferencesStore((s) => s.theme)
  const palette = theme === 'dark' ? DARK : LIGHT

  useEffect(() => {
    applyCSSVars(palette)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, palette])

  return palette
}

export { LIGHT, DARK }

// Typography tokens — import these instead of redefining per page
export const fontDisplay = "'Rajdhani', sans-serif"  // Headers, KPIs, nav labels
export const fontMono = "'IBM Plex Mono', monospace"  // Code, stats, technical data

/**
 * Theme-aware constants for common inline styles.
 * Use this hook to get input styles, chart tooltip styles, etc.
 * that automatically adapt to the current theme.
 */
export function useThemeStyles() {
  const T = useThemeColors()
  return {
    inputStyle: {
      backgroundColor: T.muted,
      border: `1px solid ${T.border}`,
      color: T.fg,
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      width: '100%',
      outline: 'none',
    },
    chartTooltipStyle: {
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      color: T.fg,
      fontSize: '12px',
    },
    cardStyle: {
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: '12px',
    },
  }
}
