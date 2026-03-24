import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('theme-light')
    root.classList.remove('theme-dark')
  } else {
    root.classList.remove('theme-light')
    root.classList.add('theme-dark')
  }
}

// Inject CSS once — handles all current and future elements
const LIGHT_MODE_CSS = `
  .theme-light {
    filter: invert(1) hue-rotate(180deg);
    background-color: #fff;
  }
  .theme-light img,
  .theme-light video,
  .theme-light canvas,
  .theme-light .recharts-wrapper,
  .theme-light .recharts-surface,
  .theme-light [data-no-invert] {
    filter: invert(1) hue-rotate(180deg);
  }
`

let styleInjected = false
function injectLightModeCSS() {
  if (styleInjected) return
  const style = document.createElement('style')
  style.id = 'theme-light-css'
  style.textContent = LIGHT_MODE_CSS
  document.head.appendChild(style)
  styleInjected = true
}

export default function ThemeToggle() {
  const { theme, setPreferences } = useUserPreferencesStore()
  const isDark = theme !== 'light'

  useEffect(() => {
    injectLightModeCSS()
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    injectLightModeCSS()
    applyTheme(theme)
  }, [])

  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    setPreferences({ theme: next })
  }

  return (
    <button
      onClick={toggle}
      data-no-invert
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: '0.5rem',
        background: 'none', border: '1px solid #E2E8F0',
        color: '#0F172A', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
