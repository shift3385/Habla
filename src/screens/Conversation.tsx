import { useCallback, useEffect, useRef, useState } from 'react'
import CorrectionView from '../components/CorrectionView'
import TalkButton, { type Phase } from '../components/TalkButton'
import { db, type Turn } from '../lib/db'
import type { ApiError, ChatMessage } from '../lib/gemini'
import { getProfile } from '../lib/profile'
import { MicError, Recorder } from '../lib/recorder'
import { getScenario } from '../lib/scenarios'
import { saveSettings, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, type SpeechAnalysis } from '../lib/speech'
import { buildSystemPrompt, START_MESSAGE, teacherTurn } from '../lib/teacher'
import { speak, stopSpeaking } from '../lib/tts'

interface PendingAnswer {
  base64: string
  mimeType: string
  seconds: number
  analysis: SpeechAnalysis | null
}

interface Props {
  scenarioId: string
  settings: Settings
  onSettingsChange: (s: Settings) => void
  onExit: () => void
}

const MIN_SECONDS = 0.7

export default function Conversation({ scenarioId, settings, onSettingsChange, onExit }: Props) {
  const scenario = getScenario(scenarioId)
  const [phase, setPhase] = useState<Phase>('starting')
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryHasAudio, setRetryHasAudio] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [finished, setFinished] = useState(false)

  const recorder = useRef(new Recorder())
  const sessionId = useRef<number | null>(null)
  const system = useRef('')
  const history = useRef<ChatMessage[]>([])
  const pending = useRef<PendingAnswer | null>(null)
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  const bottomRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, phase])

  const say = useCallback(async (text: string) => {
    setPhase('speaking')
    try {
      await speak(text, settingsRef.current.ttsRate, settingsRef.current.voiceIndex)
    } catch {
      setHint('No se pudo reproducir la voz. Revisa el motor de voz de Android (Ajustes → Texto a voz).')
    }
    setPhase((p) => (p === 'speaking' ? 'idle' : p))
  }, [])

  /**
   * Pide al profe la siguiente intervención. Con `answer` (tu audio), Gemini lo transcribe,
   * te corrige y responde en una sola llamada. Si falla, el audio queda guardado para "Reintentar".
   */
  const askTeacher = useCallback(
    async (answer?: PendingAnswer) => {
      setPhase('thinking')
      setCanRetry(false)
      try {
        const { geminiKey, geminiModel, geminiFallbackModel } = settingsRef.current
        const res = await teacherTurn(
          geminiKey,
          { primary: geminiModel, fallback: geminiFallbackModel },
          system.current,
          history.current,
          answer && { base64: answer.base64, mimeType: answer.mimeType },
          ({ attempt, total, model, switchedModel }) =>
            setHint(
              switchedModel
                ? `Gemini sigue saturado: probando con ${model} (${attempt}/${total})…`
                : `Gemini está saturado, reintentando (${attempt}/${total})…`,
            ),
        )
        setHint(null)
        const sid = sessionId.current!
        pending.current = null

        if (answer) {
          if (!res.heardSpeech || !res.transcript) {
            setHint('No te he entendido. Prueba otra vez, un poco más cerca del micrófono.')
            setPhase('idle')
            return
          }
          const turn: Turn = {
            sessionId: sid,
            role: 'user',
            text: res.transcript,
            audioSeconds: answer.seconds,
            speechSeconds: answer.analysis?.speechSeconds,
            pauses: answer.analysis?.pauses,
            createdAt: Date.now(),
            ...(res.correction ? { correction: res.correction } : {}),
          }
          turn.id = await db.turns.add(turn)
          if (res.correction) {
            await db.mistakes.add({ ...res.correction, sessionId: sid, turnId: turn.id!, createdAt: Date.now() })
          }
          setTurns((ts) => [...ts, turn])
          history.current.push({ role: 'user', content: res.transcript })
        }

        history.current.push({ role: 'assistant', content: res.reply })
        const teacher: Turn = { sessionId: sid, role: 'teacher', text: res.reply, createdAt: Date.now() }
        teacher.id = await db.turns.add(teacher)
        setTurns((ts) => [...ts, teacher])
        await say(res.reply)
      } catch (e) {
        setHint(null)
        const err = e as ApiError
        setError(
          err.transient
            ? `Gemini sigue sin responder tras varios intentos (${err.status || 'sin conexión'}). ` +
                (answer ? 'Tu audio está guardado: no hace falta repetirlo.' : '')
            : err.message,
        )
        setCanRetry(true)
        setRetryHasAudio(!!answer)
        setPhase('idle')
      }
    },
    [say],
  )

  // Arranque de la sesión: micrófono, prompt con perfil + errores recientes, saludo del profe.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const rec = recorder.current
    ;(async () => {
      try {
        await rec.open()
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo abrir el micrófono.')
      }
      const [profile, recent] = await Promise.all([
        getProfile(),
        db.mistakes.orderBy('createdAt').reverse().limit(8).toArray(),
      ])
      system.current = buildSystemPrompt(profile, scenario, recent)
      sessionId.current = (await db.sessions.add({ scenario: scenario.id, startedAt: Date.now() })) ?? null
      history.current = [{ role: 'user', content: START_MESSAGE }]
      await askTeacher()
    })()
  }, [askTeacher, scenario])

  useEffect(() => {
    const rec = recorder.current
    return () => {
      rec.close()
      stopSpeaking()
    }
  }, [])

  // Si sueltas el botón antes de que la grabación haya arrancado, onRelease espera a que arranque.
  const starting = useRef<Promise<void>>(Promise.resolve())

  const onPress = () => {
    setError(null)
    setHint(null)
    starting.current = (async () => {
      await stopSpeaking()
      try {
        if (!recorder.current.isOpen) await recorder.current.open()
        recorder.current.start()
        setPhase('recording')
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
        setPhase('idle')
      }
    })()
  }

  const onRelease = async () => {
    await starting.current
    const { blob, seconds } = await recorder.current.stop()
    if (seconds < MIN_SECONDS || blob.size === 0) {
      setHint('Mantén el botón presionado mientras hablas y suéltalo al terminar.')
      setPhase('idle')
      return
    }
    setPhase('transcribing')
    try {
      // Análisis local: si no hay voz, ni siquiera se llama a Gemini.
      const analysis = await analyzeSpeech(blob)
      if (analysis && !analysis.hasSpeech) {
        setHint('No te he oído. Habla un poco más fuerte o más cerca del micrófono.')
        setPhase('idle')
        return
      }
      const answer: PendingAnswer = {
        base64: await blobToBase64(blob),
        mimeType: blob.type.split(';')[0] || 'audio/webm',
        seconds,
        analysis,
      }
      pending.current = answer
      await askTeacher(answer)
    } catch (e) {
      setError((e as Error).message)
      setPhase('idle')
    }
  }

  const retry = () => {
    setError(null)
    askTeacher(pending.current ?? undefined)
  }

  const changeRate = (rate: number) => {
    const s = { ...settings, ttsRate: rate }
    onSettingsChange(s)
    saveSettings(s)
  }

  const toggleEar = () => {
    const s = { ...settings, earMode: !settings.earMode }
    onSettingsChange(s)
    saveSettings(s)
    setRevealed(new Set())
  }

  const finish = async () => {
    recorder.current.close()
    await stopSpeaking()
    if (sessionId.current) await db.sessions.update(sessionId.current, { endedAt: Date.now() })
    setFinished(true)
  }

  const userTurns = turns.filter((t) => t.role === 'user')
  const corrections = userTurns.filter((t) => t.correction)

  if (finished) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-semibold">¡Sesión terminada!</h2>
        <p className="text-slate-300">
          Hablaste {userTurns.length} {userTurns.length === 1 ? 'vez' : 'veces'} y el profe te corrigió{' '}
          {corrections.length} {corrections.length === 1 ? 'error' : 'errores'}.
        </p>
        {corrections.length > 0 && (
          <div className="w-full max-w-md space-y-2 text-left">
            {corrections.map((t) => (
              <CorrectionView key={t.id} c={t.correction!} />
            ))}
          </div>
        )}
        <button onClick={onExit} className="mt-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white">
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="text-2xl">{scenario.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{scenario.title}</h1>
        </div>
        <button onClick={finish} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
          Terminar
        </button>
      </header>

      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2 text-xs text-slate-300">
        <label className="flex flex-1 items-center gap-2">
          🐢
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={settings.ttsRate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          🐇 <span className="w-8 tabular-nums">{settings.ttsRate.toFixed(2)}×</span>
        </label>
        <button
          onClick={toggleEar}
          className={`rounded-full px-3 py-1 ${settings.earMode ? 'bg-brand text-white' : 'bg-white/10'}`}
        >
          👂 Modo oído
        </button>
      </div>

      <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.map((t) =>
          t.role === 'teacher' ? (
            <div key={t.id} className="flex items-start gap-2">
              <div className="mt-1 text-xl">🧑‍🏫</div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2">
                {settings.earMode && !revealed.has(t.id!) ? (
                  <button
                    onClick={() => setRevealed((r) => new Set(r).add(t.id!))}
                    className="text-left text-sm text-slate-400 italic"
                  >
                    👂 Escucha… (toca para ver el texto)
                  </button>
                ) : (
                  <p>{t.text}</p>
                )}
                <button
                  onClick={() => say(t.text)}
                  disabled={phase !== 'idle' && phase !== 'speaking'}
                  className="mt-1 text-xs text-slate-400"
                >
                  🔊 Repetir
                </button>
              </div>
            </div>
          ) : (
            <div key={t.id} className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-600/80 px-3 py-2 text-white">
                {t.text}
              </div>
              {t.correction && (
                <div className="w-[85%]">
                  <CorrectionView c={t.correction} />
                </div>
              )}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-white/10 px-4 pt-3 pb-6">
        {error && (
          <div className="mb-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {error}
            {canRetry && (
              <button onClick={retry} className="mt-2 block w-full rounded-lg bg-white/10 py-2 font-medium">
                {retryHasAudio ? '🔁 Reenviar mi audio' : '🔁 Reintentar'}
              </button>
            )}
          </div>
        )}
        {hint && !error && <div className="mb-3 text-center text-sm text-amber-200">{hint}</div>}
        <TalkButton phase={phase} onPress={onPress} onRelease={onRelease} />
      </footer>
    </div>
  )
}
