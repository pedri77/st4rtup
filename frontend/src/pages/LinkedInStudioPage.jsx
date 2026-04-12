/**
 * LinkedInStudioPage — MOD-LINKEDIN-001
 * Editor de posts LinkedIn con generacion IA, preview en tiempo real,
 * selector de framework, mejores horarios, templates y analytics.
 */
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import LinkedInPreview from '@/components/LinkedInPreview'
import api from '@/services/api'

import { linkedinApi } from '@/services/api'

const TONES = [
  { value: 'expert', label: 'Experto', icon: '🎓' },
  { value: 'casual', label: 'Casual', icon: '💬' },
  { value: 'inspirational', label: 'Inspirador', icon: '✨' },
  { value: 'provocative', label: 'Provocativo', icon: '🔥' },
]

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export default function LinkedInStudioPage() {
  const [activeTab, setActiveTab] = useState('create')
  const [topic, setTopic] = useState('')
  const [framework, setFramework] = useState('hook_story_cta')
  const [tone, setTone] = useState('expert')
  const [language, setLanguage] = useState('es')
  const [maxWords, setMaxWords] = useState(250)
  const [context, setContext] = useState('')
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeEmoji, setIncludeEmoji] = useState(true)

  const [generatedContent, setGeneratedContent] = useState('')
  const [hashtags, setHashtags] = useState([])
  const [generating, setGenerating] = useState(false)

  const [templates, setTemplates] = useState([])
  const [bestTimes, setBestTimes] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [oauthStatus, setOauthStatus] = useState(null)

  useEffect(() => {
    linkedinApi.templates().then(r => setTemplates(r.data.templates || [])).catch(() => {})
    linkedinApi.bestTimes().then(r => setBestTimes(r.data.recommended_times || [])).catch(() => {})
    linkedinApi.analytics(30).then(r => setAnalytics(r.data)).catch(() => {})
    linkedinApi.oauthStatus().then(r => setOauthStatus(r.data)).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Escribe un tema'); return }
    setGenerating(true)
    try {
      const { data } = await linkedinApi.generate({
        topic, framework, tone, language, max_words: maxWords,
        include_hashtags: includeHashtags, include_emoji: includeEmoji,
        context: context || undefined,
      })
      if (data.generated) {
        setGeneratedContent(data.content)
        setHashtags(data.hashtags || [])
        toast.success('Post generado')
      } else {
        toast.error(data.error || 'Error generando')
      }
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.detail || e.message))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!topic.trim()) { toast.error('Escribe un tema'); return }
    setGenerating(true)
    try {
      const { data } = await linkedinApi.generateAndSave({
        topic, framework, tone, language, max_words: maxWords,
        include_hashtags: includeHashtags, include_emoji: includeEmoji,
        context: context || undefined,
      })
      if (data.created) {
        setGeneratedContent(data.content_preview + '...')
        toast.success('Post guardado como borrador')
      }
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.detail || e.message))
    } finally {
      setGenerating(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === framework)

  const tabs = [
    { id: 'create', label: 'Crear', icon: '✍️' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'schedule', label: 'Horarios', icon: '🕐' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">in</span>
            LinkedIn Studio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Genera, programa y analiza tu contenido de LinkedIn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const { data } = await linkedinApi.seed()
                toast.success(`${data.seeded} posts de ejemplo creados`)
              } catch (e) {
                toast.error(e.response?.data?.detail || e.message)
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Seed datos
          </button>
        {oauthStatus && (
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${oauthStatus.connected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
            {oauthStatus.connected ? `Conectado: ${oauthStatus.name}` : 'No conectado'}
          </div>
        )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema del post</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ej: Los 5 errores mas comunes al implementar ENS Alto..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Framework selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Framework</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFramework(t.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      framework === t.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{selectedTemplate.description}</p>
              )}
            </div>

            {/* Tone + Language row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tono</label>
                <div className="flex gap-1">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        tone === t.value
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                      title={t.label}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
                >
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeHashtags} onChange={e => setIncludeHashtags(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-gray-600 dark:text-gray-400">Hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeEmoji} onChange={e => setIncludeEmoji(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-gray-600 dark:text-gray-400">Emojis</span>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Max palabras:</span>
                <input
                  type="number"
                  value={maxWords}
                  onChange={e => setMaxWords(Number(e.target.value))}
                  min={50} max={500} step={50}
                  className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-center"
                />
              </div>
            </div>

            {/* Context (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contexto extra (opcional)</label>
              <input
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ej: Enfocado en sector financiero, mencionar caso de exito reciente..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
                ) : (
                  <><span>🤖</span> Generar post</>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={generating || !topic.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Generar y guardar
              </button>
            </div>

            {/* Secondary actions */}
            {generatedContent && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const { data } = await linkedinApi.generateAndSave({
                        topic, framework, tone, language, max_words: maxWords,
                        include_hashtags: includeHashtags, include_emoji: includeEmoji,
                      })
                      if (data.created) {
                        await linkedinApi.sendToTelegram(data.post_id)
                        toast.success('Enviado a Telegram para revision')
                      }
                    } catch (e) {
                      toast.error('Error: ' + (e.response?.data?.detail || e.message))
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  📱 Enviar a Telegram
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success('Copiado') }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  📋 Copiar
                </button>
              </div>
            )}

            {/* Editable generated content */}
            {generatedContent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido generado (editable)</label>
                <textarea
                  value={generatedContent}
                  onChange={e => setGeneratedContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono resize-y min-h-[200px]"
                  rows={10}
                />
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{generatedContent.split(/\s+/).filter(Boolean).length} palabras · {generatedContent.length} caracteres</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success('Copiado') }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Copiar al portapapeles
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 flex justify-center">
              <LinkedInPreview
                content={generatedContent || 'Tu post aparecera aqui...'}
                hashtags={hashtags}
              />
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                <div className="flex gap-1">
                  {t.best_for.map(b => (
                    <span key={b} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">{b}</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t.description}</p>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line max-h-40 overflow-y-auto">
                {t.example}
              </div>
              <button
                onClick={() => { setFramework(t.id); setActiveTab('create'); toast.success(`Template "${t.name}" seleccionado`) }}
                className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Usar este template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Posts', value: analytics.posts_count, color: 'blue' },
              { label: 'Impresiones', value: analytics.total_impressions?.toLocaleString(), color: 'cyan' },
              { label: 'Likes', value: analytics.total_likes, color: 'red' },
              { label: 'Comentarios', value: analytics.total_comments, color: 'yellow' },
              { label: 'Engagement', value: `${analytics.avg_engagement_rate}%`, color: 'green' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          {analytics.best_day && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Mejores momentos (basado en tus datos)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mejor dia: <span className="font-medium text-gray-900 dark:text-white capitalize">{analytics.best_day}</span>
                {analytics.best_hour !== null && <> · Mejor hora: <span className="font-medium text-gray-900 dark:text-white">{analytics.best_hour}:00</span></>}
              </p>
            </div>
          )}
          {analytics.top_hashtags?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Top Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {analytics.top_hashtags.map(h => (
                  <span key={h.tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm">
                    {h.tag} <span className="text-gray-400">({h.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Mejores horarios para publicar en LinkedIn</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Basado en datos agregados de engagement B2B en Europa (timezone: Europe/Madrid)</p>
          <div className="space-y-2">
            {bestTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="w-24 font-medium text-sm text-gray-900 dark:text-white capitalize">{t.day}</div>
                <div className="w-16 text-sm text-gray-600 dark:text-gray-400">{t.hour}:00</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: `${t.score}%` }}
                    />
                  </div>
                </div>
                <div className="w-10 text-right text-sm font-medium text-gray-900 dark:text-white">{t.score}</div>
                <div className="w-48 text-xs text-gray-500 dark:text-gray-400 hidden md:block">{t.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
