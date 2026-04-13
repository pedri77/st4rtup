# Stripe Setup — st4rtup

> **Estado**: Pendiente de configurar en produccion
> **Codigo**: Implementado (checkout, suscripciones, webhooks, portal, trial, invoicing)
> **Metodo**: httpx raw contra Stripe API (sin SDK)

---

## Paso 1 — Crear productos y precios en Stripe Dashboard

URL: https://dashboard.stripe.com/products

### Planes principales

| Producto | Precio mensual | Precio anual | Env var mensual | Env var anual |
|----------|---------------|-------------|-----------------|---------------|
| **Growth** | 19 EUR/mes | 190 EUR/ano | `STRIPE_PRICE_GROWTH_MONTHLY` | `STRIPE_PRICE_GROWTH_ANNUAL` |
| **Scale** | 49 EUR/mes | 490 EUR/ano | `STRIPE_PRICE_SCALE_MONTHLY` | `STRIPE_PRICE_SCALE_ANNUAL` |

Cada precio genera un ID tipo `price_1Xxx...` — apuntarlo para el Paso 4.

### Add-ons (opcional, hacer despues de validar los planes)

| Add-on | Precio | Nota |
|--------|--------|------|
| Extra Users | 9 EUR/mes | Los price IDs estan hardcodeados en `backend/app/api/v1/endpoints/payments.py:602-606`. Tras crearlos en Stripe, actualizar esos IDs en el codigo o moverlos a env vars. |
| AI Advanced | 15 EUR/mes | |
| Deal Room | 12 EUR/mes | |
| WhatsApp | 9 EUR/mes | |
| API Access | 15 EUR/mes | |

---

## Paso 2 — Configurar webhook

URL: https://dashboard.stripe.com/webhooks

1. **Endpoint URL**: `https://api.st4rtup.com/api/v1/payments/stripe-webhook`
2. **Eventos a escuchar**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
3. Copiar el **Signing secret** (`whsec_...`) para el Paso 4.

---

## Paso 3 — Configurar Customer Portal

URL: https://dashboard.stripe.com/settings/billing/portal

- Habilitar: cambiar plan, actualizar metodo de pago, cancelar suscripcion
- Return URL: `https://st4rtup.com/app/billing`

---

## Paso 4 — Env vars en produccion

```bash
ssh -i ~/.ssh/id_hetzner root@188.245.166.253
```

Anadir al `.env` del backend:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GROWTH_MONTHLY=price_1...
STRIPE_PRICE_GROWTH_ANNUAL=price_1...
STRIPE_PRICE_SCALE_MONTHLY=price_1...
STRIPE_PRICE_SCALE_ANNUAL=price_1...
```

Reiniciar:

```bash
systemctl restart st4rtup
```

---

## Paso 5 — Verificacion

1. **Webhook**: Stripe Dashboard > Webhooks > "Send test event" — debe devolver 200
2. **Checkout**: Ir a pricing, hacer checkout con tarjeta de test `4242 4242 4242 4242`
3. **Portal**: Tras suscribirse, ir a `/app/billing` y verificar que el enlace al portal funciona

---

## Mejoras post-configuracion

- [ ] Mover price IDs de add-ons de hardcoded a env vars
- [ ] Migrar de httpx a `stripe` Python SDK (mejor mantenibilidad)
- [ ] Anadir manejo de reembolsos
- [ ] Tax para jurisdicciones fuera de Espana (actualmente 21% IVA fijo)
