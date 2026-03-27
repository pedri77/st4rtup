# RGPD para startups: guía práctica de cumplimiento

El **RGPD** (Reglamento General de Protección de Datos) es obligatorio para toda empresa que trate datos personales en la UE. Las multas pueden llegar al 4% de la facturación global. Pero cumplir no es tan difícil como parece.

## Qué es el RGPD

Es la normativa europea que regula cómo las empresas recopilan, almacenan y usan datos personales. Aplica a toda empresa que:

- Tenga sede en la UE
- Trate datos de residentes de la UE
- Ofrezca servicios a personas en la UE

**Dato personal**: cualquier información que identifique a una persona: nombre, email, IP, cookies, ubicación.

## Los 7 pasos para cumplir

### 1. Registra tu actividad de tratamiento
Documenta qué datos recopilas, para qué, dónde los almacenas y quién accede. Un spreadsheet basta para empezar.

### 2. Base legal para cada tratamiento
Necesitas una base legal para cada dato que tratas:
- **Consentimiento** — checkbox opt-in (no pre-marcado)
- **Ejecución de contrato** — datos necesarios para el servicio
- **Interés legítimo** — marketing a clientes existentes
- **Obligación legal** — facturación, impuestos

### 3. Política de privacidad
Página pública en tu web que explique: qué datos, para qué, quién accede, cuánto tiempo, derechos del usuario. Lenguaje claro, no legal.

### 4. Banner de cookies
Obligatorio si usas cookies no esenciales. Debe permitir rechazar todas. Las cookies analíticas (como Umami si es cookieless) no necesitan consentimiento.

### 5. Contratos con proveedores (DPA)
Si usas Supabase, AWS, Stripe, etc., necesitas un **Data Processing Agreement** con cada uno. La mayoría ya lo ofrecen online.

### 6. Derechos de los usuarios
Debe ser fácil para el usuario ejercer sus derechos:
- **Acceso** — qué datos tienes sobre mí
- **Rectificación** — corregir datos incorrectos
- **Supresión** — eliminar mis datos
- **Portabilidad** — dame mis datos en formato legible

### 7. Seguridad
Medidas técnicas y organizativas: cifrado, acceso restringido, backups, políticas de contraseñas. Proporcional al riesgo.

## Lo que NO necesitas

- **DPO (Delegado de Protección de Datos)** — solo obligatorio si tratas datos a gran escala o datos sensibles
- **Auditoría externa** — no obligatoria para startups pequeñas
- **Registro en la AEPD** — el registro de actividades es interno, no necesita presentarse

## Multas

- Infracciones leves: hasta 10M€ o 2% facturación
- Infracciones graves: hasta 20M€ o 4% facturación
- En la práctica, las multas a startups son mucho menores (1.000-50.000€)

## Herramientas útiles

- **Cookie consent**: Cookiebot, Osano (hay opciones gratuitas)
- **Política de privacidad**: iubenda, Termly
- **DPA de proveedores**: busca "DPA" en la web de cada proveedor
- **CRM con RGPD**: [St4rtup](https://st4rtup.com) incluye consent management y derecho de supresión

## Preguntas frecuentes

### ¿Aplica el RGPD a mi startup si solo tengo 2 empleados?
Sí. El RGPD aplica independientemente del tamaño de la empresa.

### ¿Qué pasa si un usuario pide que borre sus datos?
Tienes 30 días para hacerlo. Debes eliminar los datos de todas tus bases de datos y notificar a los proveedores que los tengan.

### ¿Las cookies de analytics necesitan consentimiento?
Depende. Google Analytics sí (usa cookies de terceros). Umami en modo cookieless no necesita consentimiento.

> *Este artículo tiene carácter informativo. Para decisiones legales, consulta con un profesional.*

## Conclusión
- El RGPD aplica a toda startup que trate datos de personas en la UE
- 7 pasos: registro actividad, base legal, privacidad, cookies, DPA, derechos, seguridad
- No necesitas DPO ni auditoría externa si eres pequeño
- Las multas son proporcionales — pero mejor prevenir
- Cumplir desde el principio es mucho más fácil que arreglarlo después
