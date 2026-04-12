/**
 * LinkedInPreview — Vista previa tipo feed de LinkedIn.
 * Simula el aspecto real de un post en el feed.
 */
import { useState } from 'react'

const CHAR_LIMIT_COLLAPSED = 210

export default function LinkedInPreview({ content = '', authorName = 'David Moya', authorTitle = 'Founder & CEO @ Riskitera', hashtags = [] }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > CHAR_LIMIT_COLLAPSED

  const displayContent = expanded || !isLong ? content : content.slice(0, CHAR_LIMIT_COLLAPSED) + '...'

  // Split content into paragraphs
  const paragraphs = displayContent.split('\n').filter(Boolean)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-w-[555px] shadow-sm">
      {/* Header */}
      <div className="p-4 pb-2 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {authorName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{authorName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{authorTitle}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
            Ahora · <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 8.5a.5.5 0 01-.5.5H7.5a.5.5 0 010-1h3a.5.5 0 010 1z"/></svg>
          </p>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
          {paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>{p}</p>
          ))}
        </div>
        {isLong && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium mt-1"
          >
            ...ver más
          </button>
        )}
        {hashtags.length > 0 && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
            {hashtags.join(' ')}
          </p>
        )}
      </div>

      {/* Engagement bar */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-500 inline-flex items-center justify-center text-white text-[8px]">👍</span>
            <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center text-white text-[8px]">❤️</span>
          </span>
          <span className="ml-1">—</span>
        </span>
        <span>— comentarios</span>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 border-t border-gray-100 dark:border-gray-700 flex justify-around">
        {['Recomendar', 'Comentar', 'Compartir', 'Enviar'].map((action) => (
          <button
            key={action}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
