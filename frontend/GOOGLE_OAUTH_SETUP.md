# Google OAuth Setup — St4rtup

## 1. Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. APIs & Services > Credentials > Create Credentials > OAuth Client ID
4. Tipo: **Web application**
5. Authorized redirect URIs:
   - `https://ufwjtzvfclnmbskemdjp.supabase.co/auth/v1/callback`
6. Guardar **Client ID** y **Client Secret**

## 2. Supabase Dashboard

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard) > proyecto `ufwjtzvfclnmbskemdjp`
2. Authentication > Providers > Google
3. Activar el provider
4. Pegar **Client ID** y **Client Secret**
5. Guardar

## 3. Verificar

- El botón "Continuar con Google" en `/login` y `/register` debería funcionar
- El redirect post-auth apunta a `window.location.origin/app`
- Supabase maneja todo el flujo OAuth, el frontend solo llama `signInWithGoogle()`

## 4. Email Verification (opcional)

En Supabase Dashboard > Authentication > Email Templates:
- Personalizar el template de confirmación
- En Settings > Auth: activar "Confirm email" si se quiere forzar verificación
