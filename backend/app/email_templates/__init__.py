"""
Email Templates for Automated Sequences
"""
import html
from typing import Dict, Any


def get_welcome_email_day0(lead_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Welcome email - Day 0
    First contact after lead creation
    """
    company = html.escape(lead_data.get('company', 'su empresa'))
    contact = html.escape(lead_data.get('contact', 'Estimado/a'))
    sector = html.escape(lead_data.get('sector', 'su sector'))

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Bienvenido a St4rtup</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">CRM para Startups</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1F2937; margin: 0 0 20px 0;">Hola {contact},</p>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 20px 0;">
            Gracias por tu interés en <strong>St4rtup</strong>. Nos complace que <strong>{company}</strong> esté explorando cómo mejorar su proceso de ventas y crecimiento.
          </p>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 30px 0;">
            En el sector <strong>{sector}</strong>, tener un proceso de ventas eficiente es clave para crecer. St4rtup está diseñada específicamente para ayudar a startups como la tuya a:
          </p>

          <!-- Benefits -->
          <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <ul style="margin: 0; padding-left: 20px; color: #1F2937;">
              <li style="margin-bottom: 12px; font-size: 15px;">✅ Gestionar leads y pipeline de ventas</li>
              <li style="margin-bottom: 12px; font-size: 15px;">✅ Automatizar campañas de marketing y outreach</li>
              <li style="margin-bottom: 12px; font-size: 15px;">✅ Generar propuestas y reportes comerciales</li>
              <li style="margin-bottom: 12px; font-size: 15px;">✅ Centralizar toda tu información comercial</li>
            </ul>
          </div>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 30px 0;">
            En los próximos días, te enviaré más información sobre cómo St4rtup puede ayudarte específicamente con tus necesidades de ventas y crecimiento.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://st4rtup.app/demo" style="display: inline-block; background-color: #6366F1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Solicitar Demo Personalizada
            </a>
          </div>

          <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin: 30px 0 0 0;">
            Si tienes alguna pregunta, no dudes en responder a este email. Estoy aquí para ayudarte.
          </p>

          <p style="font-size: 16px; color: #1F2937; margin: 20px 0 0 0;">
            Saludos,<br>
            <strong>Equipo Comercial de St4rtup</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0; font-size: 12px; color: #6B7280; text-align: center;">
            <strong>St4rtup</strong> | CRM para Startups<br>
            <a href="https://st4rtup.app" style="color: #6366F1; text-decoration: none;">st4rtup.app</a>
          </p>
        </div>

      </div>
    </body>
    </html>
    """

    subject = f"¡Bienvenido a St4rtup, {company}! 🚀"

    text = f"""
    Hola {contact},

    Gracias por tu interés en St4rtup. Nos complace que {company} esté explorando cómo mejorar su proceso de ventas y crecimiento.

    En el sector {sector}, tener un proceso de ventas eficiente es clave para crecer.

    St4rtup te ayuda a:
    • Gestionar leads y pipeline de ventas
    • Automatizar campañas de marketing y outreach
    • Generar propuestas y reportes comerciales
    • Centralizar toda tu información comercial

    Solicita una demo: https://st4rtup.app/demo

    Saludos,
    Equipo Comercial de St4rtup
    """

    return {"subject": subject, "html": html_body, "text": text}


def get_welcome_email_day3(lead_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Welcome email - Day 3
    Value proposition and use cases
    """
    company = html.escape(lead_data.get('company', 'su empresa'))
    contact = html.escape(lead_data.get('contact', 'Estimado/a'))
    frameworks = lead_data.get('regulatory_frameworks', [])
    frameworks_text = html.escape(", ".join(frameworks[:3]) if frameworks else "ventas, marketing, growth")

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Cómo St4rtup Impulsa tu Crecimiento</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1F2937; margin: 0 0 20px 0;">Hola {contact},</p>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 20px 0;">
            Hace unos días te dimos la bienvenida a St4rtup. Hoy quiero compartirte cómo nuestra plataforma puede ayudar específicamente a <strong>{company}</strong> con <strong>{frameworks_text}</strong>.
          </p>

          <!-- Use Cases -->
          <h2 style="font-size: 20px; color: #1F2937; margin: 30px 0 20px 0;">Casos de Uso Reales</h2>

          <div style="margin-bottom: 20px;">
            <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #065F46;">📊 Gestión Automatizada de Riesgos</h3>
              <p style="margin: 0; font-size: 14px; color: #1F2937; line-height: 1.5;">
                Identifica, evalúa y mitiga riesgos de manera sistemática. Matriz de riesgos actualizada en tiempo real.
              </p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1E40AF;">🛡️ Control de Cumplimiento Normativo</h3>
              <p style="margin: 0; font-size: 14px; color: #1F2937; line-height: 1.5;">
                Mapeo automático de controles a múltiples frameworks. Evidencias centralizadas para auditorías.
              </p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 6px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #92400E;">📈 Reportes Ejecutivos</h3>
              <p style="margin: 0; font-size: 14px; color: #1F2937; line-height: 1.5;">
                Dashboards intuitivos para la dirección. Exporta reportes de cumplimiento en PDF con un clic.
              </p>
            </div>
          </div>

          <!-- Stats -->
          <div style="background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); border-radius: 8px; padding: 24px; margin: 30px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1F2937; text-align: center;">Resultados de Nuestros Clientes</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: center;">
              <div>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #6366F1;">70%</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B7280;">Reducción de tiempo</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10B981;">100%</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B7280;">Trazabilidad completa</p>
              </div>
            </div>
          </div>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 30px 0;">
            ¿Te gustaría ver cómo funciona en una demo personalizada? Podemos mostrarte casos específicos para {company}.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://st4rtup.app/demo" style="display: inline-block; background-color: #10B981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Agendar Demo
            </a>
          </div>

          <p style="font-size: 16px; color: #1F2937; margin: 20px 0 0 0;">
            Saludos,<br>
            <strong>Equipo Comercial de St4rtup</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0; font-size: 12px; color: #6B7280; text-align: center;">
            <strong>St4rtup</strong> | CRM para Startups<br>
            <a href="https://st4rtup.app" style="color: #10B981; text-decoration: none;">st4rtup.app</a>
          </p>
        </div>

      </div>
    </body>
    </html>
    """

    subject = f"{company} - Cómo St4rtup impulsa {frameworks_text}"

    text = f"""
    Hola {contact},

    Hace unos días te dimos la bienvenida a St4rtup. Hoy quiero compartirte cómo nuestra plataforma puede ayudar específicamente a {company} con {frameworks_text}.

    CASOS DE USO REALES:

    📊 Gestión Automatizada de Riesgos
    Identifica, evalúa y mitiga riesgos de manera sistemática.

    🛡️ Control de Cumplimiento Normativo
    Mapeo automático de controles a múltiples frameworks.

    📈 Reportes Ejecutivos
    Dashboards intuitivos para la dirección.

    Resultados de nuestros clientes:
    • 70% Reducción de tiempo
    • 100% Trazabilidad completa

    Agenda una demo: https://st4rtup.app/demo

    Saludos,
    Equipo Comercial de St4rtup
    """

    return {"subject": subject, "html": html_body, "text": text}


def get_welcome_email_day7(lead_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Welcome email - Day 7
    Follow-up and call to action
    """
    company = html.escape(lead_data.get('company', 'su empresa'))
    contact = html.escape(lead_data.get('contact', 'Estimado/a'))

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0;">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">¿Hablamos de tus Necesidades?</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1F2937; margin: 0 0 20px 0;">Hola {contact},</p>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 20px 0;">
            Ha pasado una semana desde que comenzamos a compartir información sobre St4rtup. Espero que hayas encontrado útil el contenido.
          </p>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 30px 0;">
            Me gustaría conocer más sobre los retos específicos que enfrenta <strong>{company}</strong> en materia de ventas y crecimiento.
          </p>

          <!-- Questions -->
          <div style="background-color: #FFF7ED; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1F2937;">Algunas preguntas que podríamos resolver:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1F2937;">
              <li style="margin-bottom: 10px; font-size: 15px;">¿Cuáles son vuestros principales retos de ventas ahora mismo?</li>
              <li style="margin-bottom: 10px; font-size: 15px;">¿Cómo gestionáis actualmente vuestro pipeline comercial?</li>
              <li style="margin-bottom: 10px; font-size: 15px;">¿Qué herramientas utilizáis (si alguna) como CRM?</li>
              <li style="margin-bottom: 10px; font-size: 15px;">¿Cuántos leads gestionáis al mes y cuál es vuestra conversión?</li>
            </ul>
          </div>

          <p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 30px 0;">
            Podemos agendar una <strong>llamada de 30 minutos</strong> para entender vuestras necesidades y ver si St4rtup es la herramienta adecuada para vosotros.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://st4rtup.app/demo" style="display: inline-block; background-color: #F59E0B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Agendar Llamada (30 min)
            </a>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 14px; color: #6B7280; margin: 0;">
              O responde a este email con tus disponibilidades
            </p>
          </div>

          <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; font-size: 14px; color: #6B7280; text-align: center; line-height: 1.6;">
              💡 <strong>Sin compromiso</strong>. Si no es el momento adecuado, sin problema.<br>
              Puedes responder "No estoy interesado" y dejaré de enviarte emails.
            </p>
          </div>

          <p style="font-size: 16px; color: #1F2937; margin: 20px 0 0 0;">
            Saludos y espero poder ayudarte,<br>
            <strong>Equipo Comercial de St4rtup</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0; font-size: 12px; color: #6B7280; text-align: center;">
            <strong>St4rtup</strong> | CRM para Startups<br>
            <a href="https://st4rtup.app" style="color: #F59E0B; text-decoration: none;">st4rtup.app</a>
          </p>
        </div>

      </div>
    </body>
    </html>
    """

    subject = f"{company} - ¿Hablamos de vuestras necesidades de ventas?"

    text = f"""
    Hola {contact},

    Ha pasado una semana desde que comenzamos a compartir información sobre St4rtup. Espero que hayas encontrado útil el contenido.

    Me gustaría conocer más sobre los retos específicos que enfrenta {company} en materia de ventas y crecimiento.

    PREGUNTAS QUE PODRÍAMOS RESOLVER:
    • ¿Cuáles son vuestros principales retos de ventas ahora mismo?
    • ¿Cómo gestionáis actualmente vuestro pipeline comercial?
    • ¿Qué herramientas utilizáis como CRM?
    • ¿Cuántos leads gestionáis al mes y cuál es vuestra conversión?

    Podemos agendar una llamada de 30 minutos para entender vuestras necesidades.

    Agendar llamada: https://st4rtup.app/demo

    O responde a este email con tus disponibilidades.

    💡 Sin compromiso. Si no es el momento adecuado, sin problema.

    Saludos,
    Equipo Comercial de St4rtup
    """

    return {"subject": subject, "html": html_body, "text": text}
