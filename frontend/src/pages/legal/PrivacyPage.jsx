import { Link } from 'react-router-dom'

function LegalLayout({ title, updated, children }) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#0F172A', minHeight: '100vh', backgroundColor: 'white' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <nav style={{ borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <Link to="/" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 500 }}>← Volver</Link>
      </nav>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 48 }}>Última actualización: {updated}</p>
        <div style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>{children}</div>
      </main>
      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: '#94A3B8' }}>
          <Link to="/privacy" style={{ color: '#64748B', textDecoration: 'none' }}>Privacidad</Link>
          <Link to="/terms" style={{ color: '#64748B', textDecoration: 'none' }}>Términos</Link>
          <Link to="/cookies" style={{ color: '#64748B', textDecoration: 'none' }}>Cookies</Link>
        </div>
      </footer>
    </div>
  )
}

export { LegalLayout }

export default function PrivacyPage() {
  const S = ({ children }) => <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12, color: '#0F172A' }}>{children}</h2>

  return (
    <LegalLayout title="Política de Privacidad" updated="24 de marzo de 2026">
      <p>En St4rtup, nos comprometemos a proteger la privacidad de nuestros usuarios. Esta política describe cómo recopilamos, usamos y protegemos tu información personal de acuerdo con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales (LOPDGDD).</p>

      <S>1. Responsable del tratamiento</S>
      <p>El responsable del tratamiento de tus datos personales es la entidad operadora de St4rtup, con domicilio en España. Para cualquier consulta relacionada con la protección de datos, puedes contactarnos en <strong>hello@st4rtup.com</strong>.</p>

      <S>2. Datos que recopilamos</S>
      <p><strong>Datos de cuenta:</strong> nombre, dirección de email, contraseña (hash), empresa, cargo, teléfono (opcional).</p>
      <p><strong>Datos de uso:</strong> páginas visitadas, funcionalidades utilizadas, frecuencia de uso, interacciones con el CRM.</p>
      <p><strong>Datos de dispositivo:</strong> dirección IP (hasheada), tipo de navegador, sistema operativo, resolución de pantalla.</p>
      <p><strong>Datos de integración:</strong> tokens OAuth de servicios conectados (Gmail, Google Drive, Stripe, etc.), almacenados cifrados.</p>

      <S>3. Finalidad del tratamiento</S>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li>Prestación del servicio CRM contratado</li>
        <li>Gestión de la cuenta y autenticación</li>
        <li>Comunicaciones relacionadas con el servicio (transaccionales)</li>
        <li>Mejora del producto y análisis de uso (anonimizado)</li>
        <li>Cumplimiento de obligaciones legales y fiscales</li>
        <li>Comunicaciones comerciales (solo con consentimiento expreso)</li>
      </ul>

      <S>4. Base legal del tratamiento</S>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Ejecución del contrato:</strong> prestación del servicio CRM (Art. 6.1.b RGPD)</li>
        <li><strong>Consentimiento:</strong> comunicaciones comerciales y cookies no esenciales (Art. 6.1.a RGPD)</li>
        <li><strong>Interés legítimo:</strong> mejora del producto, prevención de fraude (Art. 6.1.f RGPD)</li>
        <li><strong>Obligación legal:</strong> facturación, fiscalidad (Art. 6.1.c RGPD)</li>
      </ul>

      <S>5. Destinatarios de los datos</S>
      <p>Compartimos datos únicamente con los proveedores necesarios para prestar el servicio:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Supabase</strong> (autenticación) — UE/US con cláusulas contractuales tipo</li>
        <li><strong>Hetzner</strong> (hosting backend y base de datos) — región CDG (París, UE)</li>
        <li><strong>Cloudflare</strong> (CDN y hosting frontend) — red global con DPA firmado</li>
        <li><strong>Stripe</strong> (pagos) — certificado PCI DSS Level 1</li>
        <li><strong>OpenAI / DeepSeek / Mistral</strong> (IA) — para funcionalidades de IA del CRM</li>
      </ul>
      <p>No vendemos, alquilamos ni compartimos datos personales con terceros con fines comerciales.</p>

      <S>6. Transferencias internacionales</S>
      <p>Algunos proveedores pueden tratar datos fuera del EEE. En esos casos, garantizamos las salvaguardias adecuadas mediante cláusulas contractuales tipo aprobadas por la Comisión Europea (Art. 46.2.c RGPD) o decisiones de adecuación (Art. 45 RGPD).</p>

      <S>7. Plazo de conservación</S>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Datos de cuenta:</strong> mientras la cuenta esté activa + 30 días tras cancelación</li>
        <li><strong>Datos del CRM:</strong> mientras la cuenta esté activa (exportables en cualquier momento)</li>
        <li><strong>Datos de facturación:</strong> 5 años (obligación fiscal española)</li>
        <li><strong>Logs de uso:</strong> 12 meses (anonimizados tras este periodo)</li>
      </ul>

      <S>8. Derechos del usuario</S>
      <p>De acuerdo con el RGPD, tienes derecho a:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Acceso:</strong> obtener copia de tus datos personales</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
        <li><strong>Supresión:</strong> solicitar la eliminación de tus datos ("derecho al olvido")</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado (CSV/JSON)</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo</li>
        <li><strong>Limitación:</strong> solicitar la restricción del tratamiento</li>
        <li><strong>Retirar el consentimiento:</strong> en cualquier momento, sin efecto retroactivo</li>
      </ul>
      <p>Para ejercer estos derechos, escríbenos a <strong>hello@st4rtup.com</strong>. Responderemos en un plazo máximo de 30 días. También puedes presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" style={{ color: '#1E6FD9' }}>www.aepd.es</a>.</p>

      <S>9. Cookies</S>
      <p>Utilizamos cookies para el funcionamiento del servicio. Consulta nuestra <Link to="/cookies" style={{ color: '#1E6FD9' }}>Política de Cookies</Link> para más detalles.</p>

      <S>10. Seguridad</S>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li>Cifrado en tránsito (TLS 1.3) y en reposo (AES-256)</li>
        <li>Acceso restringido por roles (admin/comercial/viewer)</li>
        <li>Tokens OAuth cifrados con Fernet (AES-128-CBC)</li>
        <li>Hashing de IPs para cumplimiento RGPD</li>
        <li>Autenticación JWT con tokens de corta duración</li>
      </ul>

      <S>11. Modificaciones</S>
      <p>Nos reservamos el derecho de modificar esta política. En caso de cambios sustanciales, notificaremos a los usuarios por email con al menos 30 días de antelación. La versión vigente estará siempre disponible en esta URL.</p>

      <S>12. Contacto</S>
      <p>Para cualquier consulta sobre privacidad: <strong>hello@st4rtup.com</strong></p>
    </LegalLayout>
  )
}
