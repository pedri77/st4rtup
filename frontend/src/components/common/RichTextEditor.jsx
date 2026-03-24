import { useRef, useCallback } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link, Image, AlignLeft, AlignCenter, Type } from 'lucide-react'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6',
}

const TOOLBAR_BUTTONS = [
  { cmd: 'bold', icon: Bold, title: 'Negrita' },
  { cmd: 'italic', icon: Italic, title: 'Cursiva' },
  { cmd: 'underline', icon: Underline, title: 'Subrayado' },
  { divider: true },
  { cmd: 'insertUnorderedList', icon: List, title: 'Lista' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Lista numerada' },
  { divider: true },
  { cmd: 'justifyLeft', icon: AlignLeft, title: 'Alinear izquierda' },
  { cmd: 'justifyCenter', icon: AlignCenter, title: 'Centrar' },
  { divider: true },
  { cmd: 'formatBlock_h2', icon: Type, title: 'Titulo' },
]

export default function RichTextEditor({ value = '', onChange, placeholder = 'Escribe tu email...', minHeight = 300 }) {
  const editorRef = useRef(null)

  const execCmd = useCallback((cmd) => {
    if (cmd === 'formatBlock_h2') {
      document.execCommand('formatBlock', false, 'h2')
    } else if (cmd === 'createLink') {
      const url = prompt('URL del enlace:')
      if (url) document.execCommand('createLink', false, url)
    } else if (cmd === 'insertImage') {
      const url = prompt('URL de la imagen:')
      if (url) document.execCommand('insertImage', false, url)
    } else {
      document.execCommand(cmd, false, null)
    }
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain')
    document.execCommand('insertHTML', false, text)
  }, [])

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '0.5rem', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px', padding: '0.375rem',
        backgroundColor: T.muted, borderBottom: `1px solid ${T.border}`,
        flexWrap: 'wrap',
      }}>
        {TOOLBAR_BUTTONS.map((btn, i) => {
          if (btn.divider) return <div key={i} style={{ width: 1, height: 20, backgroundColor: T.border, margin: '0 4px' }} />
          const Icon = btn.icon
          return (
            <button
              key={btn.cmd}
              onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd) }}
              title={btn.title}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '0.25rem',
                background: 'none', border: 'none', color: T.fgMuted,
                cursor: 'pointer',
              }}
            >
              <Icon size={14} />
            </button>
          )
        })}
        <button
          onMouseDown={(e) => { e.preventDefault(); execCmd('createLink') }}
          title="Insertar enlace"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '0.25rem', background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer' }}
        >
          <Link size={14} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); execCmd('insertImage') }}
          title="Insertar imagen"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '0.25rem', background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer' }}
        >
          <Image size={14} />
        </button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        style={{
          minHeight, padding: '1rem',
          backgroundColor: T.card, color: T.fg,
          fontSize: '0.875rem', lineHeight: 1.6,
          outline: 'none', overflowY: 'auto',
        }}
      />
    </div>
  )
}
