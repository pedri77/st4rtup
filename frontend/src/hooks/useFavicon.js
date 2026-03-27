import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const FAVICONS = {
  app: '/favicon.svg',
  landing: '/favicon.svg',
}

export default function useFavicon() {
  const { pathname } = useLocation()

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link')
    link.rel = 'icon'

    if (pathname.startsWith('/app')) {
      // In-app: use notification-aware favicon (handled by Layout.jsx)
      return
    }

    // Public pages: always use default
    link.href = FAVICONS.landing
    if (!link.parentNode) document.head.appendChild(link)

    // Update page title based on route
    const titles = {
      '/': 'St4rtup — CRM de ventas para startups',
      '/login': 'Iniciar sesión — St4rtup',
      '/register': 'Crear cuenta — St4rtup',
      '/pricing': 'Precios — St4rtup',
      '/blog': 'Blog — St4rtup',
      '/demo': 'Demo — St4rtup',
      '/help': 'Ayuda — St4rtup',
    }
    const title = titles[pathname]
    if (title) document.title = title
  }, [pathname])
}
