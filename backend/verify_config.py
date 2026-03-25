#!/usr/bin/env python3
"""
Verify backend configuration
Run: python verify_config.py
"""

from app.core.config import settings

print("🔍 Verificando configuración del backend...\n")

# Check Database
print("📊 DATABASE")
if settings.DATABASE_URL:
    # Mask password for security
    url = settings.DATABASE_URL
    if "@" in url:
        before_at = url.split("@")[0]
        after_at = url.split("@")[1]
        username = before_at.split("://")[1].split(":")[0] if "://" in before_at else "***"
        print(f"  ✅ DATABASE_URL: postgresql://{username}:****@{after_at[:50]}...")
    else:
        print(f"  ✅ DATABASE_URL: {url[:50]}...")
    print(f"  ✅ Async URL: {settings.async_database_url[:60]}...")
else:
    print("  ❌ DATABASE_URL no configurada")

# Check Supabase
print("\n🔐 SUPABASE")
if settings.SUPABASE_URL:
    print(f"  ✅ SUPABASE_URL: {settings.SUPABASE_URL}")
else:
    print("  ❌ SUPABASE_URL no configurada")

if settings.SUPABASE_ANON_KEY:
    print(f"  ✅ SUPABASE_ANON_KEY: {settings.SUPABASE_ANON_KEY[:20]}...")
else:
    print("  ❌ SUPABASE_ANON_KEY no configurada")

if settings.SUPABASE_SERVICE_ROLE_KEY:
    print(f"  ✅ SUPABASE_SERVICE_ROLE_KEY: {settings.SUPABASE_SERVICE_ROLE_KEY[:20]}...")
else:
    print("  ❌ SUPABASE_SERVICE_ROLE_KEY no configurada")

# Check Auth
print("\n🔑 AUTH")
if settings.SECRET_KEY and settings.SECRET_KEY != "dev-secret-key-change-in-production":
    print(f"  ✅ SECRET_KEY configurada (custom)")
elif settings.SECRET_KEY == "dev-secret-key-change-in-production":
    print(f"  ⚠️  SECRET_KEY usando valor por defecto (cambiar en producción)")
else:
    print("  ❌ SECRET_KEY no configurada")

# Check CORS
print("\n🌐 CORS")
try:
    origins = settings.cors_origins
    print(f"  ✅ CORS Origins configurados: {len(origins)} origins")
    for origin in origins:
        print(f"     - {origin}")
except:
    print("  ❌ Error al parsear CORS origins")

# Check Email
print("\n📧 EMAIL")
if settings.RESEND_API_KEY:
    print(f"  ✅ RESEND_API_KEY: {settings.RESEND_API_KEY[:10]}...")
else:
    print("  ⚠️  RESEND_API_KEY no configurada (opcional)")

print(f"  ℹ️  EMAIL_FROM: {settings.EMAIL_FROM}")

# Summary
print("\n" + "="*60)
missing = []
if not settings.DATABASE_URL:
    missing.append("DATABASE_URL")
if not settings.SUPABASE_URL:
    missing.append("SUPABASE_URL")
if not settings.SUPABASE_ANON_KEY:
    missing.append("SUPABASE_ANON_KEY")

if missing:
    print("❌ Variables faltantes:")
    for var in missing:
        print(f"   - {var}")
    print("\n💡 Configura en Fly.io con:")
    print("   # Configure in Hetzner .env VARIABLE=valor")
else:
    print("✅ Todas las variables críticas están configuradas")
print("="*60)
