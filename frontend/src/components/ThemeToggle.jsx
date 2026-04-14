import { Moon, Sun } from 'lucide-react'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'
import { useThemeColors } from '@/utils/theme'

export default function ThemeToggle() {
  const { theme, setPreferences } = useUserPreferencesStore()
  const T = useThemeColors()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setPreferences({ theme: isDark ? 'light' : 'dark' })}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: '0.5rem',
        background: 'none', border: `1px solid ${T.border}`,
        color: T.fgMuted, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
