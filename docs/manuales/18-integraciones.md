# Manual de Usuario: Integraciones

## Descripcion

El modulo de Integraciones permite configurar las conexiones externas del CRM: proveedores de email, Telegram, n8n, Apollo.io y webhooks.

## Acceso

Navegar a **Integraciones** en la barra lateral o acceder a `/integrations`.

## Pestanas de configuracion

| Pestana | Descripcion |
|---------|------------|
| Email | Proveedores de envio de email |
| Integraciones | Servicios externos (Telegram, Apollo, n8n) |
| General | Configuracion general del sistema |

---

## 1. Proveedores de Email

### Proveedores soportados

| Proveedor | Descripcion |
|-----------|------------|
| Resend | API moderna de email transaccional |
| Zoho | Email corporativo Zoho |
| Brevo | Plataforma de email marketing (ex-Sendinblue) |
| Amazon SES | Servicio de email de AWS |
| Mailgun | API de email para desarrolladores |
| SMTP | Servidor SMTP generico |
| Gmail OAuth2 | Gmail con autenticacion OAuth2 |

### Configurar un proveedor

1. Seleccionar el proveedor deseado
2. Introducir las credenciales:
   - **API Key** (para servicios API)
   - **Host/Puerto** (para SMTP)
   - **Email remitente**: Direccion "From"
   - **Nombre remitente**: Nombre que aparece al enviar
3. Pulsar **Guardar**
4. Pulsar **Test** para enviar un email de prueba

### Gmail OAuth2

1. Configurar las credenciales OAuth en Google Cloud Console
2. Introducir Client ID y Client Secret
3. Pulsar **Autorizar** para completar el flujo OAuth
4. El sistema obtendra automaticamente los tokens de acceso

---

## 2. Integraciones externas

### Telegram

Configurar notificaciones via Telegram:
1. Crear un bot en Telegram (via @BotFather)
2. Obtener el Bot Token
3. Obtener el Chat ID del grupo/canal destino
4. Introducir ambos valores en la configuracion
5. Pulsar **Test** para verificar

### Apollo.io

Sincronizacion de leads desde Apollo:
1. Obtener la API Key de Apollo.io
2. Introducirla en la configuracion
3. Configurar los filtros de importacion
4. Activar la sincronizacion automatica

### n8n

Configurar la conexion con n8n:
1. Introducir la URL base de n8n
2. Configurar las credenciales de acceso
3. Los webhooks de las automatizaciones se conectaran automaticamente

### Webhooks

Configurar webhooks entrantes:
- **URL del webhook**: Endpoint que recibira datos externos
- **Secret**: Token de seguridad para validar peticiones
- **Eventos**: Seleccionar que eventos disparan el webhook

---

## 3. Configuracion General

### API del sistema

Muestra informacion de la API:
- URL base de la API
- Version actual
- Estado de la conexion

### Variables de entorno

Indica que variables de entorno estan configuradas:
- Base de datos
- Autenticacion (Supabase)
- Proveedores de IA

---

## Estado de las integraciones

Cada integracion muestra un indicador de estado:
- **Conectado**: Configurado y funcionando correctamente
- **No configurado**: Pendiente de configuracion
- **Error**: Configurado pero con problemas de conexion

## Seguridad

- Las API Keys se almacenan cifradas en el servidor
- Las credenciales OAuth se renuevan automaticamente
- Los webhooks usan tokens de verificacion

## Consejos

- Configurar al menos un proveedor de email antes de usar el modulo de Emails
- Verificar siempre con el boton Test tras configurar un proveedor
- Configurar Telegram para recibir notificaciones en tiempo real
- Mantener las API Keys actualizadas y rotarlas periodicamente
- No compartir credenciales de integraciones
