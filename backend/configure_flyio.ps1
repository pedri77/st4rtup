# Configure Fly.io secrets for St4rtup CRM Backend
# Run: .\configure_flyio.ps1

Write-Host "🚀 Configurando secrets en Fly.io..." -ForegroundColor Green
Write-Host ""

# Database URL
flyctl secrets set DATABASE_URL="postgresql://postgres:GoqA#7]^1Kp}Rm3jzc;('`"vD(5Spk}Alk@db.dszhaxyzrnsgjlabtvqx.supabase.co:5432/postgres"

# Supabase
flyctl secrets set SUPABASE_URL="https://dszhaxyzrnsgjlabtvqx.supabase.co"
flyctl secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzemhheHl6cm5zZ2psYWJ0dnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTIwNzMsImV4cCI6MjA4NzYyODA3M30.mDb0RupHEPMtFsYZ4G--XI6CNwIZXljGPZZE1-Ruubg"

# ⚠️ IMPORTANTE: Reemplaza este valor con el service_role key real de Supabase
# Ve a Supabase Dashboard → Settings → API → service_role key
Write-Host "⚠️  ANTES DE CONTINUAR: Ve a Supabase Dashboard y copia el service_role key" -ForegroundColor Yellow
$serviceRoleKey = Read-Host "Pega el service_role key aquí (o presiona Enter para usar placeholder)"
if ($serviceRoleKey) {
    flyctl secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceRoleKey"
} else {
    Write-Host "❌ Saltando SUPABASE_SERVICE_ROLE_KEY - debes configurarlo manualmente" -ForegroundColor Red
}

# Auth
flyctl secrets set SECRET_KEY="GgTv8kmeWPS7HDduZl5n9iw6RVpPmPHOm+/NXGMebh8="

# CORS (incluye dominios de producción)
flyctl secrets set BACKEND_CORS_ORIGINS='[\"http://localhost:5173\",\"https://app.st4rtup.app\",\"https://st4rtup.pages.dev\"]'

# Email (opcional)
flyctl secrets set RESEND_API_KEY="re_your_resend_api_key_here"
flyctl secrets set EMAIL_FROM="hello@st4rtup.app"

Write-Host ""
Write-Host "✅ Configuración completa" -ForegroundColor Green
Write-Host ""
Write-Host "Verifica con: flyctl secrets list"
Write-Host "Ver logs: flyctl logs"
