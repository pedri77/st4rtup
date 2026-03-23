# RoleGuard - Protección de Rutas por Rol

## Descripción

Sistema de autorización basado en roles para proteger rutas y componentes según el rol del usuario.

## Roles Disponibles

- **`admin`**: Acceso completo al sistema (gestión de usuarios, configuración)
- **`comercial`**: Acceso a operaciones comerciales (leads, visitas, emails, pipeline)
- **`viewer`**: Solo lectura (no puede crear/editar/eliminar)

## Uso

### Proteger Rutas Completas

```jsx
import RoleGuard from '@/components/RoleGuard'

// Solo admin
<Route
  path="admin/users"
  element={
    <RoleGuard allowedRoles="admin">
      <UsersPage />
    </RoleGuard>
  }
/>

// Admin o comercial
<Route
  path="leads"
  element={
    <RoleGuard allowedRoles={['admin', 'comercial']}>
      <LeadsPage />
    </RoleGuard>
  }
/>
```

### Proteger Componentes Internos

Usa el hook `useHasRole` para mostrar/ocultar elementos según el rol:

```jsx
import { useHasRole } from '@/components/RoleGuard'

function MyComponent() {
  const { hasRole, currentRole } = useHasRole()

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Botón solo para admin */}
      {hasRole('admin') && (
        <button>Configuración Avanzada</button>
      )}

      {/* Botón para admin y comercial */}
      {hasRole('comercial') && (
        <button>Crear Lead</button>
      )}

      {/* Mostrar rol actual */}
      <p>Tu rol: {currentRole}</p>
    </div>
  )
}
```

### Fallback Personalizado

```jsx
<RoleGuard
  allowedRoles="admin"
  fallback={<div>No tienes permisos para ver esto</div>}
>
  <SecretContent />
</RoleGuard>
```

## Página 403 Forbidden

Si el usuario intenta acceder a una ruta protegida sin permisos, se muestra automáticamente una página 403 con:

- Icono de escudo rojo
- Mensaje "Acceso Denegado"
- Información del rol actual vs rol requerido
- Botón para volver atrás

## Implementación en el Proyecto

### Rutas Protegidas Actuales

- `/admin/users` → Solo `admin`
- `/settings` → Solo `admin`
- Resto de rutas → Todos los usuarios autenticados

### Navegación Condicional

El sidebar (`Layout.jsx`) oculta automáticamente:

- Menú "Usuarios" → Solo visible para admin
- Icono de Settings → Solo visible para admin

### Footer del Sidebar

Muestra:
- Email del usuario (primera letra como avatar)
- Rol actual (admin, comercial, viewer)

## Modo MOCK

En modo `USE_MOCK_DATA = true`:
- Todos los usuarios se consideran `admin` automáticamente
- Útil para desarrollo sin backend

## Seguridad

⚠️ **Importante**: La protección de rutas en el frontend es solo UX.

**SIEMPRE** valida los permisos en el backend:

```python
# Backend (FastAPI)
from app.core.security import get_current_active_user, require_role

@router.get("/users")
async def list_users(
    current_user: User = Depends(require_role("admin"))
):
    # Solo usuarios con rol admin pueden acceder
    return users
```

## Testing

Para probar diferentes roles:

1. Cambia el rol del usuario en Supabase:
   ```sql
   UPDATE public.users
   SET role = 'viewer'  -- o 'comercial' o 'admin'
   WHERE email = 'tu@email.com';
   ```

2. Cierra sesión y vuelve a iniciar sesión

3. Verifica que:
   - El menú "Usuarios" aparece/desaparece
   - El icono de Settings aparece/desaparece
   - Las rutas `/admin/users` y `/settings` redirigen a 403

## API Reference

### `<RoleGuard>`

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `allowedRoles` | `string \| string[]` | ✅ | Rol(es) permitido(s) |
| `children` | `ReactNode` | ✅ | Contenido a proteger |
| `fallback` | `ReactNode` | ❌ | Componente a mostrar si no tiene permisos (default: página 403) |

### `useHasRole()`

Retorna:
```typescript
{
  hasRole: (requiredRole: string) => boolean,
  currentRole: 'admin' | 'comercial' | 'viewer' | null
}
```

### `useUserRole()`

Retorna:
```typescript
{
  role: 'admin' | 'comercial' | 'viewer' | null,
  loading: boolean
}
```

## Troubleshooting

### "El rol siempre es null"

- Verifica que el backend esté funcionando
- Comprueba que existe un registro en `public.users` con el `id` del usuario de Supabase
- Revisa la consola del navegador para errores

### "Siempre muestra admin en modo producción"

- Verifica que `USE_MOCK_DATA = false` en `mockData.js`
- Limpia la caché del navegador

### "La página 403 no se muestra"

- Asegúrate de que `RoleGuard` está envolviendo el componente de ruta, no anidado dentro
