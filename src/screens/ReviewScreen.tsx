import { useEffect, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import PrepareScreen from '../components/PrepareScreen'
import { MAX_TALK_SECONDS } from '../components/TalkButton'
import { MIN_SEND_MS } from '../components/talkGesture'
import type { SrsCard } from '../lib/db'
import { friendlyError } from '../lib/errors'
import MascotPage from '../components/MascotPage'
import { addPracticeSeconds } from '../lib/stats'
import { MicError, Recorder } from '../lib/recorder'
import { mainModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64 } from '../lib/speech'
import {
  evaluateDrill,
  archiveCard,
  GRADES,
  previewIntervals,
  reviewCard,
  sessionQueue,
  suggestedGrade,
  syncCards,
  type DrillResult,
} from '../lib/srs'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { TEACHERS, THEME_INFO, type ThemeVars } from '../ui/theme'
import Wave from '../ui/Wave'

type Step = 'ask' | 'recording' | 'checking' | 'result'

/** Al aparecer los botones de elegir, se desplazan a la vista (en horizontal quedaban debajo). Estable: solo al montar. */
const showOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest' })

interface Props {
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
  onExit: () => void
  registerBack: (h: (() => void) | null) => void
}

const VERDICT = {
  correct: { label: '¡Correcto!', icon: 'check' as const, color: '#5fe3a1' },
  almost: { label: 'Casi', icon: 'spark' as const, color: 'var(--acc)' },
  wrong: { label: 'Aún no', icon: 'back' as const, color: '#f87171' },
  unknown: { label: 'Esta era la respuesta', icon: 'help' as const, color: 'var(--acc2)' },
}

/** Repaso espaciado: frase en español → la dices en inglés → Gemini la evalúa → nota FSRS. */
export default function ReviewScreen({ settings, t, update, onExit, registerBack }: Props) {
  const teacher = TEACHERS[settings.teacher]
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [step, setStep] = useState<Step>('ask')
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<DrillResult | 'unknown' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stats, setStats] = useState({ done: 0, correct: 0 })
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)

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

  useEffect(() => {
    registerBack(onExit)
    return () => registerBack(null)
  }, [onExit, registerBack])

  useEffect(() => {
    if (step !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [step])

  // v5.9: como en la clase, una respuesta dura como mucho 60 s; al llegar se envía sola.
  const toggleRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (step === 'recording' && elapsed >= MAX_TALK_SECONDS) toggleRef.current?.()
  }, [step, elapsed])

  const toggleRecord = async () => {
    const card = queue?.[i]
    if (!card) return
    setError(null)
    if (step === 'ask') {
      await stopSpeaking()
      try {
        // AUD-MIC-302: un doble toque comparte la misma apertura; false = cancelada (saliste, «No lo sé» o segundo plano).
        if (!(await recorder.current.begin())) return
        recStart.current = performance.now()
        setElapsed(0)
        setStep('recording')
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
      }
      return
    }
    if (step !== 'recording') return
    // Rebote de un doble toque justo al empezar: no se envía una grabación vacía (talkGesture.ts).
    if (performance.now() - recStart.current < MIN_SEND_MS) return
    setStep('checking')
    // v5.9 (AUD-MIC-305): se suelta el micro; entre tarjetas ya no queda abierto.
    const { blob, seconds } = await recorder.current.finish()
    const analysis = await analyzeSpeech(blob)
    // v5.9: lo hablado en el repaso cuenta para la meta diaria y la racha.
    if (analysis?.hasSpeech !== false) addPracticeSeconds(analysis?.speechSeconds ?? seconds)
    if (seconds < 0.8 || (analysis && !analysis.hasSpeech)) {
      setError('No te he oído. Inténtalo otra vez.')
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
      setResult(r)
      setStep('result')
      speak(card.answerEn, settings.ttsRate, settings.voiceIndex).catch(() => {})
    } catch (e) {
      setError(friendlyError(e))
      setStep('ask')
    }
  }

  // La referencia se actualiza después de cada pintado (no durante él) para el envío automático de los 60 s.
  useEffect(() => {
    toggleRef.current = toggleRecord
  })

  const pad = 'relative z-[2] flex h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+24px)]'

  if (loadError) {
    return <PrepareScreen kind="clase" state="error" mascot={THEME_INFO[settings.theme].mascot} teacherName={teacher.name} errorText={loadError} onBack={onExit} />
  }
  if (!queue) return null

  const card = queue[i]

  // ---- Sin tarjetas o sesión terminada
  if (!card) {
    const empty = queue.length === 0
    return (
      <div className={pad}>
        <div className="anim-up flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Mascot element={THEME_INFO[settings.theme].mascot} size={170} mood={empty ? 'happy' : 'idle'} />
          <h1 className="text-[28px] font-semibold tracking-[-.6px]">{empty ? '¡Todo repasado!' : '¡Repaso terminado!'}</h1>
          <p className="txt-sub max-w-[300px] text-[15px] leading-snug">
            {empty
              ? 'No tienes frases pendientes. Cuando el profe te corrija o guardes palabras, aparecerán aquí para repasarlas en el momento justo.'
              : `Has repasado ${stats.done} ${stats.done === 1 ? 'frase' : 'frases'} y acertaste ${stats.correct}. Volverán cuando estés a punto de olvidarlas.`}
          </p>
        </div>
        <button onClick={onExit} className="btn-acc h-[56px] rounded-full text-[16px]">
          Volver
        </button>
      </div>
    )
  }

  const intervals = previewIntervals(card)
  const suggested = result ? suggestedGrade(result === 'unknown' ? 'unknown' : result.verdict) : null


  const dontKnow = () => {
    // AUD-MIC-302: «No lo sé» durante la apertura del micro la cancela; si no, al abrir pisaría el resultado.
    if (recorder.current.isOpening) recorder.current.close()
    stopSpeaking()
    setResult('unknown')
    setStep('result')
    speak(card.answerEn, settings.ttsRate, settings.voiceIndex).catch(() => {})
  }

  const grade = async (g: Grade) => {
    await reviewCard(card, g)
    const ok = result !== 'unknown' && result?.verdict === 'correct'
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (ok ? 1 : 0) }))
    // "Otra vez": vuelve al final de esta misma sesión.
    if (g === GRADES[0].grade) setQueue((q) => (q ? [...q, card] : q))
    setResult(null)
    setShowHint(false)
    setError(null)
    setStep('ask')
    setI((x) => x + 1)
  }

  /** «Ya me la sé»: sale del repaso (se recupera en Palabras → Ya las sé) y se pasa a la siguiente. */
  const known = async () => {
    await archiveCard(card)
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (result !== 'unknown' && result?.verdict === 'correct' ? 1 : 0) }))
    setResult(null)
    setShowHint(false)
    setError(null)
    setStep('ask')
    setI((x) => x + 1)
  }

  const v = result ? VERDICT[result === 'unknown' ? 'unknown' : result.verdict] : null

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
    <div className={pad}>
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Salir del repaso">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="flex-1">
          <div className="text-lg font-semibold">Repaso</div>
          <div className="txt-sub text-xs">
            {Math.min(i + 1, queue.length)} de {queue.length} · {card.source === 'mistake' ? 'tu corrección' : 'palabra guardada'}
          </div>
        </div>
        <Mascot element={THEME_INFO[settings.theme].mascot} size={52} mood={step === 'checking' ? 'thinking' : 'idle'} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--gb)' }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(i / queue.length) * 100}%`, background: 'var(--acc)' }} />
      </div>

      {/* En horizontal (Galaxy A11) la tarjeta y los botones no caben: el contenido se desplaza (antes quedaban fuera). */}
      <div key={i} className="anim-in no-scrollbar mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">¿Cómo se dice en inglés?</div>
        <div className="glass mt-2 rounded-[26px] p-5 text-[21px] leading-snug font-medium">{card.promptEs}</div>
        {card.hintEs && step !== 'result' && (
          <button onClick={() => setShowHint((s) => !s)} className="txt-sub mt-2 flex items-center gap-1.5 self-start text-[13px]">
            <Icon name="bulb" size={14} color="var(--acc)" />
            {showHint ? card.hintEs : 'Ver pista'}
          </button>
        )}

        {step === 'result' && v && (
          <div className="anim-up mt-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[17px] font-semibold" style={{ color: v.color }}>
              <Icon name={v.icon} size={20} stroke={2} />
              {v.label}
            </div>
            {result !== 'unknown' && result?.transcript && (
              <div className="txt-sub text-[14px]">
                Dijiste: <i>"{result.transcript}"</i>
              </div>
            )}
            <button onClick={() => speak(card.answerEn, settings.ttsRate, settings.voiceIndex)} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3 text-left">
              <span className="btn-acc grid h-9 w-9 flex-none place-items-center rounded-full">
                <Icon name="speaker" size={16} />
              </span>
              <span className="text-[16px] font-semibold">{card.answerEn}</span>
            </button>
            {result !== 'unknown' && result?.feedbackEs && <div className="text-[14px] leading-snug">{result.feedbackEs}</div>}
            {card.hintEs && <div className="txt-sub text-[13px] leading-snug">💡 {card.hintEs}</div>}
          </div>
        )}

        <div className="flex-1" />

        {step === 'result' ? (
          <div ref={showOnMount}>
            {/* v5.9 (nota del dueño): decides TÚ cuándo vuelve, según lo que te costó; hace falta elegir para seguir. */}
            <div className="mb-2 text-center text-[14px] font-semibold">¿Cuándo quieres volver a verla?</div>
            <div className="grid grid-cols-4 gap-1.5">
              {GRADES.map(({ grade: g, label }) => (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className={`flex h-[62px] flex-col items-center justify-center rounded-[18px] px-1 ${g === suggested ? 'btn-acc' : 'glass'}`}
                >
                  <span className="text-[14px] leading-tight font-semibold">{intervals[g]}</span>
                  <span className={`text-[11px] leading-tight ${g === suggested ? 'opacity-80' : 'txt-sub'}`}>{label}</span>
                </button>
              ))}
            </div>
            <div className="txt-sub mt-1.5 text-center text-[12px] leading-snug">
              {suggested !== null ? 'Te marco una según cómo te salió, pero eliges tú. ' : ''}Elige una para pasar a la siguiente.
            </div>
            <button onClick={known} className="txt-sub mt-2 h-10 w-full rounded-[20px] text-[13.5px]" style={{ border: '1.5px dashed var(--sub)' }}>
              Ya me la sé: no volver a repasarla
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {error && (
              <div className="text-center text-[13px]" style={{ color: '#f87171' }}>
                {error}
              </div>
            )}
            <div className="flex items-center gap-5">
              <Wave on={step === 'recording'} />
              <button
                onClick={toggleRecord}
                disabled={step === 'checking'}
                className="grid h-[88px] w-[88px] place-items-center rounded-full disabled:opacity-60"
                style={{
                  border: '1px solid rgba(255,255,255,.35)',
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
                  color: 'var(--ink)',
                  boxShadow: step === 'recording' ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
                  transition: 'all .25s ease',
                }}
                aria-label={step === 'recording' ? 'Parar' : 'Responder'}
              >
                {step === 'recording' ? <span className="h-7 w-7 rounded-md" style={{ background: 'var(--ink)' }} /> : <Icon name="mic" size={32} stroke={1.8} />}
              </button>
              <Wave on={step === 'recording'} />
            </div>
            <div className="txt-sub text-[13px] tabular-nums">
              {step === 'recording' ? `${Math.floor(elapsed)} s de ${MAX_TALK_SECONDS} · toca para enviar` : step === 'checking' ? `${teacher.name} está escuchando…` : 'Toca y di la frase en inglés'}
            </div>
            {step === 'ask' && (
              <button onClick={dontKnow} className="txt-sub mt-1 h-10 rounded-[20px] px-4 text-[14px]" style={{ border: '1.5px dashed var(--sub)' }}>
                No lo sé, muéstrame la respuesta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
