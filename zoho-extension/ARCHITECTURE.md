# 🏗️ Arquitectura de la Extensión Zoho Mail

## 📋 Visión General

La extensión de Zoho Mail para Riskitera Sales CRM es una aplicación embebida que se ejecuta dentro de Zoho Mail y se comunica con el backend del CRM a través de API REST.

```
┌─────────────────────────────────────────────────────────┐
│                    Zoho Mail (Browser)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Riskitera CRM Extension Widget           │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │         widget.html (Frontend)                │  │ │
│  │  │  - Display lead info                          │  │ │
│  │  │  - Search leads                               │  │ │
│  │  │  - Sync emails                                │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                        ↕                            │ │
│  │         Zoho Embedded App SDK (JavaScript)         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕
                    HTTPS / JSON
                           ↕
┌─────────────────────────────────────────────────────────┐
│            Riskitera Sales Backend (FastAPI)             │
│  ┌────────────────────────────────────────────────────┐ │
│  │              REST API Endpoints                     │ │
│  │  - GET /api/v1/leads (search by email)             │ │
│  │  - GET /api/v1/emails (get lead emails)            │ │
│  │  - POST /api/v1/emails (sync email)                │ │
│  │  - POST /api/v1/leads (create lead)                │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │           PostgreSQL Database (Supabase)            │ │
│  │  - leads, emails, actions, visits, etc.             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Principales

### **1. Plugin Manifest (`plugin-manifest.json`)**

Define la configuración de la extensión:

- **Metadata**: Nombre, versión, descripción, desarrollador
- **Permisos**: Scopes de Zoho Mail requeridos
- **Settings**: Campos de configuración (API URL, Token)
- **Location**: Dónde se muestra la extensión (SIDEBAR)

**Permisos solicitados:**
```json
{
  "scope": [
    "ZohoMail.messages.READ",      // Leer emails
    "ZohoMail.messages.CREATE",    // Crear emails
    "ZohoMail.messages.UPDATE",    // Actualizar emails
    "ZohoMail.organization.READ",  // Info organización
    "ZohoMail.accounts.READ"       // Cuentas de email
  ]
}
```

### **2. Widget HTML (`app/widget.html`)**

**Estructura:**
- HTML semántico con estilos CSS embebidos
- JavaScript vanilla (sin frameworks externos)
- Zoho Embedded App SDK para comunicación

**Secciones del UI:**
1. **Header**: Logo + email actual
2. **Loading State**: Spinner mientras busca
3. **No Lead State**: Cuando el email no está en CRM
4. **Lead Info**: Información completa del lead
5. **Recent Activity**: Últimas interacciones
6. **Action Buttons**: Sync, Open CRM

### **3. Zoho Embedded App SDK**

**Funciones principales utilizadas:**

```javascript
// Inicializar SDK
ZOHO.embeddedApp.init();

// Evento de carga
ZOHO.embeddedApp.on("PageLoad", callback);

// Obtener configuración
ZOHO.embeddedApp.get("ConnectorKeys");

// Obtener info del email actual
ZOHO.embeddedApp.get("Mail");
```

---

## 🔄 Flujo de Datos

### **Flujo 1: Búsqueda de Lead al Abrir Email**

```
1. Usuario abre email en Zoho Mail
   ↓
2. Extension widget se carga (PageLoad event)
   ↓
3. SDK obtiene email del remitente (ZOHO.embeddedApp.get("Mail"))
   ↓
4. Widget hace GET /api/v1/leads?search={email}
   ↓
5. Backend busca en PostgreSQL (contact_email LIKE email)
   ↓
6. Si encuentra → Muestra lead info
   Si no encuentra → Muestra "Crear Lead"
```

### **Flujo 2: Sincronización de Email**

```
1. Usuario abre email de un lead conocido
   ↓
2. Click en botón "Sincronizar Email"
   ↓
3. SDK obtiene datos del email actual
   ↓
4. Widget hace POST /api/v1/emails con:
   {
     lead_id: "uuid",
     subject: "...",
     body_text: "...",
     to_email: "...",
     from_email: "...",
     status: "sent",
     sent_at: "2026-02-26T..."
   }
   ↓
5. Backend guarda email en PostgreSQL
   ↓
6. Widget muestra confirmación
   ↓
7. Refresca actividad reciente
```

### **Flujo 3: Cargar Actividad Reciente**

```
1. Lead encontrado y mostrado
   ↓
2. Widget hace GET /api/v1/emails?lead_id={id}
   ↓
3. Backend retorna últimos 10 emails del lead
   ↓
4. Widget muestra los 3 más recientes
```

---

## 🔐 Autenticación y Seguridad

### **Autenticación**

**JWT Bearer Token:**
```javascript
headers: {
  'Authorization': `Bearer ${apiToken}`,
  'Content-Type': 'application/json'
}
```

**Almacenamiento del Token:**
- Se guarda en la configuración de la extensión (Settings)
- Zoho encripta la configuración automáticamente
- No se expone en el código del cliente
- Solo se envía en requests HTTPS

### **Seguridad en el Backend**

**CORS Configuration:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mail.zoho.eu",
        "https://mail.zoho.com",
        "https://extensions.zoho.eu"
    ],
    allow_credentials=True
)
```

**Validación de JWT:**
```python
@router.get("/leads")
async def get_leads(
    current_user: dict = Depends(get_current_user)  # ← Valida JWT
):
    # ...
```

---

## 📡 API Endpoints Utilizados

### **GET /api/v1/leads**
Buscar leads por email.

**Request:**
```
GET /api/v1/leads?search=juan@empresa.com
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "company_name": "Empresa S.L.",
      "contact_email": "juan@empresa.com",
      "score": 85,
      "status": "qualified",
      "source": "website"
    }
  ],
  "total": 1
}
```

### **GET /api/v1/emails**
Obtener emails de un lead.

**Request:**
```
GET /api/v1/emails?lead_id={uuid}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "subject": "Propuesta comercial",
      "sent_at": "2026-02-25T10:30:00Z",
      "status": "sent"
    }
  ]
}
```

### **POST /api/v1/emails**
Sincronizar email con el CRM.

**Request:**
```json
POST /api/v1/emails
Authorization: Bearer {token}

{
  "lead_id": "uuid",
  "subject": "Re: Consulta GRC",
  "to_email": "juan@empresa.com",
  "from_email": "sales@riskitera.com",
  "body_text": "Contenido del email...",
  "status": "sent",
  "sent_at": "2026-02-26T15:30:00Z"
}
```

**Response:**
```json
{
  "id": "new-uuid",
  "lead_id": "uuid",
  "subject": "Re: Consulta GRC",
  "status": "sent"
}
```

---

## 🎨 Diseño y UX

### **Principios de Diseño**

1. **Minimalista**: Solo información esencial
2. **Rápido**: Carga en < 1 segundo
3. **Contextual**: Adapta info según el email
4. **Accesible**: Contraste AA, keyboard navigation

### **Responsive Design**

```css
.container {
  max-width: 400px;  /* Ancho máximo para sidebar */
  padding: 16px;     /* Espaciado interno */
}

.card {
  border-radius: 8px;  /* Esquinas redondeadas */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);  /* Sombra sutil */
}
```

### **Color System**

```css
--primary: #6366F1;     /* Indigo - Botones primarios */
--success: #10B981;     /* Green - Estados positivos */
--warning: #F59E0B;     /* Amber - Alertas */
--danger: #EF4444;      /* Red - Errores */
--gray-50: #F9FAFB;     /* Background */
--gray-900: #111827;    /* Texto principal */
```

---

## 🚀 Optimizaciones

### **Performance**

1. **Lazy Loading**: Actividad reciente se carga después del lead
2. **Cache Local**: No implementado aún (roadmap v1.1)
3. **Debouncing**: En búsquedas (roadmap v1.1)

### **Bundle Size**

- **widget.html**: ~15 KB (sin comprimir)
- **CSS embebido**: ~3 KB
- **JavaScript**: ~8 KB
- **Zoho SDK**: ~45 KB (cargado externamente)

**Total**: < 70 KB → Carga rápida

---

## 🔮 Roadmap Técnico

### **v1.1 - Sincronización Automática**

**Webhook desde Zoho Mail:**
```javascript
ZOHO.embeddedApp.on("Mail.Sent", async (data) => {
  // Auto-sync cuando se envía email
  await syncEmail(data);
});
```

### **v1.2 - Offline First**

**Service Worker para cache:**
```javascript
// Cache API responses
navigator.serviceWorker.register('sw.js');

// Cache leads en IndexedDB
const db = await openDB('riskitera-cache');
```

### **v2.0 - Real-time Updates**

**WebSocket para notificaciones:**
```javascript
const ws = new WebSocket('wss://backend.riskitera.com/ws');
ws.onmessage = (event) => {
  // Actualizar widget en tiempo real
  updateLeadInfo(JSON.parse(event.data));
};
```

---

## 📊 Monitorización

### **Eventos a Trackear**

1. **Widget Load**: Cuántas veces se carga
2. **Lead Found**: % de emails que coinciden con leads
3. **Email Synced**: Cantidad de emails sincronizados
4. **Lead Created**: Leads creados desde extensión
5. **Errors**: Errores de API, permisos, etc.

### **Analytics Implementation (Futuro)**

```javascript
function trackEvent(event, data) {
  fetch('https://analytics.riskitera.com/track', {
    method: 'POST',
    body: JSON.stringify({ event, data, timestamp: new Date() })
  });
}

// Uso
trackEvent('lead_found', { leadId, score });
trackEvent('email_synced', { emailId });
```

---

## 🧪 Testing

### **Manual Testing Checklist**

- [ ] Widget carga correctamente en Zoho Mail
- [ ] Búsqueda de lead por email funciona
- [ ] Información del lead se muestra correctamente
- [ ] Sincronizar email guarda en CRM
- [ ] Botón "Abrir CRM" redirige correctamente
- [ ] Estado de error se muestra cuando falla API
- [ ] Estado "No lead" permite crear lead

### **Automated Testing (Futuro)**

```javascript
// Jest + Testing Library
describe('Widget', () => {
  it('should display lead info when found', async () => {
    const { getByText } = render(<Widget />);
    await waitFor(() => {
      expect(getByText('Empresa S.L.')).toBeInTheDocument();
    });
  });
});
```

---

## 📚 Referencias

- [Zoho Extensions Documentation](https://www.zoho.com/mail/help/extensions/)
- [Zoho Embedded App SDK](https://www.zoho.com/mail/help/extensions/embedded-app-sdk.html)
- [Zoho Extension Toolkit](https://github.com/zoho/zoho-extension-toolkit)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [JWT Authentication](https://jwt.io/introduction)
