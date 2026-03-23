# 🔧 Configuración del Backend para Zoho Extension

Para que la extensión de Zoho Mail funcione correctamente, necesitas configurar el backend para permitir requests desde los dominios de Zoho.

---

## 🌐 Configurar CORS

### **Opción 1: Variable de Entorno (Recomendado)**

En tu deployment (Railway, Heroku, etc.), agrega esta variable de entorno:

```bash
BACKEND_CORS_ORIGINS=["https://mail.zoho.com","https://mail.zoho.eu","https://extensions.zoho.com","https://extensions.zoho.eu","http://localhost:5173"]
```

**Nota**: El formato es un array JSON como string.

### **Opción 2: Archivo .env (Desarrollo Local)**

En `backend/.env`:

```bash
BACKEND_CORS_ORIGINS=["https://mail.zoho.com","https://mail.zoho.eu","https://extensions.zoho.com","https://extensions.zoho.eu","http://localhost:5173","http://localhost:3000"]
```

---

## 🔐 Generar Token JWT para la Extensión

### **Paso 1: Iniciar sesión en el CRM**

Ve a `https://sales.riskitera.com` e inicia sesión con tu cuenta.

### **Paso 2: Obtener el Token**

**Método A: Desde la Consola del Navegador**

1. Abre las DevTools (F12)
2. Ve a la pestaña **Application** o **Almacenamiento**
3. Expande **Local Storage** → `sales.riskitera.com`
4. Busca la clave que empiece con `sb-` seguido del ID del proyecto
5. Dentro verás un objeto JSON, busca `access_token`
6. Copia ese valor (es un JWT largo)

**Método B: Desde el Backend (Alternativa)**

Crea un endpoint temporal en el backend:

```python
# backend/app/api/v1/endpoints/auth.py

@router.get("/me/token")
async def get_my_token(current_user: dict = Depends(get_current_user)):
    """Get current user JWT token"""
    # En producción, desactivar este endpoint por seguridad
    return {"token": current_user.get("token")}
```

Luego:
```bash
curl https://tu-backend.railway.app/api/v1/auth/me/token \
  -H "Authorization: Bearer TU_TOKEN_ACTUAL"
```

### **Paso 3: Configurar en la Extensión**

1. En Zoho Mail, ve a **Configuración** → **Extensiones**
2. Busca **Riskitera CRM**
3. Click en **Configurar**
4. Pega:
   - **API URL**: `https://tu-backend.railway.app`
   - **API Token**: El JWT que obtuviste
5. Guarda

---

## ✅ Verificar Configuración

### **Test 1: CORS**

Desde la consola del navegador en Zoho Mail:

```javascript
fetch('https://tu-backend.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Resultado esperado:**
```json
{ "status": "healthy" }
```

**Si falla con CORS error:**
- Verifica que la variable `BACKEND_CORS_ORIGINS` esté configurada
- Reinicia el backend después de cambiar variables de entorno

### **Test 2: Autenticación**

```javascript
fetch('https://tu-backend.railway.app/api/v1/leads?page_size=1', {
  headers: {
    'Authorization': 'Bearer TU_TOKEN',
    'Content-Type': 'application/json'
  }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Resultado esperado:**
```json
{
  "items": [...],
  "total": X,
  "page": 1
}
```

**Si falla con 401:**
- El token JWT ha expirado o es inválido
- Genera un nuevo token siguiendo los pasos anteriores

---

## 🚀 Deployment Checklist

Antes de usar la extensión en producción:

- [ ] Variable `BACKEND_CORS_ORIGINS` configurada con dominios de Zoho
- [ ] Backend reiniciado después de cambiar variables
- [ ] Token JWT generado y configurado en la extensión
- [ ] Test de CORS exitoso
- [ ] Test de autenticación exitoso
- [ ] Extensión cargada en Zoho Mail (modo desarrollador o producción)

---

## 🔒 Seguridad

### **Rotación de Tokens**

Los JWT de Supabase expiran automáticamente después de 1 hora. Si la extensión falla con error 401:

1. Genera un nuevo token
2. Actualiza la configuración de la extensión
3. Refresca Zoho Mail

**Próximamente**: Implementaremos refresh token automático.

### **Limitar Orígenes CORS**

En producción, usa solo los dominios necesarios:

```bash
# Solo dominios de Zoho (sin localhost)
BACKEND_CORS_ORIGINS=["https://mail.zoho.com","https://mail.zoho.eu","https://extensions.zoho.com","https://extensions.zoho.eu"]
```

### **Rate Limiting**

Considera agregar rate limiting al backend:

```python
# backend/app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/leads")
@limiter.limit("100/minute")
async def get_leads(...):
    pass
```

---

## 🐛 Troubleshooting

### **Error: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Causa**: CORS no configurado correctamente.

**Solución**:
1. Verifica que `BACKEND_CORS_ORIGINS` incluya `https://mail.zoho.com`
2. Reinicia el backend
3. Limpia caché del navegador (Ctrl+Shift+R)

### **Error: "401 Unauthorized"**

**Causa**: Token JWT expirado o inválido.

**Solución**:
1. Genera un nuevo token JWT
2. Actualiza configuración de la extensión
3. Refresca Zoho Mail

### **Error: "TypeError: Failed to fetch"**

**Causa**: Backend no accesible o URL incorrecta.

**Solución**:
1. Verifica que la API URL sea correcta (sin `/` al final)
2. Prueba la URL en el navegador: `https://tu-backend.railway.app/health`
3. Verifica que el backend esté funcionando

### **Widget no se carga**

**Causa**: Extensión no instalada o configurada.

**Solución**:
1. En Zoho Mail → Configuración → Extensiones
2. Verifica que **Riskitera CRM** esté instalada y activa
3. Si estás en desarrollo, verifica que el modo desarrollador esté activo

---

## 📊 Monitoreo

### **Logs del Backend**

Monitoriza requests desde Zoho Mail:

```bash
# Railway
railway logs

# Heroku
heroku logs --tail -a tu-app

# Docker
docker logs -f container-name
```

Busca líneas que incluyan requests desde `mail.zoho.com`.

### **Métricas Útiles**

- Requests desde dominios de Zoho
- Errores 401 (tokens expirados)
- Errores 404 (leads no encontrados)
- Tiempo de respuesta de búsqueda de leads

---

## 🔄 Actualizar Backend en Producción

Cuando actualices el backend:

1. Haz deploy de los cambios
2. **NO** es necesario actualizar la extensión si solo cambió el backend
3. La extensión seguirá funcionando con la nueva versión del backend
4. Solo regenera el token si cambió el sistema de autenticación

---

## 📞 Soporte

Si tienes problemas configurando el backend:

- **Email**: sales@riskitera.com
- **Documentación**: `zoho-extension/README.md`
- **Arquitectura**: `zoho-extension/ARCHITECTURE.md`
