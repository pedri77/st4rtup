# Desplegar Backend a Fly.io

## 📋 Prerrequisitos

- Cuenta en Fly.io (https://fly.io/app/sign-up)
- `flyctl` instalado localmente

---

## 1️⃣ Instalar Fly.io CLI

### Windows (PowerShell):

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Linux/Mac:

```bash
curl -L https://fly.io/install.sh | sh
```

Después de la instalación, reinicia tu terminal.

---

## 2️⃣ Login en Fly.io

```bash
flyctl auth login
```

Se abrirá tu navegador para autenticarte. Una vez autenticado, vuelve a la terminal.

---

## 3️⃣ Crear la Aplicación en Fly.io

```bash
cd C:\Users\zc01607\Documents\Desarrollo\Claude\riskitera-sales\backend

# Crear app (interactivo)
flyctl launch

# Durante el proceso:
# - App name: riskitera-sales-backend (o el que prefieras)
# - Region: Madrid (mad) o la más cercana
# - PostgreSQL database: NO (ya tenemos Supabase)
# - Redis: NO
# - Overwrite fly.toml: NO (ya tenemos uno configurado)
```

---

## 4️⃣ Configurar Variables de Entorno (Secrets)

**IMPORTANTE**: Estas variables son sensibles y deben configurarse como secrets:

```bash
# Database
flyctl secrets set DATABASE_URL="postgresql://postgres:GoqA#7]^1Kp}Rm3jzc;(\"vD(5Spk}Alk@db.dszhaxyzrnsgjlabtvqx.supabase.co:5432/postgres"

# Supabase
flyctl secrets set SUPABASE_URL="https://dszhaxyzrnsgjlabtvqx.supabase.co"
flyctl secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzemhheHl6cm5zZ2psYWJ0dnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTIwNzMsImV4cCI6MjA4NzYyODA3M30.mDb0RupHEPMtFsYZ4G--XI6CNwIZXljGPZZE1-Ruubg"
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# JWT Auth
flyctl secrets set SECRET_KEY="GgTv8kmeWPS7HDduZl5n9iw6RVpPmPHOm+/NXGMebh8="

# CORS (actualizar con tu dominio de Cloudflare Pages)
flyctl secrets set BACKEND_CORS_ORIGINS='["https://riskitera-sales.pages.dev","http://localhost:5173"]'

# Email (opcional)
flyctl secrets set RESEND_API_KEY="re_your_resend_api_key_here"
```

**Nota sobre DATABASE_URL**: Si tienes problemas con caracteres especiales, usa comillas dobles escapadas como se muestra arriba.

---

## 5️⃣ Desplegar la Aplicación

```bash
# Desplegar
flyctl deploy

# Ver logs en tiempo real
flyctl logs
```

El despliegue tardará unos 2-3 minutos. Una vez completado, verás la URL de tu aplicación.

---

## 6️⃣ Verificar el Deployment

```bash
# Ver información de la app
flyctl status

# Ver la URL de tu app
flyctl info

# Abrir en el navegador
flyctl open
```

Tu backend estará disponible en: `https://riskitera-sales-backend.fly.dev`

### Probar endpoints:

```bash
# Health check
curl https://riskitera-sales-backend.fly.dev/health

# Root
curl https://riskitera-sales-backend.fly.dev/

# Docs (abrir en navegador)
https://riskitera-sales-backend.fly.dev/docs
```

---

## 7️⃣ Actualizar Frontend en Cloudflare Pages

Una vez que el backend esté desplegado, actualiza la variable de entorno en Cloudflare Pages:

1. Ve a Cloudflare Pages Dashboard
2. Selecciona tu proyecto `riskitera-sales`
3. Ve a **Settings** → **Environment variables**
4. Edita `VITE_API_URL`:
   ```
   Production: https://riskitera-sales-backend.fly.dev/api/v1
   ```
5. **Save**
6. Ve a **Deployments** → **View details** → **Redeploy**

---

## 8️⃣ Comandos Útiles de Fly.io

```bash
# Ver logs en tiempo real
flyctl logs

# Ver status de la app
flyctl status

# Escalar recursos
flyctl scale memory 1024  # 1GB RAM
flyctl scale vm shared-cpu-2x  # 2 vCPUs

# Ver secrets configurados
flyctl secrets list

# SSH a la máquina
flyctl ssh console

# Reiniciar la app
flyctl apps restart riskitera-sales-backend

# Ver costos
flyctl pricing

# Detener la app (sin eliminarla)
flyctl apps suspend riskitera-sales-backend

# Reactivar la app
flyctl apps resume riskitera-sales-backend

# Eliminar la app completamente
flyctl apps destroy riskitera-sales-backend
```

---

## 9️⃣ Actualizar la Aplicación (CI/CD Manual)

Cada vez que hagas cambios en el código:

```bash
cd C:\Users\zc01607\Documents\Desarrollo\Claude\riskitera-sales\backend

# Pull los últimos cambios
git pull origin main

# Desplegar
flyctl deploy
```

---

## 🔟 Configurar Auto-Deploy desde GitHub (Opcional)

Si quieres que cada push a `main` despliegue automáticamente:

1. Ve a GitHub Actions en tu repositorio
2. Crea `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    name: Deploy to Fly.io
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

3. Genera un token de Fly.io:
   ```bash
   flyctl tokens create deploy
   ```

4. Agrega el token como secret en GitHub:
   - GitHub repo → Settings → Secrets → New repository secret
   - Name: `FLY_API_TOKEN`
   - Value: (el token generado)

---

## 🐛 Troubleshooting

### Error: "Could not find App"

```bash
# Verificar que estás en el directorio correcto
cd C:\Users\zc01607\Documents\Desarrollo\Claude\riskitera-sales\backend

# Verificar que fly.toml existe
ls fly.toml
```

### Error: "Database connection failed"

```bash
# Verificar secrets
flyctl secrets list

# Reconfigurar DATABASE_URL con caracteres escapados
flyctl secrets set DATABASE_URL="postgresql://..."
```

### Error: "Health check failed"

```bash
# Ver logs
flyctl logs

# Verificar que el endpoint /health funciona localmente
curl http://localhost:8001/health
```

### App muy lenta al iniciar

```bash
# Aumentar memoria
flyctl scale memory 1024

# Ver métricas
flyctl metrics
```

### Ver errores de deployment

```bash
# Logs detallados durante deploy
flyctl deploy --verbose

# Logs de la app
flyctl logs --app riskitera-sales-backend
```

---

## 💰 Costos Estimados (Free Tier)

Fly.io ofrece un **free tier** generoso:

- **3 VMs compartidas** (256MB RAM cada una)
- **3GB de volumen persistente**
- **160GB de transferencia de datos/mes**

Con la configuración actual (1 VM de 512MB), estarás **dentro del free tier** si:
- Reduces a 256MB: `flyctl scale memory 256`
- O pagas ~$2/mes por los 256MB extra

**Recomendación para producción**: Escalar a 1GB RAM cuando tengas tráfico real.

---

## 📊 Monitoreo

```bash
# Ver métricas
flyctl metrics

# Ver requests
flyctl logs --app riskitera-sales-backend

# Dashboard web
https://fly.io/apps/riskitera-sales-backend
```

---

## ✅ Checklist de Deployment

- [ ] `flyctl` instalado
- [ ] Login en Fly.io (`flyctl auth login`)
- [ ] App creada (`flyctl launch`)
- [ ] Secrets configurados (`flyctl secrets set ...`)
- [ ] App desplegada (`flyctl deploy`)
- [ ] Health check funcionando (`curl https://...fly.dev/health`)
- [ ] Docs accesibles (`https://...fly.dev/docs`)
- [ ] VITE_API_URL actualizado en Cloudflare Pages
- [ ] Frontend redesplegado en Cloudflare

---

Una vez completado, tu stack estará 100% en producción:

- ✅ Frontend: Cloudflare Pages
- ✅ Backend: Fly.io
- ✅ Database: Supabase
- ✅ Auth: Supabase Auth

🚀 **¡Listo para producción!**
