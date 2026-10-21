import { useEffect, useRef, useState } from 'react'
import { whenBackground } from '../lib/lifecycle'
import type { Grade } from 'ts-fsrs'
import PrepareScreen from '../components/PrepareScreen'
import ReviewSummaryView from '../components/ReviewSummaryView'
import TalkButton, { type Phase } from '../components/TalkButton'
import { DISCARD_HINTS, logDiscard, MIN_SEND_MS } from '../components/talkGesture'
import { holdRoute } from '../lib/audioRoute'
import type { SrsCard } from '../lib/db'
import { friendlyError } from '../lib/errors'
import MascotPage from '../components/MascotPage'
import PhoneticsToggle from '../components/PhoneticsToggle'
import PronunciationView from '../components/PronunciationView'
import SpeakIcon from '../components/SpeakIcon'
import { runPhonetics } from '../lib/phonetics'
import type { PronResult } from '../lib/pronunciation'
import { summarizeReview, type ReviewAttempt } from '../lib/reviewSummary'
import { addPracticeSeconds } from '../lib/stats'
import { distrustMic, MicError, Recorder } from '../lib/recorder'
import { mainModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, isEmptyRecording } from '../lib/speech'
import {
  AUTO_GRADE_SECONDS,
  autoGrade,
  evaluateDrill,
  archiveCard,
  GRADES,
  previewIntervals,
  reviewCard,
  reviewMode,
  sessionQueue,
  suggestedGrade,
  syncCards,
  type DrillResult,
} from '../lib/srs'
import { speak, stopSpeaking, toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO, type ThemeVars, teacherName } from '../ui/theme'

type Step = 'ask' | 'opening' | 'recording' | 'checking' | 'result'

/**
 * Estado del botón de hablar (el mismo de la clase) en cada paso de la tarjeta. 5.10.1 (REG-A4-02, P7): mientras abre
 * el micro, el botón dice «Abriendo el micro… espera» y no acepta toques, como en la clase.
 */
const PHASE: Record<Exclude<Step, 'result'>, Phase> = { ask: 'idle', opening: 'opening', recording: 'recording', checking: 'thinking' }

/** Al aparecer los botones de elegir, se desplazan a la vista (en horizontal quedaban debajo). Estable: solo al montar. */
const showOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest' })

interface Props {
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
  onExit: () => void
  registerBack: (h: (() => void) | null) => void
}

const SOURCE_LABEL: Record<SrsCard['source'], string> = {
  mistake: 'tu corrección',
  lookup: 'palabra guardada',
  grammar: 'ejercicio de Gramática', // v5.10
}

const VERDICT = {
  correct: { label: '¡Correcto!', icon: 'check' as const, color: 'var(--ok)' },
  almost: { label: 'Casi', icon: 'spark' as const, color: 'var(--acc)' },
  wrong: { label: 'Aún no', icon: 'back' as const, color: 'var(--bad)' },
  unknown: { label: 'Esta era la respuesta', icon: 'help' as const, color: 'var(--acc2)' },
}

/** Repaso espaciado: frase en español → la dices en inglés → Gemini la evalúa → nota FSRS. */
export default function ReviewScreen({ settings, t, update, onExit, registerBack }: Props) {
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [step, setStep] = useState<Step>('ask')
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<DrillResult | 'unknown' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  // v5.10 (punto 4): lo hecho en este repaso, para la evaluación del final (reviewSummary.ts).
  const [attempts, setAttempts] = useState<(ReviewAttempt & { tryId?: number })[]>([])
  // Notas de Azure por número de intento: la de la última frase puede llegar con el resumen ya en pantalla.
  const [pronScores, setPronScores] = useState<Record<number, number>>({})
  const [spokenSeconds, setSpokenSeconds] = useState(0)
  // Intento cuya grabación evaluó Gemini en la tarjeta actual (su nota de Azure es la que cuenta en el resumen).
  const cardTry = useRef<number | undefined>(undefined)
  // Saliste a mitad con alguna frase hecha: se muestra la evaluación de lo hecho en vez de salir directamente.
  const [ended, setEnded] = useState(false)
  // v5.9: nota de Azure de la frase (la referencia es la respuesta correcta). null = sin fonética.
  const [pron, setPron] = useState<PronResult | string | 'pending' | null>(null)
  // Cada intento tiene su número: una nota de Azure que llega tarde (de la frase anterior) no se pinta en esta.
  const pronTry = useRef(0)
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)
  // 5.11 (M-10): «Escucha y repite» (1 de cada 4): el texto en inglés queda oculto hasta que lo pidas o respondas.
  const [showText, setShowText] = useState(false)
  // 5.11 (M-10): «Que decida Habla»: segundos que quedan para pasar sola (null = sin cuenta atrás).
  const [autoLeft, setAutoLeft] = useState<number | null>(null)
  const cancelAuto = useRef<() => void>(() => {})
  const gradeRef = useRef<(g: Grade) => void>(() => {})

  useEffect(() => {
    syncCards()
      .then(sessionQueue)
      .then(setQueue)
      .catch((e) => setLoadError((e as Error).message))
    const rec = recorder.current
    return () => {
      rec.close()
      stopSpeaking()
    }
  }, [])

  // Atrás de Android hace lo mismo que la flecha de salir (`leave`, más abajo); con la referencia no se registra en cada pintado.
  const leaveRef = useRef(onExit)
  useEffect(() => {
    registerBack(() => leaveRef.current())
    return () => registerBack(null)
  }, [registerBack])

  useEffect(() => {
    if (step !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [step])

  // MOV-1: al pasar a segundo plano se cierra el micro (lifecycle); la tarjeta no debe seguir «grabando».
  // REG-A1-01: tampoco quedarse en «Abriendo el micro…» si se minimiza durante la apertura.
  useEffect(() => {
    if (step !== 'recording' && step !== 'opening') return
    return whenBackground(() => {
      logDiscard('segundo-plano', 'repaso', { step })
      setStep('ask')
      setError(DISCARD_HINTS['segundo-plano'])
    })
  }, [step])

  // 5.10.1 (REG-M-01): con el repaso abierto (y la app en uso) la ruta de los auriculares se queda puesta; se suelta al
  // ver la evaluación final, al salir y en segundo plano. No abre el micro.
  useEffect(() => (ended ? undefined : holdRoute()), [ended])

  // 5.11 (M-10): en «Escucha y repite» la frase suena sola al aparecer la tarjeta (y con ▶ las veces que quieras).
  const listenCard = queue?.[i] && reviewMode(i, queue[i]) === 'listen' ? queue[i] : null
  const helpPending = step === 'result' && !settings.reviewHelpSeen
  useEffect(() => {
    if (!listenCard || ended) return
    const id = setTimeout(() => speak(listenCard.answerEn, settings.ttsRate, settings.voiceIndex).catch(() => {}), 450)
    return () => clearTimeout(id)
    // Solo al cambiar de tarjeta (no con cada ajuste de voz).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenCard, ended])

  // 5.11 (M-10): «Que decida Habla». Con veredicto, cuenta atrás de 3 s visible y se aplica la nota sugerida; un toque en
  // cualquier sitio la cancela y eliges tú. Con «No lo sé» no pasa sola. En segundo plano se cancela (no corre a escondidas).
  useEffect(() => {
    if (step !== 'result' || ended) return
    const g = autoGrade(result, settings.reviewAutoGrade, helpPending)
    if (g === null) return
    let left = AUTO_GRADE_SECONDS
    setAutoLeft(left)
    const stop = () => {
      clearInterval(id)
      offBg()
      setAutoLeft(null)
    }
    const id = setInterval(() => {
      left--
      if (left > 0) return setAutoLeft(left)
      stop()
      gradeRef.current(g)
    }, 1000)
    const offBg = whenBackground(stop)
    cancelAuto.current = stop
    return () => {
      clearInterval(id)
      offBg()
    }
  }, [step, result, ended, helpPending, settings.reviewAutoGrade])

  // v5.10 (punto 5): el micro es el mismo TalkButton de la clase (toca para hablar / toca para enviar, anillo de 60 s,
  // barras con la voz real, papelera). El envío automático a los 60 s lo hace el propio TalkButton con `elapsed`.
  const onPress = async () => {
    if (!queue?.[i] || step !== 'ask') return
    setError(null)
    setHint(null)
    // REG-A1-01: billete al tocar, antes de esperar a que calle la voz.
    const ticket = recorder.current.ticket()
    setStep('opening') // REG-A4-02 (P7)
    await stopSpeaking()
    try {
      // AUD-MIC-302: un doble toque comparte la misma apertura; false = cancelada (saliste, «No lo sé» o segundo plano).
      if (!(await recorder.current.begin(ticket))) {
        setStep((s) => (s === 'opening' ? 'ask' : s))
        return
      }
      recStart.current = performance.now()
      setElapsed(0)
      setStep('recording')
    } catch (e) {
      setStep('ask')
      setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
    }
  }

  // Como en la clase: un segundo toque (o el envío automático) mientras se cierra la grabación no vuelve a enviar.
  const sending = useRef(false)
  const onRelease = async () => {
    if (sending.current) return
    sending.current = true
    try {
      await send()
    } finally {
      sending.current = false
    }
  }

  /** Papelera: descarta la grabación y suelta el micro (como en la clase). */
  const onCancel = async () => {
    if (step !== 'recording' || sending.current) return
    sending.current = true
    let seconds = 0
    try {
      seconds = (await recorder.current.finish()).seconds
    } finally {
      sending.current = false
    }
    logDiscard('cancelada', 'repaso', { seconds })
    setStep('ask')
    setHint(DISCARD_HINTS.cancelada)
  }

  const send = async () => {
    const card = queue?.[i]
    if (!card || step !== 'recording') return
    setError(null)
    setHint(null)
    // Rebote de un doble toque justo al empezar: no se envía una grabación vacía (talkGesture.ts).
    if (performance.now() - recStart.current < MIN_SEND_MS) return
    setStep('checking')
    // v5.9 (AUD-MIC-305): se suelta el micro; entre tarjetas ya no queda abierto.
    const { blob, seconds } = await recorder.current.finish()
    const analysis = await analyzeSpeech(blob)
    // Error 400 del repaso (2026-10-08): una grabación sin audio (micro de unos auriculares ya desconectados) no se
    // manda a Gemini, y la próxima vuelve a buscar un micro que funcione.
    const empty = isEmptyRecording(blob, analysis)
    if (empty) distrustMic()
    const heard = seconds >= 0.8 && !empty && analysis?.hasSpeech !== false
    // v5.9: lo hablado en el repaso cuenta para la meta diaria y la racha.
    if (heard) {
      addPracticeSeconds(analysis?.speechSeconds ?? seconds)
      setSpokenSeconds((x) => x + (analysis?.speechSeconds ?? seconds))
    }
    // v5.9: con la fonética activa, Azure puntúa la frase en paralelo. La referencia es lo que DIJISTE (la
    // transcripción de Gemini), como en la clase: con la respuesta de la tarjeta, Azure marcaba como «te la comiste»
    // palabras que nunca dijiste («speaks about loyalty» contra «talks about the loyalty»: «the», «talks»).
    let giveReference: (t: string) => void = () => {}
    const reference = new Promise<string>((r) => (giveReference = r))
    const job = heard ? runPhonetics(settings, update, blob, () => reference) : null
    const mine = ++pronTry.current
    setPron(job ? 'pending' : null)
    job?.then((r) => {
      if (typeof r !== 'string') setPronScores((m) => ({ ...m, [mine]: r.pron }))
      if (pronTry.current === mine) setPron(r)
    })
    if (!heard) {
      giveReference('')
      // REG-M-02: el motivo queda en el registro y el aviso (en rojo) se queda hasta el siguiente toque.
      const reason = seconds < 0.8 || blob.size === 0 ? 'corta' : empty ? 'vacia' : 'sin-voz'
      logDiscard(reason, 'repaso', { seconds, bytes: blob.size, analyzed: !!analysis, mic: recorder.current.label })
      setError(DISCARD_HINTS[reason])
      setStep('ask')
      return
    }
    try {
      const r = await evaluateDrill(
        settings.geminiKey,
        mainModels(settings),
        card,
        { base64: await blobToBase64(blob), mimeType: blob.type.split(';')[0] || 'audio/webm' },
      )
      giveReference(r.transcript)
      cardTry.current = mine
      setResult(r)
      setStep('result')
      speak(card.answerEn, settings.ttsRate, settings.voiceIndex).catch(() => {})
    } catch (e) {
      // Sin transcripción, Azure da su nota sin referencia (lo que entendió él).
      giveReference('')
      setError(friendlyError(e))
      setStep('ask')
    }
  }

  /** Salir: con alguna frase hecha, primero la evaluación de lo hecho (v5.10, punto 4); si no, fuera directamente. */
  const leave = () => {
    // Si terminas viendo el resultado de una frase (sin elegir cuándo vuelve), también cuenta en la evaluación; como no se
    // eligió, la frase sigue pendiente para el próximo repaso.
    const current = step === 'result' && !!result
    if (ended || (!attempts.length && !current) || !queue?.[i]) return onExit()
    if (current) record()
    pronTry.current++ // un resultado que llegue tarde ya no se pinta en la tarjeta
    recorder.current.close()
    stopSpeaking()
    setStep('ask')
    setEnded(true)
  }
  // La referencia se actualiza después de cada pintado (no durante él) para el Atrás de Android.
  useEffect(() => {
    leaveRef.current = leave
  })

  const pad = 'relative z-[2] flex h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+24px)]'

  if (loadError) {
    return <PrepareScreen kind="clase" state="error" mascot={THEME_INFO[settings.theme].mascot} teacherName={teacherName(settings.theme)} errorText={loadError} onBack={onExit} />
  }
  if (!queue) return null

  const card = queue[i]

  // ---- Repaso terminado (o dejado a medias): evaluación de lo hecho (v5.10, punto 4)
  if ((!card || ended) && attempts.length > 0) {
    const done = attempts.map(({ tryId, ...a }) => ({ ...a, pron: tryId === undefined ? null : (pronScores[tryId] ?? null) }))
    // La frase en pantalla no cuenta como «sin repasar» si se respondió antes de terminar (se anotó al salir).
    const left = card ? queue.length - i - (attempts.at(-1)?.cardId === card.id ? 1 : 0) : 0
    return (
      <ReviewSummaryView
        s={summarizeReview(done, spokenSeconds, left)}
        element={THEME_INFO[settings.theme].mascot}
        partial={left > 0}
        ttsRate={settings.ttsRate}
        voiceIndex={settings.voiceIndex}
        onBack={onExit}
      />
    )
  }

  // ---- Sin tarjetas pendientes
  if (!card) {
    return (
      <div className={pad}>
        <div className="anim-up flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Mascot element={THEME_INFO[settings.theme].mascot} size={170} mood="happy" />
          <h1 className="fs-28 font-semibold tracking-[-.6px]">¡Todo repasado!</h1>
          <p className="txt-sub max-w-[300px] fs-15 leading-snug">
            No tienes frases pendientes. Cuando el profe te corrija o guardes palabras, aparecerán aquí para repasarlas en el momento justo.
          </p>
        </div>
        <button onClick={onExit} className="btn-acc h-[56px] rounded-full fs-16">
          Volver
        </button>
      </div>
    )
  }

  const intervals = previewIntervals(card)
  const suggested = result ? suggestedGrade(result === 'unknown' ? 'unknown' : result.verdict) : null


  const dontKnow = () => {
    pronTry.current++
    cardTry.current = undefined
    setPron(null)
    // AUD-MIC-302: «No lo sé» durante la apertura del micro la cancela; si no, al abrir pisaría el resultado.
    if (recorder.current.isOpening) recorder.current.close()
    stopSpeaking()
    setResult('unknown')
    setStep('result')
    speak(card.answerEn, settings.ttsRate, settings.voiceIndex).catch(() => {})
  }

  /** Anota la frase para la evaluación del final: el veredicto de Gemini (o «No lo sé») y su intento de Azure. */
  const record = () => {
    const outcome = !result || result === 'unknown' ? 'unknown' : result.verdict
    const tryId = outcome === 'unknown' ? undefined : cardTry.current
    cardTry.current = undefined
    setAttempts((a) => [
      ...a,
      { cardId: card.id ?? -1 - i, source: card.source, promptEs: card.promptEs, answerEn: card.answerEn, outcome, tryId },
    ])
  }

  const grade = async (g: Grade) => {
    cancelAuto.current()
    pronTry.current++
    setPron(null)
    setShowText(false)
    await reviewCard(card, g)
    record()
    // "Otra vez": vuelve al final de esta misma sesión.
    if (g === GRADES[0].grade) setQueue((q) => (q ? [...q, card] : q))
    setResult(null)
    setShowHint(false)
    setError(null)
    setStep('ask')
    setI((x) => x + 1)
  }

  /** «Ya me la sé»: sale del repaso (se recupera en Palabras → Ya las sé) y se pasa a la siguiente. */
  // La cuenta atrás (efecto de arriba) llama a la versión de este pintado.
  gradeRef.current = grade

  const known = async () => {
    cancelAuto.current()
    pronTry.current++
    setPron(null)
    setShowText(false)
    await archiveCard(card)
    record()
    setResult(null)
    setShowHint(false)
    setError(null)
    setStep('ask')
    setI((x) => x + 1)
  }

  const v = result ? VERDICT[result === 'unknown' ? 'unknown' : result.verdict] : null
  const listen = reviewMode(i, card) === 'listen'

  // La primera vez que toca elegir, la mascota explica qué significa (antes había que intuirlo).
  if (step === 'result' && !settings.reviewHelpSeen) {
    return (
      <MascotPage
        overlay={{ t }}
        element={THEME_INFO[settings.theme].mascot}
        mood="speaking"
        title="Tú decides cuándo vuelve"
        subtitle="Después de cada frase eliges cuándo quieres volver a verla, según lo que te costó. Si no te salió, vuelve en unos minutos; si fue fácil, tardará días o semanas. Hace falta elegir para pasar a la siguiente. Y si ya te la sabes de memoria, toca «Ya me la sé» y no volverá (puedes recuperarla en Palabras)."
        primary={{ label: 'Entendido', onClick: () => update({ reviewHelpSeen: true }) }}
      />
    )
  }

  return (
    <div className={pad} onPointerDownCapture={() => autoLeft !== null && cancelAuto.current()}>
      <div className="flex items-center gap-3">
        <button onClick={leave} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Salir del repaso">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="flex-1">
          <div className="text-lg font-semibold">Repaso</div>
          <div className="txt-sub text-xs">
            {Math.min(i + 1, queue.length)} de {queue.length} · {SOURCE_LABEL[card.source]}
          </div>
        </div>
        <PhoneticsToggle settings={settings} update={update} />
        <Mascot element={THEME_INFO[settings.theme].mascot} size={52} mood={step === 'checking' ? 'thinking' : 'idle'} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--gb)' }}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(i / queue.length) * 100}%`, background: 'var(--acc)' }} />
        </div>
        {/* v5.10 (petición del dueño): el repaso se puede terminar cuando quieras, sin agotar las frases. Con al menos una
            respondida (antes no hay nada que evaluar) lleva a la evaluación de lo hecho; las que faltan siguen pendientes. */}
        {(attempts.length > 0 || (step === 'result' && !!result)) && (
          <button onClick={leave} className="field flex h-8 flex-none items-center gap-1.5 rounded-full px-3 fs-13 font-medium" style={{ border: 0 }}>
            <Icon name="check" size={14} stroke={2} />
            Terminar
          </button>
        )}
      </div>

      {/* En horizontal (Galaxy A11) la tarjeta y los botones no caben: el contenido se desplaza (antes quedaban fuera). */}
      <div key={i} className="anim-in no-scrollbar mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">
          {/* v5.10: en las de Gramática se ve el ejercicio en inglés (hueco o palabras) y se dice la frase entera. */}
          {listen ? 'Escucha y repite' : card.source === 'grammar' ? 'Di la frase completa en inglés' : '¿Cómo se dice en inglés?'}
        </div>
        {listen ? (
          // 5.11 (M-10): suena el inglés y lo repites; debajo, lo que significa. El texto en inglés, solo si lo pides.
          <div className="glass mt-2 flex flex-col gap-2.5 rounded-[26px] p-5" data-review-mode="listen">
            <button
              onClick={() => toggleSpeak(card.answerEn, settings.ttsRate, settings.voiceIndex)}
              className="flex items-center gap-3 text-left"
              aria-label="Escuchar la frase otra vez"
            >
              <span className="btn-acc grid h-12 w-12 flex-none place-items-center rounded-full">
                <SpeakIcon speakKey={card.answerEn} size={20} />
              </span>
              <span className="fs-17 leading-snug font-semibold">{showText || step === 'result' ? card.answerEn : 'Escúchala y repítela en voz alta'}</span>
            </button>
            <div className="txt-sub fs-14 leading-snug">Significa: {card.promptEs}</div>
            {!showText && step !== 'result' && (
              <button onClick={() => setShowText(true)} className="txt-sub self-start fs-13 underline underline-offset-[3px]">
                Ver la frase en inglés
              </button>
            )}
          </div>
        ) : (
          <div className="glass mt-2 rounded-[26px] p-5 fs-21 leading-snug font-medium">{card.promptEs}</div>
        )}
        {card.hintEs && step !== 'result' && (
          <button onClick={() => setShowHint((s) => !s)} className="txt-sub mt-2 flex items-center gap-1.5 self-start fs-13">
            <Icon name="bulb" size={14} color="var(--acc)" />
            {showHint ? card.hintEs : 'Ver pista'}
          </button>
        )}

        {step === 'result' && v && (
          <div className="anim-up mt-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 fs-17 font-semibold" style={{ color: v.color }}>
              <Icon name={v.icon} size={20} stroke={2} />
              {v.label}
            </div>
            {result !== 'unknown' && result?.transcript && (
              <div className="txt-sub fs-14">
                Dijiste: <i>"{result.transcript}"</i>
              </div>
            )}
            <button onClick={() => toggleSpeak(card.answerEn, settings.ttsRate, settings.voiceIndex)} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3 text-left">
              <span className="btn-acc grid h-9 w-9 flex-none place-items-center rounded-full">
                <SpeakIcon speakKey={card.answerEn} size={16} />
              </span>
              <span className="fs-16 font-semibold">{card.answerEn}</span>
            </button>
            {result !== 'unknown' && result?.feedbackEs && <div className="fs-14 leading-snug">{result.feedbackEs}</div>}
            {card.hintEs && <div className="txt-sub fs-13 leading-snug">💡 {card.hintEs}</div>}
            {pron === 'pending' && <div className="txt-sub fs-12.5">Azure está puntuando tu pronunciación…</div>}
            {pron && pron !== 'pending' && typeof pron !== 'string' && (
              <PronunciationView r={pron} onSay={(w) => speak(w, settings.ttsRate, settings.voiceIndex)} pausable />
            )}
            {typeof pron === 'string' && pron !== 'pending' && <div className="txt-sub fs-12">Sin nota de pronunciación: {pron}</div>}
          </div>
        )}

        <div className="flex-1" />

        {step === 'result' ? (
          <div ref={showOnMount}>
            {/* v5.9 (nota del dueño): decides TÚ cuándo vuelve, según lo que te costó; hace falta elegir para seguir. */}
            <div className="mb-2 text-center fs-14 font-semibold">¿Cuándo quieres volver a verla?</div>
            <div className="grid grid-cols-4 gap-1.5">
              {GRADES.map(({ grade: g, label }) => (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className={`flex h-[62px] flex-col items-center justify-center rounded-[18px] px-1 ${g === suggested ? 'btn-acc' : 'glass'}`}
                >
                  <span className="fs-14 leading-tight font-semibold">{intervals[g]}</span>
                  <span className={`fs-11 leading-tight ${g === suggested ? 'opacity-80' : 'txt-sub'}`}>{label}</span>
                </button>
              ))}
            </div>
            {autoLeft !== null ? (
              // 5.11 (M-10): cuenta atrás visible; cualquier toque la cancela (onPointerDownCapture de arriba).
              <button
                onClick={() => cancelAuto.current()}
                className="field mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-[20px] fs-13.5 font-medium"
                style={{ border: 0 }}
                data-autograde={autoLeft}
                aria-live="polite"
              >
                <span className="btn-acc grid h-6 w-6 place-items-center rounded-full fs-13 tabular-nums">{autoLeft}</span>
                Paso a la siguiente con la marcada · toca para elegir tú
              </button>
            ) : (
              <div className="txt-sub mt-1.5 text-center fs-12 leading-snug">
                {suggested !== null ? 'Te marco una según cómo te salió, pero eliges tú. ' : ''}Elige una para pasar a la siguiente.
              </div>
            )}
            <button onClick={known} className="txt-sub mt-2 h-10 w-full rounded-[20px] fs-13.5" style={{ border: '1.5px dashed var(--sub)' }}>
              Ya me la sé: no volver a repasarla
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {error && (
              <div className="text-center fs-13" style={{ color: 'var(--bad)' }}>
                {error}
              </div>
            )}
            {hint && !error && <div className="txt-sub text-center fs-13">{hint}</div>}
            <TalkButton
              phase={PHASE[step]}
              elapsed={elapsed}
              onPress={onPress}
              onRelease={onRelease}
              onCancel={onCancel}
              level={() => recorder.current.level()}
            />
            {step === 'ask' && (
              <button onClick={dontKnow} className="txt-sub mt-1 h-10 rounded-[20px] px-4 fs-14" style={{ border: '1.5px dashed var(--sub)' }}>
                No lo sé, muéstrame la respuesta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
