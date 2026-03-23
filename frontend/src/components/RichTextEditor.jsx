import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Undo, Redo } from 'lucide-react'
import { useCallback } from 'react'

/**
 * Rich Text Editor con TipTap
 * @param {Object} props
 * @param {string} props.value - HTML content
 * @param {Function} props.onChange - Callback (html, text) => void
 * @param {string} props.placeholder - Placeholder text
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Escribe aquí...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange?.(html, text)
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL:', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-600' : ''
          }`}
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-600' : ''
          }`}
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-600' : ''
          }`}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-600' : ''
          }`}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('link') ? 'bg-gray-600' : ''
          }`}
          title="Insertar enlace"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Deshacer"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Rehacer"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none"
      />
    </div>
  )
}
