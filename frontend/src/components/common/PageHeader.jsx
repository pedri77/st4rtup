import { useThemeColors } from '@/utils/theme'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

export default function PageHeader({ title, subtitle, icon: Icon, actions, badge }) {
  const T = useThemeColors()
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.primary || T.cyan}15, ${T.accent || T.purple}10)`, border: `1px solid ${T.primary || T.cyan}15` }}>
              <Icon className="w-5 h-5" style={{ color: T.primary || T.cyan }} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{title}</h1>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.primary || T.cyan}15`, color: T.primary || T.cyan }}>{badge}</span>
              )}
            </div>
            {subtitle && <p className="text-sm mt-0.5" style={{ color: T.fgMuted }}>{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
