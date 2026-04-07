import { useState, useCallback, createContext, useContext } from 'react'
import { AlertTriangle, X } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// ConfirmDialog — replaces window.confirm() with a styled modal
//
// Usage:
//   const confirm = useConfirm()
//   if (await confirm({ title: "¿Eliminar?", description: "..." })) {
//     deleteItem()
//   }
// ────────────────────────────────────────────────────────────

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false })
  const [resolver, setResolver] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || '¿Confirmar acción?',
        description: opts.description || '',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        variant: opts.variant || 'danger', // danger | primary
      })
      setResolver(() => resolve)
    })
  }, [])

  const close = (result) => {
    setState({ open: false })
    if (resolver) {
      resolver(result)
      setResolver(null)
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => { if (e.target === e.currentTarget) close(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: 14,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            animation: 'confirmIn 0.15s ease-out',
          }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: state.variant === 'danger' ? '#FEF2F2' : '#EFF6FF',
                color: state.variant === 'danger' ? '#DC2626' : '#1E6FD9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <h2 id="confirm-title" style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#0F172A',
                  lineHeight: 1.4,
                }}>{state.title}</h2>
                {state.description && (
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: 14,
                    color: '#64748B',
                    lineHeight: 1.55,
                  }}>{state.description}</p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                aria-label="Cerrar"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: '#94A3B8',
                  borderRadius: 6,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{
              padding: '16px 24px 24px',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => close(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: state.variant === 'danger' ? '#DC2626' : '#1E6FD9',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes confirmIn {
              from { opacity: 0; transform: scale(0.96); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    // Fallback to window.confirm if provider missing (graceful degradation)
    return (opts) => Promise.resolve(window.confirm(opts.title || '¿Confirmar?'))
  }
  return ctx
}
