import { LegalLayout } from './PrivacyPage'

export default function TermsPage() {
  const S = ({ children }) => <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12, color: '#0F172A' }}>{children}</h2>

  return (
    <LegalLayout title="Términos de Uso" updated="24 de marzo de 2026">
      <p>Los presentes Términos de Uso regulan el acceso y uso de la plataforma St4rtup (en adelante, "el Servicio"), accesible en st4rtup.com. Al registrarte o usar el Servicio, aceptas estos términos en su totalidad.</p>

      <S>1. Objeto y aceptación</S>
      <p>St4rtup es una plataforma SaaS de gestión comercial (CRM) y marketing diseñada para startups y empresas B2B. Estos términos constituyen un acuerdo vinculante entre el usuario ("tú") y la entidad operadora de St4rtup ("nosotros").</p>

      <S>2. Descripción del servicio</S>
      <p>El Servicio incluye, según el plan contratado: gestión de leads y pipeline, email marketing, automatizaciones, inteligencia artificial aplicada a ventas, SEO, integraciones con terceros, llamadas IA, deal room, y herramientas de reporting. Las funcionalidades específicas de cada plan están detalladas en la <a href="/pricing" style={{ color: '#1E6FD9' }}>página de precios</a>.</p>

      <S>3. Registro y cuenta</S>
      <p>Para usar el Servicio debes crear una cuenta proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Debes notificarnos inmediatamente cualquier uso no autorizado de tu cuenta.</p>
      <p>Nos reservamos el derecho de suspender o cancelar cuentas que:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li>Proporcionen información falsa</li>
        <li>Violen estos términos</li>
        <li>Permanezcan inactivas más de 12 meses (plan gratuito)</li>
      </ul>

      <S>4. Planes y precios</S>
      <p>Ofrecemos planes gratuitos y de pago. Los precios vigentes se muestran en la página de precios y no incluyen IVA (21% para empresas españolas). Nos reservamos el derecho de modificar precios con 30 días de preaviso por email.</p>

      <S>5. Facturación y pagos</S>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Procesador de pagos:</strong> Stripe (PCI DSS Level 1). No almacenamos datos de tarjeta.</li>
        <li><strong>Facturación:</strong> mensual o anual según el plan elegido, con cargo automático.</li>
        <li><strong>IVA:</strong> 21% para empresas españolas. Exención intracomunitaria con NIF-IVA válido.</li>
        <li><strong>Impago:</strong> si el pago falla, dispondrás de 7 días para resolverlo. Tras 3 intentos fallidos, el servicio se suspenderá temporalmente (sin pérdida de datos durante 30 días).</li>
        <li><strong>Reembolsos:</strong> planes anuales tienen 7 días de desistimiento desde la contratación. Planes mensuales no tienen reembolso del periodo en curso.</li>
      </ul>

      <S>6. Propiedad intelectual</S>
      <p>La plataforma St4rtup, incluyendo su código, diseño, marca, documentación y contenido generado por IA son propiedad exclusiva de St4rtup. Se concede al usuario una licencia limitada, no exclusiva y revocable para usar el Servicio durante la vigencia de la suscripción.</p>

      <S>7. Datos del usuario</S>
      <p><strong>Tus datos son tuyos.</strong> St4rtup actúa como encargado del tratamiento de los datos que introduces en el CRM. Mantienes la plena propiedad y control sobre tus leads, contactos, emails, documentos y cualquier otro dato almacenado en el Servicio.</p>
      <p>Puedes exportar tus datos en cualquier momento en formato CSV, JSON o a través de integraciones (Google Sheets, Airtable). Tras cancelar tu cuenta, mantenemos tus datos disponibles para exportación durante 30 días, tras los cuales se eliminan permanentemente.</p>

      <S>8. Uso aceptable</S>
      <p>Te comprometes a no:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li>Usar el Servicio para actividades ilegales o spam</li>
        <li>Intentar acceder a cuentas de otros usuarios</li>
        <li>Realizar ingeniería inversa o descompilar el software</li>
        <li>Usar la API para scraping masivo o abuso</li>
        <li>Almacenar contenido ilegal, difamatorio o que infrinja derechos de terceros</li>
        <li>Revender el acceso al Servicio sin autorización</li>
        <li>Enviar comunicaciones comerciales no solicitadas (spam) a través del Servicio</li>
      </ul>

      <S>9. Disponibilidad y SLA</S>
      <p>Nos esforzamos por mantener una disponibilidad del <strong>99.9%</strong> (excluyendo mantenimientos programados). Los mantenimientos se notificarán con al menos 24 horas de antelación por email o banner in-app.</p>
      <p>No garantizamos que el Servicio esté libre de errores o interrupciones. En caso de incidencia, informaremos a través de nuestra página de estado.</p>

      <S>10. Limitación de responsabilidad</S>
      <p>En la máxima medida permitida por la ley española:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li>St4rtup no será responsable de daños indirectos, lucro cesante o pérdida de datos</li>
        <li>Nuestra responsabilidad total se limita al importe pagado por el usuario en los últimos 12 meses</li>
        <li>No somos responsables del contenido generado por los modelos de IA integrados</li>
        <li>No somos responsables de fallos en servicios de terceros (proveedores de email, Stripe, etc.)</li>
      </ul>

      <S>11. Resolución y cancelación</S>
      <p><strong>Por el usuario:</strong> puedes cancelar tu cuenta en cualquier momento desde Configuración → Cuenta. La cancelación es efectiva al final del periodo de facturación en curso.</p>
      <p><strong>Por St4rtup:</strong> podemos resolver el contrato inmediatamente en caso de violación grave de estos términos, con notificación por email. En caso de resolución por nuestra parte sin causa imputable al usuario, reembolsaremos la parte proporcional del periodo no consumido.</p>

      <S>12. Modificaciones</S>
      <p>Podemos modificar estos términos en cualquier momento. Los cambios sustanciales se notificarán por email con 30 días de antelación. El uso continuado del Servicio tras la fecha de efecto constituye aceptación de los nuevos términos.</p>

      <S>13. Ley aplicable y jurisdicción</S>
      <p>Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a la jurisdicción de los Juzgados y Tribunales de Madrid (España), con renuncia a cualquier otro fuero que pudiera corresponderles.</p>

      <S>14. Contacto</S>
      <p>Para consultas sobre estos términos: <strong>hello@st4rtup.com</strong></p>
    </LegalLayout>
  )
}
