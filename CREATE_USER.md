# Crear Usuario en Supabase

## Credenciales del Usuario

- **Email**: david@riskitera.com
- **Contraseña**: Manuel2018***

---

## Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ir a Supabase Dashboard: https://supabase.com/dashboard/project/dszhaxyzrnsgjlabtvqx

2. En el menú lateral, hacer clic en **Authentication**

3. Hacer clic en **Users**

4. Hacer clic en **Add user** → **Create new user**

5. Completar el formulario:
   ```
   Email: david@riskitera.com
   Password: Manuel2018***
   Auto Confirm User: ✅ (activar esta opción)
   ```

6. Hacer clic en **Create user**

7. ¡Listo! Ya puedes hacer login en http://localhost:5173/login

---

## Opción 2: Desde SQL Editor

Si prefieres hacerlo mediante SQL:

1. Ir a **SQL Editor** en Supabase Dashboard

2. Ejecutar este comando:

```sql
-- Crear usuario con email confirmado
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'david@riskitera.com',
    crypt('Manuel2018***', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
```

**Nota**: Este método requiere que tengas la extensión `pgcrypto` habilitada en tu base de datos.

---

## Opción 3: Desde el Backend (Programáticamente)

Si quieres crear el usuario programáticamente usando el backend:

```bash
# Crear un endpoint temporal en el backend
# backend/app/api/v1/endpoints/setup.py
```

```python
from fastapi import APIRouter, HTTPException
from supabase import create_client

router = APIRouter()

@router.post("/create-admin-user")
async def create_admin_user():
    """TEMPORAL: Crear usuario admin inicial"""
    from app.core.config import settings

    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY  # ⚠️ Requiere service_role key
    )

    try:
        # Crear usuario
        user = supabase.auth.admin.create_user({
            "email": "david@riskitera.com",
            "password": "Manuel2018***",
            "email_confirm": True,
        })

        return {"message": "User created successfully", "user_id": user.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

Luego ejecutar:
```bash
curl -X POST http://localhost:8001/api/v1/setup/create-admin-user
```

---

## Verificación

Una vez creado el usuario:

1. Ir a http://localhost:5173/login (o la URL desplegada en Cloudflare Pages)

2. Introducir las credenciales:
   ```
   Email: david@riskitera.com
   Contraseña: Manuel2018***
   ```

3. Hacer clic en **Iniciar Sesión**

4. Deberías ser redirigido al Dashboard del CRM

5. En la barra lateral izquierda, deberías ver tu email y el botón **Cerrar Sesión**

---

## Gestión de Usuarios

**Todos los usuarios se gestionan desde la consola de Supabase:**

- **Crear usuario**: Authentication → Users → Add user
- **Eliminar usuario**: Authentication → Users → (seleccionar usuario) → Delete
- **Resetear contraseña**: Authentication → Users → (seleccionar usuario) → Send password recovery
- **Ver sesiones activas**: Authentication → Users → (seleccionar usuario) → Sessions

**No hay panel de administración de usuarios en la aplicación** - toda la gestión se realiza desde Supabase.

---

## Seguridad

- Las contraseñas se hashean automáticamente con bcrypt
- Las sesiones usan JWT con refresh tokens
- Los tokens se almacenan en localStorage del navegador
- Auto-refresh de tokens cada hora
- Logout invalida la sesión en Supabase

---

## Roles y Permisos (Futuro)

En el futuro, se pueden agregar roles personalizados usando `user_metadata`:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
)
WHERE email = 'david@riskitera.com';
```

Luego acceder al rol en el frontend con `user.user_metadata.role`.
