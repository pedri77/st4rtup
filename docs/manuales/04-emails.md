# Manual de Usuario: Emails

## Descripcion

El modulo de Emails centraliza la gestion de comunicaciones por correo electronico con leads y clientes. Permite componer, enviar, programar y hacer seguimiento de emails.

## Acceso

Navegar a **Emails** en la barra lateral o acceder a `/emails`.

## Vista principal

Panel con estadisticas superiores:
- Total de emails
- Enviados
- Abiertos
- Tasa de apertura
- Borradores

Debajo, listado de emails con estado, destinatario, asunto y fecha.

## Componer un email

1. Pulsar **Nuevo Email**
2. Completar el formulario:
   - **Lead**: Seleccionar lead destinatario
   - **Para**: Email del destinatario (se autocompleta al seleccionar lead)
   - **Asunto**: Linea de asunto del email
   - **Cuerpo**: Contenido del mensaje
   - **Tipo**: Primer contacto, seguimiento, propuesta, etc.
   - **Plantilla**: Opcionalmente seleccionar una plantilla predefinida
3. Pulsar **Guardar como borrador** o **Enviar**

## Estados del email

| Estado | Descripcion |
|--------|------------|
| draft | Borrador guardado |
| sent | Email enviado |
| opened | Email abierto por el destinatario |
| replied | El destinatario ha respondido |
| bounced | Email rebotado |
| failed | Error en el envio |

## Envio de emails

Para enviar un email:
1. El email debe tener destinatario, asunto y cuerpo
2. Pulsar el boton **Enviar**
3. El sistema utilizara el proveedor de email configurado en Integraciones

## Plantillas

- Seleccionar una plantilla al componer para prerellenar el contenido
- Las plantillas pueden contener variables como `{{nombre}}`, `{{empresa}}`
- Se pueden crear plantillas desde la seccion de Integraciones

## Filtros

- **Busqueda**: Por asunto o destinatario
- **Estado**: Filtrar por estado del email
- **Tipo**: Primer contacto, seguimiento, etc.
- **Fecha**: Rango de fechas

## Seguimiento

- Los emails enviados muestran si han sido abiertos
- La tasa de apertura se calcula automaticamente
- Se pueden crear secuencias de seguimiento automatico

## Exportacion

Exportar listado de emails en formato CSV o Excel para analisis externo.

## Consejos

- Personalizar siempre el asunto del email para mejorar la tasa de apertura
- Utilizar plantillas para mantener consistencia en la comunicacion
- Revisar los emails con estado "bounced" para actualizar datos de contacto
- Programar seguimientos automaticos tras el primer contacto
