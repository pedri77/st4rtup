import { useEffect } from 'react'
import { LIGHT } from '@/utils/theme'

/**
 * Forces light theme on public pages.
 * Resets data-theme and CSS custom properties to light palette.
 * On unmount (navigating to /app), lets the user preference take over.
 */
export default function ForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', 'light')

    // Apply light CSS vars
    root.style.setProperty('--color-bg', LIGHT.bg)
    root.style.setProperty('--color-card', LIGHT.card)
    root.style.setProperty('--color-muted', LIGHT.muted)
    root.style.setProperty('--color-border', LIGHT.border)
    root.style.setProperty('--color-fg', LIGHT.fg)
    root.style.setProperty('--color-fg-muted', LIGHT.fgMuted)
    root.style.setProperty('--color-primary', LIGHT.primary)
    root.style.setProperty('--color-accent', LIGHT.accent)
    root.style.setProperty('--color-destructive', LIGHT.destructive)
    root.style.setProperty('--color-success', LIGHT.success)
    root.style.setProperty('--color-warning', LIGHT.warning)
  }, [])

  return null
}
