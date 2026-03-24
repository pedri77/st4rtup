const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
}
const fontDisplay = "'Rajdhani', sans-serif"

const ILLUSTRATIONS = {
  leads: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="40" r="20" stroke={T.cyan} strokeWidth="2" opacity="0.3" />
      <circle cx="60" cy="40" r="12" stroke={T.cyan} strokeWidth="2" opacity="0.6" />
      <path d="M40 90 C40 70 80 70 80 90" stroke={T.cyan} strokeWidth="2" opacity="0.4" />
      <circle cx="35" cy="55" r="8" stroke={T.purple} strokeWidth="1.5" opacity="0.3" />
      <circle cx="85" cy="55" r="8" stroke={T.purple} strokeWidth="1.5" opacity="0.3" />
      <path d="M55 42 L65 42" stroke={T.cyan} strokeWidth="1.5" opacity="0.5" />
      <path d="M57 47 L63 47" stroke={T.cyan} strokeWidth="1.5" opacity="0.4" />
    </svg>
  ),
  pipeline: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="30" width="25" height="60" rx="4" stroke={T.cyan} strokeWidth="2" opacity="0.4" />
      <rect x="10" y="50" width="25" height="40" rx="0" fill={T.cyan} opacity="0.1" />
      <rect x="47" y="40" width="25" height="50" rx="4" stroke={T.purple} strokeWidth="2" opacity="0.4" />
      <rect x="47" y="55" width="25" height="35" rx="0" fill={T.purple} opacity="0.1" />
      <rect x="84" y="50" width="25" height="40" rx="4" stroke={T.cyan} strokeWidth="2" opacity="0.4" />
      <rect x="84" y="65" width="25" height="25" rx="0" fill={T.cyan} opacity="0.1" />
      <path d="M35 60 L47 60" stroke={T.fgMuted} strokeWidth="1" strokeDasharray="3 3" />
      <path d="M72 65 L84 65" stroke={T.fgMuted} strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  ),
  emails: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="20" y="35" width="80" height="50" rx="6" stroke={T.cyan} strokeWidth="2" opacity="0.4" />
      <path d="M20 40 L60 65 L100 40" stroke={T.cyan} strokeWidth="2" opacity="0.3" />
      <path d="M20 85 L45 65" stroke={T.cyan} strokeWidth="1" opacity="0.2" />
      <path d="M100 85 L75 65" stroke={T.cyan} strokeWidth="1" opacity="0.2" />
      <circle cx="90" cy="35" r="10" fill={T.purple} opacity="0.2" stroke={T.purple} strokeWidth="1.5" />
      <text x="90" y="39" textAnchor="middle" fill={T.purple} fontSize="10" fontWeight="bold">0</text>
    </svg>
  ),
  actions: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="25" y="25" width="70" height="16" rx="4" stroke={T.cyan} strokeWidth="1.5" opacity="0.3" />
      <rect x="25" y="50" width="70" height="16" rx="4" stroke={T.purple} strokeWidth="1.5" opacity="0.3" />
      <rect x="25" y="75" width="70" height="16" rx="4" stroke={T.fgMuted} strokeWidth="1.5" opacity="0.2" />
      <circle cx="35" cy="33" r="4" stroke={T.cyan} strokeWidth="1.5" opacity="0.5" />
      <circle cx="35" cy="58" r="4" stroke={T.purple} strokeWidth="1.5" opacity="0.5" />
      <circle cx="35" cy="83" r="4" stroke={T.fgMuted} strokeWidth="1.5" opacity="0.3" />
      <path d="M48 33 L85 33" stroke={T.cyan} strokeWidth="1" opacity="0.3" />
      <path d="M48 58 L75 58" stroke={T.purple} strokeWidth="1" opacity="0.3" />
      <path d="M48 83 L65 83" stroke={T.fgMuted} strokeWidth="1" opacity="0.2" />
    </svg>
  ),
  generic: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="30" y="20" width="60" height="80" rx="8" stroke={T.cyan} strokeWidth="2" opacity="0.3" />
      <path d="M45 45 L75 45" stroke={T.fgMuted} strokeWidth="1.5" opacity="0.3" />
      <path d="M45 55 L70 55" stroke={T.fgMuted} strokeWidth="1.5" opacity="0.2" />
      <path d="M45 65 L65 65" stroke={T.fgMuted} strokeWidth="1.5" opacity="0.2" />
      <circle cx="60" cy="60" r="25" stroke={T.cyan} strokeWidth="1" opacity="0.15" strokeDasharray="4 4" />
    </svg>
  ),
}

export default function EmptyState({
  type = 'generic',
  title = 'Sin datos',
  description = 'No hay elementos para mostrar.',
  actionLabel,
  onAction,
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2rem', minHeight: 300,
    }}>
      <div style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        {ILLUSTRATIONS[type] || ILLUSTRATIONS.generic}
      </div>
      <h3 style={{ fontFamily: fontDisplay, fontSize: '1.25rem', fontWeight: 700, color: T.fg, margin: '0 0 0.5rem 0', textAlign: 'center' }}>
        {title}
      </h3>
      <p style={{ color: T.fgMuted, fontSize: '0.875rem', maxWidth: 400, textAlign: 'center', margin: '0 0 1.5rem 0' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '0.625rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
            fontFamily: fontDisplay, cursor: 'pointer',
            background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: T.bg, border: 'none',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
