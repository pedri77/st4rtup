import clsx from 'clsx'

/**
 * Skeleton loaders for different content types.
 */

export function SkeletonPulse({ className }) {
  return <div className={clsx('animate-pulse bg-gray-700/50 rounded', className)} />
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-4 w-32" />
        <SkeletonPulse className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonPulse className="h-8 w-24" />
      <SkeletonPulse className="h-3 w-full" />
      <SkeletonPulse className="h-1.5 w-full rounded-full" />
    </div>
  )
}

export function SkeletonKPIGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => <SkeletonPulse key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 border-b border-gray-700/50 flex gap-4">
          {Array.from({ length: cols }).map((_, j) => <SkeletonPulse key={j} className="h-4 flex-1" />)}
        </div>
      ))}
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="h-5 w-5 rounded" />
        <SkeletonPulse className="h-8 w-48" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPulse key={i} className="h-9 w-24 rounded-lg" />)}
      </div>
      <SkeletonKPIGrid />
    </div>
  )
}
