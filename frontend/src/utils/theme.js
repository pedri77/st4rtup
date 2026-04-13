/**
 * Theme-aware color tokens.
 * Drop-in replacement for the hardcoded T objects in every page.
 * Usage: import { useThemeColors } from '@/utils/theme'
 *        const T = useThemeColors()
 *
 * This makes the existing inline style={{ backgroundColor: T.card }}
 * automatically switch between light and dark palettes.
 */
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

const LIGHT = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  border: '#E2E8F0',
  fg: '#0F172A',
  fgMuted: '#64748B',
  cyan: '#1E6FD9',
  purple: '#F5820B',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
}

const DARK = {
  bg: '#0F172A',
  card: '#1E293B',
  muted: '#334155',
  border: '#475569',
  fg: '#F1F5F9',
  fgMuted: '#94A3B8',
  cyan: '#3B82F6',
  purple: '#F59E0B',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
}

export function useThemeColors() {
  const theme = useUserPreferencesStore((s) => s.theme)
  return theme === 'dark' ? DARK : LIGHT
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
