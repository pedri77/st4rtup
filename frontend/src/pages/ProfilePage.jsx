import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { usersApi } from '@/services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Shield, Calendar, Save, LogOut, Bell, Globe, Moon, Sun, Monitor, Smartphone, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { USE_MOCK_DATA } from '@/mocks/mockData'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'
import { supabase } from '@/lib/supabase'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'



const inputStyle = { backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

function TwoFactorSection() {
  const [mfaState, setMfaState] = useState('idle') // idle | enrolling | verifying | active
  const [qrUri, setQrUri] = useState('')
  const [factorId, setFactorId] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState('')

  // Check if MFA is already enrolled
  useEffect(() => {
    async function checkMFA() {
      const { data } = await supabase.auth.mfa.listFactors()
      if (data?.totp?.length > 0 && data.totp[0].status === 'verified') {
        setMfaState('active')
        setFactorId(data.totp[0].id)
      }
    }
    checkMFA()
  }, [])

  async function enrollMFA() {
    setError('')
    setMfaState('enrolling')
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'St4rtup App' })
    if (err) { setError(err.message); setMfaState('idle'); return }
    setQrUri(data.totp.uri)
    setFactorId(data.id)
    setMfaState('verifying')
  }

  async function verifyMFA() {
    setError('')
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setError('Error creando challenge'); return }
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verifyCode })
    if (err) { setError('Código incorrecto. Inténtalo de nuevo.'); return }
    setMfaState('active')
    toast.success('2FA activado correctamente')
  }

  async function unenrollMFA() {
    if (!confirm('¿Desactivar 2FA? Tu cuenta será menos segura.')) return
    await supabase.auth.mfa.unenroll({ factorId })
    setMfaState('idle')
    setQrUri('')
    setFactorId('')
    toast.success('2FA desactivado')
  }

  const T = useThemeColors()

  return (
    <div className="rounded-lg p-6 mt-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold" style={{ color: T.fg }}>Autenticación de dos factores (2FA)</h3>
        {mfaState === 'active' && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, backgroundColor: `${T.success}15`, color: T.success, fontWeight: 600 }}>✓ Activo</span>}
      </div>
      <p style={{ fontSize: 13, color: T.fgMuted, marginBottom: 16 }}>Protege tu cuenta con un código de verificación desde Google Authenticator o Authy.</p>

      {error && <p role="alert" style={{ fontSize: 12, color: T.destructive, marginBottom: 12, padding: '8px 12px', backgroundColor: `${T.destructive}10`, borderRadius: 8 }}>{error}</p>}

      {mfaState === 'idle' && (
        <button onClick={enrollMFA} style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: T.cyan, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Activar 2FA
        </button>
      )}

      {mfaState === 'enrolling' && <p style={{ color: T.fgMuted, fontSize: 13 }}>Configurando...</p>}

      {mfaState === 'verifying' && (
        <div>
          <p style={{ fontSize: 13, color: T.fg, fontWeight: 600, marginBottom: 12 }}>1. Escanea este código QR con tu app de autenticación:</p>
          <div style={{ padding: 16, backgroundColor: T.card, borderRadius: 12, border: `1px solid ${T.border}`, display: 'inline-block', marginBottom: 16 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="QR Code" style={{ width: 200, height: 200 }} />
          </div>
          <p style={{ fontSize: 13, color: T.fg, fontWeight: 600, marginBottom: 8 }}>2. Introduce el código de 6 dígitos:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" maxLength={6}
              style={{ width: 140, padding: '10px 16px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 20, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 8, outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && verifyCode.length === 6 && verifyMFA()} />
            <button onClick={verifyMFA} disabled={verifyCode.length !== 6}
              style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: verifyCode.length === 6 ? T.cyan : T.muted, color: verifyCode.length === 6 ? 'white' : T.fgMuted, border: 'none', fontSize: 13, fontWeight: 600, cursor: verifyCode.length === 6 ? 'pointer' : 'default' }}>
              Verificar
            </button>
          </div>
        </div>
      )}

      {mfaState === 'active' && (
        <div>
          <p style={{ fontSize: 13, color: T.success, marginBottom: 12 }}>Tu cuenta está protegida con 2FA.</p>
          <button onClick={unenrollMFA} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.muted, color: T.destructive, border: `1px solid ${T.border}`, fontSize: 12, cursor: 'pointer' }}>
            Desactivar 2FA
          </button>
        </div>
      )}
    </div>
  )
}

function ActiveSessionsSection() {
  const T = useThemeColors()
  const fontDisplay = "'Rajdhani', sans-serif"

  const { data: sessionsData, refetch } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => api.get('/security/sessions').then(r => r.data),
    staleTime: 30_000,
  })

  const revokeSession = async (sessionId) => {
    try {
      await api.delete(`/security/sessions/${sessionId}`)
      toast.success('Sesion revocada')
      refetch()
    } catch { toast.error('Error al revocar sesion') }
  }

  const revokeAll = async () => {
    if (!confirm('¿Cerrar todas las sesiones excepto la actual?')) return
    try {
      await api.post('/security/sessions/revoke-all')
      toast.success('Sesiones revocadas')
      refetch()
    } catch { toast.error('Error') }
  }

  const sessions = sessionsData?.sessions || []
  const deviceIcon = (label) => label === 'Mobile' ? Smartphone : Monitor

  return (
    <div className="rounded-lg p-6 mt-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
          <Monitor className="w-5 h-5" style={{ color: T.cyan }} /> Sesiones activas
        </h3>
        {sessions.length > 1 && (
          <button onClick={revokeAll} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${T.destructive}10`, color: T.destructive, border: `1px solid ${T.destructive}30` }}>
            Cerrar todas
          </button>
        )}
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm" style={{ color: T.fgMuted }}>No hay sesiones registradas</p>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const DeviceIcon = deviceIcon(session.device_label)
            return (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: T.muted }}>
                <DeviceIcon className="w-5 h-5 flex-shrink-0" style={{ color: session.is_current ? T.success : T.fgMuted }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: T.fg }}>{session.device_label}</span>
                    {session.is_current && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${T.success}15`, color: T.success }}>Actual</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: T.fgMuted }}>
                    <span>{session.ip_address}</span>
                    <span>·</span>
                    <span>{session.last_active_at ? new Date(session.last_active_at).toLocaleString('es-ES') : '—'}</span>
                  </div>
                </div>
                {!session.is_current && (
                  <button onClick={() => revokeSession(session.id)} className="p-1.5 rounded hover:bg-white/50" title="Revocar sesion">
                    <Trash2 className="w-4 h-4" style={{ color: T.fgMuted }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const T = useThemeColors()
  const { user, signOut } = useAuth()
  const { role, loading: roleLoading } = useUserRole()
  const queryClient = useQueryClient()

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (USE_MOCK_DATA || !user?.id) {
        return { id: user?.id || 'mock-user', email: user?.email || 'usuario@ejemplo.com', full_name: 'Usuario Demo', role: 'admin', created_at: new Date().toISOString() }
      }
      try { const response = await usersApi.get(user.id); return response.data }
      catch (error) { return { id: user.id, email: user.email, full_name: user.email.split('@')[0], role: role || 'viewer', created_at: new Date().toISOString() } }
    },
    enabled: !!user,
  })

  const [formData, setFormData] = useState({ full_name: '' })
  const [nameError, setNameError] = useState('')
  const { setPreferences, ...preferences } = useUserPreferencesStore()

  useEffect(() => { if (userProfile) setFormData({ full_name: userProfile.full_name || '' }) }, [userProfile])

  const validateName = (value) => {
    if (!value || value.trim().length === 0) return 'El nombre es obligatorio'
    if (value.trim().length < 2) return 'Minimo 2 caracteres'
    if (value.trim().length > 100) return 'Maximo 100 caracteres'
    return ''
  }

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      if (USE_MOCK_DATA) { await new Promise(resolve => setTimeout(resolve, 500)); return data }
      return await usersApi.update(user.id, data)
    },
    onSuccess: () => { queryClient.invalidateQueries(['user-profile']); toast.success('Perfil actualizado correctamente') },
    onError: (error) => { toast.error(`Error: ${error.response?.data?.detail || 'No se pudo actualizar'}`) },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const error = validateName(formData.full_name)
    if (error) { setNameError(error); return }
    updateProfile.mutate(formData)
  }

  const handleLogout = async () => {
    if (confirm('Cerrar sesion?')) {
      try { await signOut(); toast.success('Sesion cerrada') }
      catch (error) { toast.error('Error al cerrar sesion') }
    }
  }

  if (isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: T.cyan, borderTopColor: 'transparent' }} />
          <p style={{ color: T.fgMuted }}>Cargando perfil...</p>
        </div>
      </div>
    )
  }

  const userInitials = userProfile?.full_name
    ? userProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : userProfile?.email?.[0]?.toUpperCase() || 'U'

  const roleColors = {
    admin: { color: T.purple, bg: `${T.purple}15` },
    comercial: { color: T.cyan, bg: `${T.cyan}15` },
    viewer: { color: T.fgMuted, bg: `${T.fgMuted}15` },
  }
  const roleLabels = { admin: 'Administrador', comercial: 'Comercial', viewer: 'Visualizador' }
  const rc = roleColors[userProfile?.role || 'viewer']

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen max-w-4xl mx-auto" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Mi Perfil</h1>
        <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Gestiona tu informacion personal y preferencias</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
              <span className="text-3xl font-bold" style={{ color: T.bg }}>{userInitials}</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              {userProfile?.full_name || 'Usuario'}
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: T.fgMuted }} /><span className="text-sm" style={{ color: T.fgMuted }}>{userProfile?.email}</span></div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: T.fgMuted }} />
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ color: rc.color, backgroundColor: rc.bg, fontFamily: fontDisplay }}>{roleLabels[userProfile?.role || 'viewer']}</span>
              </div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: T.fgMuted }} />
                <span className="text-sm" style={{ color: T.fgMuted }}>Miembro desde {new Date(userProfile?.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
            <LogOut className="w-4 h-4" /> Cerrar Sesion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <User className="w-5 h-5" style={{ color: T.cyan }} /> Informacion Personal
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs uppercase tracking-[0.1em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Nombre Completo</label>
              <input id="profile-name" type="text" value={formData.full_name}
                required minLength={2} maxLength={100}
                onChange={(e) => { setFormData({ ...formData, full_name: e.target.value }); if (nameError) setNameError('') }}
                onBlur={(e) => setNameError(validateName(e.target.value))}
                style={{ ...inputStyle, ...(nameError ? { borderColor: T.destructive } : {}) }}
                placeholder="Tu nombre completo" />
              {nameError && <p role="alert" className="text-xs mt-1" style={{ color: T.destructive }}>{nameError}</p>}
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-xs uppercase tracking-[0.1em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Email</label>
              <input id="profile-email" type="email" value={userProfile?.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
              <p className="text-xs mt-1" style={{ color: T.fgMuted }}>El email no se puede cambiar</p>
            </div>
            <div>
              <label htmlFor="profile-role" className="block text-xs uppercase tracking-[0.1em] mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Rol</label>
              <input id="profile-role" type="text" value={roleLabels[userProfile?.role || 'viewer']} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
              <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Solo un administrador puede cambiar roles</p>
            </div>
            <button aria-label="Guardar" type="submit" disabled={updateProfile.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              <Save className="w-4 h-4" />{updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Preferences */}
        <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <Bell className="w-5 h-5" style={{ color: T.cyan }} /> Preferencias
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: T.fg }}>Tema</label>
              <div className="grid grid-cols-2 gap-3">
                <button aria-label="Modo claro" onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                  className="p-3 rounded-lg flex items-center gap-2 transition-colors"
                  style={{ border: `2px solid ${preferences.theme === 'light' ? T.cyan : T.border}`, backgroundColor: preferences.theme === 'light' ? `${T.cyan}10` : 'transparent', color: T.fg }}>
                  <Sun className="w-5 h-5" /><span className="text-sm font-medium">Claro</span>
                </button>
                <button aria-label="Modo oscuro" onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                  className="p-3 rounded-lg flex items-center gap-2 transition-colors"
                  style={{ border: `2px solid ${preferences.theme === 'dark' ? T.cyan : T.border}`, backgroundColor: preferences.theme === 'dark' ? `${T.cyan}10` : 'transparent', color: T.fg }}>
                  <Moon className="w-5 h-5" /><span className="text-sm font-medium">Oscuro</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: T.fg }}>Idioma</label>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" style={{ color: T.fgMuted }} />
                <select id="profile-select-1" aria-label="Selector" value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })} style={inputStyle}>
                  <option value="es">Espanol</option>
                  <option value="en" disabled>English (Proximamente)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: T.fg }}>Notificaciones</label>
              <div className="space-y-3">
                <label htmlFor="profile-notif-email" className="flex items-center gap-3 cursor-pointer">
                  <input id="profile-notif-email" type="checkbox" checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: T.fg }}>Notificaciones por email</p>
                    <p className="text-xs" style={{ color: T.fgMuted }}>Recibe actualizaciones en tu correo</p>
                  </div>
                </label>
                <label htmlFor="profile-notif-push" className="flex items-center gap-3 cursor-pointer">
                  <input id="profile-notif-push" type="checkbox" checked={preferences.desktopNotifications}
                    onChange={(e) => setPreferences({ ...preferences, desktopNotifications: e.target.checked })} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: T.fg }}>Notificaciones de escritorio</p>
                    <p className="text-xs" style={{ color: T.fgMuted }}>Alertas en el navegador</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: `${T.success}10`, border: `1px solid ${T.success}30` }}>
            <p className="text-sm flex items-center gap-2" style={{ color: T.success }}>
              Preferencias guardadas automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <TwoFactorSection />

      {/* Active Sessions */}
      <ActiveSessionsSection />

      {/* Stats */}
      <div className="rounded-lg p-6 mt-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>Estadisticas de Actividad</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Leads Creados', 'Visitas Realizadas', 'Emails Enviados', 'Acciones Completadas'].map(label => (
            <div key={label} className="text-center p-4 rounded-lg" style={{ backgroundColor: T.muted }}>
              <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>--</p>
              <p className="text-sm" style={{ color: T.fgMuted }}>{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4 text-center" style={{ color: T.fgMuted }}>Las estadisticas se actualizaran cuando el backend este conectado</p>
      </div>
    </div>
  )
}
