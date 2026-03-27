import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeTogglePublic() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('st4rtup-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('st4rtup-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      style={{
        padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
        backgroundColor: dark ? '#334155' : '#F1F5F9',
        color: dark ? '#F59E0B' : '#64748B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
