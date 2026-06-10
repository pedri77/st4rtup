#!/usr/bin/env python3
"""Create st4rtup products and prices in Stripe.

Usage:
  STRIPE_SECRET_KEY=sk_live_xxx python scripts/setup_stripe_products.py

Creates 2 paid products (Growth, Scale) x 2 prices (monthly, annual)
and prints the env vars to paste into .env
"""

import os
import sys

try:
    import stripe
except ImportError:
    print("pip install stripe")
    sys.exit(1)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
if not stripe.api_key or not stripe.api_key.startswith("sk_"):
    print("Set STRIPE_SECRET_KEY=sk_live_xxx or sk_test_xxx")
    sys.exit(1)

PLANS = [
    {
        "id": "growth",
        "name": "st4rtup Growth",
        "monthly": 1900,      # 19 EUR/mo
        "annual": 15 * 12 * 100,  # 15 EUR/mo x 12 = 180 EUR/yr
        "features": [
            "Pipeline ilimitado",
            "1.000 contactos",
            "WhatsApp API",
            "Email automation",
            "Factura electronica basica",
        ],
    },
    {
        "id": "scale",
        "name": "st4rtup Scale",
        "monthly": 4900,      # 49 EUR/mo
        "annual": 39 * 12 * 100,  # 39 EUR/mo x 12 = 468 EUR/yr
        "features": [
            "Todo Growth",
            "AI Calls (50 min/mes)",
            "Marketing Hub",
            "Deal Room",
            "IA Copilot",
            "VeriFactu completo",
        ],
    },
]

# Add-ons
ADDONS = [
    {"id": "extra_users", "name": "st4rtup - Usuarios extra", "monthly": 900},       # 9 EUR/user/mo
    {"id": "ai_advanced", "name": "st4rtup - AI Calls extra 100 min", "monthly": 1500},  # 15 EUR/mo
    {"id": "deal_room", "name": "st4rtup - Deal Room addon", "monthly": 900},         # 9 EUR/mo
    {"id": "whatsapp", "name": "st4rtup - WhatsApp extra numero", "monthly": 900},    # 9 EUR/mo
    {"id": "api_access", "name": "st4rtup - API Access", "monthly": 1900},            # 19 EUR/mo
]

print("Creating Stripe products and prices for st4rtup...\n")

env_lines = []

for plan in PLANS:
    product = stripe.Product.create(
        name=plan["name"],
        metadata={"st4rtup_plan": plan["id"]},
    )
    print(f"Created product: {plan['name']} ({product.id})")

    price_monthly = stripe.Price.create(
        product=product.id,
        unit_amount=plan["monthly"],
        currency="eur",
        recurring={"interval": "month"},
        metadata={"st4rtup_plan": plan["id"], "period": "monthly"},
    )
    print(f"  Monthly: {plan['monthly']/100} EUR/mo ({price_monthly.id})")

    price_annual = stripe.Price.create(
        product=product.id,
        unit_amount=plan["annual"],
        currency="eur",
        recurring={"interval": "year"},
        metadata={"st4rtup_plan": plan["id"], "period": "annual"},
    )
    print(f"  Annual: {plan['annual']/100} EUR/yr ({price_annual.id})")

    env_lines.append(f"STRIPE_PRICE_{plan['id'].upper()}_MONTHLY={price_monthly.id}")
    env_lines.append(f"STRIPE_PRICE_{plan['id'].upper()}_ANNUAL={price_annual.id}")

for addon in ADDONS:
    product = stripe.Product.create(
        name=addon["name"],
        metadata={"st4rtup_addon": addon["id"]},
    )
    price = stripe.Price.create(
        product=product.id,
        unit_amount=addon["monthly"],
        currency="eur",
        recurring={"interval": "month"},
        metadata={"st4rtup_addon": addon["id"]},
    )
    print(f"Addon: {addon['name']} - {addon['monthly']/100} EUR/mo ({price.id})")
    env_lines.append(f"STRIPE_PRICE_{addon['id'].upper()}={price.id}")

print("\n=== ENV VARS (paste into .env) ===\n")
print(f"STRIPE_SECRET_KEY={stripe.api_key}")
for line in env_lines:
    print(line)
print("\n# Also set STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET from dashboard")
