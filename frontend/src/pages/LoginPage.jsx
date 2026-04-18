import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { LogIn, Rocket, Mail, ArrowLeft, CheckCircle, BarChart3, Zap, Shield, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app')
    } catch (err) {
      setError('Credenciales inválidas. Por favor, verifica tu email y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!email) { setError('Introduce tu email para recuperar la contraseña.'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Error al enviar el email de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white placeholder:text-gray-400"

  return (
    <div className="public-page min-h-dvh flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>St4rtup</span>
          </Link>

          {resetMode ? (
            resetSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email enviado</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                  Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones.
                </p>
                <button onClick={() => { setResetMode(false); setResetSent(false) }}
                  className="text-blue-600 font-semibold text-sm hover:underline flex items-center gap-1 mx-auto">
                  <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recuperar contraseña</h1>
                <p className="text-gray-500 mb-8">Te enviaremos un enlace para restablecer tu contraseña.</p>

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      required disabled={loading} className={inputClass} placeholder="tu@email.com" autoComplete="email" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </form>
                <button onClick={() => { setResetMode(false); setError('') }}
                  className="text-sm text-gray-400 hover:text-gray-600 mt-6 flex items-center gap-1 mx-auto transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
                </button>
              </>
            )
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Bienvenido de nuevo</h1>
              <p className="text-gray-500 mb-8">Inicia sesión para acceder a tu CRM.</p>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required disabled={loading} placeholder="tu@email.com" autoComplete="email" className={inputClass} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                    <button type="button" onClick={() => { setResetMode(true); setError('') }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">¿Olvidaste tu contraseña?</button>
                  </div>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      required disabled={loading} placeholder="••••••••" autoComplete="current-password" className={inputClass} style={{ paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              <p className="text-sm text-gray-500 text-center mt-8">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-blue-600 font-semibold hover:underline">Crear cuenta gratis</Link>
              </p>
            </>
          )}

          <p className="text-xs text-gray-400 text-center mt-10">© {new Date().getFullYear()} St4rtup. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Right: Hero visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E6FD9, #3B82F6, #1E40AF)' }}>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-white w-full">
          <h2 className="text-4xl font-bold mb-4 text-center leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Gestiona tus ventas<br />con inteligencia.
          </h2>
          <p className="text-blue-100 text-center mb-12 max-w-md text-lg">
            Pipeline visual, 22 automatizaciones y dashboard con IA. Todo en un solo lugar.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {[
              { icon: BarChart3, text: 'Dashboard con 14 gráficos en tiempo real', color: '#34D399' },
              { icon: Zap, text: '22 automatizaciones listas para activar', color: '#FBBF24' },
              { icon: Shield, text: 'Datos seguros con cifrado end-to-end', color: '#A78BFA' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${f.color}20` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <span className="text-sm font-medium text-white/90">{f.text}</span>
              </div>
            ))}
          </div>

          {/* CRM preview mockup */}
          <div className="mt-12 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <div className="flex gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
              </div>
              <video src="/videos/showcase-dashboard.mp4" autoPlay muted loop playsInline
                className="w-full rounded-lg" style={{ opacity: 0.85 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
