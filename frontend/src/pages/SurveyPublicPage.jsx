import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Star, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { surveysApi } from '@/services/api'

const NPS_LABELS = {
  0: 'Nada probable',
  5: 'Neutral',
  10: 'Muy probable',
}

export default function SurveyPublicPage() {
  const { token } = useParams()
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  // Form state
  const [npsScore, setNpsScore] = useState(null)
  const [csatScore, setCsatScore] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [improvements, setImprovements] = useState('')

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const { data } = await surveysApi.getPublic(token)
        setSurvey(data)
      } catch (err) {
        setError('Encuesta no encontrada')
      } finally {
        setLoading(false)
      }
    }
    fetchSurvey()
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (survey.survey_type === 'nps' && npsScore === null) return
    if (survey.survey_type === 'csat' && csatScore === null) return

    setSubmitting(true)
    try {
      const payload = { responses: [] }

      if (survey.survey_type === 'nps') {
        payload.nps_score = npsScore
        payload.responses.push({ question: 'nps', answer: npsScore, score: npsScore })
      } else if (survey.survey_type === 'csat') {
        payload.overall_score = csatScore
        payload.responses.push({ question: 'csat', answer: csatScore, score: csatScore })
      }

      if (feedback) {
        payload.responses.push({ question: 'feedback', answer: feedback })
        payload.notes = feedback
      }
      if (improvements) {
        payload.improvements_suggested = [{ text: improvements }]
      }

      await surveysApi.respondPublic(token, payload)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar respuesta')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  // Error
  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Encuesta no disponible</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // Already completed
  if (survey?.status === 'already_completed') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Encuesta completada</h1>
          <p className="text-gray-400">Ya has respondido a esta encuesta. Gracias por tu participación.</p>
        </div>
      </div>
    )
  }

  // Expired
  if (survey?.status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Encuesta expirada</h1>
          <p className="text-gray-400">Esta encuesta ya no está disponible.</p>
        </div>
      </div>
    )
  }

  // Submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Gracias por tu respuesta</h1>
          <p className="text-gray-400">Tu feedback es muy valioso para nosotros y nos ayuda a mejorar continuamente.</p>
        </div>
      </div>
    )
  }

  // Active survey form
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-cyan-400 mb-1">St4rtup</h1>
          <p className="text-sm text-gray-500">Encuesta de satisfacción</p>
        </div>

        <div className="bg-gray-50 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{survey.title}</h2>
          {survey.lead_name && (
            <p className="text-sm text-gray-400 mb-6">{survey.lead_name}</p>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NPS Score */}
            {survey.survey_type === 'nps' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Del 0 al 10, ¿qué tan probable es que recomiendes nuestro servicio?
                </label>
                <div className="grid grid-cols-11 gap-1.5">
                  {[...Array(11)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNpsScore(i)}
                      className={clsx(
                        'aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all',
                        npsScore === i
                          ? i <= 6 ? 'bg-red-500 text-gray-800 scale-110'
                            : i <= 8 ? 'bg-yellow-500 text-gray-900 scale-110'
                            : 'bg-green-500 text-gray-800 scale-110'
                          : 'bg-white text-gray-400 hover:bg-gray-100'
                      )}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                  <span>Nada probable</span>
                  <span>Muy probable</span>
                </div>
                {npsScore !== null && (
                  <div className="mt-3 text-center">
                    <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium',
                      npsScore >= 9 ? 'bg-green-900/50 text-green-300' :
                      npsScore >= 7 ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-red-900/50 text-red-300'
                    )}>
                      {npsScore >= 9 ? 'Promotor' : npsScore >= 7 ? 'Pasivo' : 'Detractor'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* CSAT Stars */}
            {survey.survey_type === 'csat' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ¿Cómo calificarías tu satisfacción general con nuestro servicio?
                </label>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button aria-label="Favorito"
                      key={n}
                      type="button"
                      onClick={() => setCsatScore(n)}
                      className="group"
                    >
                      <Star className={clsx(
                        'w-12 h-12 transition-all',
                        n <= (csatScore || 0)
                          ? 'fill-yellow-400 text-yellow-400 scale-110'
                          : 'text-gray-600 group-hover:text-yellow-400/50'
                      )} />
                    </button>
                  ))}
                </div>
                {csatScore && (
                  <p className="text-center text-sm text-gray-400 mt-2">
                    {csatScore === 1 ? 'Muy insatisfecho' :
                     csatScore === 2 ? 'Insatisfecho' :
                     csatScore === 3 ? 'Neutral' :
                     csatScore === 4 ? 'Satisfecho' :
                     'Muy satisfecho'}
                  </p>
                )}
              </div>
            )}

            {/* Generic score for other types */}
            {survey.survey_type !== 'nps' && survey.survey_type !== 'csat' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="surveypublic-field-1">
                  Puntuación general (0-10)
                </label>
                <input id="surveypublic-field-1" type="range"
                  min="0"
                  max="10"
                  value={npsScore || 5}
                  onChange={(e) => setNpsScore(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="text-center text-2xl font-bold text-gray-800 mt-1">{npsScore ?? 5}</div>
              </div>
            )}

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Algún comentario adicional? <span className="text-gray-500">(opcional)</span>
              </label>
              <textarea id="surveypublic-textarea-2" aria-label="Texto" value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                rows={3}
                placeholder="Cuéntanos tu experiencia..."
              />
            </div>

            {/* Improvements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué podríamos mejorar? <span className="text-gray-500">(opcional)</span>
              </label>
              <textarea id="surveypublic-textarea-3" aria-label="Texto" value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                rows={2}
                placeholder="Sugerencias de mejora..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || (survey.survey_type === 'nps' && npsScore === null) || (survey.survey_type === 'csat' && csatScore === null)}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-gray-800 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Respuesta'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by St4rtup CRM
        </p>
      </div>
    </div>
  )
}
