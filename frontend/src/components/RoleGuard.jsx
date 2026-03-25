import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { ShieldAlert } from 'lucide-react'

/**
 * Role hierarchy: admin > comercial > viewer
 * - admin: Full access to everything
 * - comercial: Access to sales operations (leads, visits, emails, etc.)
 * - viewer: Read-only access
 */
const ROLE_HIERARCHY = {
  admin: 3,
  comercial: 2,
  viewer: 1,
}

/**
 * RoleGuard - Protects routes based on user role
 *
 * @param {Object} props
 * @param {string|string[]} props.allowedRoles - Single role or array of allowed roles
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {React.ReactNode} props.fallback - Optional custom fallback (defaults to 403 page)
 *
 * @example
 * <RoleGuard allowedRoles="admin">
 *   <UsersPage />
 * </RoleGuard>
 *
 * @example
 * <RoleGuard allowedRoles={['admin', 'comercial']}>
 *   <LeadsPage />
 * </RoleGuard>
 */
export default function RoleGuard({ allowedRoles, children, fallback }) {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useUserRole()

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // If no user, redirect to login (this shouldn't happen if wrapped in PrivateRoute)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Normalize allowedRoles to array
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  // Check if user's role is in allowed roles
  const hasPermission = rolesArray.includes(role)

  // If no permission, show fallback or default 403 page
  if (!hasPermission) {
    if (fallback) {
      return fallback
    }

    return <ForbiddenPage userRole={role} requiredRoles={rolesArray} />
  }

  // User has permission, render children
  return children
}

/**
 * Default 403 Forbidden page
 */
function ForbiddenPage({ userRole, requiredRoles }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200/50">
          <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Acceso Denegado
          </h1>

          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a esta página.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Tu rol:</span>{' '}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {userRole || 'desconocido'}
              </span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Roles requeridos:</span>{' '}
              {requiredRoles.map((role, idx) => (
                <span key={role}>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {role}
                  </span>
                  {idx < requiredRoles.length - 1 && ' o '}
                </span>
              ))}
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            className="btn-primary w-full"
          >
            ← Volver atrás
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Si crees que deberías tener acceso, contacta con el administrador.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to check if user has a specific role or higher
 * Useful for conditional rendering within components
 *
 * @example
 * const { hasRole } = useHasRole()
 *
 * {hasRole('admin') && <AdminButton />}
 */
export function useHasRole() {
  const { role } = useUserRole()

  const hasRole = (requiredRole) => {
    if (!role) return false
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole]
  }

  return { hasRole, currentRole: role }
}
