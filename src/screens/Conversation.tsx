import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import CorrectionView from '../components/CorrectionView'
import ReportView from '../components/ReportView'
import LookupSheet from '../components/LookupSheet'
import PrepareScreen, { type PrepareState } from '../components/PrepareScreen'
import { friendlyError } from '../lib/errors'
import TalkButton, { type Phase } from '../components/TalkButton'
import TappableText from '../components/TappableText'
import { sentenceAround } from '../lib/lookup'
import { db, type LevelEvent, type Session, type Topic, type Turn } from '../lib/db'
import { levelIdx, updateLevelsFromPractice } from '../lib/levels'
import { generateReport, sessionMetrics, turnMetrics } from '../lib/fluency'
import type { ApiError, ChatMessage, Models } from '../lib/gemini'
import { getProfile } from '../lib/profile'
import { MicError, Recorder } from '../lib/recorder'
import { getScenario } from '../lib/scenarios'
import type { Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, type SpeechAnalysis } from '../lib/speech'
import { deleteSessionIfEmpty } from '../lib/stats'
import { answerIdeas, buildSystemPrompt, START_MESSAGE, teacherTurn, type Idea } from '../lib/teacher'
import { generateTopic, getCategory, randomCategory } from '../lib/topics'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import Orb from '../ui/Orb'
import { TEACHERS, type ThemeVars } from '../ui/theme'
import Wave from '../ui/Wave'

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
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onExit: () => void
  registerBack: (handler: (() => void) | null) => void
}

const MIN_SECONDS = 0.7

function haptic(style: ImpactStyle) {
  Haptics.impact({ style }).catch(() => {})
}

export default function Conversation({ scenarioId, categoryId, settings, t, update, onExit, registerBack }: Props) {
  const scenario = getScenario(scenarioId)
  const teacherInfo = TEACHERS[settings.teacher]
  const [phase, setPhase] = useState<Phase>('starting')
  const [status, setStatus] = useState('Preparando la clase…')
  const [turns, setTurns] = useState<Turn[]>([])
  const [topic, setTopic] = useState<Topic | undefined>()
  const [cardOpen, setCardOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryHasAudio, setRetryHasAudio] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [translated, setTranslated] = useState<Set<number>>(new Set())
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [lookupReq, setLookupReq] = useState<{ query: string; context: string } | null>(null)
  const [level, setLevel] = useState('B1')
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [recordStart, setRecordStart] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Informe final
  const [view, setView] = useState<'chat' | 'report'>('chat')
  const [session, setSession] = useState<Session | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [levelChange, setLevelChange] = useState<LevelEvent | null>(null)

  const recorder = useRef(new Recorder())
  const sessionId = useRef<number | null>(null)
  const system = useRef('')
  const history = useRef<ChatMessage[]>([])
  const pending = useRef<PendingAnswer | null>(null)
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  const listRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  const models = (): Models => ({
    primary: settingsRef.current.geminiModel,
    fallback: settingsRef.current.geminiFallbackModel,
  })
  // Los reintentos (y el cambio al modelo de respaldo) ocurren en segundo plano, sin mensajes.
  // Pantalla de preparación (animación) hasta que llega el saludo del profe.
  const [prep, setPrepState] = useState<PrepareState | null>('loading')
  const [prepError, setPrepError] = useState('')
  const prepRef = useRef<PrepareState | null>('loading')
  const setPrep = (s: PrepareState | null) => {
    prepRef.current = s
    setPrepState(s)
  }

  useEffect(() => {
    const el = listRef.current
    if (view === 'chat' && el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, phase, ideas, view])

  // Cronómetro mientras grabas
  useEffect(() => {
    if (phase !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recordStart) / 1000), 250)
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
          setCardOpen(false) // la tarjeta del tema se pliega sola al responder
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
        if (prepRef.current === 'loading') {
          // Primera intervención: animación de "¡Clase lista!" y después el chat.
          setPrep('done')
          await new Promise((r) => setTimeout(r, 1400))
          setPrep(null)
        }
        await say(res.reply)
      } catch (e) {
        setHint(null)
        if (prepRef.current === 'loading') {
          setPrepError(friendlyError(e))
          setPrep('error')
          setPhase('idle')
          return
        }
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
      setLevel(profile.levels.overall)

      let tp: Topic | undefined
      if (scenario.topic) {
        const cat = categoryId ? getCategory(categoryId) : await randomCategory()
        setStatus(cat.live ? `Buscando algo reciente sobre ${cat.title.toLowerCase()}…` : 'Eligiendo un tema…')
        try {
          tp = await generateTopic(settingsRef.current.geminiKey, models(), cat)
          setTopic(tp)
        } catch {
          // Sin tema: el profe elige uno él mismo.
        }
        setHint(null)
      }
      setStatus('')

      system.current = buildSystemPrompt(profile, scenario, recent, tp, TEACHERS[settingsRef.current.teacher].persona)
      sessionId.current = (await db.sessions.add({ scenario: scenario.id, startedAt: Date.now(), topic: tp })) ?? null
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
        await recorder.current.begin()
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

  const onCancel = async () => {
    await starting.current
    await recorder.current.stop() // se descarta el audio
    setPhase('idle')
    setHint('Grabación descartada')
  }

  const retry = () => {
    setError(null)
    askTeacher(pending.current ?? undefined)
  }

  const lastTeacher = [...turns].reverse().find((x) => x.role === 'teacher')

  const toggleIdeas = async () => {
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

  const toggleEar = () => {
    update({ earMode: !settings.earMode })
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
    // El nivel de habla evoluciona con la práctica (nunca a mano).
    updateLevelsFromPractice()
      .then(setLevelChange)
      .catch(() => {})
  }, [onExit, buildReport])

  // Botón "atrás" de Android: en el chat termina la sesión (con informe); en el informe vuelve al inicio.
  useEffect(() => {
    registerBack(lookupReq ? () => setLookupReq(null) : view === 'report' ? onExit : () => finish())
    return () => registerBack(null)
  }, [view, finish, onExit, registerBack, lookupReq])

  const userTurns = turns.filter((x) => x.role === 'user')
  const orbColors = t[settings.teacher]
  const chatStatus =
    phase === 'recording'
      ? 'Te escucha…'
      : phase === 'thinking' || phase === 'transcribing'
        ? 'Pensando…'
        : phase === 'speaking'
          ? 'Hablando…'
          : 'Tu profe de inglés'

  // Tarjeta del tema / práctica
  const cat = topic ? getCategory(topic.category) : null
  const card: { icon: IconName; label: string; title: string; sub: string } = topic
    ? { icon: cat!.icon, label: cat!.title, title: topic.title, sub: topic.summary }
    : scenario.id === 'open'
      ? { icon: 'mic', label: 'Charla libre', title: scenario.subtitle, sub: `${teacherInfo.name} sigue tu conversación` }
      : scenario.topic
        ? { icon: scenario.icon, label: scenario.title, title: status || 'Tema sorpresa', sub: '' }
        : { icon: scenario.icon, label: 'Práctica guiada', title: scenario.title, sub: scenario.subtitle }

  if (view === 'chat' && prep) {
    return (
      <PrepareScreen
        kind="clase"
        state={prep}
        colors={orbColors}
        teacherName={teacherInfo.name}
        errorText={prepError}
        onRetry={() => {
          setPrep('loading')
          askTeacher()
        }}
        onBack={finish}
      />
    )
  }

  if (view === 'report' && session?.metrics) {
    return (
      <div className="relative z-[2] flex h-full flex-col pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2.5 px-[18px] pt-1.5 pb-2.5">
          <button onClick={onExit} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Volver al inicio">
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="flex-1 text-xl font-semibold tracking-[-.4px]">Tu informe</div>
          <Orb size={34} colors={orbColors} />
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {levelChange && (
            <div
              className="anim-up mb-3 rounded-[24px] p-4 text-center"
              style={{ background: 'var(--acc)', color: 'var(--ink)', boxShadow: '0 10px 30px var(--glow)' }}
            >
              <div className="text-sm">{levelIdx(levelChange.to) > levelIdx(levelChange.from) ? '¡Has subido de nivel al hablar!' : 'Ajuste de nivel al hablar'}</div>
              <div className="text-3xl font-semibold tracking-[-1px]">
                {levelChange.from} → {levelChange.to}
              </div>
              <div className="text-xs opacity-85">Según tus últimas 5 sesiones</div>
            </div>
          )}
          <ReportView
            metrics={session.metrics}
            report={session.report}
            reportLoading={reportLoading}
            reportError={reportError}
            onRetryReport={() =>
              db.turns
                .where('sessionId')
                .equals(session.id!)
                .sortBy('createdAt')
                .then((ts) => buildReport(session, ts))
            }
            corrections={userTurns.map((x) => x.correction).filter((c) => !!c)}
            topic={session.topic}
            ttsRate={settings.ttsRate}
            voiceIndex={settings.voiceIndex}
          />
          <button onClick={onExit} className="btn-acc mt-4 h-[54px] w-full rounded-full text-[16px]">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="anim-up relative z-[2] flex h-full flex-col pt-[env(safe-area-inset-top)]">
      {/* Cabecera */}
      <div className="flex items-center gap-2.5 px-[18px] pt-1.5 pb-2.5">
        <button onClick={finish} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Terminar y salir">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2.5">
          <Orb size={34} colors={orbColors} active={phase === 'speaking' || phase === 'thinking'} />
          <div>
            <div className="text-base font-semibold">{teacherInfo.name}</div>
            <div className="txt-sub text-xs">{chatStatus}</div>
          </div>
        </div>
        <button onClick={finish} className="glass h-11 flex-none rounded-[22px] px-4 text-sm font-medium">
          Terminar
        </button>
      </div>

      {/* Velocidad + modo oído */}
      <div className="flex items-center gap-2.5 px-[18px] pb-2.5">
        <Icon name="speaker" size={18} color="var(--sub)" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={settings.ttsRate}
          onChange={(e) => update({ ttsRate: Number(e.target.value) })}
          className="flex-1"
          style={{ accentColor: 'var(--acc)' }}
          aria-label="Velocidad de la voz"
        />
        <span className="txt-sub w-10 text-[13px] tabular-nums">{settings.ttsRate.toFixed(2)}×</span>
        <button
          onClick={toggleEar}
          className={`flex h-[34px] items-center gap-1.5 rounded-[17px] px-3 text-[13px] ${settings.earMode ? 'btn-acc' : 'glass'}`}
        >
          <Icon name="ear" size={15} stroke={1.8} />
          Modo oído
        </button>
      </div>

      {/* Tarjeta del tema: se pliega sola al responder */}
      <div className="flex-none px-[18px] pb-2">
        <div className="glass rounded-[24px] py-3 pr-3 pl-3.5">
          <button onClick={() => setCardOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
            <span className="field txt-acc2 grid h-9 w-9 flex-none place-items-center rounded-full">
              <Icon name={card.icon} size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="txt-acc2 block text-[10.5px] tracking-[1.2px] uppercase">{card.label}</span>
              <span className="block truncate text-base font-semibold">{card.title}</span>
            </span>
            <span
              className="txt-sub grid h-[30px] w-[30px] flex-none place-items-center rounded-full transition-transform duration-300"
              style={{ border: '1px solid var(--gb)', transform: cardOpen ? 'rotate(180deg)' : 'none' }}
            >
              <Icon name="chevD" size={15} stroke={2} />
            </span>
          </button>
          {cardOpen && (card.sub || topic?.vocab.length) ? (
            <div className="anim-up pl-12">
              {topic?.titleEs && <div className="txt-sub mt-1 text-[13px]">{topic.titleEs}</div>}
              {card.sub && <div className="mt-1 text-[13px] leading-snug">{card.sub}</div>}
              {topic && topic.vocab.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {topic.vocab.map((v) => (
                    <button
                      key={v.en}
                      onClick={() => speak(v.en, settings.ttsRate, settings.voiceIndex)}
                      className="field flex h-8 items-center gap-1.5 rounded-2xl px-2.5 text-[13px]"
                    >
                      <Icon name="speaker" size={13} stroke={1.8} />
                      <b className="font-semibold">{v.en}</b>
                      <span className="txt-sub">· {v.es}</span>
                    </button>
                  ))}
                </div>
              )}
              {topic?.sources && topic.sources.length > 0 && (
                <div className="txt-sub mt-2 truncate text-[11px]">Fuente: {topic.sources.map((s) => s.title).join(' · ')}</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] pt-1.5 pb-4">

        {turns.map((m, i) => {
          if (m.role === 'user') {
            const tm = turnMetrics(m)
            return (
              <div key={m.id} className="anim-up flex flex-col items-end">
                <div
                  className="max-w-[80%] rounded-[24px_24px_8px_24px] px-4 py-3 text-base leading-[1.4]"
                  style={{ background: 'var(--acc)', color: 'var(--ink)', boxShadow: '0 8px 22px var(--glow)' }}
                >
                  {m.text}
                </div>
                <div className="txt-sub mt-1 mr-1 flex gap-2.5 text-[11px] tabular-nums">
                  {tm.wpm !== null && <span>{tm.wpm} ppm</span>}
                  <span>{tm.words} palabras</span>
                  <span>
                    {tm.pauses} {tm.pauses === 1 ? 'pausa' : 'pausas'}
                  </span>
                </div>
              </div>
            )
          }
          // La corrección de tu respuesta aparece dentro de la siguiente burbuja del profe, como en el diseño.
          const prev = turns[i - 1]
          const fix = prev?.role === 'user' ? prev.correction : undefined
          const hidden = settings.earMode && !revealed.has(m.id!)
          const showEs = translated.has(m.id!)
          return (
            <div key={m.id} className="glass anim-up max-w-[86%] self-start rounded-[24px_24px_24px_8px] px-4 pt-3.5 pb-2.5">
              {hidden ? (
                <button onClick={() => setRevealed((r) => new Set(r).add(m.id!))} className="txt-sub flex items-center gap-2.5 text-sm">
                  <Wave n={9} color="var(--sub)" on={false} w={3} h={18} />
                  Texto oculto · toca para ver
                </button>
              ) : (
                <div className="text-base leading-[1.42]">
                  <TappableText text={m.text} onWord={(w, start) => setLookupReq({ query: w, context: sentenceAround(m.text, start) })} />
                </div>
              )}
              {showEs && m.translation && <div className="txt-sub mt-1.5 text-sm leading-snug">{m.translation}</div>}
              {fix && (
                <div className="mt-2.5">
                  <CorrectionView c={fix} />
                </div>
              )}
              <div className="mt-2 flex gap-3.5">
                <button
                  onClick={() => say(m.text)}
                  disabled={phase !== 'idle' && phase !== 'speaking'}
                  className="txt-sub flex items-center gap-1 text-[12.5px]"
                >
                  <Icon name="speaker" size={14} stroke={1.8} />
                  Repetir
                </button>
                {m.translation && (
                  <button
                    onClick={() =>
                      setTranslated((s) => {
                        const n = new Set(s)
                        if (n.has(m.id!)) n.delete(m.id!)
                        else n.add(m.id!)
                        return n
                      })
                    }
                    className="flex items-center gap-1 text-[12.5px]"
                    style={{ color: showEs ? 'var(--acc2)' : 'var(--sub)' }}
                  >
                    <Icon name="globe" size={14} />
                    ES
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {(phase === 'thinking' || phase === 'transcribing') && (
          <div className="glass flex gap-[5px] self-start rounded-[24px_24px_24px_8px] px-[18px] py-3.5">
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="h-[7px] w-[7px] rounded-full" style={{ background: 'var(--tx)', animation: `hb-dot 1.2s ${d}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* Zona inferior: ideas, avisos y micrófono */}
      <div className="flex flex-col items-center gap-3 px-[18px] pt-3 pb-[calc(env(safe-area-inset-bottom)+22px)]">
        {ideas && (
          <div className="anim-up flex w-full flex-col gap-2">
            {ideas.map((i) => (
              <button
                key={i.en}
                onClick={() => speak(i.en, settings.ttsRate, settings.voiceIndex)}
                className="glass rounded-[19px] px-3.5 py-2 text-left text-[13.5px]"
              >
                {i.en}…<span className="txt-sub block text-xs">{i.es}</span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <div className="glass w-full rounded-[20px] px-3.5 py-2.5 text-sm">
            <span style={{ color: '#f87171' }}>{error}</span>
            {canRetry && (
              <button onClick={retry} className="btn-acc mt-2 h-10 w-full rounded-[20px] text-sm">
                {retryHasAudio ? 'Reenviar mi audio' : 'Reintentar'}
              </button>
            )}
          </div>
        )}
        {hint && !error && <div className="txt-sub text-center text-[13px]">{hint}</div>}
        {lastTeacher && (phase === 'idle' || phase === 'speaking') && (
          <button onClick={toggleIdeas} className="glass flex h-9 items-center gap-1.5 rounded-[18px] px-3.5 text-[13.5px]">
            <Icon name="bulb" size={15} stroke={1.8} color="var(--acc)" />
            {ideasLoading ? 'Pensando…' : ideas ? 'Ocultar ideas' : '¿Qué digo?'}
          </button>
        )}
        <TalkButton phase={phase} elapsed={elapsed} onPress={onPress} onRelease={onRelease} onCancel={onCancel} />
      </div>

      {lookupReq && (
        <LookupSheet
          query={lookupReq.query}
          context={lookupReq.context}
          apiKey={settings.geminiKey}
          models={models()}
          level={level}
          ttsRate={settings.ttsRate}
          voiceIndex={settings.voiceIndex}
          onClose={() => setLookupReq(null)}
        />
      )}
    </div>
  )
}
