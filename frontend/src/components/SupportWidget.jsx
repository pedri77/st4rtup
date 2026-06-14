import { useEffect } from 'react'

export default function SupportWidget({ email }) {
  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://empresaautomatizada.es/support-widget.js'
    s.defer = true
    s.setAttribute('data-project', 'st4rtup')
    s.setAttribute('data-email', email || '')
    s.setAttribute('data-color', '#1E6FD9')
    s.setAttribute('data-lang', 'es')
    document.body.appendChild(s)
    return () => { try { document.body.removeChild(s) } catch {} }
  }, [email])

  useEffect(() => {
    if (email && window.supportWidgetSetEmail) window.supportWidgetSetEmail(email)
  }, [email])

  return null
}
