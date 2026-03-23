import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

/**
 * Breadcrumbs component.
 * @param {Array<{label: string, href?: string}>} items - breadcrumb items, last one is current page
 */
export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
      <Link to="/dashboard" className="hover:text-gray-300 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-gray-700" />
          {i < items.length - 1 && item.href ? (
            <Link to={item.href} className="hover:text-gray-300 transition-colors">{item.label}</Link>
          ) : (
            <span className="text-gray-400">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
