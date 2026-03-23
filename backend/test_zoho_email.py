#!/usr/bin/env python
"""
Test Zoho ZeptoMail integration
Run this script to verify your Zoho API key works correctly
"""
import asyncio
from app.core.config import settings
from app.services.email_service import email_service


async def test_zoho_email():
    """Test sending an email via Zoho ZeptoMail"""
    print("=" * 60)
    print("ZOHO ZEPTOMAIL TEST")
    print("=" * 60)
    print(f"EMAIL_PROVIDER: {settings.EMAIL_PROVIDER}")
    print(f"EMAIL_FROM: {settings.EMAIL_FROM}")
    print(f"ZOHO_API_KEY configured: {'✅ Yes' if settings.ZOHO_API_KEY and settings.ZOHO_API_KEY != 'TU_ZOHO_API_KEY_AQUI' else '❌ No'}")
    print()

    if settings.ZOHO_API_KEY == "TU_ZOHO_API_KEY_AQUI":
        print("⚠️  ERROR: Por favor configura ZOHO_API_KEY en el archivo .env")
        print("   1. Ve a https://www.zoho.com/zeptomail/")
        print("   2. Login → Settings → API Keys")
        print("   3. Copia tu Send Mail Token")
        print("   4. Actualiza ZOHO_API_KEY en backend/.env")
        return

    # Email de prueba
    test_email = input("Ingresa el email de destino para la prueba: ").strip()
    if not test_email:
        print("❌ Email vacío. Cancelando test.")
        return

    print()
    print(f"📧 Enviando email de prueba a: {test_email}")
    print("   Esto puede tardar unos segundos...")
    print()

    result = await email_service.send_email(
        to=test_email,
        subject="🧪 Test de Zoho ZeptoMail - St4rtup CRM",
        html_body="""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5;">✅ Zoho ZeptoMail Configurado Correctamente</h1>
            <p>Este es un email de prueba del CRM <strong>St4rtup CRM</strong>.</p>
            <p>Si recibes este mensaje, significa que:</p>
            <ul>
                <li>✅ Tu API Key de Zoho ZeptoMail funciona correctamente</li>
                <li>✅ El servicio de email está bien configurado</li>
                <li>✅ Puedes enviar emails transaccionales desde el CRM</li>
            </ul>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 14px;">
                <strong>St4rtup CRM CRM</strong><br>
                Automatización comercial para GRC SaaS
            </p>
        </body>
        </html>
        """,
        text_body="✅ Zoho ZeptoMail configurado correctamente\n\nEste es un email de prueba del CRM St4rtup CRM.",
        from_email=settings.EMAIL_FROM,
    )

    print("=" * 60)
    print("RESULTADO")
    print("=" * 60)
    if result['success']:
        print(f"✅ Email enviado exitosamente!")
        print(f"   Provider: {result['provider']}")
        print(f"   Message ID: {result['message_id']}")
        print()
        print(f"📬 Revisa la bandeja de entrada de {test_email}")
    else:
        print(f"❌ Error al enviar email:")
        print(f"   {result['error']}")
        print()
        print("Posibles causas:")
        print("  • API Key incorrecta")
        print("  • EMAIL_FROM no verificado en Zoho")
        print("  • Límite de emails alcanzado")
        print("  • Problema de red/firewall")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_zoho_email())
