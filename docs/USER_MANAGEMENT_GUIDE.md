# 👥 Guía de Gestión de Usuarios y Permisos

## 📋 Descripción General

Sistema completo de gestión de usuarios con control de acceso basado en roles para Riskitera Sales CRM.

### Roles Disponibles

| Rol | Icono | Permisos | Descripción |
|-----|-------|----------|-------------|
| **Admin** | 👑 Crown | Acceso total al sistema | Puede gestionar usuarios, configurar integraciones, ver todos los datos |
| **Comercial** | 👥 Users | Gestión completa del CRM | Puede crear/editar leads, visitas, emails, pipeline, acciones |
| **Viewer** | 👁️ Eye | Solo lectura | Puede ver datos pero no modificarlos |

---

## 🚀 Inicio Rápido

### 1. Ejecutar Migración de Base de Datos

```bash
# En Supabase SQL Editor, ejecutar:
scripts/012_users_table.sql
```

Esta migración crea:
- Tabla `users` con roles y permisos
- Enum `user_role` (admin, comercial, viewer)
- Índices para rendimiento
- Políticas RLS (Row Level Security)
- Trigger para `updated_at`

### 2. Crear Primer Usuario Admin

```sql
-- Obtener tu UUID de Supabase Auth
SELECT id, email FROM auth.users;

-- Crear usuario admin (reemplaza 'YOUR_UUID' con el UUID real)
INSERT INTO users (id, email, full_name, role, is_active, invited_at)
VALUES (
    'YOUR_UUID'::uuid,
    'tu-email@riskitera.com',
    'Tu Nombre',
    'admin',
    true,
    NOW()
);
```

### 3. Acceder a Gestión de Usuarios

Una vez autenticado como admin:
1. Navega a **"Usuarios"** en el sidebar (icono Shield)
2. O accede directamente a `/admin/users`

---

## 🎯 Funcionalidades

### Invitar Nuevo Usuario

1. Click en **"+ Invitar Usuario"**
2. Completa el formulario:
   - **Email** (requerido): Email del nuevo usuario
   - **Nombre Completo** (requerido): Nombre del usuario
   - **Rol**: Selecciona admin, comercial o viewer
   - **Teléfono** (opcional): Número de contacto
   - **Notas** (opcional): Notas internas sobre el usuario
3. Click en **"Enviar Invitación"**

**Nota:** Por ahora se crea el usuario en la BD. Para enviar email de invitación automático, se necesita configurar Supabase Service Role Key.

### Editar Usuario

1. En la lista de usuarios, click en **"Editar"** en el usuario deseado
2. Modifica:
   - Nombre completo
   - Rol (cambia permisos)
   - Teléfono
   - Estado activo/inactivo
   - Notas
3. Click en **"Guardar Cambios"**

**Restricciones:**
- El email no se puede modificar (está sincronizado con Supabase Auth)
- Los usuarios no-admin solo pueden editar su propio perfil
- Los usuarios no-admin no pueden cambiar su propio rol

### Eliminar Usuario

1. Click en **"Eliminar"** en el usuario deseado
2. Confirma la acción en el diálogo

**Protecciones:**
- Solo admins pueden eliminar usuarios
- No puedes eliminar tu propia cuenta
- La eliminación es permanente (considerar desactivar en su lugar)

### Ver Perfil Propio

Los usuarios pueden ver y editar su propio perfil en `/users/me/profile` (endpoint backend).

---

## 🔐 Modelo de Permisos

### Backend (API)

#### Endpoints Protegidos por Admin

Requieren `get_current_admin_user` middleware:
- `POST /api/v1/users` - Invitar usuario
- `GET /api/v1/users` - Listar todos los usuarios
- `DELETE /api/v1/users/{id}` - Eliminar usuario

#### Endpoints con Permisos Mixtos

- `GET /api/v1/users/{id}` - Ver usuario
  - ✅ Propietario puede ver su perfil
  - ✅ Admin puede ver cualquier perfil
  - ❌ Otros usuarios no pueden ver perfiles ajenos

- `PUT /api/v1/users/{id}` - Actualizar usuario
  - ✅ Propietario puede actualizar su perfil (campos limitados)
  - ✅ Admin puede actualizar cualquier perfil (todos los campos)
  - ❌ Usuarios no pueden cambiar su propio rol/estado (solo admin)

#### Endpoint Público (autenticado)

- `GET /api/v1/users/me/profile` - Ver perfil propio
  - ✅ Cualquier usuario autenticado puede ver su propio perfil
  - 🔄 Auto-crea el registro si no existe en la BD

### Frontend (UI)

#### Rutas Protegidas

- `/admin/users` - Gestión de usuarios (solo visible en navegación si eres admin)

**Nota:** Por implementar protección completa de rutas basada en roles (PrivateRoute con roleRequired).

---

## 📊 Estructura de Datos

### Tabla `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,                    -- UUID de Supabase Auth
    email VARCHAR(255) NOT NULL UNIQUE,     -- Email (sincronizado)
    full_name VARCHAR(255),                 -- Nombre completo
    avatar_url VARCHAR(500),                -- URL de avatar
    phone VARCHAR(50),                      -- Teléfono
    role user_role NOT NULL DEFAULT 'viewer', -- Rol
    is_active BOOLEAN NOT NULL DEFAULT true, -- Activo/Inactivo
    preferences JSONB DEFAULT '{}',         -- Preferencias JSON
    last_login_at TIMESTAMPTZ,              -- Último login
    invited_at TIMESTAMPTZ,                 -- Fecha de invitación
    invited_by UUID REFERENCES users(id),   -- Quién invitó
    notes TEXT,                             -- Notas internas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Preferencias (JSON)

Ejemplo de estructura para `preferences`:

```json
{
  "theme": "light",              // "light" | "dark" | "auto"
  "language": "es",              // "es" | "en"
  "notifications": {
    "email": true,
    "push": true,
    "digest": "daily"            // "realtime" | "daily" | "weekly" | "off"
  },
  "dashboardLayout": [
    "stats", "recent-leads", "pipeline"
  ],
  "timezone": "Europe/Madrid"
}
```

---

## 🛡️ Row Level Security (RLS)

Políticas activas en la tabla `users`:

| Operación | Política | Descripción |
|-----------|----------|-------------|
| SELECT | `users_select_own` | Usuarios pueden ver su propio perfil |
| SELECT | `users_select_admin` | Admins pueden ver todos los perfiles |
| INSERT | `users_insert_admin` | Solo admins pueden crear usuarios |
| UPDATE | `users_update_own` | Usuarios pueden actualizar su perfil (sin cambiar rol) |
| UPDATE | `users_update_admin` | Admins pueden actualizar cualquier perfil |
| DELETE | `users_delete_admin` | Admins pueden eliminar usuarios (excepto a sí mismos) |

---

## 🔄 Integración con Supabase Auth

### Sincronización de Usuarios

El sistema mantiene una tabla `users` local que se sincroniza con `auth.users` de Supabase:

1. **Al hacer login por primera vez:**
   - El endpoint `/users/me/profile` auto-crea el registro en `users`
   - Se asigna rol `viewer` por defecto
   - Admin puede cambiar el rol después

2. **Al invitar un usuario:**
   - Se crea el registro en `users` con el rol asignado
   - Se envía invitación por email (requiere Service Role Key)
   - El usuario completa registro en Supabase Auth
   - El `id` se sincroniza automáticamente

### Configuración Requerida (Futuro)

Para invitaciones automáticas por email:

```python
# backend/app/core/config.py
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# backend/app/api/v1/endpoints/users.py
from supabase import create_client

supabase_admin = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

# En create_user endpoint:
supabase_admin.auth.admin.invite_user_by_email(
    data.email,
    options={
        "data": {
            "full_name": data.full_name,
            "role": data.role
        }
    }
)
```

---

## 🧪 Testing

### Probar Roles

1. **Como Admin:**
   - Crea 2 usuarios de prueba (1 comercial, 1 viewer)
   - Verifica que puedes ver/editar/eliminar todos
   - Verifica que aparece el enlace "Usuarios" en sidebar

2. **Como Comercial:**
   - Login con usuario comercial
   - Verifica que NO aparece enlace "Usuarios" en sidebar
   - Verifica que puedes crear/editar leads, visitas, etc.
   - Intenta acceder a `/admin/users` directamente → debería fallar

3. **Como Viewer:**
   - Login con usuario viewer
   - Verifica que puedes ver datos pero no editarlos
   - Verifica permisos de solo lectura en todas las páginas

### Verificar en BD

```sql
-- Ver todos los usuarios
SELECT id, email, full_name, role, is_active, created_at
FROM users
ORDER BY created_at DESC;

-- Ver usuarios activos por rol
SELECT role, COUNT(*) as total
FROM users
WHERE is_active = true
GROUP BY role;

-- Ver cadena de invitaciones
SELECT
    u.email as invited_user,
    i.email as invited_by_user,
    u.role,
    u.created_at
FROM users u
LEFT JOIN users i ON u.invited_by = i.id
ORDER BY u.created_at DESC;
```

---

## 🚧 Próximas Mejoras

### Backend
- [ ] Implementar invitación por email con Supabase Admin API
- [ ] Añadir logs de actividad de usuarios (audit trail)
- [ ] Implementar rate limiting en endpoints de usuarios
- [ ] Añadir endpoints para cambiar contraseña
- [ ] Implementar 2FA (Two-Factor Authentication)

### Frontend
- [ ] Protección de rutas basada en roles (PrivateRoute enhancement)
- [ ] Página de perfil de usuario (`/profile`)
- [ ] Editor de preferencias (tema, notificaciones, idioma)
- [ ] Avatar upload con crop
- [ ] Historial de actividad del usuario
- [ ] Filtros avanzados en lista de usuarios
- [ ] Exportar lista de usuarios a CSV

### Seguridad
- [ ] Implementar CSRF protection
- [ ] Añadir validación de email en invitaciones
- [ ] Implementar blacklist de dominios de email
- [ ] Añadir confirmación por email para cambios críticos
- [ ] Rate limiting en login attempts

---

## 📚 Recursos

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

**✅ Sistema de gestión de usuarios implementado y listo para usar!**
