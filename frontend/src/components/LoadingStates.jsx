// ═══════════════════════════════════════════════════════════════════════
// Loading States & Skeletons - Componentes reutilizables
// ═══════════════════════════════════════════════════════════════════════

// ─── Skeleton Base ─────────────────────────────────────────────────────

export function Skeleton({ className = "", variant = "default" }) {
  const variantClasses = {
    default: "bg-gray-100",
    light: "bg-white",
    dark: "bg-gray-600",
  }

  return (
    <div
      className={`animate-pulse rounded ${variantClasses[variant]} ${className}`}
      aria-label="Cargando..."
    />
  )
}

// ─── KPI Card Skeleton ─────────────────────────────────────────────────

export function KpiCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-3 w-28 mt-2" />
    </div>
  )
}

// ─── Chart Skeleton ────────────────────────────────────────────────────

export function ChartSkeleton({ height = "300px" }) {
  return (
    <div className="card">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-around gap-2 px-4 pb-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-full"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
        <Skeleton className="absolute bottom-0 left-0 right-0 h-8" variant="light" />
      </div>
    </div>
  )
}

// ─── Table Row Skeleton ────────────────────────────────────────────────

export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="border-b border-gray-200/50">
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── List Item Skeleton ────────────────────────────────────────────────

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 flex-shrink-0" />
    </div>
  )
}

// ─── Dashboard Loading ─────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border-2 border-gray-200/50 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Table Loading ─────────────────────────────────────────────────────

export function TableSkeleton({ rows = 10, columns = 4 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50/50 border-b border-gray-200">
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Empty States ──────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ""
}) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-4">
        {Icon && <Icon className="w-8 h-8 text-gray-500" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

// ─── Error State ───────────────────────────────────────────────────────

export function ErrorState({
  title = "Algo salió mal",
  description = "Hubo un error al cargar los datos",
  onRetry,
  className = ""
}) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-cyan-600 text-gray-800 rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

// ─── Loading Spinner ───────────────────────────────────────────────────

export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg className="w-full h-full text-cyan-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

// ─── Inline Loader ─────────────────────────────────────────────────────

export function InlineLoader({ text = "Cargando..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <LoadingSpinner size="sm" />
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  )
}
