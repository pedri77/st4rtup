import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

export default function NotFoundPage() {
  const T = useThemeColors()
  const location = useLocation()
  const isAppRoute = location.pathname.startsWith('/app/')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: T.bg,
      fontFamily: "'Inter', sans-serif",
      padding: 24,
      color: T.fg,
    }}>
      <Helmet>
        <title>Página no encontrada (404) | st4rtup</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{
          fontSize: 96,
          fontWeight: 800,
          color: T.primary,
          lineHeight: 1,
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>404</div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: T.fg,
          marginBottom: 12,
        }}>Esta página no existe</h1>

        <p style={{
          fontSize: 16,
          color: T.fgMuted,
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          La página que buscas no está disponible o ha sido movida.
          {' '}
          <code style={{
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: T.muted,
            borderRadius: 4,
            fontSize: 13,
            color: T.fgMuted,
            marginTop: 8,
          }}>{location.pathname}</code>
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={isAppRoute ? '/app/dashboard' : '/'} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            backgroundColor: T.primary,
            color: 'white',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          }}>
            <Home size={16} />
            {isAppRoute ? 'Ir al dashboard' : 'Ir al inicio'}
          </Link>

          <button onClick={() => window.history.back()} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            backgroundColor: T.card,
            color: T.primary,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
          }}>
            <ArrowLeft size={16} />
            Volver
          </button>

          {!isAppRoute && (
            <Link to="/blog" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: T.card,
              color: T.primary,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
            }}>
              <Search size={16} />
              Ver el blog
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
