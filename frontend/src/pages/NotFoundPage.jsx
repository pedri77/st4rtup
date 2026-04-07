import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFoundPage() {
  const location = useLocation()
  const isAppRoute = location.pathname.startsWith('/app/')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      fontFamily: "'Inter', sans-serif",
      padding: 24,
    }}>
      <Helmet>
        <title>Página no encontrada (404) | st4rtup</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{
          fontSize: 96,
          fontWeight: 800,
          color: '#1E6FD9',
          lineHeight: 1,
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>404</div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#1A1A2E',
          marginBottom: 12,
        }}>Esta página no existe</h1>

        <p style={{
          fontSize: 16,
          color: '#64748B',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          La página que buscas no está disponible o ha sido movida.
          {' '}
          <code style={{
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: '#F1F5F9',
            borderRadius: 4,
            fontSize: 13,
            color: '#475569',
            marginTop: 8,
          }}>{location.pathname}</code>
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={isAppRoute ? '/app/dashboard' : '/'} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            backgroundColor: '#1E6FD9',
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
            backgroundColor: 'white',
            color: '#1E6FD9',
            border: '1px solid #E2E8F0',
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
              backgroundColor: 'white',
              color: '#1E6FD9',
              border: '1px solid #E2E8F0',
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
