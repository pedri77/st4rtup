import { useState, useMemo } from 'react'
import DOMPurify from 'dompurify'
import {
  BookOpen, Search, Printer, ChevronRight, ChevronDown,
  Target, BarChart3, Megaphone, BrainCircuit, Phone, Plug, Shield,
  Zap, MessageCircle, Calendar, CreditCard, Users, FileText,
  Settings, Lock, Globe, Mail, Hash, ClipboardList, Eye,
  ArrowRight, ExternalLink, Copy, Check
} from 'lucide-react'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// ─── Documentation content ──────────────────────────────────────────

const DOCS = [
  {
    id: 'getting-started', title: 'Primeros pasos', icon: Globe, accent: T.cyan,
    content: `## Bienvenido a St4rtup

St4rtup es un CRM completo para startups B2B que integra ventas, marketing, IA y automatizaciones en una sola plataforma. Esta guia te llevara desde cero hasta productivo en minutos.

### Requisitos previos

- Una cuenta activa en St4rtup (registrate en [st4rtup.com](https://st4rtup.com))
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexion a internet

### 1. Tu primer lead

Ve a **Leads** en el menu lateral y click en **+ Nuevo Lead**.

| Campo | Descripcion | Obligatorio |
|-------|-------------|:-----------:|
| Empresa | Nombre de la empresa | Si |
| Contacto | Nombre del decisor | Si |
| Email | Email corporativo | Si |
| Telefono | Con prefijo internacional | No |
| Sector | CNAE o sector personalizado | No |
| Tamano | Micro, PYME, Mediana, Gran empresa | No |
| Fuente | Web, LinkedIn, Referral, Cold... | No |

El **scoring automatico** clasificara el lead de 0 a 100 al guardarlo.

### 2. Configura tu pipeline

Ve a **Pipeline**. Las etapas por defecto son:

\`\`\`
Nuevo → Contactado → Cualificado → Propuesta → Negociacion → Ganado/Perdido
\`\`\`

Arrastra oportunidades entre etapas con **drag & drop**. Cada etapa tiene una probabilidad de cierre asociada que se usa para el forecast.

### 3. Conecta tu email

Ve a **Integraciones → Email**. Opciones disponibles:

- **Gmail OAuth2** — Sin contrasena de aplicacion, el metodo mas sencillo
- **Resend** — 3.000 emails/mes gratis, ideal para empezar
- **Brevo** — 300 emails/dia gratis, SMTP incluido
- **Amazon SES** — El mas barato a escala ($0.10/1.000 emails)

### 4. Tu primera accion

Ve a **Acciones → Nueva Accion**. Asignala a un lead, pon fecha de vencimiento y prioridad. Las acciones vencidas se escalan automaticamente a tu manager si tienes la automatizacion AC-02 activa.

### 5. Dashboard

El dashboard muestra tus KPIs principales:

| KPI | Descripcion |
|-----|-------------|
| Total leads | Leads activos en el sistema |
| Pipeline value | Valor total del pipeline abierto |
| Won this month | Revenue ganado en el mes |
| Conversion rate | % de leads que llegan a Ganado |
| Avg deal size | Tamano medio de los deals |
| Activity score | Emails + visitas + llamadas de la semana |

### Planes y limites

| | Starter (gratis) | Growth (19€/mes) | Scale (49€/mes) |
|---|:---:|:---:|:---:|
| Usuarios | 1 | 3 | 10 |
| Leads | 100 | 5.000 | Ilimitados |
| Emails/dia | 5 | Ilimitados | Ilimitados |
| IA | - | Todos los agentes | Todos + A/B |
| Deal Room | - | - | Incluido |
| API | - | - | Incluido |`,
  },
  {
    id: 'leads', title: 'Leads', icon: Target, accent: T.cyan,
    content: `## Gestion de Leads

Los leads son empresas potencialmente interesadas en tu producto. El modulo de leads es el punto de entrada de todo tu funnel comercial.

### Crear un lead manualmente

Click en **+ Nuevo Lead** e introduce los datos:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Empresa | Texto | Nombre legal o comercial |
| Contacto | Texto | Nombre del decisor principal |
| Email | Email | Email corporativo (se valida formato) |
| Telefono | Texto | Con prefijo (+34, +1, etc.) |
| Sector | Select | CNAE o sector personalizado |
| Tamano | Select | Micro / PYME / Mediana / Gran empresa |
| Fuente | Select | Web, LinkedIn, Referral, Cold, Evento, Otro |
| Web | URL | Sitio web de la empresa |
| Direccion | Texto | Direccion fiscal |
| CIF/NIF | Texto | Identificacion fiscal |
| Notas | Textarea | Notas internas (no visibles para el lead) |
| Tags | Multi-select | Etiquetas personalizadas |

### Importar desde CSV

1. Ve a **Leads → Importar CSV**
2. Arrastra tu archivo o click para seleccionar
3. El sistema detecta columnas automaticamente
4. Revisa el mapeo y corrige si es necesario
5. Click **Importar**

Formatos soportados: CSV generico, export de HubSpot, Salesforce, Pipedrive y Apollo.io.

### Scoring automatico (0-100)

El score se calcula automaticamente con estos pesos:

| Factor | Peso | Detalle |
|--------|:----:|---------|
| Sector relevante | 25% | Si coincide con tu ICP |
| Tamano empresa | 20% | PYME+ puntua mas alto |
| Actividad reciente | 20% | Emails, visitas, llamadas ultimos 30 dias |
| Engagement | 15% | Aperturas, clics, respuestas |
| Completitud datos | 10% | Campos rellenados vs vacios |
| Fuente | 10% | Referral > Inbound > Cold |

El score se recalcula cada vez que hay nueva actividad sobre el lead.

### Estados del lead

\`\`\`
nuevo → contactado → cualificado → oportunidad → cliente → perdido / inactivo
\`\`\`

- **Nuevo**: Lead recien creado, pendiente de primer contacto
- **Contactado**: Se ha hecho al menos 1 accion (email, llamada, visita)
- **Cualificado**: Cumple criterios BANT (Budget, Authority, Need, Timeline)
- **Oportunidad**: Tiene una oportunidad en pipeline asociada
- **Cliente**: Deal ganado, es cliente activo
- **Perdido**: Descartado (motivo obligatorio)
- **Inactivo**: Sin actividad en 90+ dias

### Filtros y busqueda

La barra de busqueda filtra por empresa, contacto o email. Filtros avanzados disponibles:

- Estado, score (rango), sector, tamano
- Fuente, tags, asignado a
- Fecha de creacion, ultima actividad
- Tiene/no tiene oportunidad

Los filtros se persisten en la URL — puedes compartir enlaces filtrados con tu equipo.

### Favoritos y vistas

- **Favoritos**: Marca leads con la estrella para acceso rapido
- **Vistas guardadas**: Guarda combinaciones de filtros como vistas reutilizables

### Auto-tagging con IA

Click en el boton **Auto-tag** en un lead para que la IA:
1. Clasifique el sector (CNAE) automaticamente
2. Detecte normativa aplicable (ENS, NIS2, DORA, ISO 27001)
3. Sugiera tags relevantes

### Detalle del lead

La vista de detalle muestra:
- **Timeline**: Todas las interacciones ordenadas cronologicamente
- **Contactos**: Power map con roles (decisor, influencer, champion, blocker)
- **Oportunidades**: Deals asociados al lead
- **Documentos**: Archivos adjuntos (propuestas, contratos, NDAs)
- **Actividad**: Emails enviados, visitas, llamadas, acciones`,
  },
  {
    id: 'pipeline', title: 'Pipeline', icon: BarChart3, accent: T.purple,
    content: `## Pipeline y Oportunidades

El pipeline visualiza el estado de tus deals activos y permite hacer forecast de revenue.

### Vista Kanban

La vista por defecto. Cada columna es una etapa:

| Etapa | Probabilidad | Color |
|-------|:------------:|-------|
| Nuevo | 10% | Gris |
| Contactado | 20% | Azul |
| Cualificado | 40% | Cyan |
| Propuesta | 60% | Amarillo |
| Negociacion | 80% | Naranja |
| Ganado | 100% | Verde |
| Perdido | 0% | Rojo |

Arrastra oportunidades entre columnas. El valor total de cada columna se muestra en la cabecera.

### Vista tabla

Tabla con todas las oportunidades, ordenable por:
- Valor, fecha de cierre, etapa, probabilidad, lead, propietario

### Crear una oportunidad

Click **+ Nueva Oportunidad**:

| Campo | Descripcion |
|-------|-------------|
| Nombre del deal | Nombre descriptivo |
| Lead | Lead asociado (obligatorio) |
| Valor estimado | En EUR |
| Etapa | Etapa inicial del pipeline |
| Fecha de cierre | Fecha esperada de cierre |
| Probabilidad | Se auto-calcula segun etapa, editable |
| Propietario | Comercial asignado |
| Notas | Contexto del deal |

### Forecast

El forecast calcula el **valor ponderado** de cada oportunidad:

\`\`\`
Valor ponderado = Valor estimado × Probabilidad de la etapa
\`\`\`

El dashboard de forecast muestra:
- Pipeline total vs objetivo mensual
- Revenue ponderado por mes (proximo trimestre)
- Deals por cerrar esta semana/mes
- Velocidad media de cierre (dias desde Nuevo hasta Ganado)

### Ofertas y propuestas

Desde una oportunidad puedes generar una **oferta formal**:
1. Click **Nueva Oferta** en el detalle de la oportunidad
2. Anade lineas (producto/servicio, cantidad, precio)
3. Aplica descuento si procede
4. Genera PDF con tu logo corporativo
5. Envia por email directamente desde el CRM

### Alertas de deals estancados

La automatizacion **PI-03** alerta si un deal lleva mas de 14 dias en la misma etapa sin actividad.`,
  },
  {
    id: 'actions', title: 'Acciones y Tareas', icon: Zap, accent: T.warning,
    content: `## Acciones y Tareas

Las acciones son tareas asociadas a leads o genericas (equipo, admin, etc.).

### Crear una accion

| Campo | Descripcion |
|-------|-------------|
| Titulo | Descripcion corta de la accion |
| Lead | Lead asociado (opcional) |
| Tipo | Llamada, Email, Reunion, Tarea, Seguimiento |
| Prioridad | Baja, Media, Alta, Urgente |
| Fecha vencimiento | Deadline |
| Asignado a | Comercial responsable |
| Notas | Detalle adicional |

### Vista Kanban

Columnas por estado: **Pendiente → En curso → Completada → Cancelada**

Arrastra tarjetas para cambiar estado. Las acciones vencidas se resaltan en rojo.

### Automatizaciones de acciones

| ID | Automatizacion | Descripcion |
|----|----------------|-------------|
| AC-01 | Resumen diario | Email a las 08:30 con acciones del dia |
| AC-02 | Escalado | Notifica a manager si +3 dias vencida |
| AC-03 | Auto-cierre | Cierra acciones completadas automaticamente |
| VI-01 | Post-visita | Crea accion de follow-up tras cada visita |

### Mi dia

La pagina **Mi Dia** muestra una vista personal con:
- Acciones de hoy y vencidas
- Proximas visitas
- Leads pendientes de contacto
- Calendario semanal`,
  },
  {
    id: 'visits', title: 'Visitas Comerciales', icon: Calendar, accent: 'hsl(210,70%,55%)',
    content: `## Visitas Comerciales

Registro y seguimiento de reuniones presenciales y videollamadas.

### Crear una visita

| Campo | Descripcion |
|-------|-------------|
| Lead | Lead asociado (obligatorio) |
| Tipo | Presencial, Videollamada, Telefonica |
| Fecha y hora | Fecha + hora inicio y fin |
| Ubicacion | Direccion o enlace de videollamada |
| Asistentes | Contactos que asistiran |
| Briefing | Preparacion previa a la reunion |
| Notas | Notas post-visita |
| Resultado | Positivo, Neutro, Negativo |

### Sincronizacion con Google Calendar

Si tienes **Google Calendar** conectado (en Integraciones):
- Las visitas se crean automaticamente como eventos en tu calendario
- Si creas un evento en Google Calendar con el tag \`[CRM]\`, se sincroniza de vuelta
- Cambios de fecha/hora se reflejan bidireccionalmente

### Automatizaciones de visitas

| ID | Automatizacion | Descripcion |
|----|----------------|-------------|
| VI-01 | Post-visita | Crea accion de follow-up 24h despues |
| VI-02 | Recordatorio | Notificacion 1h antes de la visita |
| VI-03 | Sync Calendar | Sincroniza nuevas visitas con Google Calendar |
| EM-04 | Follow-up email | Envia email de agradecimiento post-visita |`,
  },
  {
    id: 'emails', title: 'Emails', icon: Mail, accent: 'hsl(25,85%,55%)',
    content: `## Emails

Envia y trackea emails directamente desde el CRM.

### Proveedores soportados

| Proveedor | Gratis | Precio pagado | Recomendado para |
|-----------|--------|---------------|------------------|
| Gmail OAuth2 | Si (limites Google) | - | Cuenta personal/Workspace |
| Resend | 3.000/mes | $20/mes (50K) | Startups, facil setup |
| Brevo | 300/dia | $9/mes (20K) | Volumen medio |
| Amazon SES | - | $0.10/1.000 | Escala alta |
| Mailgun | 1.000/mes (3 meses) | $15/mes | Analytics avanzados |
| Zoho ZeptoMail | - | ~$2.50/1.000 | Usuarios Zoho |
| SMTP generico | Depende | Depende | Gmail, Outlook, custom |

### Tracking

Cada email enviado registra automaticamente:
- **Apertura**: Detecta cuando el destinatario abre el email
- **Clics**: Registra clics en enlaces del email
- **Rebotes**: Emails no entregados
- **Respuestas**: Detecta respuestas y las vincula al lead

### Templates

Crea templates reutilizables con variables:

\`\`\`
Hola {{nombre}},

Te escribo desde {{empresa}} para...

Saludos,
{{mi_nombre}}
\`\`\`

Variables disponibles: \`nombre\`, \`empresa\`, \`email\`, \`telefono\`, \`mi_nombre\`, \`mi_email\`, \`mi_empresa\`.

### Secuencias automaticas

La automatizacion **EM-01** (Welcome) envia una secuencia automatica:
- Dia 0: Email de bienvenida
- Dia 3: Email de valor (caso de uso)
- Dia 7: Email de call-to-action`,
  },
  {
    id: 'contacts', title: 'Contactos', icon: Users, accent: T.success,
    content: `## Contactos

Los contactos son personas dentro de un lead (empresa). Un lead puede tener multiples contactos con diferentes roles.

### Roles de contacto

| Rol | Descripcion | Icono |
|-----|-------------|:-----:|
| Decisor | Tiene poder de compra | Corona |
| Influencer | Influye en la decision | Estrella |
| Champion | Promotor interno de tu producto | Escudo |
| Blocker | Puede bloquear la compra | Candado |
| Usuario | Usuario final del producto | Persona |
| Tecnico | Evaluador tecnico | Llave |

### Power Map

Vista visual de los contactos de un lead organizados por rol e influencia. Util para mapear la estructura de decision de la empresa.

### Campos de contacto

| Campo | Descripcion |
|-------|-------------|
| Nombre | Nombre completo |
| Email | Email corporativo |
| Telefono | Movil o directo |
| Cargo | Titulo profesional |
| LinkedIn | URL del perfil |
| Rol | Decisor, Influencer, etc. |
| Notas | Notas sobre la persona |`,
  },
  {
    id: 'marketing', title: 'Marketing Hub', icon: Megaphone, accent: T.purple,
    content: `## Marketing Hub

Hub centralizado con 16 modulos de marketing B2B.

### Modulos disponibles

| Modulo | Descripcion |
|--------|-------------|
| SEO Command Center | Content Hub, keywords, backlinks, brand monitor |
| Campanas | LinkedIn Ads, Google Ads, Email, YouTube, Webinars |
| Generador UTM | Crea y gestiona codigos UTM con preview |
| Calendario | Calendario editorial visual |
| Alertas | Rendimiento de CPL, keywords, integraciones |
| Funnels | Constructor visual de funnels |
| Assets | Landing pages, CTAs, recursos |
| Documentos | Gestor documental con versionado |
| Analytics | Dashboard unificado Marketing + Sales |
| Tools | Calculadora ROI, generador contenido IA |
| Audit Log | Registro de acciones sensibles |
| SEO & Geo-SEO | Rankings localizados, NAP audits |
| LLM Visibility | Monitorizacion en ChatGPT, Claude, Gemini |
| Social Media | Publicacion en LinkedIn, Twitter, YouTube |
| YouTube | Analytics del canal |
| Integraciones | Google Drive, Search Console, GA4, Semrush |

### Campanas

Crea campanas multicanal con:
- **Tipo**: LinkedIn Ads, Google Ads, SEO, Email, YouTube, Webinar, Evento
- **Presupuesto**: Budget diario o total
- **Objetivos**: Leads, MQLs, revenue
- **Metricas**: Impresiones, clics, CPL, CPA, ROI

### Analytics

El dashboard de analytics unifica datos de marketing y ventas:

| Metrica | Descripcion |
|---------|-------------|
| CPL | Coste por lead (gasto / leads generados) |
| MQL Rate | % de leads que se cualifican |
| CAC | Coste de adquisicion de cliente |
| Pipeline | Valor total de oportunidades de leads de marketing |
| ROI | (Revenue - Gasto) / Gasto × 100 |
| Atribucion | Fuente del lead → canal de conversion |`,
  },
  {
    id: 'seo', title: 'SEO Command Center', icon: Search, accent: T.success,
    content: `## SEO Command Center

9 tabs para gestionar toda tu estrategia SEO desde una sola pantalla.

### Tabs

| Tab | Descripcion |
|-----|-------------|
| Content Hub | Genera articulos con 4 agentes IA encadenados |
| Keyword Studio | Investigacion de keywords, clusters, PAA |
| Backlinks | Tracker de backlinks con verificacion HTTP |
| Dashboard | KPIs SEO: trafico, posiciones, backlinks |
| Repurposer | Convierte contenido existente a otros formatos |
| Health | Auditoria tecnica SEO (meta tags, velocidad) |
| Brand Monitor | Keywords de marca y share of voice |
| Content Tracker | URLs de contenido externo con metricas |
| Pipeline IA | 4 agentes: Keyword → Draft → SEO → Meta |

### Content Pipeline IA

El pipeline usa 4 agentes en cadena:

1. **Keyword Agent** — Selecciona la keyword target y keywords secundarias
2. **Draft Agent** — Genera un borrador de articulo (1.500-3.000 palabras)
3. **SEO Agent** — Optimiza meta title, description, headings, internal links
4. **Meta Agent** — Genera OG tags, schema markup, alt texts

Cada paso es editable antes de pasar al siguiente.

### Geo-SEO

Para mercado espanol:
- Rankings localizados por provincia
- Google Business Profile tracking
- NAP (Name, Address, Phone) audits
- Geo-pages automaticas por ciudad`,
  },
  {
    id: 'ai-agents', title: 'Agentes IA', icon: BrainCircuit, accent: T.warning,
    content: `## Agentes IA

4 agentes de inteligencia artificial que trabajan para tu equipo comercial.

### Proveedores IA soportados

| Proveedor | Modelos | Uso recomendado |
|-----------|---------|-----------------|
| OpenAI | GPT-4o, GPT-4o Mini, o1 | Asistente, propuestas |
| Anthropic | Claude Sonnet 4, Opus 4, Haiku 4.5 | Analisis, redaccion |
| Google | Gemini 2.0 Flash, 1.5 Pro | Documentos, datos |
| Mistral | Large, Medium, Small | GDPR, mercado EU |
| Groq | Llama 3.3 70B, Mixtral | Inferencia rapida |
| DeepSeek | Chat, Reasoner | Razonamiento economico |
| Ollama | Cualquier modelo local | Self-hosted, privacidad |

Configura tus API keys en **Integraciones → Inteligencia Artificial**.

### Agente 1: Scoring ICP

Clasifica leads por similitud con tu Ideal Customer Profile:
- Analiza sector, tamano, engagement, presencia digital
- Devuelve score ICP (0-100) con explicacion
- Se ejecuta automaticamente al crear un lead o bajo demanda

### Agente 2: Cualificacion BANT

Cualifica leads usando el framework BANT:
- **Budget**: Tiene presupuesto asignado?
- **Authority**: Es el contacto el decisor?
- **Need**: Tiene una necesidad real y urgente?
- **Timeline**: Hay un timeline definido?

Funciona con transcripciones de llamadas (Retell AI) o notas de visitas.

### Agente 3: Generacion de propuestas

Genera propuestas comerciales en Markdown + PDF:
- Usa datos del lead (empresa, sector, necesidades)
- Aplica tu plantilla corporativa (logo, colores, pie)
- Incluye pricing personalizado segun tamano/sector
- Genera PDF descargable

### Agente 4: Customer Success

Analiza clientes existentes:
- **NPS Analysis**: Interpreta puntuacion y comentarios
- **Churn Risk**: Detecta senales de abandono (inactividad, tickets, NPS bajo)
- **Upsell**: Identifica oportunidades de venta cruzada

### Chat IA

Asistente conversacional para el equipo de ventas. Responde preguntas sobre leads, pipeline, metricas y sugiere proximos pasos.`,
  },
  {
    id: 'calls', title: 'Llamadas IA', icon: Phone, accent: T.success,
    content: `## Llamadas IA (Retell AI)

Modulo de llamadas automatizadas con inteligencia artificial.

### Consola de llamadas

Inicia llamadas individuales:
1. Selecciona un lead
2. Elige un prompt (script de llamada)
3. Selecciona numero saliente
4. Click **Llamar**

La llamada se graba y transcribe automaticamente. El resultado (sentiment, resumen, siguiente accion) se vincula al lead.

### Prompts

5 templates predefinidos + personalizados:

| Template | Uso | Duracion media |
|----------|-----|:--------------:|
| Prospecting | Primer contacto frio | 2-3 min |
| Follow-up | Seguimiento post-email | 1-2 min |
| Qualification | Cualificacion BANT | 3-5 min |
| Closing | Cierre de deal | 2-4 min |
| Reactivation | Leads inactivos | 1-2 min |

Cada prompt es editable y soporta variables: \`{{nombre}}\`, \`{{empresa}}\`, \`{{producto}}\`.

### Colas y batch

Crea colas de llamadas masivas:
- Selecciona leads por filtro o manualmente
- Asigna prompt y numero
- Programa fecha/hora
- Controles: Start, Pause, Cancel
- Retry automatico si no contesta (configurable: 1-3 intentos)

**Limites**: Growth = 50 llamadas/mes, Scale = ilimitadas.

### A/B Testing (Scale)

Compara dos prompts:
- Misma audiencia dividida aleatoriamente
- Metricas: conversion rate, sentiment score, duracion media
- Resultado estadisticamente significativo tras 30+ llamadas

### RGPD

- Checkbox de consentimiento obligatorio antes de llamar
- Grabaciones se eliminan tras 30 dias (configurable)
- Derecho de supresion: elimina grabacion + transcripcion de un lead`,
  },
  {
    id: 'integrations', title: 'Integraciones', icon: Plug, accent: 'hsl(210,70%,55%)',
    content: `## Integraciones

St4rtup se conecta con 40+ servicios externos organizados en 9 categorias.

### Categorias

| Categoria | Servicios |
|-----------|-----------|
| Email | Gmail OAuth, Resend, Brevo, SES, Mailgun, Zoho, SMTP |
| Automatizaciones | Telegram, n8n, Apollo.io, Webhooks |
| Prospeccion | LinkedIn, Clearbit, Hunter, Lusha, ZoomInfo, PhantomBuster, Waalaxy, Lemlist |
| Comunicacion | Google Calendar, Outlook, Calendly, Zoom, WhatsApp, Slack, Twilio, SendGrid |
| Marketing | Google Ads, LinkedIn Ads, GA4, HubSpot, Typeform |
| Documentos | PandaDoc, DocuSign, Yousign, Google Drive, OneDrive, Notion |
| Datos | eInforma/Axesor, CNAE Lookup |
| Facturacion | Stripe, Holded, Facturama, Intercom, Freshdesk |
| Encuestas | Typeform, Google Forms, SurveyMonkey, Tally, JotForm, Survicate, Hotjar |
| IA | OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Ollama |

### Como configurar una integracion

1. Ve a **Integraciones** en el menu lateral
2. Selecciona la tab correspondiente
3. Busca el servicio que quieres conectar
4. Introduce la API key o credenciales
5. Click **Guardar**
6. El indicador cambiara a **Conectado** (verde)

### OAuth2

Algunos servicios usan OAuth2 (sin API key manual):
- **Gmail** — Click "Conectar con Google" y autoriza
- **Google Calendar** — Mismo flujo OAuth
- **Google Drive** — Mismo flujo OAuth

### Webhooks

Configura webhooks salientes para enviar eventos a servicios externos:
- Eventos: lead.created, lead.updated, opportunity.stage_changed, etc.
- Firma HMAC-SHA256 en el header \`X-Webhook-Signature\`
- Retry automatico (3 intentos con backoff exponencial)
- Log de entregas con status y response

### Variables de entorno

En la seccion superior de Integraciones se muestra el estado de las variables de entorno del servidor (API keys configuradas a nivel de infraestructura vs base de datos).`,
  },
  {
    id: 'automations', title: 'Automatizaciones', icon: Zap, accent: 'hsl(25,85%,55%)',
    content: `## Automatizaciones

28 automatizaciones preconfiguradas que se ejecutan via APScheduler.

### Lista completa

| ID | Nombre | Categoria | Frecuencia |
|----|--------|-----------|------------|
| EM-01 | Secuencia Welcome | Email | Al crear lead |
| EM-02 | Email Tracking | Email | Tiempo real |
| EM-03 | Re-engagement | Email | Semanal (lunes) |
| EM-04 | Follow-up Post-Visita | Email | 24h tras visita |
| LD-01 | Webhook Formularios | Leads | Tiempo real |
| LD-02 | Sync Apollo.io | Leads | Diario (06:00) |
| LD-03 | Enriquecimiento | Leads | Al crear lead |
| LD-04 | Scoring Periodico | Leads | Diario (03:00) |
| VI-01 | Acciones Post-Visita | Visitas | Tras cada visita |
| VI-02 | Recordatorio Pre-Visita | Visitas | 1h antes |
| VI-03 | Sync Google Calendar | Visitas | Cada 15 min |
| AC-01 | Resumen Diario | Acciones | Diario (08:30) |
| AC-02 | Escalado Automatico | Acciones | Cada 6h |
| AC-03 | Auto-cierre | Acciones | Diario (23:00) |
| PI-01 | Triggers por Etapa | Pipeline | Al cambiar etapa |
| PI-02 | Report Semanal | Pipeline | Viernes (18:00) |
| PI-03 | Alerta Deal Estancado | Pipeline | Diario (09:00) |
| MR-01 | Auto-gen Monthly Review | Seguimiento | Dia 1 de cada mes |
| MR-02 | Informe Consolidado | Seguimiento | Dia 5 de cada mes |
| SV-01 | NPS Post-Cierre | Encuestas | 7 dias tras cierre |
| SV-02 | CSAT Trimestral | Encuestas | Cada 90 dias |
| IN-01 | Importar Leads Scraping | Integraciones | Bajo demanda |
| IN-02 | Notificaciones Telegram | Integraciones | Tiempo real |

### Activar/desactivar

Cada automatizacion tiene un toggle on/off. Ve a **Automatizaciones** para gestionar el estado de cada una.

### Logs de ejecucion

Cada ejecucion se registra con:
- Fecha y hora, duracion, estado (success/error), detalles del resultado

### Crear automatizaciones custom

Usa **n8n** (conectado desde Integraciones) para crear workflows personalizados. St4rtup envia eventos via webhook a n8n.`,
  },
  {
    id: 'surveys', title: 'Encuestas', icon: ClipboardList, accent: T.purple,
    content: `## Encuestas NPS/CSAT

Mide la satisfaccion de tus clientes con encuestas automatizadas.

### Tipos de encuesta

| Tipo | Pregunta principal | Escala |
|------|-------------------|--------|
| NPS | "¿Recomendarias St4rtup?" | 0-10 |
| CSAT | "¿Que tan satisfecho estas?" | 1-5 |
| CES | "¿Fue facil resolver tu problema?" | 1-7 |
| Custom | Preguntas personalizadas | Libre |

### Crear encuesta

1. Ve a **Encuestas → Nueva Encuesta**
2. Selecciona tipo (NPS, CSAT, CES, Custom)
3. Edita el titulo y preguntas
4. Configura el email de envio (template editable)
5. Selecciona destinatarios (leads, clientes, filtro)
6. Programa o envia inmediatamente

### Formularios publicos

Cada encuesta genera un link publico que puedes compartir:
\`\`\`
https://app.st4rtup.com/form/{encuesta_id}
\`\`\`

El formulario es responsive y no requiere login.

### Resultados

- **NPS Score**: % Promotores (9-10) - % Detractores (0-6)
- Graficos de distribucion
- Comentarios individuales con sentiment analysis (IA)
- Evolucion temporal

### Integraciones de encuestas

Puedes usar proveedores externos en lugar del sistema nativo:
Typeform, Google Forms, SurveyMonkey, Tally, JotForm, Survicate, Hotjar.

Configuralos en **Integraciones → Encuestas y Feedback**.`,
  },
  {
    id: 'deal-room', title: 'Deal Room', icon: Lock, accent: 'hsl(250,60%,58%)',
    content: `## Deal Room (Plan Scale)

Espacio colaborativo seguro entre tu equipo y el comprador.

### Funcionalidades

| Funcion | Descripcion |
|---------|-------------|
| Documentos con watermark | PDFs automaticamente watermarkeados con nombre, email y timestamp |
| Page analytics | Que paginas leyo el comprador, cuanto tiempo, cuantas sesiones |
| NDA digital | Firma con Signaturit, Yousign o DocuSign. Fallback automatico |
| Q&A | Mensajes directos entre seller y buyer |
| Permisos | Acceso por link con token, expirable |

### Crear un Deal Room

1. Ve al detalle de una oportunidad
2. Click **Crear Deal Room**
3. Sube documentos (propuesta, caso de uso, pricing)
4. Configura si requiere NDA previo
5. Genera el link y comparte con el comprador

### Watermark automatico

Todos los PDFs subidos se watermarkean con:
- Nombre de la empresa compradora
- Email del usuario que accede
- Fecha y hora de acceso
- Texto personalizable

### Page Analytics

Sabras exactamente:
- Que paginas del documento leyo cada persona
- Cuanto tiempo paso en cada pagina
- Cuantas sesiones tuvo
- Desde que dispositivo/navegador

### NDA Gate

Si activas el NDA Gate:
1. El comprador ve una pantalla de NDA antes de acceder
2. Debe firmar electronicamente (Signaturit > Yousign > DocuSign)
3. Solo tras firmar puede ver los documentos
4. La firma se registra con hash y timestamp`,
  },
  {
    id: 'payments', title: 'Pagos y Facturacion', icon: CreditCard, accent: T.cyan,
    content: `## Pagos y Facturacion

Cobra a tus clientes directamente desde el CRM.

### Proveedores de pago

| Proveedor | Tipo | Comision |
|-----------|------|----------|
| Stripe | Tarjeta, SEPA, Apple/Google Pay | 1.5% + 0.25€ (EU) |
| PayPal | PayPal, tarjeta | 2.9% + 0.30€ |

### Stripe

Configura en **Integraciones → Facturacion → Stripe**:
- **Secret Key**: \`sk_live_...\`
- **Webhook Secret**: \`whsec_...\`

Funcionalidades:
- Checkout integrado (redirect a Stripe)
- Suscripciones mensuales/anuales
- Facturas automaticas
- Portal de cliente (gestionar suscripcion)

### Facturas

Genera facturas con:
- Numero secuencial automatico
- Datos fiscales (CIF/NIF, direccion)
- IVA 21% (Espana, configurable)
- Lineas de detalle (producto, cantidad, precio)
- PDF generado automaticamente
- Envio por email

### Planes de pricing

Crea planes para tus clientes:

| Campo | Descripcion |
|-------|-------------|
| Nombre | Nombre del plan |
| Precio | Importe en EUR |
| Intervalo | Mensual, anual, unico |
| Stripe Price ID | ID del precio en Stripe |
| Features | Lista de caracteristicas incluidas |
| Limites | Max usuarios, max leads |

### Webhook de pagos

Stripe envia eventos al endpoint:
\`\`\`
POST /api/v1/payments/webhook/stripe
\`\`\`

Eventos procesados: \`payment_intent.succeeded\`, \`checkout.session.completed\`, \`customer.subscription.deleted\`.`,
  },
  {
    id: 'whatsapp', title: 'WhatsApp Business', icon: MessageCircle, accent: T.success,
    content: `## WhatsApp Business

Comunicacion directa con leads via WhatsApp Business Cloud API.

### Configuracion

En **Integraciones → Comunicacion → WhatsApp Business**:

| Campo | Donde obtenerlo |
|-------|-----------------|
| Access Token | Meta Business Suite → WhatsApp → API Setup |
| Phone Number ID | Meta Business Suite → WhatsApp → Phone Numbers |
| Business Account ID | Meta Business Suite → Settings → Business Info |

### Funcionalidades

- **Mensajes de texto**: Envio directo desde el CRM
- **Templates**: Mensajes pre-aprobados por Meta (obligatorio para primer contacto)
- **Multimedia**: Imagenes, documentos, audio
- **Chatbot IA**: Respuestas automaticas con el LLM configurado
- **Inbox unificado**: Todas las conversaciones en una sola vista

### Chatbot IA

El chatbot responde automaticamente usando tu LLM configurado:
- Responde preguntas frecuentes
- Recopila datos del lead (nombre, empresa, necesidad)
- Escala a un humano si no puede resolver
- Toggle on/off por conversacion

### Conversaciones

Cada conversacion tiene:
- **Estado**: Activa, Archivada, Bot, Escalada
- **Lead vinculado**: Se asocia automaticamente por telefono
- **Unread count**: Mensajes sin leer
- **Bot enabled**: Toggle para activar/desactivar chatbot`,
  },
  {
    id: 'social', title: 'Social Media', icon: Hash, accent: 'hsl(210,70%,55%)',
    content: `## Social Media

Publica y programa contenido en redes sociales.

### Redes soportadas

| Red | Publicar | Programar | Metricas |
|-----|:--------:|:---------:|:--------:|
| LinkedIn | Si | Si | Si |
| Twitter/X | Si | Si | Si |
| Instagram | Si | Si | Si |
| YouTube | Solo links | Si | Via tab YouTube |

### Crear publicacion

1. Ve a **Marketing → Social Media**
2. Click **+ Nueva Publicacion**
3. Redacta el contenido (o usa IA para generar)
4. Selecciona redes destino
5. Adjunta imagen/video si procede
6. Publica ahora o programa fecha/hora

### Recurrencias

Programa publicaciones recurrentes:
- Diaria, semanal, quincenal, mensual
- Con variaciones automaticas de texto (IA)

### YouTube Analytics

Tab dedicada con metricas del canal:
- Suscriptores, vistas, watch time
- Videos recientes con performance
- Engagement rate`,
  },
  {
    id: 'reports', title: 'Reportes', icon: BarChart3, accent: 'hsl(340,65%,55%)',
    content: `## Reportes

Informes predefinidos y constructor de reportes custom.

### Reportes predefinidos

| Reporte | Contenido |
|---------|-----------|
| Pipeline | Valor por etapa, conversion entre etapas, velocity |
| Actividad | Emails, visitas, llamadas, acciones por comercial |
| Rendimiento | Revenue, deals ganados/perdidos, tamano medio |
| Leads | Nuevos leads, fuentes, scoring distribution |
| Forecast | Revenue ponderado proximo trimestre |

### Report Builder

Constructor visual de reportes:
1. Selecciona origen de datos (leads, pipeline, actividad, marketing)
2. Elige metricas y dimensiones
3. Aplica filtros (fecha, estado, comercial)
4. Selecciona tipo de grafico (barras, linea, pie, tabla)
5. Guarda y comparte

### Export

Todos los reportes se pueden exportar en:
- **PDF** — Con logo corporativo y graficos
- **CSV** — Para analisis en Excel/Sheets
- **Imagen** — Captura del dashboard`,
  },
  {
    id: 'calendar', title: 'Calendario', icon: Calendar, accent: T.warning,
    content: `## Calendario

Vista calendario unificada de todas las actividades.

### Tipos de eventos

| Color | Tipo | Fuente |
|:-----:|------|--------|
| Azul | Visitas | Modulo Visitas |
| Naranja | Acciones con fecha | Modulo Acciones |
| Verde | Deals por cerrar | Pipeline (fecha de cierre) |
| Morado | Campanas | Marketing Calendar |
| Gris | Eventos externos | Google Calendar sync |

### Vistas

- **Mes**: Vista mensual completa
- **Semana**: Vista semanal con horas
- **Dia**: Vista diaria detallada
- **Agenda**: Lista cronologica

### Drag & drop

Arrastra eventos para cambiar de fecha. Los cambios se reflejan en el modulo original y en Google Calendar si esta sincronizado.`,
  },
  {
    id: 'users', title: 'Usuarios y Roles', icon: Users, accent: T.fgMuted,
    content: `## Usuarios y Roles

Gestion de accesos y permisos del equipo.

### Roles

| Rol | Permisos |
|-----|----------|
| Admin | Todo: CRUD completo, configuracion, integraciones, usuarios |
| Comercial | CRUD leads, pipeline, acciones, visitas, emails. Sin config |
| Viewer | Solo lectura en todos los modulos |

### Limites por plan

| Plan | Max usuarios |
|------|:------------:|
| Starter | 1 |
| Growth | 3 |
| Scale | 10 |
| +5 Usuarios (addon) | +5 al plan actual |

### Invitar usuarios

1. Ve a **Usuarios** (solo Admin)
2. Click **+ Invitar**
3. Introduce email y rol
4. El usuario recibe un email de invitacion
5. Al aceptar, queda vinculado a tu organizacion

### Perfil

Cada usuario puede editar:
- Nombre, email, avatar, telefono
- Idioma preferido (ES/EN/PT)
- Zona horaria
- Firma de email`,
  },
  {
    id: 'settings', title: 'Configuracion', icon: Settings, accent: T.fgMuted,
    content: `## Configuracion

### General

| Ajuste | Descripcion |
|--------|-------------|
| Nombre empresa | Nombre mostrado en emails y docs |
| Logo | Logo para PDFs, emails y Deal Room |
| Idioma | ES, EN o PT |
| Zona horaria | Para programar automatizaciones |
| Moneda | EUR por defecto |
| Formato fecha | DD/MM/YYYY o MM/DD/YYYY |

### Notificaciones

Canales de notificacion:
- **In-app**: Campanilla en el menu superior
- **Email**: Resumen diario o tiempo real
- **Telegram**: Alertas criticas al bot
- **Slack**: Digest diario al canal de ventas

### Seguridad

- Autenticacion via Supabase Auth (email + password)
- JWT tokens con expiracion configurable
- 2FA (proximamente)
- Logs de acceso en Audit Log (Marketing Hub)

### Preferencias de usuario

Se almacenan en el navegador (Zustand persist):
- Tema (claro/oscuro)
- Sidebar colapsado/expandido
- Columnas visibles en tablas
- Filtros por defecto`,
  },
  {
    id: 'api', title: 'API Publica', icon: Globe, accent: 'hsl(210,60%,50%)',
    content: `## API Publica (Plan Scale)

Accede a todos los datos de St4rtup via REST API.

### Autenticacion

Todas las peticiones requieren un Bearer token:

\`\`\`
Authorization: Bearer {tu_jwt_token}
\`\`\`

### Endpoints principales

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /api/v1/leads | Listar leads (paginado) |
| POST | /api/v1/leads | Crear lead |
| GET | /api/v1/leads/{id} | Detalle de un lead |
| PUT | /api/v1/leads/{id} | Actualizar lead |
| DELETE | /api/v1/leads/{id} | Eliminar lead |
| GET | /api/v1/opportunities | Listar oportunidades |
| GET | /api/v1/dashboard/stats | KPIs del dashboard |
| GET | /api/v1/reports/pipeline | Informe de pipeline |
| POST | /api/v1/emails | Enviar email |

### Paginacion

Todos los endpoints de lista soportan:

\`\`\`
GET /api/v1/leads?page=1&page_size=20
\`\`\`

Response:
\`\`\`json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20
}
\`\`\`

### Webhooks salientes

Configura webhooks para recibir eventos:
- \`lead.created\`, \`lead.updated\`, \`lead.deleted\`
- \`opportunity.stage_changed\`, \`opportunity.won\`, \`opportunity.lost\`
- \`email.sent\`, \`email.opened\`, \`email.clicked\`
- \`visit.created\`, \`action.overdue\`

Firma HMAC-SHA256 en el header \`X-Webhook-Signature\`.

### Rate limiting

| Plan | Limite |
|------|--------|
| Scale | 1.000 req/min |
| Enterprise | 10.000 req/min |

### Documentacion interactiva

Swagger UI disponible en:
\`\`\`
https://api.st4rtup.com/docs
\`\`\``,
  },
]

// ─── Markdown renderer ──────────────────────────────────────────────

function renderMarkdown(md) {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:${T.muted};border:1px solid ${T.border};border-radius:8px;padding:12px 16px;font-family:${fontMono};font-size:12px;line-height:1.6;color:${T.fg};overflow-x:auto;margin:12px 0">${code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, `<code style="background:${T.muted};padding:1px 6px;border-radius:4px;font-family:${fontMono};font-size:12px;color:${T.cyan}">$1</code>`)
    // Tables
    .replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (_, header, body) => {
      const thStyle = `padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:${T.fg};border-bottom:2px solid ${T.border};white-space:nowrap`
      const tdStyle = `padding:6px 12px;font-size:12px;color:${T.fgMuted};border-bottom:1px solid ${T.border}`
      const ths = header.split('|').filter(Boolean).map(h => {
        const align = h.trim()
        return `<th style="${thStyle}">${align}</th>`
      }).join('')
      const rows = body.trim().split('\n').map(row => {
        const tds = row.split('|').filter(Boolean).map(d =>
          `<td style="${tdStyle}">${d.trim()}</td>`
        ).join('')
        return `<tr>${tds}</tr>`
      }).join('')
      return `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;border:1px solid ${T.border};border-radius:8px;overflow:hidden"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`
    })
    // Headers
    .replace(/### (.*)/g, `<h3 style="font-size:14px;font-weight:700;margin:20px 0 8px;color:${T.fg};font-family:${fontDisplay}">$1</h3>`)
    .replace(/## (.*)/g, `<h2 style="font-size:18px;font-weight:700;margin:28px 0 12px;color:${T.fg};font-family:${fontDisplay};padding-bottom:8px;border-bottom:1px solid ${T.border}">$1</h2>`)
    // Bold
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${T.fg};font-weight:600">$1</strong>`)
    // Links — only allow http(s) and relative URLs (block javascript:, data:, etc.)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const safe = /^(https?:|\/)/i.test(url.trim())
      if (!safe) return text  // strip unsafe URLs entirely
      const isExternal = /^https?:/i.test(url.trim())
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${url}"${attrs} style="color:${T.cyan};text-decoration:none;border-bottom:1px dashed ${T.cyan}40">${text}</a>`
    })
    // Lists
    .replace(/^(\d+)\. (.*)/gm, `<li style="margin:4px 0;padding-left:4px;color:${T.fgMuted};font-size:13px;list-style-type:decimal">$2</li>`)
    .replace(/^- (.*)/gm, `<li style="margin:3px 0;padding-left:4px;color:${T.fgMuted};font-size:13px">$1</li>`)

  // Wrap consecutive <li> in <ul>/<ol>
  html = html.replace(/((?:<li[^>]*list-style-type:decimal[^>]*>.*?<\/li>\s*)+)/g,
    `<ol style="padding-left:20px;margin:8px 0">$1</ol>`)
  html = html.replace(/((?:<li(?![^>]*list-style-type)[^>]*>.*?<\/li>\s*)+)/g,
    `<ul style="list-style:disc;padding-left:20px;margin:8px 0">$1</ul>`)

  // Paragraphs
  html = html.replace(/\n\n/g, '<br style="margin:6px 0"/>')

  return html
}

// ─── Copy button for code blocks ────────────────────────────────────

function ContentRenderer({ html }) {
  // Sanitize HTML to prevent XSS — allow only safe markdown-generated tags
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  })
  return (
    <div
      dangerouslySetInnerHTML={{ __html: clean }}
      style={{ fontSize: 13, lineHeight: 1.75, color: '#475569' }}
    />
  )
}

// ─── Main component ─────────────────────────────────────────────────

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState('getting-started')
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({ general: true, crm: true, marketing: true, ia: true, integraciones: true, avanzado: true })

  const CATEGORIES = [
    { id: 'general', label: 'General', docs: ['getting-started'] },
    { id: 'crm', label: 'CRM Core', docs: ['leads', 'pipeline', 'actions', 'visits', 'emails', 'contacts', 'calendar', 'surveys'] },
    { id: 'marketing', label: 'Marketing', docs: ['marketing', 'seo', 'social'] },
    { id: 'ia', label: 'Inteligencia Artificial', docs: ['ai-agents', 'calls'] },
    { id: 'integraciones', label: 'Integraciones y Config', docs: ['integrations', 'automations', 'payments', 'whatsapp', 'users', 'settings'] },
    { id: 'avanzado', label: 'Avanzado', docs: ['deal-room', 'reports', 'api'] },
  ]

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return DOCS.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
  }, [search])

  const current = DOCS.find(d => d.id === activeDoc) || DOCS[0]
  const renderedContent = useMemo(() => renderMarkdown(current.content), [current.id])

  const toggleCategory = (id) => setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7" style={{ color: T.cyan }} />
            Documentacion
          </h1>
          <p style={{ color: T.fgMuted }} className="text-sm mt-1">
            {DOCS.length} secciones — Guia completa de la plataforma
          </p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ border: `1px solid ${T.border}`, color: T.fgMuted, backgroundColor: T.card, cursor: 'pointer' }}>
          <Printer className="w-3.5 h-3.5" /> Imprimir
        </button>
      </div>

      <div className="flex gap-5" style={{ alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div className="hidden md:block" style={{ width: 240, flexShrink: 0, position: 'sticky', top: 16 }}>
          {/* Search */}
          <div className="mb-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.fgMuted }} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full"
              style={{ padding: '6px 10px 6px 30px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, backgroundColor: T.card, color: T.fg, outline: 'none' }} />
          </div>

          {/* Search results */}
          {filteredDocs ? (
            <nav className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest px-2 py-1" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                {filteredDocs.length} resultados
              </p>
              {filteredDocs.map(d => {
                const Icon = d.icon
                return (
                  <button key={d.id} onClick={() => { setActiveDoc(d.id); setSearch('') }}
                    className="w-full flex items-center gap-2 rounded-md transition-colors"
                    style={{
                      padding: '5px 8px', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left',
                      backgroundColor: activeDoc === d.id ? `${T.cyan}10` : 'transparent',
                      color: activeDoc === d.id ? T.cyan : T.fgMuted,
                      fontWeight: activeDoc === d.id ? 600 : 400,
                    }}>
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: d.accent }} />
                    <span className="truncate">{d.title}</span>
                  </button>
                )
              })}
            </nav>
          ) : (
            /* Category nav */
            <nav className="space-y-1">
              {CATEGORIES.map(cat => (
                <div key={cat.id}>
                  <button onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between rounded-md"
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ fontFamily: fontMono, color: T.fgMuted }}>{cat.label}</span>
                    {expandedCategories[cat.id]
                      ? <ChevronDown className="w-3 h-3" style={{ color: T.fgMuted }} />
                      : <ChevronRight className="w-3 h-3" style={{ color: T.fgMuted }} />}
                  </button>
                  {expandedCategories[cat.id] && (
                    <div className="space-y-0.5 mt-0.5 ml-1">
                      {cat.docs.map(docId => {
                        const d = DOCS.find(x => x.id === docId)
                        if (!d) return null
                        const Icon = d.icon
                        return (
                          <button key={d.id} onClick={() => setActiveDoc(d.id)}
                            className="w-full flex items-center gap-2 rounded-md transition-colors"
                            style={{
                              padding: '4px 8px', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left',
                              backgroundColor: activeDoc === d.id ? `${T.cyan}10` : 'transparent',
                              color: activeDoc === d.id ? T.cyan : T.fgMuted,
                              fontWeight: activeDoc === d.id ? 600 : 400,
                            }}>
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: activeDoc === d.id ? T.cyan : d.accent }} />
                            <span className="truncate">{d.title}</span>
                            {activeDoc === d.id && <ChevronRight className="w-3 h-3 ml-auto shrink-0" style={{ color: T.cyan }} />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-4">
          <select
            value={activeDoc}
            onChange={e => setActiveDoc(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, backgroundColor: T.card, color: T.fg }}
          >
            {DOCS.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <BookOpen className="w-3.5 h-3.5" style={{ color: T.fgMuted }} />
            <span className="text-[11px]" style={{ color: T.fgMuted }}>Docs</span>
            <ChevronRight className="w-3 h-3" style={{ color: T.border }} />
            <span className="text-[11px] font-medium" style={{ color: T.fg }}>{current.title}</span>
          </div>
          {/* Article */}
          <div className="px-6 py-5" style={{ maxWidth: 780 }}>
            <ContentRenderer html={renderedContent} />
          </div>
        </div>
      </div>
    </div>
  )
}
