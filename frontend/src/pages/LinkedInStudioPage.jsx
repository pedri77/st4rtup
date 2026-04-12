/**
 * LinkedInStudioPage — MOD-LINKEDIN-001
 * Editor de posts LinkedIn con generacion IA, preview en tiempo real,
 * selector de framework, mejores horarios, templates y analytics.
 */
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import LinkedInPreview from '@/components/LinkedInPreview'
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

  // Carousel state
  const [carouselTopic, setCarouselTopic] = useState('')
  const [carouselSlides, setCarouselSlides] = useState(8)
  const [carouselResult, setCarouselResult] = useState(null)
  const [generatingCarousel, setGeneratingCarousel] = useState(false)

  // RSS state
  const [rssFeeds, setRssFeeds] = useState([])
  const [rssArticles, setRssArticles] = useState([])
  const [fetchingRss, setFetchingRss] = useState(false)
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedCategory, setNewFeedCategory] = useState('general')
  const [showAddFeed, setShowAddFeed] = useState(false)

  // Charts state
  const [chartData, setChartData] = useState(null)
  const [frameworkData, setFrameworkData] = useState(null)

  const tabs = [
    { id: 'create', label: 'Crear', icon: '✍️' },
    { id: 'carousel', label: 'Carousel', icon: '🎠' },
    { id: 'rss', label: 'Inspiracion', icon: '📰' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'charts', label: 'Charts', icon: '📈' },
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
                <input type="checkbox" checked={includeHashtags} onChange={e => setIncludeHashtags(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                <span className="text-gray-700 dark:text-gray-200">Hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeEmoji} onChange={e => setIncludeEmoji(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                <span className="text-gray-700 dark:text-gray-200">Emojis</span>
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

      {/* CAROUSEL TAB */}
      {activeTab === 'carousel' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Generador de Carousel</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Genera un guion estructurado slide por slide para crear carousels virales.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema del carousel</label>
                <input
                  value={carouselTopic}
                  onChange={e => setCarouselTopic(e.target.value)}
                  placeholder="Ej: 5 errores que matan tu startup B2B"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slides</label>
                <input
                  type="number" value={carouselSlides} onChange={e => setCarouselSlides(Number(e.target.value))}
                  min={4} max={15}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!carouselTopic.trim()) { toast.error('Escribe un tema'); return }
                setGeneratingCarousel(true)
                try {
                  const { data } = await linkedinApi.generateCarousel({ topic: carouselTopic, slides: carouselSlides })
                  if (data.generated) { setCarouselResult(data.carousel); toast.success(`Carousel de ${data.slides_count} slides generado`) }
                  else toast.error(data.error || 'Error')
                } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                finally { setGeneratingCarousel(false) }
              }}
              disabled={generatingCarousel || !carouselTopic.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {generatingCarousel ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</> : '🎠 Generar carousel'}
            </button>
          </div>

          {carouselResult && carouselResult.slides && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{carouselResult.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {carouselResult.slides.map((slide, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${
                    slide.type === 'cover' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                    slide.type === 'cta' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                    slide.type === 'stat' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' :
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Slide {slide.slide}</span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400 uppercase">{slide.type}</span>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{slide.icon} {slide.headline}</p>
                    {slide.body && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{slide.body}</p>}
                    {slide.subheadline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{slide.subheadline}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {carouselResult && carouselResult.raw_content && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{carouselResult.raw_content}</pre>
            </div>
          )}
        </div>
      )}

      {/* RSS / INSPIRACION TAB */}
      {activeTab === 'rss' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Inspiracion desde RSS</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona feeds y genera posts desde articulos recientes.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddFeed(!showAddFeed)}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                + Añadir feed
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data } = await linkedinApi.rssSeedDefaults()
                    toast.success(`${data.seeded} feeds por defecto cargados`)
                    const res = await linkedinApi.rssFeeds()
                    setRssFeeds(res.data.feeds || [])
                  } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cargar defaults
              </button>
              <button
                onClick={async () => {
                  setFetchingRss(true)
                  try {
                    const [feedsRes, articlesRes] = await Promise.all([
                      linkedinApi.rssFeeds(),
                      linkedinApi.rssFetch(null, 5),
                    ])
                    setRssFeeds(feedsRes.data.feeds || [])
                    setRssArticles(articlesRes.data.articles || [])
                    toast.success(`${articlesRes.data.total} articulos de ${articlesRes.data.feeds_checked} feeds`)
                  } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                  finally { setFetchingRss(false) }
                }}
                disabled={fetchingRss}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {fetchingRss ? 'Cargando...' : '🔄 Cargar articulos'}
              </button>
            </div>
          </div>

          {/* Add feed form */}
          {showAddFeed && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Nuevo feed RSS</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input value={newFeedName} onChange={e => setNewFeedName(e.target.value)} placeholder="Nombre" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
                <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="https://example.com/feed.xml" className="md:col-span-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <select value={newFeedCategory} onChange={e => setNewFeedCategory(e.target.value)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                    <option value="general">General</option>
                    <option value="ciberseguridad">Ciberseguridad</option>
                    <option value="regulacion">Regulacion</option>
                    <option value="tech">Tech</option>
                    <option value="infosec">InfoSec</option>
                    <option value="eu_cyber">EU Cyber</option>
                    <option value="startup">Startup</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (!newFeedName || !newFeedUrl) { toast.error('Nombre y URL son obligatorios'); return }
                      try {
                        await linkedinApi.rssCreateFeed({ name: newFeedName, url: newFeedUrl, category: newFeedCategory })
                        toast.success('Feed creado')
                        setNewFeedName(''); setNewFeedUrl(''); setShowAddFeed(false)
                        const res = await linkedinApi.rssFeeds()
                        setRssFeeds(res.data.feeds || [])
                      } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    Crear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feed list */}
          {rssFeeds.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Feeds configurados ({rssFeeds.length})</h4>
              <div className="flex flex-wrap gap-2">
                {rssFeeds.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{f.name}</span>
                    <span className="text-xs text-gray-400">({f.category})</span>
                    <button
                      onClick={async () => {
                        try {
                          await linkedinApi.rssDeleteFeed(f.id)
                          setRssFeeds(prev => prev.filter(x => x.id !== f.id))
                          toast.success('Feed eliminado')
                        } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                      }}
                      className="ml-1 text-red-400 hover:text-red-600 text-xs"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rssArticles.length > 0 && (
            <div className="space-y-3">
              {rssArticles.map((article, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400">{article.feed_name}</span>
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded text-[10px] font-medium text-blue-600 dark:text-blue-400">{article.category}</span>
                      </div>
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        {article.title}
                      </a>
                      {article.summary && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{article.summary}</p>}
                      {article.published && <p className="text-xs text-gray-400 mt-1">{article.published}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await linkedinApi.rssInspire({ title: article.title, summary: article.summary || '', framework })
                          if (data.generated) {
                            setGeneratedContent(data.content)
                            setHashtags(data.hashtags || [])
                            setActiveTab('create')
                            toast.success('Post generado desde articulo')
                          } else toast.error(data.error || 'Error')
                        } catch (e) { toast.error(e.response?.data?.detail || e.message) }
                      }}
                      className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 whitespace-nowrap"
                    >
                      ✍️ Crear post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  const [engRes, fwRes] = await Promise.all([
                    linkedinApi.chartEngagement(30),
                    linkedinApi.chartFrameworks(),
                  ])
                  setChartData(engRes.data)
                  setFrameworkData(fwRes.data)
                  toast.success('Charts actualizados')
                } catch (e) { toast.error(e.response?.data?.detail || e.message) }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              📈 Cargar datos
            </button>
          </div>

          {frameworkData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Rendimiento por Framework</h3>
              <div className="space-y-3">
                {frameworkData.frameworks.map((fw, i) => {
                  const maxEng = Math.max(...frameworkData.frameworks.map(f => f.avg_engagement), 1)
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{fw.framework}</div>
                      <div className="flex-1">
                        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max((fw.avg_engagement / maxEng) * 100, 5)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{fw.avg_engagement}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 w-40 justify-end">
                        <span>{fw.posts} posts</span>
                        <span>👍 {fw.likes}</span>
                        <span>💬 {fw.comments}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {chartData && chartData.data.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Engagement ultimos {chartData.period_days} dias</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2 font-medium">Fecha</th>
                      <th className="text-right py-2 font-medium">Posts</th>
                      <th className="text-right py-2 font-medium">Impresiones</th>
                      <th className="text-right py-2 font-medium">Likes</th>
                      <th className="text-right py-2 font-medium">Comentarios</th>
                      <th className="text-right py-2 font-medium">Shares</th>
                      <th className="text-right py-2 font-medium">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.data.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-2 text-gray-700 dark:text-gray-300">{row.date}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{row.posts}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{row.impressions.toLocaleString()}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{row.likes}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{row.comments}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{row.shares}</td>
                        <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{row.engagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
