import { useState, useRef, useEffect } from 'react'
import { Check, X, Pencil } from 'lucide-react'

const T = {
  muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A',
  fgMuted: '#64748B', cyan: '#1E6FD9', success: '#10B981',
  destructive: '#EF4444',
}

export default function InlineEdit({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = '',
  className = '',
  style = {},
  renderDisplay,
  validate,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text') inputRef.current.select()
    }
  }, [editing])

  useEffect(() => { setDraft(value ?? '') }, [value])

  const save = () => {
    if (validate) {
      const err = validate(draft)
      if (err) { setError(err); return }
    }
    setError(null)
    if (draft !== value) onSave(draft)
    setEditing(false)
  }

  const cancel = () => { setDraft(value ?? ''); setError(null); setEditing(false) }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (!editing) {
    return (
      <div
        className={`group inline-flex items-center gap-1 cursor-pointer ${className}`}
        onClick={() => setEditing(true)}
        style={{ minHeight: 28, ...style }}
        title="Click para editar"
      >
        {renderDisplay ? renderDisplay(value) : (
          <span style={{ color: value ? T.fg : T.fgMuted }}>{value || placeholder || '—'}</span>
        )}
        <Pencil size={12} style={{ color: T.fgMuted, opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:!opacity-100" />
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="inline-flex items-center gap-1">
        <select id="inlineedit-select-1" aria-label="Selector" ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={save}
          style={{
            backgroundColor: T.muted, border: `1px solid ${T.cyan}`, color: T.fg,
            borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: 'inherit',
            outline: 'none',
          }}
        >
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col">
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type={type === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) { const err = validate ? validate(e.target.value) : null; setError(err) } }}
          onKeyDown={handleKeyDown}
          onBlur={save}
          placeholder={placeholder}
          style={{
            backgroundColor: T.muted, border: `1px solid ${error ? T.destructive : T.cyan}`, color: T.fg,
            borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: 'inherit',
            outline: 'none', width: Math.max(60, (draft?.toString().length || 5) * 9),
          }}
        />
        <button aria-label="Confirmar" onClick={save} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.success, padding: 2 }}>
          <Check size={14} />
        </button>
        <button aria-label="Cerrar" onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.destructive, padding: 2 }}>
          <X size={14} />
        </button>
      </div>
      {error && <span style={{ color: T.destructive, fontSize: '0.7rem', marginTop: '0.125rem' }}>{error}</span>}
    </div>
  )
}
