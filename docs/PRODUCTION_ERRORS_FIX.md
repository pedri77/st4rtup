# 🔧 Solución de Errores CORS y 404 en Producción

## 🔴 Problemas Detectados

### Error 1: CORS Blocked
```
Access to XMLHttpRequest at 'https://riskitera-sales-backend.fly.dev/api/v1/automations/stats'
from origin 'https://riskitera-sales-v1.pages.dev' has been blocked by CORS policy
```

**Causa:** El backend no tiene configurado el dominio de Cloudflare Pages en CORS.

### Error 2: 404 en /notifications/stats
```
GET https://riskitera-sales-backend.fly.dev/api/v1/notifications/stats 404 (Not Found)
```

**Causa:** El backend no está respondiendo correctamente o está caído.

---

## ✅ Solución 1: Configurar CORS en el Backend

### Opción A: Railway (Recomendado según CLAUDE.md)

1. Ve a **Railway Dashboard** → Tu proyecto backend
2. Ve a **Variables** → **Add Variable**
3. Agrega:

```bash
Variable Name: BACKEND_CORS_ORIGINS
Value: ["http://localhost:5173","https://riskitera-sales-v1.pages.dev","https://riskitera-sales.pages.dev","https://sales.riskitera.com"]
```

4. **Redeploy** el backend para aplicar cambios
5. Verifica con: `curl https://tu-backend.up.railway.app/health`

### Opción B: Fly.io (Si usas Fly.io)

```bash
# En tu terminal local
cd backend

# Configurar variable de entorno
fly secrets set BACKEND_CORS_ORIGINS='["http://localhost:5173","https://riskitera-sales-v1.pages.dev","https://riskitera-sales.pages.dev","https://sales.riskitera.com"]'

# Verificar
fly secrets list

# Redeploy
fly deploy
```

---

## ✅ Solución 2: Configurar Variables en Cloudflare Pages

### Paso 1: Determinar URL Correcta del Backend

Primero, verifica qué backend está activo:

```bash
# Probar Railway
curl https://riskitera-sales.up.railway.app/health
# O
curl https://tu-proyecto.railway.app/health

# Probar Fly.io
curl https://riskitera-sales-backend.fly.dev/health

# Debería retornar: {"status":"healthy"}
```

### Paso 2: Configurar en Cloudflare Pages

1. Ve a **Cloudflare Dashboard** → **Workers & Pages**
2. Selecciona tu proyecto: `riskitera-sales` o similar
3. Ve a **Settings** → **Environment variables**
4. Click en **Add variables**

**Para Production:**

```bash
Variable name: VITE_API_URL
Value: https://riskitera-sales-backend.fly.dev/api/v1
Environment: Production
```

**Para Preview (opcional):**

```bash
Variable name: VITE_API_URL
Value: https://riskitera-sales-backend.fly.dev/api/v1
Environment: Preview
```

5. **Save**
6. Ve a **Deployments** → Click en **...** en el último deployment → **Retry deployment**

---

## ✅ Solución 3: Actualizar Código CORS (Backend)

Agrega el dominio de producción por defecto:

**Archivo:** `backend/app/core/config.py` (línea 13)

```python
# Antes
BACKEND_CORS_ORIGINS: str = '["http://localhost:5173","https://riskitera-sales-v1.pages.dev","https://riskitera-sales.pages.dev"]'

# Después
BACKEND_CORS_ORIGINS: str = '["http://localhost:5173","https://riskitera-sales-v1.pages.dev","https://riskitera-sales.pages.dev","https://sales.riskitera.com"]'
```

Luego:

```bash
git add backend/app/core/config.py
git commit -m "fix: add sales.riskitera.com to CORS origins"
git push origin main

# Redeploy backend en Railway/Fly.io
```

---

## ✅ Solución 4: Verificar Estado del Backend

### Verificar si el Backend está Activo

```bash
# Health check
curl https://riskitera-sales-backend.fly.dev/health

# Si responde {"status":"healthy"} → Backend OK
# Si no responde → Backend caído
```

### Si el Backend está Caído

**En Railway:**
1. Ve a Dashboard → Tu proyecto
2. Verifica que el deployment esté **Active**
3. Si está detenido, click en **Deploy**
4. Revisa **Logs** para ver errores

**En Fly.io:**

```bash
# Ver status
fly status

# Ver logs
fly logs

# Redeploy
fly deploy

# Escalar si está dormido
fly scale count 1
```

---

## ✅ Solución 5: Modo Mock de Emergencia (Temporal)

Si el backend no está disponible, puedes activar el modo mock completo:

**Archivo:** `frontend/src/mocks/mockData.js` (línea 1)

```javascript
// Cambiar de false a true temporalmente
export const USE_MOCK_DATA = true
```

Esto hará que el frontend funcione con datos de prueba sin necesitar el backend.

**Nota:** Esto es solo temporal para desarrollo. No usar en producción.

---

## 🧪 Testing - Verificar que Todo Funciona

### 1. Verificar CORS

```bash
# Desde terminal
curl -H "Origin: https://riskitera-sales-v1.pages.dev" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://riskitera-sales-backend.fly.dev/api/v1/dashboard/stats

# Debe retornar headers con:
# access-control-allow-origin: https://riskitera-sales-v1.pages.dev
```

### 2. Verificar Endpoints

```bash
# Health check
curl https://riskitera-sales-backend.fly.dev/health

# Notifications stats (requiere auth)
curl https://riskitera-sales-backend.fly.dev/api/v1/notifications/stats \
     -H "Authorization: Bearer YOUR_TOKEN"

# Automations stats
curl https://riskitera-sales-backend.fly.dev/api/v1/automations/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Verificar en Browser

1. Abre https://riskitera-sales-v1.pages.dev
2. Login
3. Abre **DevTools** (F12) → **Console**
4. Busca errores de CORS o 404
5. Ve a **Network** tab y verifica que las peticiones retornen 200

---

## 📋 Checklist de Solución

- [ ] Verificar que el backend está activo (`/health` responde)
- [ ] Configurar `BACKEND_CORS_ORIGINS` en Railway/Fly.io
- [ ] Configurar `VITE_API_URL` en Cloudflare Pages
- [ ] Redeploy backend (Railway/Fly.io)
- [ ] Redeploy frontend (Cloudflare Pages)
- [ ] Verificar en browser que no hay errores CORS
- [ ] Verificar que `/notifications/stats` responde (200 OK)
- [ ] Verificar que `/automations/stats` responde (200 OK)

---

## 🚨 Resumen Rápido

**Si tienes prisa, ejecuta esto:**

```bash
# 1. Configurar CORS en Fly.io
fly secrets set BACKEND_CORS_ORIGINS='["http://localhost:5173","https://riskitera-sales-v1.pages.dev","https://riskitera-sales.pages.dev","https://sales.riskitera.com"]'

# 2. Redeploy backend
fly deploy

# 3. Configurar en Cloudflare Pages (ve a dashboard web):
#    Settings > Environment variables > Add variable
#    VITE_API_URL = https://riskitera-sales-backend.fly.dev/api/v1

# 4. Redeploy frontend en Cloudflare Pages (desde dashboard)

# 5. Verificar
curl https://riskitera-sales-backend.fly.dev/health
```

---

## 🔗 URLs Importantes

- **Frontend Prod:** https://sales.riskitera.com
- **Frontend Preview:** https://riskitera-sales-v1.pages.dev
- **Backend (Fly.io):** https://riskitera-sales-backend.fly.dev
- **Backend (Railway):** https://[tu-proyecto].up.railway.app
- **Supabase:** https://dszhaxyzrnsgjlabtvqx.supabase.co

---

**✅ Una vez configurado, los errores CORS y 404 desaparecerán!**
