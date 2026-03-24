import { LegalLayout } from './PrivacyPage'

export default function CookiesPage() {
  const S = ({ children }) => <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12, color: '#0F172A' }}>{children}</h2>
  const T = ({ headers, rows }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0 24px', fontSize: 14 }}>
      <thead><tr>{headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #E2E8F0', fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', color: '#475569', fontSize: 13 }}>{c}</td>)}</tr>)}</tbody>
    </table>
  )

  return (
    <LegalLayout title="Política de Cookies" updated="24 de marzo de 2026">
      <p>Esta Política de Cookies explica qué cookies utilizamos en st4rtup.com, para qué sirven y cómo puedes gestionarlas. Cumplimos con el artículo 22 de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE) y el RGPD.</p>

      <S>1. ¿Qué son las cookies?</S>
      <p>Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando visitas un sitio web. Permiten que el sitio recuerde tus preferencias, sesión de usuario y otra información para mejorar tu experiencia.</p>

      <S>2. Cookies que utilizamos</S>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Cookies esenciales (estrictamente necesarias)</h3>
      <p>No requieren consentimiento. Son imprescindibles para el funcionamiento del Servicio.</p>
      <T headers={['Cookie', 'Proveedor', 'Finalidad', 'Duración']} rows={[
        ['sb-access-token', 'Supabase', 'Token de autenticación JWT', 'Sesión'],
        ['sb-refresh-token', 'Supabase', 'Renovación de sesión', '7 días'],
        ['riskitera_user_prefs', 'St4rtup', 'Preferencias (idioma, tema, moneda)', 'Permanente'],
        ['riskitera_dashboard_widgets', 'St4rtup', 'Configuración del dashboard', 'Permanente'],
        ['__cf_bm', 'Cloudflare', 'Protección contra bots', '30 min'],
      ]} />

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Cookies funcionales</h3>
      <p>Mejoran la funcionalidad del Servicio. Requieren consentimiento.</p>
      <T headers={['Cookie', 'Proveedor', 'Finalidad', 'Duración']} rows={[
        ['rs_deal_visitor_*', 'St4rtup', 'Identificación de visitantes en Deal Room', 'Sesión'],
        ['rs_visitor_*', 'St4rtup', 'Token anónimo para analytics de documentos', 'Permanente'],
        ['st4rtup_install_dismissed', 'St4rtup', 'Recordar cierre del banner PWA', '7 días'],
      ]} />

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Cookies analíticas</h3>
      <p>Nos ayudan a entender cómo se usa el Servicio (de forma anónima). Requieren consentimiento.</p>
      <T headers={['Cookie', 'Proveedor', 'Finalidad', 'Duración']} rows={[
        ['Actualmente no usamos cookies analíticas de terceros', '', '', ''],
      ]} />
      <p style={{ fontSize: 13, color: '#64748B' }}>Nota: nuestras analíticas internas se basan en datos del backend (sin cookies de tracking), de forma anónima y agregada.</p>

      <S>3. Cookies de terceros</S>
      <p>Los siguientes servicios integrados pueden establecer sus propias cookies:</p>
      <T headers={['Servicio', 'Finalidad', 'Política de privacidad']} rows={[
        ['Supabase', 'Autenticación', 'supabase.com/privacy'],
        ['Cloudflare', 'CDN y protección', 'cloudflare.com/privacypolicy'],
        ['Stripe', 'Procesamiento de pagos', 'stripe.com/privacy'],
        ['Google (OAuth)', 'Conexión Gmail/Drive/Calendar', 'policies.google.com/privacy'],
      ]} />

      <S>4. Cómo gestionar cookies</S>
      <p>Puedes gestionar tus preferencias de cookies de varias formas:</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Desde tu navegador:</strong> la mayoría de navegadores permiten bloquear, eliminar o limitar cookies desde la configuración. Ten en cuenta que bloquear cookies esenciales puede impedir el funcionamiento del Servicio.</li>
        <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
        <li><strong>Firefox:</strong> Preferencias → Privacidad y seguridad → Cookies</li>
        <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
        <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
      </ul>

      <S>5. Cambios en esta política</S>
      <p>Podemos actualizar esta Política de Cookies cuando sea necesario. La fecha de última actualización se indica al inicio del documento. Los cambios sustanciales se comunicarán a través del Servicio.</p>

      <S>6. Contacto</S>
      <p>Para consultas sobre cookies: <strong>hello@st4rtup.com</strong></p>
    </LegalLayout>
  )
}
