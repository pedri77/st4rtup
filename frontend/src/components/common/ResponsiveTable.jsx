/**
 * ResponsiveTable — Wraps tables in a horizontal scroll container on mobile.
 * Use this around any <table> or wide data grid to prevent horizontal overflow.
 *
 * Usage:
 *   <ResponsiveTable>
 *     <table>...</table>
 *   </ResponsiveTable>
 */
export default function ResponsiveTable({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 ${className}`}>
      <div className="min-w-[640px]">
        {children}
      </div>
    </div>
  )
}
