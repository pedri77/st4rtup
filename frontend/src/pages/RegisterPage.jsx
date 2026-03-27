import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserPlus, Eye, EyeOff, Building2, ArrowRight, CheckCircle, Rocket } from 'lucide-react'
import confetti from 'canvas-confetti'

function SuccessScreen() {
  return (
    <div className="text-center py-6 animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cuenta creada!</h2>
      <p className="text-gray-500 mb-6">Te estamos preparando tu espacio de trabajo...</p>
      <div className="flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="h-12 bg-blue-100 rounded-lg" />
    </div>
  )
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formReady, setFormReady] = useState(true)
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const fireConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#1E6FD9', '#F5820B', '#10B981', '#8B5CF6'] })
    setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 } }), 250)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, { full_name: fullName, company_name: companyName })
      setSuccess(true)
      fireConfetti()
      setTimeout(() => navigate('/app/onboarding'), 2000)
    } catch (err) {
      console.error('Register error:', err)
      if (err.message?.includes('already registered')) {
        setError('Este email ya está registrado. ¿Quieres iniciar sesión?')
      } else {
        setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google auth error:', err)
      setError('Error al conectar con Google. Inténtalo de nuevo.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="St4rtup" className="h-24 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Crea tu cuenta</h1>
          <p className="text-gray-500">Empieza gratis. Sin tarjeta de crédito.</p>
        </div>

        {/* Register Card */}
        <div className="bg-white backdrop-blur-sm rounded-xl border border-gray-200 p-8 shadow-xl">
          {success ? <SuccessScreen /> : !formReady ? <FormSkeleton /> : (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 px-4 py-3 rounded-lg mb-6">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Google OAuth */}
              <button type="button" onClick={handleGoogle} disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 mb-6">
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span className="font-medium text-gray-700">{googleLoading ? 'Conectando...' : 'Continuar con Google'}</span>
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-sm text-gray-400">o regístrate con email</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                  <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    required disabled={loading} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: 14, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1E6FD9'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,111,217,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }} placeholder="María García" autoComplete="name" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email de trabajo</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required disabled={loading} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: 14, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1E6FD9'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,111,217,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }} placeholder="maria@miempresa.com" autoComplete="email" />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="w-4 h-4 inline mr-1 -mt-0.5" /> Nombre de la empresa
                  </label>
                  <input id="company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    required disabled={loading} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: 14, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1E6FD9'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,111,217,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }} placeholder="Mi Startup S.L." autoComplete="organization" />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                      style={{ width: '100%', padding: '10px 14px', paddingRight: 40, borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: 14, outline: 'none' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1E6FD9'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,111,217,0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }} placeholder="Mínimo 6 caracteres" autoComplete="new-password" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !mt-6">
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creando cuenta...</>
                  ) : (
                    <><UserPlus className="w-5 h-5" /> Crear cuenta gratis</>
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Al registrarte, aceptas nuestros{' '}
                <Link to="/terms" className="text-blue-500 hover:underline">Términos</Link> y{' '}
                <Link to="/privacy" className="text-blue-500 hover:underline">Política de privacidad</Link>.
              </p>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Iniciar sesión <ArrowRight className="w-3.5 h-3.5 inline" />
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} St4rtup. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
