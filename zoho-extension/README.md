# 📧 Riskitera Sales CRM - Extensión para Zoho Mail

Extensión oficial de Riskitera Sales CRM para Zoho Mail. Gestiona tus leads directamente desde tu bandeja de entrada.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Widget lateral** en Zoho Mail mostrando información del lead
- **Búsqueda automática** de leads por email
- **Visualización completa** de información del lead:
  - Nombre de empresa, contacto, cargo
  - Lead score, estado, origen
  - Sector y ubicación
- **Actividad reciente** del lead (últimos emails)
- **Sincronización manual** de emails con el CRM
- **Enlace directo** al lead en el CRM web

### 🔄 Próximamente
- Sincronización automática de emails
- Crear leads desde Zoho Mail
- Webhook para sincronización en tiempo real
- Notificaciones de actividad del CRM

---

## 📦 Instalación

### **Requisitos previos**

1. **Node.js** instalado (v14 o superior)
2. **Zoho Extension Toolkit** instalado:
   ```bash
   npm install -g zoho-extension-toolkit
   ```

### **Paso 1: Preparar la extensión**

Desde el directorio `zoho-extension/`:

```bash
cd zoho-extension
```

### **Paso 2: Modo de desarrollo**

Para probar localmente:

```bash
zet run
```

Esto iniciará un servidor local. Luego:

1. Ve a Zoho Mail
2. Click en **Configuración** → **Extensiones** → **Modo Desarrollador**
3. Activa el modo desarrollador
4. Introduce la URL del servidor local (usualmente `https://localhost:3000`)

### **Paso 3: Configurar credenciales**

En Zoho Mail → Extensiones → Riskitera CRM → Configuración:

- **API URL**: URL de tu backend (ej: `https://tu-backend.railway.app`)
- **API Token**: Tu JWT token de autenticación

**¿Cómo obtener el token?**

1. Inicia sesión en `https://sales.riskitera.com`
2. Abre la consola del navegador (F12)
3. Ve a **Application** → **Local Storage** → `sales.riskitera.com`
4. Busca la clave `supabase.auth.token`
5. Copia el valor del `access_token`

### **Paso 4: Empaquetar para producción**

Cuando esté lista para publicar:

```bash
zet pack
```

Esto generará un archivo `.zip` que puedes:
1. Subir a **Zoho Marketplace** (Sigma)
2. O instalar manualmente en tu organización

---

## 🎯 Uso

### **Ver información del lead**

1. Abre un email en Zoho Mail
2. El widget lateral se abrirá automáticamente
3. Si el email del remitente coincide con un lead en el CRM, verás:
   - Información completa del lead
   - Lead score
   - Actividad reciente
   - Botones de acción

### **Sincronizar email con el CRM**

1. Abre un email de un lead conocido
2. Click en **"📧 Sincronizar Email"**
3. El email se guardará en el historial del lead en el CRM

### **Crear nuevo lead**

Si el email no está en el CRM:
1. Click en **"➕ Crear Nuevo Lead"**
2. (Actualmente redirige al CRM web para crear el lead)

### **Abrir lead en CRM**

Click en **"🔗 Abrir en CRM"** para ver el lead completo en la aplicación web.

---

## 🔧 Configuración Avanzada

### **Modificar la URL del CRM**

Edita `widget.html` línea ~340:

```javascript
window.open(`https://sales.riskitera.com/leads/${currentLead.id}`, '_blank');
```

### **Personalizar diseño**

El diseño está en `app/widget.html`. Puedes modificar:
- Colores (cambiar `#6366F1` por tu color de marca)
- Tipografía (editar `font-family`)
- Layout y espaciado

### **Agregar más campos del lead**

En `widget.html`, función `displayLead()`, agrega:

```javascript
document.getElementById('nuevo-campo').textContent = lead.nuevo_campo || '-';
```

Y en el HTML agrega:

```html
<div class="info-item">
  <span class="icon">🏷️</span>
  <span class="label">Nuevo Campo:</span>
  <span class="value" id="nuevo-campo">-</span>
</div>
```

---

## 🔒 Seguridad

### **Token de autenticación**

- El token se almacena encriptado en la configuración de la extensión
- Nunca se expone en el código del cliente
- Se envía solo en headers HTTPS

### **Permisos de Zoho**

La extensión solicita permisos para:
- `ZohoMail.messages.READ`: Leer emails
- `ZohoMail.messages.CREATE`: Crear emails
- `ZohoMail.messages.UPDATE`: Actualizar emails
- `ZohoMail.organization.READ`: Leer info de organización
- `ZohoMail.accounts.READ`: Leer cuentas de email

### **CORS en el backend**

Asegúrate de que tu backend permita requests desde Zoho:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mail.zoho.eu",
        "https://mail.zoho.com",
        "https://extensions.zoho.eu"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Troubleshooting

### **"Error al inicializar la extensión"**

1. Verifica que la API URL y Token estén configurados
2. Comprueba que el backend esté accesible desde internet
3. Revisa la consola del navegador (F12) para más detalles

### **"Lead no encontrado"**

- El email del remitente debe coincidir exactamente con `contact_email` del lead
- La búsqueda es case-insensitive
- Asegúrate de que el lead existe en el CRM

### **"Error al sincronizar email"**

1. Verifica que el token JWT sea válido
2. Comprueba que el endpoint `/api/v1/emails` funcione
3. Revisa los permisos del usuario

### **Widget no aparece**

1. Refresca Zoho Mail (Ctrl+Shift+R)
2. Desactiva y reactiva la extensión
3. Verifica que el modo desarrollador esté activo (en desarrollo)

---

## 📊 Métricas y Analytics

Próximamente implementaremos tracking de:
- Emails sincronizados automáticamente
- Leads creados desde la extensión
- Interacciones con el widget
- Tasa de adopción

---

## 🚀 Roadmap

### **v1.1** (Próximamente)
- ✨ Creación de leads desde Zoho Mail
- 🔄 Sincronización automática de emails
- 📝 Crear acciones rápidas desde el widget
- 📊 Ver pipeline del lead

### **v1.2**
- 🔔 Notificaciones push de actividad CRM
- 📅 Programar visitas desde Zoho Mail
- 🎯 Sugerencias de seguimiento con IA
- 📈 Dashboard de actividad en el widget

### **v2.0**
- 🤖 Automatización completa basada en reglas
- 📧 Templates de email integrados
- 🔗 Integración con Zoho CRM nativo
- 📱 Soporte para Zoho Mail móvil

---

## 📞 Soporte

- **Email**: sales@riskitera.com
- **Documentación**: https://docs.riskitera.com
- **GitHub Issues**: https://github.com/riskitera/sales-crm/issues

---

## 📄 Licencia

Propiedad de Riskitera. Todos los derechos reservados.
