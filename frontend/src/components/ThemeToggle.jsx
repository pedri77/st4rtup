import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

const DARK_CSS = `
  .theme-dark { filter: invert(1) hue-rotate(180deg); }
  .theme-dark img, .theme-dark video, .theme-dark canvas,
  .theme-dark .recharts-wrapper, .theme-dark .recharts-surface,
  .theme-dark [data-no-invert] { filter: invert(1) hue-rotate(180deg); }
`

let injected = false
function injectCSS() {
  if (injected) return
  const s = document.createElement('style')
  s.textContent = DARK_CSS
  document.head.appendChild(s)
  injected = true
}

export default function ThemeToggle() {
  const { theme, setPreferences } = useUserPreferencesStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    injectCSS()
    document.documentElement.classList.toggle('theme-dark', isDark)
  }, [isDark])

  return (
    <button
      onClick={() => setPreferences({ theme: isDark ? 'light' : 'dark' })}
      data-no-invert
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: '0.5rem',
        background: 'none', border: '1px solid #E2E8F0',
        color: '#64748B', cursor: 'pointer',
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
