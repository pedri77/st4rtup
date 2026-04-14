import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

export default function InstallPrompt() {
  const T = useThemeColors()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Only show if not dismissed recently (7 days)
      const dismissed = localStorage.getItem('pwa_dismissed')
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShow(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('pwa_dismissed', String(Date.now()))
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 45, backgroundColor: T.card, border: `1px solid ${T.primary}`,
      borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 340,
    }}>
      <Download size={20} color={T.primary} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.fg, margin: 0 }}>Instalar St4rtup</p>
        <p style={{ fontSize: 11, color: T.fgMuted, margin: '2px 0 0' }}>Acceso rapido desde tu escritorio</p>
      </div>
      <button onClick={handleInstall} style={{ padding: '6px 14px', backgroundColor: T.primary, color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Instalar
      </button>
      <button aria-label="Cerrar" onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <X size={16} color={T.fgMuted} />
      </button>
    </div>
  )
}
