# Secret Rotation Playbook

Procedimientos para rotar los secretos críticos de st4rtup sin pérdida de datos ni downtime excesivo.

---

## 1. `SECRET_KEY` (JWT signing key)

**Impacto de la rotación:** invalida TODOS los JWT activos emitidos por el backend (tokens de impersonate, tokens de forms públicos, cualquier token interno firmado con `settings.SECRET_KEY`).

**Impacto en usuarios:** los usuarios estándar autentican vía Supabase (no con nuestra `SECRET_KEY`), así que NO se les cierra la sesión. Solo se ven afectados:
- Tokens de impersonación de admin (expiran en minutos de todas formas)
- Tokens públicos de formularios (TTL máximo 30 días)
- Cualquier feature futura que firme JWTs con `SECRET_KEY`

**Cuándo rotar:**
- Cada 6 meses como práctica estándar
- Inmediatamente si hay sospecha de compromiso
- Tras cambio de composición del equipo con acceso al `.env` de producción

**Procedimiento (sin downtime):**

1. **Generar nueva key:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

2. **Actualizar `.env` en Hetzner** (SSH como `root`):
   ```bash
   cp /opt/st4rtup/.env /opt/st4rtup/.env.bak.$(date +%s)
   sed -i 's|^SECRET_KEY=.*|SECRET_KEY=<nueva_key>|' /opt/st4rtup/.env
   grep ^SECRET_KEY /opt/st4rtup/.env  # verificar
   ```

3. **Reiniciar backend:**
   ```bash
   systemctl restart st4rtup
   systemctl is-active st4rtup
   curl -sf http://127.0.0.1:8001/health
   ```

4. **Invalidar tokens públicos activos** (opcional, si la rotación es por compromiso):
   ```sql
   -- Desactivar tokens de formularios públicos con TTL largo
   UPDATE form_tokens SET used_at = now() WHERE used_at IS NULL;
   ```

5. **Actualizar el secret en GitHub Actions** (solo si se usa en CI — actualmente no).

6. **Limpiar backup** de `.env` antiguo cuando verifiques que todo funciona:
   ```bash
   rm /opt/st4rtup/.env.bak.<timestamp>
   ```

---

## 2. `CREDENTIAL_ENCRYPTION_KEY` (Fernet key para OAuth tokens at-rest)

**⚠️ Aviso crítico:** si pierdes esta key sin haber rotado primero, **todos los tokens OAuth cifrados en DB son irrecuperables**. Los usuarios tendrán que reconectar manualmente Gmail / GSC / LinkedIn / etc.

**Impacto de la rotación:** todos los tokens cifrados con la key antigua dejan de ser descifrables. Hay que **re-cifrar** con la nueva key antes de desactivar la antigua.

**Cuándo rotar:**
- Anualmente como práctica estándar
- Inmediatamente si hay sospecha de compromiso del `.env` de producción
- Si la key fue compartida o expuesta accidentalmente

**Procedimiento (dual-key para evitar downtime):**

### Paso 1 — Soporte dual-key temporal

Editar `app/core/credential_store.py` para aceptar dos keys (primary + legacy) durante la ventana de rotación:

```python
class CredentialStore:
    def __init__(self):
        self._fernet = None           # new key, para encrypt + primary decrypt
        self._fernet_legacy = None    # old key, solo decrypt fallback
        self._init_keys()

    def _init_keys(self):
        key = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY", "")
        legacy = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY_LEGACY", "")
        if key:
            self._fernet = Fernet(key.encode())
        if legacy:
            self._fernet_legacy = Fernet(legacy.encode())

    def decrypt(self, value):
        if not value or not value.startswith("enc:"):
            return value
        ct = value[4:].encode()
        try:
            return self._fernet.decrypt(ct).decode()
        except InvalidToken:
            if self._fernet_legacy:
                return self._fernet_legacy.decrypt(ct).decode()
            raise
```

### Paso 2 — Deploy con ambas keys

1. **Generar nueva key:**
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. **Actualizar `.env`** manteniendo la antigua como legacy:
   ```bash
   # .env antes de rotar
   CREDENTIAL_ENCRYPTION_KEY=<key_actual>

   # .env durante rotación
   CREDENTIAL_ENCRYPTION_KEY=<nueva_key>
   CREDENTIAL_ENCRYPTION_KEY_LEGACY=<key_actual_ahora_legacy>
   ```

3. **Deploy del código dual-key + nuevo `.env`**, reiniciar backend.

### Paso 3 — Re-cifrar todos los tokens en DB

Con ambas keys activas, llama al endpoint de migración con un admin JWT:

```bash
curl -X POST https://api.st4rtup.com/api/v1/settings/encrypt-credentials \
  -H "Authorization: Bearer <admin_jwt>"
```

Esto descifra con `_fernet_legacy` (automáticamente en fallback) y re-cifra con `_fernet`. Idempotente.

**Verificar que todos los tokens están re-cifrados:**

```sql
-- No debería haber ningún valor enc: que no pueda descifrar la nueva key.
-- Ejecutar este query desde un script Python que invoque credential_store.decrypt()
-- para cada fila sensible. Si lanza InvalidToken, esa fila sigue con la vieja key.
```

### Paso 4 — Eliminar la legacy key

1. Borrar `CREDENTIAL_ENCRYPTION_KEY_LEGACY` del `.env`
2. Revertir los cambios dual-key en `credential_store.py` (opcional — se puede mantener el soporte para la siguiente rotación)
3. Reiniciar backend
4. Verificar que `GET /api/v1/settings/oauth/google/status` sigue funcionando

---

## 3. `N8N_API_KEY` (service token para n8n)

**Impacto:** n8n pierde acceso al backend inmediatamente. Las automatizaciones n8n fallarán hasta que se actualice el token en n8n.

**Procedimiento:**

1. Generar nuevo:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
2. Actualizar `/opt/st4rtup/.env` con el nuevo `N8N_API_KEY`
3. Actualizar el mismo valor en **todas las credenciales HTTP de n8n** (pueden ser varios workflows)
4. Reiniciar backend
5. Probar disparando manualmente un workflow de n8n que llame al backend

---

## 4. Supabase keys (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

Estas keys se generan en el dashboard de Supabase. La rotación se hace **desde Supabase**, no desde nuestro repo.

**Procedimiento:**

1. Supabase Dashboard → Project Settings → API → "Regenerate JWT secret"
2. **Impacto:** invalida TODAS las sesiones de usuarios (logout forzado para todo el mundo)
3. Copiar las nuevas `anon` y `service_role` keys
4. Actualizar `/opt/st4rtup/.env` **y** el `.env` de frontend (`VITE_SUPABASE_ANON_KEY`)
5. Redeploy backend + frontend
6. Avisar a todos los usuarios que deberán volver a loguearse

**Cuándo:** solo en caso de compromiso confirmado. Rotación rutinaria NO recomendada por el alto impacto en UX.

---

## 5. Database password (`DATABASE_URL`)

Rotación desde Supabase Dashboard → Project Settings → Database → Reset database password.

**Procedimiento:**

1. Reset password en Supabase
2. Actualizar `DATABASE_URL` en `/opt/st4rtup/.env`
3. Reiniciar backend (la conexión vieja se invalida al instante; hay un breve error hasta el restart)
4. Verificar `/health`

---

## Checklist general post-rotación

- [ ] `curl -sf https://api.st4rtup.com/health` responde `healthy`
- [ ] Login normal funciona (loguearse como usuario de prueba)
- [ ] Enviar un email desde la app (valida Gmail OAuth + SECRET_KEY)
- [ ] Crear un lead via API pública (valida `PUBLIC_API_KEYS` + rate limit)
- [ ] n8n dispara un workflow y el backend lo acepta (valida `N8N_API_KEY`)
- [ ] Borrar `.env.bak.*` de más de 7 días
- [ ] Registrar la rotación en `CHANGELOG.md`

---

## Auditoría de rotación

Cada rotación debe dejarse registrada:

```markdown
## Secret rotations log

| Fecha       | Secret                        | Razón                  | Ejecutor |
|-------------|-------------------------------|------------------------|----------|
| 2026-04-07  | CREDENTIAL_ENCRYPTION_KEY     | Setup inicial          | David    |
```

Mantener esta tabla en `docs/operations/rotation-log.md`.
