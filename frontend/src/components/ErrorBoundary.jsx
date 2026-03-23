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
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Algo salió mal</h3>
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
