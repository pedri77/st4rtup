import { Moon, Sun } from 'lucide-react'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

export default function ThemeToggle() {
  const { theme, setPreferences } = useUserPreferencesStore()
  const isDark = theme === 'dark'

  const toggle = () => setPreferences({ theme: isDark ? 'light' : 'dark' })

  return (
    <button
      onClick={toggle}
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
