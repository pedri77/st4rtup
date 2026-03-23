# Manual de Usuario: Administracion de Usuarios

## Descripcion

El modulo de Usuarios permite gestionar las cuentas de acceso al CRM, asignar roles y controlar permisos. Solo accesible para administradores.

## Acceso

Navegar a **Usuarios** en la barra lateral o acceder a `/admin/users`. Requiere rol de administrador.

## Vista principal

Listado de usuarios con:
- Nombre/Email
- Rol asignado
- Estado (activo/inactivo)
- Fecha de creacion
- Ultimo acceso

## Roles del sistema

| Rol | Permisos |
|-----|---------|
| admin | Acceso completo: gestion de usuarios, configuracion, todos los modulos |
| comercial | Acceso a modulos comerciales: leads, visitas, emails, pipeline, acciones |
| viewer | Solo lectura: puede ver datos pero no crear ni modificar |

## Crear un usuario

1. Pulsar **Nuevo Usuario**
2. Completar:
   - **Email**: Direccion de correo (se usa como login)
   - **Nombre**: Nombre del usuario
   - **Rol**: Seleccionar admin, comercial o viewer
   - **Activo**: Activar o desactivar la cuenta
3. Pulsar **Guardar**
4. El usuario recibira un email para establecer su contrasena

## Editar un usuario

1. Hacer clic en el usuario del listado
2. Modificar los campos necesarios (rol, estado, nombre)
3. Pulsar **Guardar**

## Desactivar un usuario

En lugar de eliminar, se recomienda desactivar:
1. Editar el usuario
2. Desmarcar la casilla **Activo**
3. Guardar

El usuario no podra acceder al sistema pero se conservan sus datos historicos.

## Permisos por rol

| Funcionalidad | Admin | Comercial | Viewer |
|--------------|-------|-----------|--------|
| Ver dashboard | Si | Si | Si |
| Gestionar leads | Si | Si | No |
| Enviar emails | Si | Si | No |
| Gestionar pipeline | Si | Si | No |
| Crear ofertas | Si | Si | No |
| Configuracion | Si | No | No |
| Gestion usuarios | Si | No | No |
| Ver informes | Si | Si | Si |

## Consejos

- Asignar el rol minimo necesario a cada usuario
- Desactivar usuarios en lugar de eliminarlos
- Revisar periodicamente los accesos activos
- Los administradores deben ser un numero reducido
