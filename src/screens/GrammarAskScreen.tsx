import { useEffect, useRef, useState } from 'react'
import SpeakIcon from '../components/SpeakIcon'
import { friendlyError } from '../lib/errors'
import { findTopic } from '../lib/grammar'
import { askMascot, type MascotAnswer } from '../lib/grammarAi'
import { fastModels, type Settings } from '../lib/settings'
import { toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

// 5.10.1 (REG-A4-01): la última respuesta de cada «Pregúntale» (tema + pregunta inicial) sobrevive a abrir un 📘 y volver
// con Atrás (la pila de Gramática desmonta esta pantalla). Solo en memoria: ni datos persistentes ni claves.
const lastAnswers = new Map<string, { q: string; asked: string; answer: MascotAnswer }>()

/**
 * v5.10 (D2) «Pregúntale a <mascota>»: dudas libres de gramática (desde un tema o desde el buscador). Responde Gemini con
 * el modelo rápido, en español, con ejemplos en inglés (▶/⏸) y enlaces a los temas del catálogo. La mascota es la del
 * tema elegido (Gota, Chispa, Musgo o Brisa).
 */
export default function GrammarAskScreen({
  settings,
  level,
  topicId,
  initialQuestion = '',
  onBack,
  onOpenTopic,
}: {
  settings: Settings
  level: string
  topicId?: string
  initialQuestion?: string
  onBack: () => void
  onOpenTopic: (id: string) => void
}) {
  const info = THEME_INFO[settings.theme]
  const topic = findTopic(topicId)
  const cacheKey = `${topicId ?? ''}:${initialQuestion}`
  const cached = lastAnswers.get(cacheKey)
  const [q, setQ] = useState(cached?.q ?? initialQuestion)
  const [asked, setAsked] = useState(cached?.asked ?? '')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<MascotAnswer | null>(cached?.answer ?? null)
  const [error, setError] = useState<string | null>(null)
  const keyReady = settings.geminiKey.trim().length > 0
  // Se marca vivo al montar (no solo al crear la ref): en desarrollo, StrictMode desmonta y vuelve a montar, y sin esto
  // la respuesta nunca se pintaba («está pensando…» para siempre).
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const send = async () => {
    const text = q.trim()
    if (!text || loading || !keyReady) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setAsked(text)
    try {
      const r = await askMascot(settings.geminiKey, fastModels(settings), info.mascotName, text, level, topic)
      lastAnswers.set(cacheKey, { q: text, asked: text, answer: r })
      if (alive.current) setAnswer(r)
    } catch (e) {
      if (alive.current) setError(friendlyError(e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }

  const examples = topic ? [`¿Cuándo uso ${topic.name.split(':')[0].toLowerCase()} y cuándo otra forma?`] : ['¿Cuándo uso would y cuándo will?', '¿Qué diferencia hay entre for y since?']

  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="fs-22 leading-tight font-semibold tracking-[-.4px]">Pregúntale a {info.mascotName}</div>
          <div className="txt-sub fs-12.5 leading-tight">{topic ? `Sobre ${topic.nameEs}` : 'Cualquier duda de gramática'}</div>
        </div>
        <Mascot element={info.mascot} size={52} mood={loading ? 'thinking' : answer ? 'happy' : 'idle'} />
      </div>

      {!keyReady ? (
        <div className="glass txt-sub rounded-[20px] p-4 text-center fs-13.5 leading-snug">
          Para preguntarle a {info.mascotName} hace falta tu clave de Gemini (Ajustes). Lo demás de Gramática funciona sin ella.
        </div>
      ) : (
        <div className="glass flex flex-col gap-2 rounded-[22px] p-3">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            rows={2}
            maxLength={500}
            placeholder={`Escribe tu duda, p. ej. «${examples[0]}»`}
            className="input h-auto w-full min-w-0 resize-none py-3 leading-snug"
            aria-label="Tu pregunta"
          />
          <button onClick={send} disabled={!q.trim() || loading} className="btn-acc flex h-[48px] items-center justify-center gap-2 rounded-[24px] fs-15 disabled:opacity-50">
            <Icon name="send" size={16} />
            {loading ? `${info.mascotName} está pensando…` : 'Preguntar'}
          </button>
        </div>
      )}

      {error && (
        <div className="text-center fs-13.5" style={{ color: 'var(--bad)' }}>
          {error}
        </div>
      )}

      {answer && (
        <div className="anim-up flex flex-col gap-3">
          <div className="txt-sub fs-12.5 italic">«{asked}»</div>
          <div className="flex items-start gap-2.5">
            <Mascot element={info.mascot} size={56} mood="speaking" />
            <div className="tip-bubble relative min-w-0 flex-1 rounded-[20px] px-4 py-3 fs-14.5 leading-snug">
              {answer.answerEs.map((p, k) => (
                <p key={k} className={k ? 'mt-1.5' : ''}>
                  {p}
                </p>
              ))}
              <div className="txt-sub mt-1.5 fs-11.5">— {info.mascotName}</div>
            </div>
          </div>
          {answer.examples.length > 0 && (
            <div className="glass rounded-[22px] px-4 py-3">
              <div className="txt-acc2 mb-1.5 text-xs tracking-[1.2px] uppercase">Ejemplos</div>
              {answer.examples.map((e) => (
                <button key={e.en} onClick={() => toggleSpeak(e.en)} className="flex w-full items-start gap-2.5 py-1.5 text-left">
                  <span className="field txt-acc2 mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full">
                    <SpeakIcon speakKey={e.en} size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block fs-15 leading-snug font-medium break-words">{e.en}</span>
                    <span className="txt-sub block fs-13 leading-snug break-words">{e.es}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {answer.topics.length > 0 && (
            <div className="glass rounded-[22px] px-4 py-3">
              <div className="txt-acc2 mb-1.5 text-xs tracking-[1.2px] uppercase">En Gramática</div>
              <div className="flex flex-wrap gap-1.5">
                {answer.topics.map((id) => (
                  <button key={id} onClick={() => onOpenTopic(id)} className="field flex min-h-10 items-center gap-1 rounded-[18px] px-3 py-1.5 text-left fs-13">
                    📘 {findTopic(id)?.nameEs ?? id}
                    <Icon name="chevR" size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
