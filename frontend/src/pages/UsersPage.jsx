import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, User, Users, Crown, Eye, CheckCircle2, XCircle, Mail, Phone, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/services/api'
import { ListItemSkeleton } from '@/components/LoadingStates'
import { useConfirm } from '@/components/common/ConfirmDialog'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#F5820B', destructive: '#EF4444',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, color: T.purple, bg: `${T.purple}15`, description: 'Acceso total al sistema' },
  comercial: { label: 'Comercial', icon: Users, color: T.cyan, bg: `${T.cyan}15`, description: 'Gestion completa del CRM' },
  viewer: { label: 'Viewer', icon: Eye, color: T.fgMuted, bg: `${T.fgMuted}15`, description: 'Solo lectura' },
}

export default function UsersPage() {
  const confirm = useConfirm()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await usersApi.list()
        return response.data
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error('No tienes permisos para ver usuarios')
        }
        throw err
      }
    },
  })

  const deleteUser = useMutation({
    mutationFn: (userId) => usersApi.delete(userId),
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('Usuario eliminado') },
    onError: (error) => { toast.error(`Error: ${error.response?.data?.detail || 'No se pudo eliminar el usuario'}`) },
  })

  const users = usersData?.items || []
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    comerciales: users.filter(u => u.role === 'comercial').length,
  }

  const handleEdit = (user) => { setSelectedUser(user); setShowEditModal(true) }
  const handleDelete = async (user) => { if (await confirm({ title: '¿Eliminar?', description: `Estas seguro de eliminar a ${user.full_name || user.email}?`, confirmText: 'Eliminar' })) deleteUser.mutate(user.id) }

  const statCards = [
    { label: 'Total Usuarios', value: stats.total, icon: Users, color: T.cyan },
    { label: 'Activos', value: stats.active, icon: CheckCircle2, color: T.success },
    { label: 'Administradores', value: stats.admins, icon: Crown, color: T.purple },
    { label: 'Comerciales', value: stats.comerciales, icon: Users, color: T.cyan },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Gestion de Usuarios</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>
            {stats.total} usuarios · {stats.active} activos · {stats.admins} admins
          </p>
        </div>
        <button onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
          <Plus className="w-4 h-4" /> Invitar Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{s.value}</p>
                <p className="text-xs" style={{ color: T.fgMuted }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg text-center py-12" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <p style={{ color: T.fgMuted }}>No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserCard key={user.id} user={user} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} />}
      {showEditModal && selectedUser && (
        <EditUserModal user={selectedUser} onClose={() => { setShowEditModal(false); setSelectedUser(null) }} />
      )}
    </div>
  )
}

function UserCard({ user, onEdit, onDelete }) {
  const config = roleConfig[user.role] || roleConfig.viewer
  const RoleIcon = config.icon

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="rounded-lg p-4 transition-all" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name || user.email} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
              <User className="w-7 h-7" style={{ color: T.bg }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm" style={{ color: T.fg }}>{user.full_name || user.email}</h3>
            <span className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              style={{ color: config.color, backgroundColor: config.bg, fontFamily: fontDisplay }}>
              <RoleIcon className="w-3 h-3" /> {config.label}
            </span>
            {user.is_active ? (
              <span className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{ color: T.success, backgroundColor: `${T.success}15` }}>
                <CheckCircle2 className="w-3 h-3" /> Activo
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{ color: T.fgMuted, backgroundColor: `${T.fgMuted}15` }}>
                <XCircle className="w-3 h-3" /> Inactivo
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm" style={{ color: T.fgMuted }}>
            <div className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user.email}</div>
            {user.phone && <div className="flex items-center gap-1"><Phone className="w-4 h-4" /> {user.phone}</div>}
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Creado {formatDate(user.created_at)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => onEdit(user)} className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
            Editar
          </button>
          <button onClick={() => onDelete(user)} className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.destructive }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteUserModal({ onClose }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'viewer', phone: '', notes: '' })

  const inviteUser = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('Usuario invitado correctamente'); onClose() },
    onError: (error) => { toast.error(`Error: ${error.response?.data?.detail || 'No se pudo invitar al usuario'}`) },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.email || !formData.full_name) { toast.error('Email y nombre son requeridos'); return }
    inviteUser.mutate(formData)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: fontDisplay, color: T.fg }}>Invitar Nuevo Usuario</h2>
        <div className="h-0.5 mb-4" style={{ backgroundColor: T.cyan }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>
              Email <span style={{ color: T.destructive }}>*</span>
            </label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} placeholder="usuario@empresa.com" required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>
              Nombre Completo <span style={{ color: T.destructive }}>*</span>
            </label>
            <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={inputStyle} placeholder="Juan Perez" required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-1">Rol</label>
            <select id="users-field-1" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={inputStyle} required>
              <option value="viewer">Viewer - Solo lectura</option>
              <option value="comercial">Comercial - Gestion CRM completa</option>
              <option value="admin">Admin - Acceso total</option>
            </select>
            <p className="text-xs mt-1" style={{ color: T.fgMuted }}>{roleConfig[formData.role]?.description}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-2">Telefono</label>
            <input id="users-field-2" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="+34 600 000 000" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-3">Notas</label>
            <textarea id="users-field-3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Notas internas sobre este usuario..." />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={inviteUser.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={inviteUser.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {inviteUser.isPending ? 'Invitando...' : 'Enviar Invitacion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditUserModal({ user, onClose }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    full_name: user.full_name || '', role: user.role, phone: user.phone || '', is_active: user.is_active, notes: user.notes || '',
  })

  const updateUser = useMutation({
    mutationFn: (data) => usersApi.update(user.id, data),
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('Usuario actualizado'); onClose() },
    onError: (error) => { toast.error(`Error: ${error.response?.data?.detail || 'No se pudo actualizar el usuario'}`) },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.full_name || !formData.role) { toast.error('Nombre y rol son requeridos'); return }
    updateUser.mutate(formData)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: fontDisplay, color: T.fg }}>Editar Usuario</h2>
        <div className="h-0.5 mb-4" style={{ backgroundColor: T.cyan }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-4">Email</label>
            <input id="users-field-4" type="email" value={user.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
            <p className="text-xs mt-1" style={{ color: T.fgMuted }}>El email no se puede modificar</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-5">
              Nombre Completo <span style={{ color: T.destructive }}>*</span>
            </label>
            <input id="users-field-5" type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-6">
              Rol <span style={{ color: T.destructive }}>*</span>
            </label>
            <select id="users-field-6" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={inputStyle} required>
              <option value="viewer">Viewer - Solo lectura</option>
              <option value="comercial">Comercial - Gestion CRM completa</option>
              <option value="admin">Admin - Acceso total</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-7">Telefono</label>
            <input id="users-field-7" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
              <span className="text-sm" style={{ color: T.fg }}>Usuario activo</span>
            </label>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }} htmlFor="users-field-8">Notas</label>
            <textarea id="users-field-8" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={updateUser.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={updateUser.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {updateUser.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
