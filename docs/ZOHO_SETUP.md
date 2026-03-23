# Configuración de Zoho ZeptoMail para Riskitera Sales

## 📋 Paso 1: Crear Cuenta en Zoho ZeptoMail

1. Ve a https://www.zoho.com/zeptomail/
2. Clic en **"Sign Up Free"** (Plan gratuito: 10,000 emails/mes)
3. Completa el registro con tu email corporativo
4. Verifica tu email

## 🔑 Paso 2: Obtener API Key

1. Login en https://www.zoho.com/zeptomail/
2. Ve a **Settings** (⚙️ icono arriba a la derecha)
3. En el menú lateral, clic en **SMTP & API Info**
4. Sección **API Keys** → clic en **Generate Token**
5. Dale un nombre: `riskitera-sales-crm`
6. **Copia el token** (se muestra solo una vez)
   - Formato: `Zoho-enczapikey wSsVR6...` (muy largo)
7. Guárdalo en un lugar seguro

## ✉️ Paso 3: Verificar Dominio de Email

**IMPORTANTE:** Zoho solo permite enviar desde dominios verificados.

### Opción A: Usar email de Zoho (para pruebas)
Si aún no tienes dominio verificado, puedes usar temporalmente:
- Email de prueba: `[tu-usuario]@zeptomail.com`
- Configura `EMAIL_FROM=tu-usuario@zeptomail.com` en `.env`

### Opción B: Verificar tu dominio (recomendado para producción)
1. En Zoho ZeptoMail → **Mail Domains**
2. Clic en **Add Domain**
3. Ingresa `riskitera.com`
4. Sigue las instrucciones para agregar registros DNS:
   - **SPF:** Agregar TXT record
   - **DKIM:** Agregar TXT record
   - **DMARC:** Agregar TXT record (opcional pero recomendado)
5. Espera propagación DNS (15-30 minutos)
6. Verifica el dominio en Zoho
7. Ahora puedes usar `sales@riskitera.com`

## 🔧 Paso 4: Configurar en Local

1. Abre `backend/.env`
2. Actualiza las siguientes variables:

```bash
EMAIL_PROVIDER=zoho
ZOHO_API_KEY=Zoho-enczapikey_wSsVR6... # Tu token completo aquí
EMAIL_FROM=sales@riskitera.com # O tu email verificado
```

3. Guarda el archivo

## 🧪 Paso 5: Probar la Configuración

Ejecuta el script de prueba:

```bash
cd backend
python test_zoho_email.py
```

Ingresa tu email personal para recibir el test.

Si todo funciona correctamente, verás:
```
✅ Email enviado exitosamente!
   Provider: zoho
   Message ID: ...
```

## ☁️ Paso 6: Configurar en Producción (Fly.io)

Una vez que funcione en local, configura en Fly.io:

```bash
cd backend
fly secrets set EMAIL_PROVIDER=zoho
fly secrets set ZOHO_API_KEY="Zoho-enczapikey_wSsVR6..." # Tu token aquí
fly secrets set EMAIL_FROM=sales@riskitera.com
```

Verifica:
```bash
fly secrets list
```

## 🐛 Troubleshooting

### Error: "ZOHO_API_KEY not configured"
- Verifica que el token esté en `.env` sin espacios
- Asegúrate de reiniciar el backend después de editar `.env`

### Error: "Invalid API key"
- Verifica que copiaste el token completo (incluye `Zoho-enczapikey`)
- Regenera el token en Zoho si es necesario

### Error: "Sender email not verified"
- El dominio de `EMAIL_FROM` debe estar verificado en Zoho
- Usa un email de Zoho temporalmente: `usuario@zeptomail.com`

### Error: "Failed to send email: 401"
- API Key incorrecta o expirada
- Regenera el token en Zoho

### Error: "Failed to send email: 429"
- Límite de emails alcanzado (10,000/mes en plan gratuito)
- Espera al siguiente mes o actualiza plan

## 📊 Monitoreo

Una vez configurado, puedes monitorear tus envíos en:
- https://www.zoho.com/zeptomail/ → **Email Logs**
- Filtra por fecha, destinatario, estado
- Ve métricas de entrega, bounces, opens

## 🔄 Cambiar a Resend (Alternativa)

Si prefieres usar Resend en lugar de Zoho:

1. Crea cuenta en https://resend.com
2. Verifica tu dominio
3. Obtén API Key
4. Actualiza `.env`:
   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_...
   EMAIL_FROM=sales@riskitera.com
   ```

El código soporta ambos providers transparentemente.

## ✅ Checklist Final

- [ ] Cuenta Zoho ZeptoMail creada
- [ ] API Key obtenida y guardada
- [ ] Dominio verificado (o usando email de Zoho)
- [ ] `.env` local actualizado
- [ ] Test exitoso con `test_zoho_email.py`
- [ ] Secretos configurados en Fly.io
- [ ] Backend reiniciado en producción

¡Listo! Ahora puedes enviar emails transaccionales desde el CRM.
