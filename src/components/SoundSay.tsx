import { useEffect, useMemo, useRef, useState } from 'react'
import { holdRoute } from '../lib/audioRoute'
import { whenBackground } from '../lib/lifecycle'
import { phoneticsActive, runWordPhonetics } from '../lib/phonetics'
import type { WordScore } from '../lib/pronunciation'
import { distrustMic, MicError, Recorder } from '../lib/recorder'
import type { Settings } from '../lib/settings'
import { playRecording, stopSoundAudio } from '../lib/soundAudio'
import type { Phoneme, SoundExercise } from '../lib/sounds'
import { SAY_OK, sayItems } from '../lib/soundGame'
import { analyzeSpeech, isEmptyRecording } from '../lib/speech'
import { speakingKey } from '../lib/speaking'
import { speakUS, stopSpeaking, toggleSpeakUS } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot, { type MascotElement } from '../ui/Mascot'
import Wave from '../ui/Wave'
import SpeakIcon from './SpeakIcon'
import { DISCARD_HINTS, logDiscard, MIN_SEND_MS } from './talkGesture'

// 5.11 (S-10): «Dilo tú» de Sonidos (`say-word`, `say-pair`, `say-sentence`). Toca para hablar y toca para enviar, como
// la clase (5.10.1); la ruta de los auriculares solo con esta parte abierta y en primer plano (CLAUDE.md regla 9: el
// micro se suelta al salir, minimizar o bloquear). Con la fonética de Azure activa, la nota del sonido objetivo (nota
// orientativa); sin Azure, «Escúchate»: tu versión y la del modelo alternadas (A-B-A-B) y te autoevalúas.
// La nota viene de `runWordPhonetics()` (S-06, D1): una sola evaluación con referencia, NBest y la política F0/S0 y de
// cuota agotada de phonetics.ts (sin nota → «Escúchate»).

/** Una palabra (o frase) dura poco: se envía sola a los 10 s (y Azure no cobra 60 s de silencio). */
export const SAY_MAX_SECONDS = 10

type Step = 'ask' | 'opening' | 'recording' | 'checking' | 'result'


export interface SayResult {
  correct: number
  total: number
  /** Notas de Azure del sonido objetivo (vacío sin Azure). */
  scores: { id: string; accuracy: number }[]
  /** Segundos hablados (los apunta la lección: suman a la meta del día). */
  seconds: number
}


export default function SoundSay({
  ex,
  phonemes,
  main,
  settings,
  update,
  mascot,
  mascotName,
  onDone,
}: {
  ex: Extract<SoundExercise, { type: 'say-word' | 'say-pair' | 'say-sentence' }>
  phonemes: Phoneme[]
  main?: string
  settings: Settings
  update: (p: Partial<Settings>) => void
  mascot: MascotElement
  mascotName: string
  onDone: (r: SayResult) => void
}) {
  const items = useMemo(() => sayItems(ex, phonemes, main), [ex, phonemes, main])
  const azure = phoneticsActive(settings)
  const [i, setI] = useState(0)
  const [step, setStep] = useState<Step>('ask')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pron, setPron] = useState<WordScore | string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [selfOk, setSelfOk] = useState<boolean | null>(null)
  const results = useRef<{ ok: boolean; score?: { id: string; accuracy: number } }[]>([])
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)
  const spokenSecs = useRef(0)
  const abab = useRef(0)
  const item = items[i]
  const modelKey = `say:${ex.id}:${i}`
  const ababKey = `abab:${ex.id}:${i}`

  useEffect(() => {
    const rec = recorder.current
    const seq = abab
    return () => {
      seq.current++
      rec.close()
      stopSoundAudio()
      stopSpeaking()
    }
  }, [])
  // 5.10.1 (REG-M-01): la ruta de los auriculares, solo mientras esta parte está abierta (se suelta al salir).
  useEffect(() => holdRoute(), [])
  useEffect(() => {
    if (step !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [step])
  // MOV-1: en segundo plano se cierra el micro: la pantalla no sigue «grabando».
  useEffect(() => {
    if (step !== 'recording' && step !== 'opening') return
    return whenBackground(() => {
      logDiscard('segundo-plano', 'sonidos', { step })
      setStep('ask')
      setError(DISCARD_HINTS['segundo-plano'])
    })
  }, [step])
  const toggleRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (step === 'recording' && elapsed >= SAY_MAX_SECONDS) toggleRef.current?.()
  }, [step, elapsed])

  const target = item?.target
  // Nota del sonido objetivo (su peor aparición); si Azure no lo puntuó, la de la palabra (y no cuenta para «dominado»).
  const word = typeof pron === 'object' && pron ? pron : null
  const targetScore = word?.target ? Math.round(word.target.accuracy) : undefined
  const score = targetScore ?? (word ? Math.round(word.accuracy) : undefined)
  const heard = word?.target?.heard
  const scoreOk = score !== undefined && score >= SAY_OK

  const toggleRecord = async () => {
    setError(null)
    if (step === 'ask' || step === 'result') {
      const ticket = recorder.current.ticket()
      setStep('opening')
      abab.current++
      stopSoundAudio()
      await stopSpeaking()
      setPron(null)
      setBlob(null)
      setSelfOk(null)
      try {
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
      return
    }
    if (step !== 'recording') return
    if (performance.now() - recStart.current < MIN_SEND_MS) return
    setStep('checking')
    const { blob: b, seconds } = await recorder.current.finish()
    const analysis = await analyzeSpeech(b)
    const empty = isEmptyRecording(b, analysis)
    if (empty) distrustMic()
    const heard = seconds >= 0.5 && !empty && analysis?.hasSpeech !== false
    if (!heard) {
      const reason = seconds < 0.5 || b.size === 0 ? 'corta' : empty ? 'vacia' : 'sin-voz'
      logDiscard(reason, 'sonidos', { seconds, bytes: b.size })
      setError(DISCARD_HINTS[reason])
      setStep('ask')
      return
    }
    // Lo hablado en Sonidos suma a la meta diaria y a la racha (como Gramática): lo apunta la lección (recordLessonTime).
    spokenSecs.current += analysis?.speechSeconds ?? seconds
    setBlob(b)
    const job = azure ? runWordPhonetics(settings, update, b, item?.text ?? '', item?.target?.azure[0] ?? item?.target?.ipa) : null
    setPron(job ? await job : null)
    setStep('result')
  }
  useEffect(() => {
    toggleRef.current = toggleRecord
  })

  /** «Escúchate»: modelo, tú, modelo, tú. Tocar otra vez lo para. */
  const listenBoth = async () => {
    if (!blob || !item) return
    if (speakingKey() === ababKey) {
      abab.current++
      stopSoundAudio()
      return stopSpeaking()
    }
    const mine = ++abab.current
    for (let k = 0; k < 4; k++) {
      if (abab.current !== mine) return
      if (k % 2 === 0) await speakUS(item.text, { key: ababKey })
      else await playRecording(blob, ababKey)
    }
  }

  /** Siguiente intento. `skip`: «Saltar esta» (no cuenta ni como acierto ni como fallo). */
  const next = (skip = false) => {
    const ok = score !== undefined ? scoreOk : !!selfOk
    if (!skip) results.current.push({ ok, score: targetScore !== undefined && target ? { id: target.id, accuracy: targetScore } : undefined })
    if (i + 1 >= items.length) {
      const r = results.current
      return onDone({ correct: r.filter((x) => x.ok).length, total: r.length, scores: r.flatMap((x) => (x.score ? [x.score] : [])), seconds: spokenSecs.current })
    }
    abab.current++
    stopSoundAudio()
    stopSpeaking()
    setI(i + 1)
    setStep('ask')
    setPron(null)
    setBlob(null)
    setSelfOk(null)
  }

  if (!item) return null
  const canNext = step === 'result' && (score !== undefined || selfOk !== null)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">
          Dilo tú · {i + 1} de {items.length}
        </div>
        <span className="txt-sub fs-11.5">{azure ? 'Con nota de Azure' : 'Escúchate (sin Azure)'}</span>
      </div>
      <div className="glass flex flex-col items-center gap-2 rounded-[22px] px-4 py-4">
        <div className="text-center fs-27 leading-tight font-semibold break-words">{item.text}</div>
        {target && (
          <div className="txt-sub fs-13">
            Cuida el sonido <b className="txt-acc">/{target.ipa}/</b>
          </div>
        )}
        <div className="flex gap-1.5">
          <button onClick={() => toggleSpeakUS(item.text, { key: modelKey })} className="field flex h-10 items-center gap-1.5 rounded-[20px] px-3 fs-14 font-semibold">
            <SpeakIcon speakKey={modelKey} size={14} />
            Modelo
          </button>
          <button onClick={() => toggleSpeakUS(item.text, { key: `${modelKey}:slow`, slow: true })} className="field flex h-10 items-center gap-1.5 rounded-[20px] px-3 fs-14 font-semibold">
            <span aria-hidden>🐢</span>
            <SpeakIcon speakKey={`${modelKey}:slow`} size={14} />
            Lenta
          </button>
        </div>
      </div>

      {step === 'result' && (
        <div className="anim-up flex items-start gap-2.5">
          <Mascot element={mascot} size={52} mood={score === undefined ? 'speaking' : scoreOk ? 'happy' : 'thinking'} />
          <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-14 leading-snug">
            {score !== undefined ? (
              <>
                <div className="font-semibold" style={{ color: scoreOk ? 'var(--ok)' : 'var(--bad)' }}>
                  {target && targetScore !== undefined ? `/${target.ipa}/ ` : 'Nota '}
                  {score} · {scoreOk ? '¡Muy bien!' : 'Casi: vuelve a intentarlo'}
                </div>
                {/* M-11/S-06: «te salió /s/» cuando Azure sabe qué sonido salió en su lugar. */}
                {!scoreOk && heard && target && (
                  <div className="mt-0.5">
                    Te salió <b>/{heard}/</b> en vez de <b>/{target.ipa}/</b>.
                  </div>
                )}
                {!scoreOk && target?.tipShortEs && <div className="mt-0.5">{target.tipShortEs}</div>}
                <div className="txt-sub mt-1 fs-11.5">Nota orientativa de Azure · — {mascotName}</div>
              </>
            ) : (
              <>
                {typeof pron === 'string' && <div className="txt-sub mb-1 fs-12">Sin nota de Azure: {pron}</div>}
                <div>Escucha el modelo y tu versión, una detrás de otra. ¿Suenan parecido?</div>
                <div className="txt-sub mt-1 fs-11.5">— {mascotName}</div>
              </>
            )}
          </div>
        </div>
      )}
      {step === 'result' && blob && (
        <button onClick={listenBoth} className="glass flex h-[50px] items-center justify-center gap-2 rounded-full fs-15 font-semibold">
          <SpeakIcon speakKey={ababKey} name="speakerWave" size={18} />
          Escúchate: modelo y tú
        </button>
      )}
      {step === 'result' && score === undefined && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setSelfOk(true)} aria-pressed={selfOk === true} className={`h-[48px] rounded-full fs-14.5 font-semibold ${selfOk === true ? 'btn-acc' : 'field'}`}>
            Me sale parecido
          </button>
          <button onClick={() => setSelfOk(false)} aria-pressed={selfOk === false} className={`h-[48px] rounded-full fs-14.5 font-semibold ${selfOk === false ? 'btn-acc' : 'field'}`}>
            Aún no
          </button>
        </div>
      )}

      <div className="mt-1 flex flex-col items-center gap-2">
        {error && (
          <div className="text-center fs-13" style={{ color: 'var(--bad)' }}>
            {error}
          </div>
        )}
        <div className="flex items-center gap-5">
          <Wave on={step === 'recording'} />
          <button
            onClick={toggleRecord}
            disabled={step === 'checking' || step === 'opening'}
            className="grid h-[76px] w-[76px] place-items-center rounded-full disabled:opacity-60"
            style={{
              border: '1px solid rgba(255,255,255,.35)',
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
              color: 'var(--ink)',
              boxShadow: step === 'recording' ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
              transition: 'all .25s ease',
            }}
            aria-label={step === 'recording' ? 'Parar y enviar' : 'Hablar'}
          >
            {step === 'recording' ? <span className="h-7 w-7 rounded-md" style={{ background: 'var(--ink)' }} /> : <Icon name="mic" size={28} stroke={1.8} />}
          </button>
          <Wave on={step === 'recording'} />
        </div>
        <div className="txt-sub fs-13 tabular-nums">
          {step === 'recording'
            ? `${Math.floor(elapsed)} s · toca para enviar`
            : step === 'opening'
              ? 'Abriendo el micro… espera'
              : step === 'checking'
                ? azure
                  ? 'Azure está puntuando…'
                  : 'Preparando…'
                : step === 'result'
                  ? 'Toca para repetir'
                  : 'Toca para hablar'}
        </div>
        {canNext && (
          <button onClick={() => next()} className="btn-acc mt-1 h-[52px] w-full rounded-full fs-16">
            {i + 1 < items.length ? 'Siguiente' : 'Terminar'}
          </button>
        )}
        {step === 'ask' && (
          <button onClick={() => next(true)} className="txt-sub h-10 px-3 fs-13 underline">
            Saltar esta
          </button>
        )}
      </div>
    </div>
  )
}
