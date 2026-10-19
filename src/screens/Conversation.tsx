import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import CorrectionView from '../components/CorrectionView'
import SpeakIcon from '../components/SpeakIcon'
import ReportView from '../components/ReportView'
import LookupSheet from '../components/LookupSheet'
import PrepareScreen, { type PrepareState } from '../components/PrepareScreen'
import { friendlyError } from '../lib/errors'
import TalkButton, { type Phase } from '../components/TalkButton'
import TappableText from '../components/TappableText'
import { sentenceAround } from '../lib/lookup'
import { splitDialogue } from '../lib/dialogue'
import { db, turnCorrections, type Session, type Topic, type Turn } from '../lib/db'
import { levelIdx, updateTrajectoryFromPractice, type TrajectoryChange } from '../lib/levels'
import { generateReport, sessionMetrics, turnMetrics } from '../lib/fluency'
import { isAborted, type ApiError, type ChatMessage, type Models } from '../lib/gemini'
import { getProfile } from '../lib/profile'
import { distrustMic, MicError, Recorder } from '../lib/recorder'
import { getScenario } from '../lib/scenarios'
import { findTopic, grammarBrief } from '../lib/grammar'
import { findLesson, LESSON_MIN_TURNS, lessonBrief, markLessonDone, type PlanLesson, type PlanWeek } from '../lib/plan'
import { fastModels, mainModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64, isEmptyRecording, type SpeechAnalysis } from '../lib/speech'
import { deleteSessionIfEmpty } from '../lib/stats'
import { answerIdeas, buildSystemPrompt, echoesIdea, START_MESSAGE, teacherTurn, type Idea } from '../lib/teacher'
import { CUSTOM_ID, customCategory, generateTopic, getCategory, randomCategory } from '../lib/topics'
import { speak, stopSpeaking, toggleSpeak } from '../lib/tts'
import { speakingKey } from '../lib/speaking'
import type { PronResult } from '../lib/pronunciation'
import { phoneticsActive, runPhonetics } from '../lib/phonetics'
import { MAX_SECONDS } from '../lib/wav'
import PronunciationView from '../components/PronunciationView'
import PhoneticsToggle from '../components/PhoneticsToggle'
import { whenBackground } from '../lib/lifecycle'
import { clearSavedClass, saveClass, type SavedClass } from '../lib/savedClass'
import MascotPage from '../components/MascotPage'
import { Icon, type IconName } from '../ui/icons'
import Mascot, { type MascotMood } from '../ui/Mascot'
import { THEME_INFO, type ThemeVars, teacherName, teacherPersona } from '../ui/theme'
import Wave from '../ui/Wave'

interface SpokenAnswer {
  base64: string
  mimeType: string
  seconds: number
  analysis: SpeechAnalysis | null
  blob: Blob // la grabación original (para el corrector fonético de Azure)
}

/** Tu respuesta: grabada (audio) o escrita con el teclado. */
type PendingAnswer = SpokenAnswer | { text: string }

interface Props {
  scenarioId: string
  categoryId?: string // para escenarios con tema; sin él, categoría al azar
  customTopic?: string // tema escrito por el alumno (Tema libre o debate propuesto)
  planLesson?: string // id de la lección del plan de 12 semanas
  /** v5.10 (D3): clase centrada en un tema de Gramática («Practicar en una clase»). */
  grammarTopic?: string
  /** Clase guardada que se retoma en el punto en que quedó (NC-16). */
  resume?: SavedClass
  /** v5.9: con `resume`, la clase no se sigue: se cierra en cuanto carga, con su informe («Terminar» del Inicio). */
  finishNow?: boolean
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

export default function Conversation({
  scenarioId,
  categoryId,
  customTopic,
  planLesson,
  grammarTopic,
  resume,
  finishNow,
  settings,
  update,
  onExit,
  registerBack,
}: Props) {
  const scenario = getScenario(scenarioId)
  // v5.10: tema de Gramática de la clase (también al retomarla).
  const gramTopic = findTopic(grammarTopic ?? resume?.grammarTopic)
  const [phase, setPhase] = useState<Phase>('starting')
  const [status, setStatus] = useState('Preparando la clase…')
  const [turns, setTurns] = useState<Turn[]>([])
  const [topic, setTopic] = useState<Topic | undefined>()
  // La tarjeta del objetivo empieza plegada y brilla hasta que la abres por primera vez.
  const [cardOpen, setCardOpen] = useState(false)
  const [cardSeen, setCardSeen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryHasAudio, setRetryHasAudio] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [translated, setTranslated] = useState<Set<number>>(new Set())
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  // v5.10 (P6): las últimas ideas enseñadas en este turno (se ocultan al grabar, pero se recuerdan para comprobar).
  const shownIdeas = useRef<Idea[]>([])
  const [lookupReq, setLookupReq] = useState<{ query: string; context: string } | null>(null)
  // v5.10 (punto 3): Atrás dentro de la hoja de consulta (vuelve del sinónimo/antónimo antes de cerrarla).
  const lookupBack = useRef<(() => boolean) | null>(null)
  const [level, setLevel] = useState('B1')
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [recordStart, setRecordStart] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  // Responder hablando (micrófono) o escribiendo (teclado).
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [draft, setDraft] = useState('')

  // Informe final
  const [view, setView] = useState<'chat' | 'report'>('chat')
  // v5.9: «Terminar» desde el Inicio: en cuanto la clase guardada está cargada, se cierra con su informe.
  const [finishing, setFinishing] = useState(false)
  // AUD-E2E-602: en horizontal la zona del micro puede no caber; se deja desplazada hasta abajo para que el micro
  // siempre se vea (lo de arriba, «¿Qué digo?» o las ideas, se alcanza desplazando).
  const ctrlRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ctrlRef.current
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
    // Solo al cambiar de fase o de modo: así las ideas de «¿Qué digo?» no se esconden solas al abrirlas.
  }, [phase, inputMode])
  // v5.9 (nota del dueño): con la fonética activa, al entrar la mascota recuerda que se puede apagar o encender.
  const [phonTip, setPhonTip] = useState(() => phoneticsActive(settings) && !finishNow)
  useEffect(() => {
    if (!phonTip) return
    const id = setTimeout(() => setPhonTip(false), 9000)
    return () => clearTimeout(id)
  }, [phonTip])
  const [session, setSession] = useState<Session | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [levelChange, setLevelChange] = useState<TrajectoryChange | null>(null)
  // Lección del plan de 12 semanas (si la clase es una de ellas) y si ya cuenta como hecha.
  const [planInfo, setPlanInfo] = useState<{ week: PlanWeek; lesson: PlanLesson } | null>(null)
  const [lessonDone, setLessonDone] = useState(false)
  // Despedida de la mascota al salir de la clase sin terminarla (queda guardada).
  const [bye, setBye] = useState(false)
  const topicRef = useRef<Topic | undefined>(undefined)
  const titleRef = useRef('')

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

  // Al salir de la clase se cancela todo lo pendiente: sin reintentos, sin respuesta del profe y sin voz.
  const abort = useRef(new AbortController())
  useEffect(() => {
    abort.current = new AbortController()
    return () => abort.current.abort()
  }, [])
  const gone = () => abort.current.signal.aborted

  const models = (): Models => mainModels(settingsRef.current, abort.current.signal)
  // Ideas, tema, informe y consultas: modelo rápido.
  const quick = (): Models => fastModels(settingsRef.current, abort.current.signal)
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
    if (abort.current.signal.aborted) return
    setPhase('speaking')
    try {
      await speak(text, settingsRef.current.ttsRate, settingsRef.current.voiceIndex)
    } catch {
      setHint('No se pudo reproducir la voz. Revisa el motor de voz de Android (Ajustes → Texto a voz).')
    }
    setPhase((p) => (p === 'speaking' ? 'idle' : p))
  }, [])

  // Turnos cuya pronunciación aún está evaluando Azure.
  const [pronPending, setPronPending] = useState<Set<number>>(new Set())
  const [pronFailed, setPronFailed] = useState<Map<number, string>>(new Map())

  /** Lanza la evaluación fonética (si está activa): convierte el audio a WAV y lo manda a Azure. */
  /** Resultado de Azure, o el motivo (texto) por el que no hay nota de pronunciación en esa respuesta. */
  const startPronunciation = (spoken: SpokenAnswer, reference: Promise<string>): Promise<PronResult | string> | null =>
    runPhonetics(settingsRef.current, update, spoken.blob, () => reference)

  /** Une la pronunciación a tu respuesta cuando llega (un momento después que la del profe). */
  const attachPronunciation = (turnId: number, p: Promise<PronResult | string>) => {
    setPronPending((s) => new Set(s).add(turnId))
    p.then(async (r) => {
      if (gone()) return
      if (typeof r === 'string') setPronFailed((m) => new Map(m).set(turnId, r))
      else {
        await db.turns.update(turnId, { pronunciation: r })
        setTurns((ts) => ts.map((t) => (t.id === turnId ? { ...t, pronunciation: r } : t)))
      }
    }).finally(() =>
      setPronPending((s) => {
        const n = new Set(s)
        n.delete(turnId)
        return n
      }),
    )
  }

  /**
   * Pide al profe la siguiente intervención. Con `answer` (tu audio), Gemini lo transcribe,
   * te corrige y responde en una sola llamada. Si falla, el audio queda guardado para reenviarlo.
   */
  const askTeacher = useCallback(
    async (answer?: PendingAnswer) => {
      setPhase('thinking')
      setCanRetry(false)
      setIdeas(null)
      const spoken = answer && 'base64' in answer ? answer : null
      const typed = answer && 'text' in answer ? answer.text : null
      // Corrector fonético (Azure) EN PARALELO a Gemini con el mismo audio. Si no se usa o falla, solo Gemini.
      let giveReference: (t: string) => void = () => {}
      const reference = new Promise<string>((r) => (giveReference = r))
      const pron = spoken ? startPronunciation(spoken, reference) : null
      try {
        const res = await teacherTurn(
          settingsRef.current.geminiKey,
          models(),
          system.current,
          history.current,
          spoken ? { base64: spoken.base64, mimeType: spoken.mimeType } : typed ? { text: typed } : undefined,
        )
        giveReference(typed ?? res.transcript) // por si Azure necesita el texto como referencia
        if (gone()) return
        setHint(null)
        const sid = sessionId.current!
        pending.current = null

        if (answer) {
          // Escrita: tu texto tal cual es la "transcripción".
          const said = typed ?? res.transcript
          if (spoken && (!res.heardSpeech || !said)) {
            setHint('No te he entendido. Prueba otra vez, un poco más cerca del micrófono.')
            setPhase('idle')
            return
          }
          // v5.10 (P6): si lo «dicho» es solo una idea de «¿Qué digo?», no se corrige ni se guarda: casi seguro que el
          // micro captó la voz del teléfono leyéndola. Se pide grabar de nuevo.
          if (spoken && echoesIdea(said, shownIdeas.current)) {
            setHint('Te entendí justo la idea de «¿Qué digo?», sin nada más. Si no la dijiste tú (a veces el micro capta la voz del teléfono), vuelve a grabar tu respuesta.')
            setPhase('idle')
            return
          }
          shownIdeas.current = []
          if (typed) setDraft('')
          const turn: Turn = {
            sessionId: sid,
            role: 'user',
            text: said,
            ...(spoken
              ? { audioSeconds: spoken.seconds, speechSeconds: spoken.analysis?.speechSeconds, pauses: spoken.analysis?.pauses }
              : { typed: true }),
            createdAt: Date.now(),
            ...(res.corrections.length ? { correction: res.corrections[0], corrections: res.corrections } : {}),
          }
          turn.id = await db.turns.add(turn)
          // Cada error va al cuaderno de errores (repaso espaciado).
          for (const c of res.corrections) await db.mistakes.add({ ...c, sessionId: sid, turnId: turn.id!, createdAt: Date.now() })
          setTurns((ts) => [...ts, turn])
          if (pron && turn.id) attachPronunciation(turn.id, pron)
          setCardOpen(false) // la tarjeta del tema se pliega sola al responder
          history.current.push({ role: 'user', content: said })
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
        persist()
        if (prepRef.current === 'loading') {
          // Primera intervención: animación de "¡Clase lista!" y después el chat.
          setPrep('done')
          await new Promise((r) => setTimeout(r, 1400))
          if (gone()) return
          setPrep(null)
        }
        await say(res.reply)
      } catch (e) {
        giveReference('')
        if (isAborted(e) || gone()) return
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
                (spoken ? 'Tu audio está guardado: no hace falta repetirlo.' : typed ? 'Tu texto sigue escrito: puedes reenviarlo.' : '')
            : err.message,
        )
        setCanRetry(true)
        setRetryHasAudio(!!spoken)
        setPhase('idle')
      }
    },
    [say],
  )

  // Arranque: micrófono, tema del día, prompt y saludo del profe; o, con `resume`, la clase guardada tal como quedó.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const rec = recorder.current
    ;(async () => {
      try {
        // Al entrar se abre una vez para pedir el permiso y elegir el micro (auriculares…), y se cierra en seguida:
        // v5.9 (AUD-MIC-305), el micro solo se abre cuando tocas para hablar. Para terminar la clase no hace falta.
        if (!(resume && finishNow)) await rec.open()
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo abrir el micrófono.')
      }
      rec.close()
      if (gone()) return // saliste mientras se abría el micrófono
      if (resume) {
        const profile = await getProfile()
        setLevel(profile.levels.overall)
        const found = resume.planLesson && profile.plan ? findLesson(profile.plan, resume.planLesson) : null
        if (found) setPlanInfo(found)
        if (resume.topic) {
          setTopic(resume.topic)
          topicRef.current = resume.topic
        }
        titleRef.current = resume.title
        system.current = resume.system
        history.current = resume.history
        sessionId.current = resume.sessionId
        const saved = await db.turns.where('sessionId').equals(resume.sessionId).sortBy('createdAt')
        setTurns(saved)
        setCardOpen(false)
        setStatus('')
        setPrep(null)
        setPhase('idle')
        if (finishNow) setFinishing(true)
        return
      }
      const [profile, recent] = await Promise.all([
        getProfile(),
        db.mistakes.orderBy('createdAt').reverse().limit(12).toArray(),
      ])
      setLevel(profile.levels.overall)

      let tp: Topic | undefined
      if (scenario.topic) {
        const cat = customTopic ? customCategory(customTopic) : categoryId ? getCategory(categoryId) : await randomCategory()
        setStatus(cat.live ? `Buscando algo reciente sobre ${cat.title.toLowerCase()}…` : 'Eligiendo un tema…')
        try {
          tp = await generateTopic(settingsRef.current.geminiKey, quick(), cat)
          setTopic(tp)
          topicRef.current = tp
        } catch {
          // Sin tema: el profe elige uno él mismo.
        }
        setHint(null)
      }
      if (gone()) return
      setStatus('')

      // Lección del plan: el profe recibe la situación, el objetivo y las frases de esa lección.
      const found = planLesson && profile.plan ? findLesson(profile.plan, planLesson) : null
      if (found) setPlanInfo(found)
      titleRef.current = found ? found.lesson.titleEs : gramTopic ? gramTopic.name : tp?.title ?? scenario.title
      // v5.10 (D3): en «Practicar en una clase» el profe recibe el foco, las fórmulas y el nombre del tema.
      const brief = found
        ? { ...scenario, brief: lessonBrief(found.week, found.lesson) }
        : gramTopic
          ? { ...scenario, brief: grammarBrief(gramTopic) }
          : scenario
      system.current = buildSystemPrompt(profile, brief, recent, tp, teacherPersona(settingsRef.current.theme, settingsRef.current.teacher))
      sessionId.current =
        (await db.sessions.add({
          scenario: scenario.id,
          startedAt: Date.now(),
          topic: tp,
          ...(found ? { planLesson } : {}),
          ...(gramTopic ? { grammarTopic: gramTopic.id } : {}),
        })) ?? null
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

  /** Guarda la clase en progreso (una sola entrada). Sin ninguna respuesta tuya todavía, no hay nada que guardar. */
  const persist = useCallback(() => {
    const sid = sessionId.current
    const answers = history.current.filter((m) => m.role === 'user').length - 1 // la primera es la orden de empezar
    if (!sid || answers < 1) return
    saveClass({
      sessionId: sid,
      scenarioId,
      categoryId,
      customTopic,
      planLesson,
      ...(gramTopic ? { grammarTopic: gramTopic.id } : {}),
      topic: topicRef.current,
      system: system.current,
      history: history.current,
      mascot: settingsRef.current.theme,
      title: titleRef.current,
      turns: answers,
      savedAt: Date.now(),
    }).catch(() => {})
  }, [scenarioId, categoryId, customTopic, planLesson, gramTopic])

  // Al minimizar o cerrar la app con la clase abierta, también se guarda (el micrófono y la voz los cierra lifecycle).
  useEffect(() => whenBackground(persist), [persist])
  // MOV-1: al pasar a segundo plano se cierra el micro (lifecycle); el botón no debe seguir «grabando».
  useEffect(() => {
    if (phase !== 'recording') return
    return whenBackground(() => {
      setPhase('idle')
      setHint('Se cortó la grabación al salir de Habla. Toca el micro y vuelve a grabar.')
    })
  }, [phase])

  /** Salir sin terminar: la clase queda guardada y la mascota se despide hasta la vuelta. */
  const leave = useCallback(async () => {
    abort.current.abort()
    recorder.current.close()
    await stopSpeaking()
    const sid = sessionId.current
    const answers = history.current.filter((m) => m.role === 'user').length - 1
    if (!sid || answers < 1) {
      // Nada que guardar: la sesión vacía no cuenta.
      if (sid) await deleteSessionIfEmpty(sid)
      return onExit()
    }
    persist()
    setBye(true)
    await new Promise((r) => setTimeout(r, 1800))
    onExit()
  }, [persist, onExit])

  // Si sueltas el botón antes de que la grabación haya arrancado, onRelease espera a que arranque.
  const starting = useRef<Promise<void>>(Promise.resolve())

  const onPress = () => {
    setError(null)
    setHint(null)
    setIdeas(null)
    haptic(ImpactStyle.Medium)
    setPhase('opening') // P7: que se vea que el micro aún no graba
    starting.current = (async () => {
      // v5.10 (P6): si sonaba algo (una idea, el profe), se para y se espera a que el altavoz calle antes de abrir el
      // micro: si no, la voz del teléfono podía colarse en la grabación.
      const wasSpeaking = speakingKey() !== null
      await stopSpeaking()
      if (wasSpeaking) await new Promise((r) => setTimeout(r, 400))
      try {
        // AUD-MIC-301/304: false = se canceló la apertura (segundo plano, salir) o ya se estaba grabando.
        if (!(await recorder.current.begin())) {
          setPhase((p) => (p === 'recording' ? p : 'idle'))
          return
        }
        haptic(ImpactStyle.Light) // P7: la vibración corta avisa de que ya puedes hablar
        setRecordStart(performance.now())
        setElapsed(0)
        setPhase('recording')
      } catch (e) {
        setError(e instanceof MicError ? e.message : 'No se pudo grabar.')
        setPhase('idle')
      }
    })()
  }

  // v5.9: con «toca para enviar», un segundo toque mientras se cierra la grabación no vuelve a enviar.
  const sending = useRef(false)
  const onRelease = async () => {
    if (sending.current) return
    sending.current = true
    try {
      await releaseOnce()
    } finally {
      sending.current = false
    }
  }
  const releaseOnce = async () => {
    await starting.current
    haptic(ImpactStyle.Light)
    // v5.9 (AUD-MIC-305): al enviar se suelta el micrófono; se vuelve a abrir en el siguiente toque.
    const { blob, seconds } = await recorder.current.finish()
    if (seconds < MIN_SECONDS || blob.size === 0) {
      setHint('Toca el micro, habla y vuelve a tocarlo para enviar.')
      setPhase('idle')
      return
    }
    setPhase('transcribing')
    try {
      // Análisis local: si no hay voz, ni siquiera se llama a Gemini.
      const analysis = await analyzeSpeech(blob)
      // Error 400 del repaso (2026-10-08): una grabación con solo la cabecera (micro de unos auriculares
      // desconectados) no se manda, y la próxima vuelve a buscar un micro que funcione.
      const empty = isEmptyRecording(blob, analysis)
      if (empty) distrustMic()
      if (empty || (analysis && !analysis.hasSpeech)) {
        setHint('No te he oído. Habla un poco más fuerte o más cerca del micrófono.')
        setPhase('idle')
        return
      }
      if (gone()) return
      const answer: SpokenAnswer = {
        base64: await blobToBase64(blob),
        mimeType: blob.type.split(';')[0] || 'audio/webm',
        seconds,
        analysis,
        blob,
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
    await recorder.current.finish() // se descarta el audio y se suelta el micro
    setPhase('idle')
    setHint('Grabación descartada')
  }

  const busy = phase === 'thinking' || phase === 'transcribing' || phase === 'starting'

  const sendText = () => {
    const text = draft.trim()
    if (!text || busy) return
    setError(null)
    setHint(null)
    setIdeas(null)
    stopSpeaking()
    const answer = { text }
    pending.current = answer
    askTeacher(answer)
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
      const list = await answerIdeas(settingsRef.current.geminiKey, quick(), lastTeacher.text, topic)
      if (!gone()) {
        setIdeas(list)
        shownIdeas.current = list
      }
    } catch (e) {
      if (!isAborted(e)) setHint((e as Error).message)
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
      // El informe no se cancela: la clase ya terminó y se está mostrando.
      const report = await generateReport(settingsRef.current.geminiKey, { ...quick(), signal: undefined }, allTurns, s.metrics!, s.topic)
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
    // Terminar de verdad: ya no hay clase que continuar.
    clearSavedClass().catch(() => {})
    // Lo que el profe estuviera preparando ya no hace falta.
    abort.current.abort()
    recorder.current.close()
    await stopSpeaking()
    const sid = sessionId.current
    if (!sid) return onExit()
    if (await deleteSessionIfEmpty(sid)) return onExit()

    const allTurns = await db.turns.where('sessionId').equals(sid).sortBy('createdAt')
    const metrics = sessionMetrics(allTurns)!
    await db.sessions.update(sid, { endedAt: Date.now(), metrics })
    const s = (await db.sessions.get(sid))!
    // Con al menos 3 respuestas, la lección del plan cuenta como hecha.
    if (planLesson && metrics.turns >= LESSON_MIN_TURNS) {
      await markLessonDone(planLesson, sid)
      setLessonDone(true)
    }
    setSession(s)
    setView('report')
    buildReport(s, allTurns)
    // Las clases no cambian el nivel: proponen una trayectoria que pesa un 30 % en el próximo re-test.
    updateTrajectoryFromPractice()
      .then(setLevelChange)
      .catch(() => {})
  }, [onExit, buildReport, planLesson])

  useEffect(() => {
    if (!finishing) return
    // El cierre es asíncrono (guarda, calcula y pide el informe): el estado cambia dentro de finish(), no aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFinishing(false)
    finish()
  }, [finishing, finish])

  // Botón "atrás" de Android: en el chat sale guardando la clase (Terminar, con informe, está en la cabecera);
  // en el informe vuelve al inicio.
  useEffect(() => {
    registerBack(lookupReq ? () => lookupBack.current?.() || setLookupReq(null) : view === 'report' ? onExit : bye ? () => {} : () => leave())
    return () => registerBack(null)
  }, [view, leave, onExit, registerBack, lookupReq, bye])

  const userTurns = turns.filter((x) => x.role === 'user')
  const mascotEl = THEME_INFO[settings.theme].mascot
  // La mascota escucha mientras grabas, piensa mientras el profe responde y habla con su voz.
  const mood: MascotMood =
    phase === 'recording' ? 'listening' : phase === 'thinking' || phase === 'transcribing' ? 'thinking' : phase === 'speaking' ? 'speaking' : 'idle'
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
  const card: { icon: IconName; label: string; title: string; sub: string } = planInfo
    ? {
        icon: 'flag',
        label: `Semana ${planInfo.week.n} · Lección ${planInfo.lesson.n}`,
        title: planInfo.lesson.titleEs,
        sub: `Misión: ${planInfo.lesson.missionEs}`,
      }
    : topic
    ? {
        icon: scenario.id === 'debate' ? 'scale' : cat!.icon,
        // En un debate se ve que es un debate (con tu tema o con el de la categoría que eligió el profe).
        label: scenario.id === 'debate' ? (topic.category === CUSTOM_ID ? 'Debate · tu tema' : `Debate · ${cat!.title}`) : cat!.title,
        title: topic.title,
        sub: topic.summary,
      }
    : gramTopic
      ? { icon: 'book', label: `Gramática · ${gramTopic.level}`, title: gramTopic.name, sub: `${gramTopic.nameEs}: ${gramTopic.summaryEs}` }
      : scenario.id === 'open'
      ? { icon: 'mic', label: 'Charla libre', title: scenario.subtitle, sub: `${teacherName(settings.theme)} sigue tu conversación` }
      : scenario.topic
        ? { icon: scenario.icon, label: scenario.title, title: status || 'Tema sorpresa', sub: '' }
        : { icon: scenario.icon, label: 'Práctica guiada', title: scenario.title, sub: scenario.subtitle }

  // Vocabulario del tema o frases de la lección del plan (tócalas para oírlas).
  const chips = topic?.vocab ?? planInfo?.lesson.phrases ?? []

  if (bye) {
    return (
      <MascotPage
        element={mascotEl}
        mood="happy"
        title="Te espero aquí"
        subtitle="Seguimos cuando vuelvas. Tu clase quedó guardada: la encontrarás en Hablar → Continuar clase."
      />
    )
  }

  if (view === 'chat' && prep) {
    return (
      <PrepareScreen
        kind="clase"
        state={prep}
        mascot={mascotEl}
        teacherName={teacherName(settings.theme)}
        errorText={prepError}
        onRetry={() => {
          setPrep('loading')
          askTeacher()
        }}
        onBack={finish}
        onCancel={finish}
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
          <Mascot element={mascotEl} mood="happy" size={52} />
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {planInfo && (
            <div className="glass anim-up mb-3 flex items-center gap-3 rounded-[24px] p-3.5">
              <span
                className={`grid h-10 w-10 flex-none place-items-center rounded-full ${lessonDone ? 'btn-acc' : 'field txt-sub'}`}
              >
                <Icon name={lessonDone ? 'check' : 'flag'} size={18} stroke={2} />
              </span>
              <span className="min-w-0 flex-1 text-sm leading-snug">
                <b className="block font-semibold">
                  {lessonDone ? '¡Lección completada!' : 'Lección sin completar'} · Semana {planInfo.week.n}
                </b>
                <span className="txt-sub">
                  {lessonDone
                    ? `${planInfo.lesson.titleEs}. Mañana, la siguiente.`
                    : `Para que cuente, responde al menos ${LESSON_MIN_TURNS} veces. Puedes repetirla desde Mi plan.`}
                </span>
              </span>
            </div>
          )}
          {levelChange && (
            <div
              className="anim-up mb-3 rounded-[24px] p-4 text-center"
              style={{ background: 'var(--acc)', color: 'var(--ink)', boxShadow: '0 10px 30px var(--glow)' }}
            >
              <div className="text-sm">{levelIdx(levelChange.to) > levelIdx(levelChange.level) ? 'Tus clases proponen subir tu habla' : levelIdx(levelChange.to) < levelIdx(levelChange.level) ? 'Tus clases proponen repasar tu habla' : 'Tus clases confirman tu nivel de habla'}</div>
              <div className="text-3xl font-semibold tracking-[-1px]">
                {levelChange.to === levelChange.level ? levelChange.level : `${levelChange.level} → ${levelChange.to}`}
              </div>
              <div className="text-xs opacity-85">Según tus últimas {levelChange.sessions} clases · cuenta un 30 % en tu próximo re-test</div>
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
            corrections={userTurns.flatMap(turnCorrections)}
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
    <div className="cv-root anim-up relative z-[2] flex h-full flex-col pt-[env(safe-area-inset-top)]">
      {/* Cabecera */}
      <div className="cv-head flex items-center gap-2.5 px-[18px] pt-1.5 pb-2.5">
        <button onClick={leave} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Salir y guardar la clase">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2.5">
          <Mascot element={mascotEl} mood={mood} size={64} />
          <div>
            <div className="text-base font-semibold">{teacherName(settings.theme)}</div>
            <div className="txt-sub text-xs">{chatStatus}</div>
          </div>
        </div>
        <button onClick={finish} className="glass h-11 flex-none rounded-[22px] px-4 text-sm font-medium">
          Terminar
        </button>
      </div>

      {/* Velocidad + modo oído */}
      <div className="cv-speed flex items-center gap-2.5 px-[18px] pb-2.5">
        <Icon name="speaker" size={18} color="var(--sub)" className="flex-none" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={settings.ttsRate}
          onChange={(e) => update({ ttsRate: Number(e.target.value) })}
          // min-w-0: con el botón Fonética (v5.9) la fila no cabía en horizontal; el deslizador es lo que se encoge.
          className="min-w-0 flex-1"
          style={{ accentColor: 'var(--acc)' }}
          aria-label="Velocidad de la voz"
        />
        <span className="txt-sub w-10 text-[13px] tabular-nums">{settings.ttsRate.toFixed(2)}×</span>
        <button
          onClick={toggleEar}
          className={`flex h-[34px] flex-none items-center gap-1.5 rounded-[17px] px-3 text-[13px] ${settings.earMode ? 'btn-acc' : 'glass'}`}
        >
          <Icon name="ear" size={15} stroke={1.8} />
          Modo oído
        </button>
        <PhoneticsToggle
          compact
          settings={settings}
          update={(p) => {
            setPhonTip(false)
            update(p)
          }}
        />
      </div>
      {phonTip && (
        <button onClick={() => setPhonTip(false)} className="cv-phon-tip mx-[18px] mb-2.5 flex items-start gap-2.5 text-left">
          <Mascot element={mascotEl} mood="speaking" size={34} />
          <span className="tip-bubble flex-1 rounded-[16px] px-3 py-2 text-[12.5px] leading-snug">
            Tu <b>fonética de Azure</b> está activa: te pongo nota de pronunciación en cada respuesta. Puedes apagarla o encenderla cuando
            quieras con el botón de la onda, junto a «Modo oído».
          </span>
        </button>
      )}

      {/* Tarjeta del tema: se pliega sola al responder */}
      <div className="cv-card flex-none px-[18px] pb-2">
        <div className={`glass rounded-[24px] py-3 pr-3 pl-3.5 ${!cardSeen && (card.sub || chips.length) ? 'card-glow' : ''}`}>
          <button
            onClick={() => {
              setCardOpen((o) => !o)
              setCardSeen(true)
            }}
            className="flex w-full items-center gap-3 text-left"
            aria-expanded={cardOpen}
          >
            <span className="field txt-acc2 grid h-9 w-9 flex-none place-items-center rounded-full">
              <Icon name={card.icon} size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="txt-acc2 block text-[10.5px] tracking-[1.2px] uppercase">{card.label}</span>
              <span className="block truncate text-base font-semibold">{card.title}</span>
              {!cardSeen && !cardOpen && (card.sub || chips.length) ? (
                <span className="txt-sub block text-[11.5px]">{planInfo ? 'Toca para ver el objetivo de esta clase' : 'Toca para ver el objetivo de esta conversación'}</span>
              ) : null}
            </span>
            <span
              className="txt-sub grid h-[30px] w-[30px] flex-none place-items-center rounded-full transition-transform duration-300"
              style={{ border: '1px solid var(--gb)', transform: cardOpen ? 'rotate(180deg)' : 'none' }}
            >
              <Icon name="chevD" size={15} stroke={2} />
            </span>
          </button>
          {cardOpen && (card.sub || chips.length) ? (
            <div className="anim-up pl-12">
              {topic?.titleEs && <div className="txt-sub mt-1 text-[13px]">{topic.titleEs}</div>}
              {card.sub && <div className="mt-1 text-[13px] leading-snug">{card.sub}</div>}
              {chips.length > 0 &&
                // Frases (lección del plan) o palabras largas: cada idea en su caja, inglés y español en líneas
                // propias que se ajustan al ancho. Palabras cortas (tema del día): píldoras que también se ajustan.
                (chips.some((v) => v.en.length > 22) ? (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {chips.map((v) => (
                      <button
                        key={v.en}
                        onClick={() => toggleSpeak(v.en, settings.ttsRate, settings.voiceIndex)}
                        className="field flex w-full items-start gap-2 rounded-[16px] px-3 py-2 text-left text-[13.5px] leading-snug"
                      >
                        <span className="txt-acc2 mt-0.5 flex-none">
                          <SpeakIcon speakKey={v.en} size={14} stroke={1.8} />
                        </span>
                        <span className="min-w-0 flex-1 break-words">
                          <b className="block font-semibold">{v.en}</b>
                          <span className="txt-sub block text-[12.5px]">{v.es}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {chips.map((v) => (
                      <button
                        key={v.en}
                        onClick={() => toggleSpeak(v.en, settings.ttsRate, settings.voiceIndex)}
                        className="field flex min-h-8 max-w-full items-center gap-1.5 rounded-2xl px-2.5 py-1 text-left text-[13px] break-words"
                      >
                        <SpeakIcon speakKey={v.en} size={13} stroke={1.8} />
                        <span className="min-w-0">
                          <b className="font-semibold">{v.en}</b>
                          <span className="txt-sub"> · {v.es}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              {topic?.sources && topic.sources.length > 0 && (
                <div className="txt-sub mt-2 truncate text-[11px]">Fuente: {topic.sources.map((s) => s.title).join(' · ')}</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="cv-list no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] pt-1.5 pb-4">

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
                  {m.typed ? (
                    <span className="flex items-center gap-1">
                      <Icon name="keyboard" size={12} /> escrita
                    </span>
                  ) : (
                    <span>
                      {tm.pauses} {tm.pauses === 1 ? 'pausa' : 'pausas'}
                    </span>
                  )}
                </div>
              </div>
            )
          }
          // La corrección de tu respuesta aparece dentro de la siguiente burbuja del profe, como en el diseño.
          const prev = turns[i - 1]
          const fixes = prev?.role === 'user' ? turnCorrections(prev) : []
          // Mensaje del coach: correcciones (Gemini) y pronunciación (Azure) juntas, bajo la respuesta del profe.
          const pron = prev?.role === 'user' ? prev.pronunciation : undefined
          const pronWaiting = prev?.role === 'user' && prev.id !== undefined && pronPending.has(prev.id)
          const pronError = prev?.role === 'user' && prev.id !== undefined ? pronFailed.get(prev.id) : undefined
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
                  {(() => {
                    // Un diálogo (A: … B: …) se ve una línea por persona (NC-06).
                    const lines = splitDialogue(m.text)
                    if (!lines) return <TappableText text={m.text} onWord={(w, start) => setLookupReq({ query: w, context: sentenceAround(m.text, start) })} />
                    return (
                      <ul className="flex flex-col gap-1">
                        {lines.map((l, k) => (
                          <li key={k}>
                            {l.who && <b className="txt-acc2 mr-1">{l.who}:</b>}
                            <TappableText text={l.text} onWord={(w, start) => setLookupReq({ query: w, context: sentenceAround(l.text, start) })} />
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                </div>
              )}
              {showEs && m.translation && <div className="txt-sub mt-1.5 text-sm leading-snug">{m.translation}</div>}
              {(fixes.length > 0 || pron || pronWaiting || pronError) && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {fixes.length > 1 && <div className="txt-sub text-[11.5px]">{fixes.length} correcciones</div>}
                  {fixes.map((c, k) => (
                    <CorrectionView key={k} c={c} />
                  ))}
                  {pron ? (
                    <PronunciationView r={pron} onSay={(w) => speak(w, settings.ttsRate, settings.voiceIndex)} pausable />
                  ) : pronWaiting ? (
                    <div className="txt-sub flex items-center gap-1.5 text-[12px]">
                      <Icon name="ear" size={13} /> Revisando tu pronunciación…
                    </div>
                  ) : pronError ? (
                    <div className="txt-sub flex items-center gap-1.5 text-[12px]">
                      <Icon name="ear" size={13} /> Sin nota de pronunciación: {pronError.replace(/\.$/, '')}.
                    </div>
                  ) : null}
                </div>
              )}
              <div className="mt-2 flex gap-3.5">
                <button
                  // v5.9: si este mensaje es el que suena (leído solo o con Repetir), tocar lo para.
                  onClick={() => (speakingKey() === m.text ? stopSpeaking() : say(m.text))}
                  disabled={phase !== 'idle' && phase !== 'speaking'}
                  className="txt-sub flex items-center gap-1 text-[12.5px]"
                >
                  <SpeakIcon speakKey={m.text} size={14} stroke={1.8} />
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
      <div ref={ctrlRef} className="cv-ctrl flex flex-col items-center gap-3 px-[18px] pt-3 pb-[calc(env(safe-area-inset-bottom)+22px)]">
        {ideas && (
          <div className="anim-up flex w-full flex-col gap-2">
            {ideas.map((i) => (
              // P6 (2026-10-19): tocar una idea la lee en voz alta; antes no se veía que sonaba, y al grabar encima el
              // micro la captaba. Ahora muestra ▶/⏸ y se puede parar tocando otra vez (el micro también la corta).
              <button
                key={i.en}
                onClick={() => toggleSpeak(i.en, settings.ttsRate, settings.voiceIndex)}
                className="glass flex items-start gap-2 rounded-[19px] px-3.5 py-2 text-left text-[13.5px]"
              >
                <SpeakIcon speakKey={i.en} size={14} stroke={1.8} className="txt-acc mt-[3px] shrink-0" />
                <span>
                  {i.en}…<span className="txt-sub block text-xs">{i.es}</span>
                </span>
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
          <button onClick={toggleIdeas} className="cv-ideas-btn glass flex h-9 items-center gap-1.5 rounded-[18px] px-3.5 text-[13.5px]">
            <Icon name="bulb" size={15} stroke={1.8} color="var(--acc)" />
            {ideasLoading ? 'Pensando…' : ideas ? 'Ocultar ideas' : '¿Qué digo?'}
          </button>
        )}
        {inputMode === 'voice' ? (
          <TalkButton phase={phase} elapsed={elapsed} onPress={onPress} onRelease={onRelease} onCancel={onCancel} onKeyboard={() => setInputMode('text')}
            maxSeconds={MAX_SECONDS}
            level={() => recorder.current.level()}
          />
        ) : (
          <div className="anim-up flex w-full items-end gap-2">
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className="glass grid h-[52px] w-[52px] flex-none place-items-center rounded-full"
              aria-label="Responder hablando"
            >
              <Icon name="mic" size={22} />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              placeholder="Write your answer in English…"
              className="input max-h-[120px] min-h-[52px] flex-1 resize-none py-3 leading-snug"
            />
            <button
              type="button"
              onClick={sendText}
              disabled={!draft.trim() || busy}
              className="btn-acc grid h-[52px] w-[52px] flex-none place-items-center rounded-full disabled:opacity-50"
              aria-label="Enviar"
            >
              <Icon name="send" size={22} stroke={1.8} />
            </button>
          </div>
        )}
      </div>

      {lookupReq && (
        <LookupSheet
          query={lookupReq.query}
          context={lookupReq.context}
          apiKey={settings.geminiKey}
          models={quick()}
          level={level}
          ttsRate={settings.ttsRate}
          voiceIndex={settings.voiceIndex}
          onClose={() => setLookupReq(null)}
          backRef={lookupBack}
        />
      )}
    </div>
  )
}
