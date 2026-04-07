import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
    // Auto-reload on chunk load failure (deploy cache invalidation)
    if (error?.message?.includes('dynamically imported module') || error?.message?.includes('Failed to fetch')) {
      const lastReload = sessionStorage.getItem('chunk_reload')
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        sessionStorage.setItem('chunk_reload', String(Date.now()))
        window.location.reload()
      }
      return
    }
    // Best-effort error reporting to backend (silent — never throws)
    // Sanitizes PII and removes auth tokens from URL before sending
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      if (!apiUrl || !navigator.sendBeacon) return

      // Strip sensitive query params from URL
      const url = new URL(window.location.href)
      for (const k of ['token', 'access_token', 'refresh_token', 'impersonate_token', 'key', 'code', 'api_key']) {
        url.searchParams.delete(k)
      }
      const safeUrl = url.pathname + url.search

      // Redact common PII patterns from text
      const redact = (s) => (s || '')
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
        .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')

      const payload = JSON.stringify({
        message: redact(error?.message || 'Unknown').slice(0, 500),
        stack: redact(error?.stack || '').slice(0, 2000),
        component_stack: redact(info?.componentStack || '').slice(0, 1000),
        url: safeUrl,
        ua: navigator.userAgent,
        ts: new Date().toISOString(),
      })
      navigator.sendBeacon(`${apiUrl}/audit/client-error`, new Blob([payload], { type: 'application/json' }))
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Algo salió mal</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md">
              {this.state.error?.message || 'Error inesperado al renderizar esta sección.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="btn-primary text-sm flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Recargar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
