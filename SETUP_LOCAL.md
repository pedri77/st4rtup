# Guía de Instalación Local - Riskitera Sales

## Estado del Proyecto

✅ **Completado:**
- Repositorio clonado y limpio
- Módulo de automations integrado
- Variables de entorno configuradas (.env)
- Migraciones ejecutadas en Supabase
- Frontend desplegado en Cloudflare Pages

⏳ **Pendiente:**
- Ejecutar backend localmente
- Ejecutar frontend localmente
- Desplegar backend (Railway o Fly.io)

---

## Prerrequisitos

- Python 3.11+
- Node.js 18+ y npm
- PostgreSQL client (opcional, para migraciones)

---

## 1. Backend (FastAPI)

### Instalación

```bash
# Navegar al directorio backend
cd /workspace/riskitera-sales/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
# En Linux/Mac:
source venv/bin/activate
# En Windows:
# venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### Verificar configuración

El archivo `.env` ya está configurado con:
- ✅ DATABASE_URL con tu base de datos Supabase
- ✅ SUPABASE_URL y SUPABASE_ANON_KEY
- ✅ SECRET_KEY para JWT
- ⚠️ SUPABASE_SERVICE_ROLE_KEY (opcional, solo para operaciones admin)

### Limpiar cache de Python (importante)

```bash
# En Windows (PowerShell):
Get-ChildItem -Path . -Include __pycache__,*.pyc -Recurse -Force | Remove-Item -Force -Recurse

# En Linux/Mac:
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete
```

### Ejecutar servidor

```bash
# Desde /workspace/riskitera-sales/backend (o tu ruta local)
uvicorn app.main:app --reload --port 8001
```

### Verificar funcionamiento

1. Abrir http://localhost:8001/docs (Swagger UI)
2. Probar endpoint: `GET /api/v1/dashboard/stats`
3. Si ves los datos del dashboard, ¡funciona!

### Ejecutar tests (opcional)

```bash
pytest tests/ -v --asyncio-mode=auto
```

---

## 2. Frontend (React + Vite)

### Instalación

```bash
# Navegar al directorio frontend
cd /workspace/riskitera-sales/frontend

# Instalar dependencias
npm install
```

### Verificar configuración

El archivo `.env` ya está configurado con:
- ✅ VITE_API_URL=http://localhost:8001
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

### Ejecutar servidor de desarrollo

```bash
# Desde /workspace/riskitera-sales/frontend
npm run dev
```

Esto iniciará el servidor en http://localhost:5173

### Build para producción

```bash
npm run build
```

---

## 3. Seed Data (Cargar datos de ejemplo)

### Automatizaciones (22 workflows n8n)

```bash
# Con el backend ejecutándose, desde otra terminal:
curl -X POST http://localhost:8001/api/v1/automations/seed \
  -H "Content-Type: application/json"
```

Esto cargará las 22 automatizaciones predefinidas.

### Leads de ejemplo (opcional)

Puedes crear leads manualmente desde:
- Frontend: http://localhost:5173/leads
- API: POST /api/v1/leads

O crear un script SQL de seed data si necesitas datos de prueba.

---

## 4. Verificación Completa

### Checklist de funcionamiento:

1. **Backend health check:**
   ```bash
   curl http://localhost:8001/health
   # Esperado: {"status":"healthy"}
   ```

2. **Dashboard stats:**
   ```bash
   curl http://localhost:8001/api/v1/dashboard/stats
   # Esperado: JSON con total_leads, pipeline_value, etc.
   ```

3. **Frontend carga:**
   - Abrir http://localhost:5173
   - Login con Supabase Auth
   - Ver Dashboard con datos

4. **Automations:**
   ```bash
   curl http://localhost:8001/api/v1/automations
   # Esperado: Array con 22 automations
   ```

---

## 5. Troubleshooting

### Error: "cannot import name 'Automation' from 'app.models'"

**Causa:** Python está usando archivos `.pyc` cacheados desactualizados.

**Solución:**
```bash
# Detener uvicorn (Ctrl+C)

# Limpiar cache de Python (Windows PowerShell):
cd C:\Users\zc01607\Documents\Desarrollo\Claude\riskitera-sales\backend
Get-ChildItem -Path . -Include __pycache__,*.pyc -Recurse -Force | Remove-Item -Force -Recurse

# Reiniciar uvicorn:
uvicorn app.main:app --reload --port 8001
```

### Error: "Connection refused" al conectar a database

**Solución:** Verifica que la contraseña en DATABASE_URL no tenga caracteres especiales sin escapar. Si tiene caracteres especiales, prueba URL-encodearlos:
```bash
# Caracteres especiales que deben ser URL-encoded:
# ! → %21
# " → %22
# # → %23
# $ → %24
# % → %25
# & → %26
# ' → %27
# ( → %28
# ) → %29
```

### Error: "ModuleNotFoundError: No module named 'app'"

**Solución:** Asegúrate de estar en el directorio `/workspace/riskitera-sales/backend` y que el entorno virtual esté activado.

### Error: "CORS policy" en el frontend

**Solución:** Verifica que en `backend/.env` el valor de `BACKEND_CORS_ORIGINS` incluya `http://localhost:5173`.

### Error: "Failed to fetch" en el frontend

**Solución:**
1. Verifica que el backend esté ejecutándose en http://localhost:8001
2. Revisa que `frontend/.env` tenga `VITE_API_URL=http://localhost:8001`
3. Reinicia el servidor de desarrollo del frontend

---

## 6. Próximos Pasos

### Deploy Backend a Railway

**Opción 1: Desde CLI**
```bash
cd /workspace/riskitera-sales/backend

# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Crear proyecto y deployar
railway init
railway up
```

**Opción 2: Desde GitHub**
1. Push del código a GitHub
2. Conectar repositorio en railway.app
3. Configurar Root Directory: `backend`
4. Configurar variables de entorno desde Railway Dashboard

### Deploy Backend a Fly.io (alternativa)

```bash
cd /workspace/riskitera-sales/backend

# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Crear app
flyctl launch

# Deploy
flyctl deploy
```

### Actualizar Frontend en Cloudflare Pages

Una vez que el backend esté desplegado, actualiza `frontend/.env` en Cloudflare Pages:
```
VITE_API_URL=https://tu-backend.railway.app
# o
VITE_API_URL=https://tu-backend.fly.dev
```

---

## 7. Comandos Útiles

```bash
# Backend - Ver logs
cd backend && uvicorn app.main:app --log-level debug

# Frontend - Build y preview
cd frontend && npm run build && npm run preview

# Verificar migraciones Alembic
cd backend && alembic current
cd backend && alembic history

# Crear nueva migración
cd backend && alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
cd backend && alembic upgrade head

# Rollback migración
cd backend && alembic downgrade -1
```

---

## 8. URLs del Proyecto

| Servicio | URL Local | URL Producción |
|----------|-----------|----------------|
| Frontend | http://localhost:5173 | https://riskitera-sales.pages.dev |
| Backend | http://localhost:8001 | (Por configurar) |
| API Docs | http://localhost:8001/docs | (Backend prod)/docs |
| Supabase | - | https://supabase.com/dashboard/project/dszhaxyzrnsgjlabtvqx |

---

## Notas Importantes

- **Base de datos:** Ya está creada en Supabase con las 13 tablas (11 del core + 2 de automations)
- **Autenticación:** Usa Supabase Auth (el frontend ya tiene el SDK configurado)
- **Emails:** Resend API está configurado pero es opcional (puedes implementarlo después)
- **Service Role Key:** Solo necesario para operaciones privilegiadas del backend (no es crítico para desarrollo)

---

¿Todo listo? Ejecuta backend y frontend, y ya tendrás el CRM funcionando en local! 🚀
