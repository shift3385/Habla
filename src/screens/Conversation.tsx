import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import CorrectionView from '../components/CorrectionView'
import LiveWave from '../components/LiveWave'
import ReportView from '../components/ReportView'
import TalkButton, { type Phase } from '../components/TalkButton'
import TeacherAvatar from '../components/TeacherAvatar'
import TopicCard from '../components/TopicCard'
import { db, type Session, type Topic, type Turn } from '../lib/db'
import { generateReport, sessionMetrics, turnMetrics } from '../lib/fluency'
import type { ApiError, ChatMessage, Models, RetryInfo } from '../lib/gemini'
import { getProfile } from '../lib/profile'
import { MicError, Recorder } from '../lib/recorder'
import { getScenario } from '../lib/scenarios'
import { saveSettings, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, type SpeechAnalysis } from '../lib/speech'
import { deleteSessionIfEmpty } from '../lib/stats'
import { answerIdeas, buildSystemPrompt, START_MESSAGE, teacherTurn, type Idea } from '../lib/teacher'
import { generateTopic, getCategory, randomCategory } from '../lib/topics'
import { speak, stopSpeaking } from '../lib/tts'

interface PendingAnswer {
  base64: string
  mimeType: string
  seconds: number
  analysis: SpeechAnalysis | null
}

interface Props {
  scenarioId: string
  categoryId?: string // para escenarios con tema; sin él, categoría al azar
  settings: Settings
  onSettingsChange: (s: Settings) => void
  onExit: () => void
  registerBack: (handler: (() => void) | null) => void
}

const MIN_SECONDS = 0.7

function haptic(style: ImpactStyle) {
  Haptics.impact({ style }).catch(() => {})
}

export default function Conversation({ scenarioId, categoryId, settings, onSettingsChange, onExit, registerBack }: Props) {
  const scenario = getScenario(scenarioId)
  const [phase, setPhase] = useState<Phase>('starting')
  const [status, setStatus] = useState('Preparando la clase…')
  const [turns, setTurns] = useState<Turn[]>([])
  const [topic, setTopic] = useState<Topic | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryHasAudio, setRetryHasAudio] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [translated, setTranslated] = useState<Set<number>>(new Set())
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [recordStart, setRecordStart] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)

  // Informe final
  const [view, setView] = useState<'chat' | 'report'>('chat')
  const [session, setSession] = useState<Session | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

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

  const models = (): Models => ({
    primary: settingsRef.current.geminiModel,
    fallback: settingsRef.current.geminiFallbackModel,
  })
  const retryHint = ({ attempt, total, model, switchedModel }: RetryInfo) =>
    setHint(
      switchedModel
        ? `Gemini sigue saturado: probando con ${model} (${attempt}/${total})…`
        : `Gemini está saturado, reintentando (${attempt}/${total})…`,
    )

  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, phase, ideas, view])

  // Cronómetro mientras grabas
  useEffect(() => {
    if (phase !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recordStart) / 1000), 200)
    return () => clearInterval(id)
  }, [phase, recordStart])

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
   * te corrige y responde en una sola llamada. Si falla, el audio queda guardado para reenviarlo.
   */
  const askTeacher = useCallback(
    async (answer?: PendingAnswer) => {
      setPhase('thinking')
      setCanRetry(false)
      setIdeas(null)
      try {
        const res = await teacherTurn(
          settingsRef.current.geminiKey,
          models(),
          system.current,
          history.current,
          answer && { base64: answer.base64, mimeType: answer.mimeType },
          retryHint,
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
        const teacher: Turn = {
          sessionId: sid,
          role: 'teacher',
          text: res.reply,
          translation: res.replyEs,
          createdAt: Date.now(),
        }
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

  // Arranque: micrófono, tema del día, prompt y saludo del profe. Siempre es una sesión NUEVA.
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
        db.mistakes.orderBy('createdAt').reverse().limit(12).toArray(),
      ])

      let t: Topic | undefined
      if (scenario.topic) {
        const cat = categoryId ? getCategory(categoryId) : await randomCategory()
        setStatus(cat.live ? `${cat.emoji} Buscando algo reciente sobre ${cat.title.toLowerCase()}…` : `${cat.emoji} Eligiendo un tema…`)
        try {
          t = await generateTopic(settingsRef.current.geminiKey, models(), cat, retryHint)
          setTopic(t)
        } catch {
          // Sin tema: el profe elige uno él mismo.
        }
        setHint(null)
      }
      setStatus('')

      system.current = buildSystemPrompt(profile, scenario, recent, t)
      sessionId.current = (await db.sessions.add({ scenario: scenario.id, startedAt: Date.now(), topic: t })) ?? null
      history.current = [{ role: 'user', content: START_MESSAGE }]
      await askTeacher()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setIdeas(null)
    haptic(ImpactStyle.Medium)
    starting.current = (async () => {
      await stopSpeaking()
      try {
        if (!recorder.current.isOpen) await recorder.current.open()
        recorder.current.start()
        setMicStream(recorder.current.mediaStream)
        setRecordStart(performance.now())
        setElapsed(0)
        setPhase('recording')
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
        setPhase('idle')
      }
    })()
  }

  const onRelease = async () => {
    await starting.current
    haptic(ImpactStyle.Light)
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

  const lastTeacher = [...turns].reverse().find((t) => t.role === 'teacher')

  const showIdeas = async () => {
    if (!lastTeacher || ideasLoading) return
    if (ideas) {
      setIdeas(null)
      return
    }
    setIdeasLoading(true)
    try {
      setIdeas(await answerIdeas(settingsRef.current.geminiKey, models(), lastTeacher.text, topic))
    } catch (e) {
      setHint((e as Error).message)
    } finally {
      setIdeasLoading(false)
    }
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

  const buildReport = useCallback(async (s: Session, allTurns: Turn[]) => {
    setReportLoading(true)
    setReportError(null)
    try {
      const report = await generateReport(settingsRef.current.geminiKey, models(), allTurns, s.metrics!, s.topic)
      await db.sessions.update(s.id!, { report })
      setSession({ ...s, report })
    } catch (e) {
      setReportError(`No se pudo generar el informe: ${(e as Error).message}`)
    } finally {
      setReportLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback(async () => {
    recorder.current.close()
    await stopSpeaking()
    const sid = sessionId.current
    if (!sid) return onExit()
    if (await deleteSessionIfEmpty(sid)) return onExit()

    const allTurns = await db.turns.where('sessionId').equals(sid).sortBy('createdAt')
    const metrics = sessionMetrics(allTurns)!
    await db.sessions.update(sid, { endedAt: Date.now(), metrics })
    const s = (await db.sessions.get(sid))!
    setSession(s)
    setView('report')
    buildReport(s, allTurns)
  }, [onExit, buildReport])

  // Botón "atrás" de Android: en el chat termina la sesión (con informe); en el informe vuelve al inicio.
  useEffect(() => {
    registerBack(view === 'report' ? onExit : () => finish())
    return () => registerBack(null)
  }, [view, finish, onExit, registerBack])

  const userTurns = turns.filter((t) => t.role === 'user')
  const live = userTurns.length ? sessionMetrics(turns) : null

  if (view === 'report' && session?.metrics) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="text-2xl">🏁</span>
          <h1 className="flex-1 font-semibold">Tu informe</h1>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ReportView
            metrics={session.metrics}
            report={session.report}
            reportLoading={reportLoading}
            reportError={reportError}
            onRetryReport={() => db.turns.where('sessionId').equals(session.id!).sortBy('createdAt').then((ts) => buildReport(session, ts))}
            corrections={userTurns.map((t) => t.correction).filter((c) => !!c)}
            topic={session.topic}
            ttsRate={settings.ttsRate}
            voiceIndex={settings.voiceIndex}
          />
          <button onClick={onExit} className="btn-primary mt-5 mb-4">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <TeacherAvatar phase={phase} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate leading-tight font-semibold">
            {scenario.emoji} {scenario.title}
          </h1>
          <p className="text-xs text-slate-400">
            {live
              ? `${live.turns} ${live.turns === 1 ? 'respuesta' : 'respuestas'} · ${live.wpm} ppm · ${live.avgWords} pal./resp.`
              : phase === 'speaking'
                ? 'Hablando…'
                : 'Tu profe de inglés'}
          </p>
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
        {topic && <TopicCard topic={topic} ttsRate={settings.ttsRate} voiceIndex={settings.voiceIndex} />}
        {phase === 'starting' && status && (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-300">
            <TeacherAvatar phase="thinking" size={72} />
            <p className="animate-pulse">{status}</p>
          </div>
        )}

        {turns.map((t) =>
          t.role === 'teacher' ? (
            <div key={t.id} className="flex items-start gap-2">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2">
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
                {translated.has(t.id!) && t.translation && (
                  <p className="mt-1 border-t border-white/10 pt-1 text-sm text-slate-400">{t.translation}</p>
                )}
                <div className="mt-1 flex gap-3 text-xs text-slate-400">
                  <button onClick={() => say(t.text)} disabled={phase !== 'idle' && phase !== 'speaking'}>
                    🔊 Repetir
                  </button>
                  {t.translation && (
                    <button
                      onClick={() =>
                        setTranslated((s) => {
                          const n = new Set(s)
                          if (n.has(t.id!)) n.delete(t.id!)
                          else n.add(t.id!)
                          return n
                        })
                      }
                    >
                      🌐 {translated.has(t.id!) ? 'Ocultar' : 'ES'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <UserBubble key={t.id} turn={t} />
          ),
        )}

        {ideas && (
          <div className="rounded-2xl bg-amber-400/10 p-3 ring-1 ring-amber-300/20">
            <p className="mb-2 text-xs text-amber-200">💡 Empieza así y continúa con tus ideas (toca para oírla):</p>
            <div className="space-y-2">
              {ideas.map((i) => (
                <button
                  key={i.en}
                  onClick={() => speak(i.en, settings.ttsRate, settings.voiceIndex)}
                  className="block w-full rounded-xl bg-black/20 px-3 py-2 text-left"
                >
                  <span className="block text-slate-100">{i.en}…</span>
                  <span className="block text-xs text-slate-400">{i.es}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-white/10 px-4 pt-2 pb-5">
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
        {hint && !error && <div className="mb-2 text-center text-sm text-amber-200">{hint}</div>}

        <div className="flex h-10 items-center justify-center">
          {phase === 'recording' ? (
            <div className="flex items-center gap-2">
              <LiveWave stream={micStream} active />
              <span className="w-10 text-sm text-red-300 tabular-nums">{elapsed.toFixed(0)} s</span>
            </div>
          ) : (
            lastTeacher &&
            (phase === 'idle' || phase === 'speaking') && (
              <button
                onClick={showIdeas}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-slate-200 active:bg-white/20"
              >
                {ideasLoading ? '💡 Pensando…' : ideas ? '✕ Ocultar ideas' : '💡 ¿Qué digo?'}
              </button>
            )
          )}
        </div>
        <TalkButton phase={phase} onPress={onPress} onRelease={onRelease} />
      </footer>
    </div>
  )
}

function UserBubble({ turn }: { turn: Turn }) {
  const m = turnMetrics(turn)
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-orange-500 to-orange-700 px-3 py-2 text-white">
        {turn.text}
      </div>
      <div className="mt-1 flex gap-2 text-[11px] text-slate-400">
        {m.wpm !== null && <span>⚡ {m.wpm} ppm</span>}
        <span>📝 {m.words} palabras</span>
        <span>⏸ {m.pauses} {m.pauses === 1 ? 'pausa' : 'pausas'}</span>
      </div>
      {turn.correction && (
        <div className="w-[88%]">
          <CorrectionView c={turn.correction} />
        </div>
      )}
    </div>
  )
}
