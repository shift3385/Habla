import { useEffect, useRef, useState } from 'react'
import { friendlyError } from '../lib/errors'
import type { GrammarTopic } from '../lib/grammar'
import { evaluateSpeaking, type SpeakResult } from '../lib/grammarAi'
import { recordSpeaking } from '../lib/grammarProgress'
import { whenBackground } from '../lib/lifecycle'
import { runPhonetics } from '../lib/phonetics'
import type { PronResult } from '../lib/pronunciation'
import { distrustMic, MicError, Recorder } from '../lib/recorder'
import { mainModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, isEmptyRecording } from '../lib/speech'
import { addPracticeSeconds } from '../lib/stats'
import { speak, stopSpeaking, toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'
import Wave from '../ui/Wave'
import PhoneticsToggle from './PhoneticsToggle'
import PronunciationView from './PronunciationView'
import SpeakIcon from './SpeakIcon'
import { MAX_TALK_SECONDS } from './TalkButton'
import { MIN_SEND_MS } from './talkGesture'

/** El resultado se desplaza a la vista al aparecer (estable: solo al montar). */
const showOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

type Step = 'ask' | 'recording' | 'checking' | 'result'

const VERDICT = {
  correct: { label: '¡Correcto!', icon: 'check' as const, color: '#22c58b' },
  almost: { label: 'Casi', icon: 'spark' as const, color: 'var(--acc)' },
  wrong: { label: 'Aún no', icon: 'back' as const, color: '#f87171' },
}

/**
 * v5.10 (D2) «Dilo tú»: la mascota te propone un reto del tema (`speaking`), lo dices («toca para hablar / toca para
 * enviar», como el Repaso de la 5.9.1) y Gemini comprueba que usas bien la estructura. Lo hablado suma a la meta diaria
 * y a la racha (`addPracticeSeconds`). Con la fonética activa, Azure puntúa lo que DIJISTE (referencia = transcripción
 * de Gemini, criterio E2 de la 5.9.1).
 */
export default function GrammarSpeak({ topic, settings, update }: { topic: GrammarTopic; settings: Settings; update: (p: Partial<Settings>) => void }) {
  const info = THEME_INFO[settings.theme]
  const [k, setK] = useState(0) // reto actual
  const [step, setStep] = useState<Step>('ask')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<SpeakResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pron, setPron] = useState<PronResult | string | 'pending' | null>(null)
  const pronTry = useRef(0)
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)
  const challenge = topic.speaking[k % Math.max(1, topic.speaking.length)]
  const keyReady = settings.geminiKey.trim().length > 0

  useEffect(() => {
    const rec = recorder.current
    return () => {
      rec.close()
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (step !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [step])

  // MOV-1: al pasar a segundo plano se cierra el micro; la pantalla no debe seguir «grabando».
  useEffect(() => {
    if (step !== 'recording') return
    return whenBackground(() => {
      setStep('ask')
      setError('Se cortó la grabación al salir de Habla. Toca el micro y vuelve a grabar.')
    })
  }, [step])

  // Como en la clase y el Repaso: una respuesta dura como mucho 60 s; al llegar se envía sola.
  const toggleRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (step === 'recording' && elapsed >= MAX_TALK_SECONDS) toggleRef.current?.()
  }, [step, elapsed])

  const toggleRecord = async () => {
    if (!challenge || !keyReady) return
    setError(null)
    if (step === 'ask' || step === 'result') {
      await stopSpeaking()
      setResult(null)
      pronTry.current++
      setPron(null)
      try {
        // AUD-MIC-302: un doble toque comparte la misma apertura; false = cancelada (saliste o segundo plano).
        if (!(await recorder.current.begin())) return
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
    // Rebote de un doble toque justo al empezar: no se envía una grabación vacía (talkGesture.ts).
    if (performance.now() - recStart.current < MIN_SEND_MS) return
    setStep('checking')
    // AUD-MIC-305: se suelta el micro al terminar.
    const { blob, seconds } = await recorder.current.finish()
    const analysis = await analyzeSpeech(blob)
    // 5.9.1 (E1): una grabación sin audio (micro de unos auriculares ya desconectados) no se manda a Gemini.
    const empty = isEmptyRecording(blob, analysis)
    if (empty) distrustMic()
    const heard = seconds >= 0.8 && !empty && analysis?.hasSpeech !== false
    // Lo hablado en Gramática suma a la meta diaria y a la racha (decisión del dueño).
    if (heard) addPracticeSeconds(analysis?.speechSeconds ?? seconds)
    let giveReference: (t: string) => void = () => {}
    const reference = new Promise<string>((r) => (giveReference = r))
    const job = heard ? runPhonetics(settings, update, blob, () => reference) : null
    const mine = ++pronTry.current
    setPron(job ? 'pending' : null)
    job?.then((r) => pronTry.current === mine && setPron(r))
    if (!heard) {
      giveReference('')
      setError('No te he oído. Inténtalo otra vez.')
      setStep('ask')
      return
    }
    try {
      const r = await evaluateSpeaking(settings.geminiKey, mainModels(settings), topic, challenge, {
        base64: await blobToBase64(blob),
        mimeType: blob.type.split(';')[0] || 'audio/webm',
      })
      giveReference(r.transcript)
      setResult(r)
      setStep('result')
      recordSpeaking(topic.id, r.verdict === 'correct').catch(() => {})
    } catch (e) {
      giveReference('')
      setError(friendlyError(e))
      setStep('ask')
    }
  }
  useEffect(() => {
    toggleRef.current = toggleRecord
  })

  const nextChallenge = () => {
    pronTry.current++
    setPron(null)
    setResult(null)
    setError(null)
    setStep('ask')
    setK((x) => x + 1)
  }

  if (!challenge) return <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Este tema aún no tiene retos para decir.</div>

  const v = result ? VERDICT[result.verdict] : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">
          Reto {(k % topic.speaking.length) + 1} de {topic.speaking.length}
        </div>
        <PhoneticsToggle settings={settings} update={update} />
      </div>
      <div className="flex items-start gap-2.5">
        <Mascot element={info.mascot} size={64} mood={step === 'checking' ? 'thinking' : step === 'recording' ? 'listening' : 'speaking'} />
        <div className="tip-bubble relative min-w-0 flex-1 rounded-[20px] px-4 py-3 text-[15.5px] leading-snug">
          <div className="font-semibold">{challenge.promptEs}</div>
          <div className="txt-sub mt-1 text-[12.5px]">💡 {challenge.checkEs}</div>
          <div className="txt-sub mt-1 text-[11.5px]">— {info.mascotName}</div>
        </div>
      </div>

      {result && v && (
        <div ref={showOnMount} className="anim-up flex scroll-mb-[120px] flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[17px] font-semibold" style={{ color: v.color }}>
            <Icon name={v.icon} size={20} stroke={2} />
            {v.label}
          </div>
          {result.transcript && (
            <div className="txt-sub text-[14px]">
              Dijiste: <i>"{result.transcript}"</i>
            </div>
          )}
          {result.feedbackEs && <div className="text-[14px] leading-snug">{result.feedbackEs}</div>}
          <div className="txt-sub text-[12px]">Una forma de decirlo:</div>
          <button onClick={() => toggleSpeak(challenge.modelEn)} className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-left">
            <span className="btn-acc grid h-9 w-9 flex-none place-items-center rounded-full">
              <SpeakIcon speakKey={challenge.modelEn} size={16} />
            </span>
            <span className="min-w-0 flex-1 text-[15.5px] font-semibold break-words">{challenge.modelEn}</span>
          </button>
          {pron === 'pending' && <div className="txt-sub text-[12.5px]">Azure está puntuando tu pronunciación…</div>}
          {pron && pron !== 'pending' && typeof pron !== 'string' && (
            <PronunciationView r={pron} onSay={(w) => speak(w, settings.ttsRate, settings.voiceIndex)} pausable />
          )}
          {typeof pron === 'string' && pron !== 'pending' && <div className="txt-sub text-[12px]">Sin nota de pronunciación: {pron}</div>}
        </div>
      )}

      <div className="mt-1 flex flex-col items-center gap-2.5">
        {error && (
          <div className="text-center text-[13px]" style={{ color: '#f87171' }}>
            {error}
          </div>
        )}
        {!keyReady ? (
          <div className="glass txt-sub rounded-[20px] p-4 text-center text-[13.5px] leading-snug">
            Para que {info.mascotName} te escuche hace falta tu clave de Gemini (Ajustes). La explicación y los ejercicios funcionan sin ella.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-5">
              <Wave on={step === 'recording'} />
              <button
                onClick={toggleRecord}
                disabled={step === 'checking'}
                className="grid h-[80px] w-[80px] place-items-center rounded-full disabled:opacity-60"
                style={{
                  border: '1px solid rgba(255,255,255,.35)',
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
                  color: 'var(--ink)',
                  boxShadow: step === 'recording' ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
                  transition: 'all .25s ease',
                }}
                aria-label={step === 'recording' ? 'Parar y enviar' : 'Hablar'}
              >
                {step === 'recording' ? <span className="h-7 w-7 rounded-md" style={{ background: 'var(--ink)' }} /> : <Icon name="mic" size={30} stroke={1.8} />}
              </button>
              <Wave on={step === 'recording'} />
            </div>
            <div className="txt-sub text-[13px] tabular-nums">
              {step === 'recording'
                ? `${Math.floor(elapsed)} s de ${MAX_TALK_SECONDS} · toca para enviar`
                : step === 'checking'
                  ? `${info.mascotName} te está escuchando…`
                  : step === 'result'
                    ? 'Toca para intentarlo otra vez'
                    : 'Toca para hablar'}
            </div>
          </>
        )}
        {topic.speaking.length > 1 && step !== 'recording' && step !== 'checking' && (
          <button onClick={nextChallenge} className="field h-10 rounded-[20px] px-4 text-[14px]">
            Otro reto
          </button>
        )}
      </div>
    </div>
  )
}
