import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookies_accepted')) {
      setTimeout(() => setShow(true), 2000)
    }
  }, [])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, padding: '16px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 -2px 10px rgba(0,0,0,.05)' }}>
      <span style={{ color: '#334155', fontSize: '.85rem' }}>
        Utilizamos cookies esenciales para el funcionamiento del servicio.
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { localStorage.setItem('cookies_accepted', 'true'); setShow(false) }}
          style={{ padding: '6px 20px', borderRadius: 6, border: 'none', background: '#1E6FD9', color: '#FFFFFF', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer' }}>
          Aceptar
        </button>
        <Link to="/cookies" style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E2E8F0', color: '#64748B', textDecoration: 'none', fontSize: '.85rem' }}>
          Más info
        </Link>
      </div>
    </div>
  )
}
