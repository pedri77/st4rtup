import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { usersApi } from '@/services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Shield, Calendar, Save, LogOut, Bell, Globe, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { USE_MOCK_DATA } from '@/mocks/mockData'
import { useUserPreferencesStore } from '@/store/useUserPreferencesStore'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#8B5CF6', destructive: '#EF4444',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

export default function ProfilePage() {
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
              {nameError && <p className="text-xs mt-1" style={{ color: T.destructive }}>{nameError}</p>}
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
            <button type="submit" disabled={updateProfile.isPending}
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
                <button onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                  className="p-3 rounded-lg flex items-center gap-2 transition-colors"
                  style={{ border: `2px solid ${preferences.theme === 'light' ? T.cyan : T.border}`, backgroundColor: preferences.theme === 'light' ? `${T.cyan}10` : 'transparent', color: T.fg }}>
                  <Sun className="w-5 h-5" /><span className="text-sm font-medium">Claro</span>
                </button>
                <button disabled className="p-3 rounded-lg flex items-center gap-2 opacity-50"
                  style={{ border: `2px solid ${T.border}`, color: T.fgMuted }}>
                  <Moon className="w-5 h-5" /><span className="text-sm font-medium">Oscuro</span>
                  <span className="text-xs" style={{ color: T.fgMuted }}>(Prox.)</span>
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
