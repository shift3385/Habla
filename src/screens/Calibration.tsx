import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BANK, BANK_VERSION, scriptSeconds, type BankItem, type BankQuestion, type BankUsage, type GrammarItem, type ListeningItem, type Speaker } from '../lib/bank'
import {
  assessSpeakingTask,
  buildLevels,
  evaluateSpeaking,
  finalLevels,
  saveCalibration,
  taskFromItem,
  type CalibrationResult,
  type SpeakingAnswer,
  type SpeakingEval,
  type SpeakingTask,
  type TaskAssessment,
} from '../lib/calibration'
import GeminiFix from '../components/GeminiFix'
import MascotPage from '../components/MascotPage'
import SkillProgressCard from '../components/SkillProgressCard'
import Fraction from '../components/Fraction'
import PrepareScreen, { type PrepareKind, type PrepareState } from '../components/PrepareScreen'
import type { Profile, Skill } from '../lib/db'
import { friendlyError } from '../lib/errors'
import type { Models, RetryInfo } from '../lib/gemini'
import { levelAt, levelIdx, needsRecalibration, overallBreakdown, rateForLevel, TEST_WEIGHT, trajectoryOf, weightedLevel, type Level } from '../lib/levels'
import {
  blockScore,
  blocksLevel,
  buildGrammar,
  checkGrammar,
  checkQuestion,
  grammarLevel,
  grammarShouldStop,
  GRAMMAR_COUNT,
  listeningConfidence,
  listeningStart,
  nextBlockLevel,
  pickBlock,
  pickSpeaking,
  readingStart,
  SPEAK_CRITERIA,
  simpleTask3,
  type BlockItem,
  type BlockResult,
  type Confidence,
  type GrammarAnswer,
  type SpeakCriterion,
} from '../lib/placement'
import { getProfile } from '../lib/profile'
import { buildSummary } from '../lib/testSummary'
import { clearDraft, clearProgress, loadDraft, loadProgress, saveDraft, saveProgress, type TestDraft, type TestProgress } from '../lib/testDraft'
import { MicError, Recorder } from '../lib/recorder'
import { mainModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64 } from '../lib/speech'
import { englishVoices, speak, stopSpeaking } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import Mascot, { type MascotElement } from '../ui/Mascot'
import { TEACHERS, THEME_INFO, type ThemeVars } from '../ui/theme'
import Wave from '../ui/Wave'

type Kind = 'reading' | 'listening'
type Value = number | string | null // índice de opción, texto escrito, -1 = "No sé", null = sin responder

type Step =
  | { k: 'loading' }
  | { k: 'explain'; i: number }
  | { k: 'section'; s: Skill }
  | { k: 'grammar' }
  | { k: 'block'; kind: Kind; n: number }
  | { k: 'review'; kind: Kind | 'grammar'; n: number } // resumen al final de cada test (NC-01)
  | { k: 'speaking'; i: number }
  | { k: 'deciding' }
  | { k: 'prep'; kind: PrepareKind; title: string; state: PrepareState; error?: string; retry?: () => void }
  | { k: 'evalFail'; error: string }
  | { k: 'result'; r: CalibrationResult }

const SECTIONS = ['Gramática', 'Lectura', 'Audición', 'Habla']
const SKILL_ES: Record<Skill, string> = { grammar: 'Gramática', reading: 'Lectura', listening: 'Audición', speaking: 'Habla' }
const SECTION_IDX: Record<Skill, number> = { grammar: 0, reading: 1, listening: 2, speaking: 3 }
const CRITERION_ES: Record<SpeakCriterion, string> = {
  fluency: 'Fluidez y coherencia',
  vocabulary: 'Vocabulario',
  grammar: 'Precisión gramatical',
  pronunciation: 'Pronunciación',
}
const CONF_ES: Record<Confidence, string> = { high: 'Alta', medium: 'Media', low: 'Baja' }
const PREVIEW_SECONDS = 35

/** Instrucciones antes de cada parte: las cuenta la mascota. */
const SECTION_INFO: Record<Skill, { title: string; icon: IconName; points: string[]; tip?: string }> = {
  grammar: {
    title: 'Gramática y vocabulario',
    icon: 'pencil',
    points: [
      `Son ${GRAMMAR_COUNT} preguntas que van de A1 a C2: empiezan fáciles y se ponen difíciles. Es normal que las últimas cuesten.`,
      'En la mayoría eliges una opción. En 5 escribes tú la palabra que falta, con una pista entre paréntesis.',
      'Si fallas todas las de dos niveles seguidos, la parte termina antes: no te haré perder el tiempo.',
      'Si no sabes, marca «No lo sé» en vez de adivinar.',
    ],
  },
  reading: {
    title: 'Lectura',
    icon: 'book',
    points: [
      'Vas a leer 2 textos, cada uno con 6 preguntas. Puedes releer el texto las veces que quieras.',
      'Algunas preguntas son de elegir y otras de escribir de 1 a 3 palabras sacadas del texto.',
      'El segundo texto depende del primero: si aciertas mucho, sube de nivel; si no, baja.',
    ],
  },
  listening: {
    title: 'Audición',
    icon: 'headphones',
    points: [
      'Son 2 audios con 6 preguntas cada uno. Antes de escuchar verás las preguntas unos segundos.',
      'Puedes escuchar cada audio hasta 3 veces. Al terminar la 3.ª, la nota se cierra: lo que no hayas respondido contará como «No sé».',
      'Después puedes seguir escuchando para practicar, pero ya no puntúa. Al final verás las respuestas correctas.',
    ],
    tip: 'Usa auriculares, sube el volumen y busca un lugar tranquilo.',
  },
  speaking: {
    title: 'Habla',
    icon: 'mic',
    points: [
      '3 tareas: unas preguntas sobre ti, describir o contar algo con una tarjeta, y dar tu opinión.',
      'Toca el micrófono para hablar y otra vez para terminar. Puedes volver a oír la pregunta.',
      'Gemini escucha tus respuestas y las puntúa con 4 criterios: fluidez, vocabulario, gramática y pronunciación.',
    ],
    tip: 'Si tienes auriculares con micrófono, úsalos. Busca un lugar sin ruido.',
  },
}

function Header({ section }: { section: number }) {
  return (
    <div className="mb-4 flex-none">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Test de nivel</div>
        <div className="txt-sub text-sm">{section >= 0 ? `${section + 1}/4 · ${SECTIONS[section]}` : ''}</div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {SECTIONS.map((s, i) => (
          <div key={s} className="h-1.5 rounded-full" style={{ background: i <= section ? 'var(--acc)' : 'var(--gb)' }} />
        ))}
      </div>
    </div>
  )
}

function Option({ text, sel, onClick, disabled }: { text: string; sel: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[48px] w-full items-center rounded-[18px] px-4 py-2.5 text-left text-[15px] ${sel ? 'btn-acc' : 'glass'}`}
    >
      {text}
    </button>
  )
}

/** Opción honesta: distinta a propósito (borde discontinuo, color apagado) para no confundirla con una respuesta. */
function UnknownOption({ sel, onClick, short }: { sel: boolean; onClick: () => void; short?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center gap-2.5 rounded-[18px] px-4 py-2 text-left text-[14.5px] transition-colors"
      style={{
        border: `1.5px dashed ${sel ? 'var(--acc2)' : 'var(--sub)'}`,
        background: sel ? 'var(--field)' : 'transparent',
        color: sel ? 'var(--acc2)' : 'var(--sub)',
      }}
    >
      <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-[13px] font-semibold" style={{ border: '1.5px solid currentColor' }}>
        ?
      </span>
      <span>
        No lo sé {!short && <span className="text-[12px] opacity-80">· mejor ser sincero que adivinar</span>}
      </span>
    </button>
  )
}

/** Respuesta escrita corta (1–3 palabras) con su "No lo sé". */
function ShortAnswer({ value, onChange, placeholder }: { value: Value; onChange: (v: Value) => void; placeholder?: string }) {
  const text = typeof value === 'string' ? value : ''
  return (
    <div className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
        placeholder={placeholder ?? 'Escribe tu respuesta'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="glass h-[50px] w-full rounded-[18px] px-4 text-[16px] outline-none"
        style={{ color: 'var(--tx)' }}
      />
      <UnknownOption short sel={value === -1} onClick={() => onChange(value === -1 ? null : -1)} />
    </div>
  )
}

/** Una pregunta de lectura o audición. */
function Question({ q, n, value, onChange }: { q: BankQuestion; n: number; value: Value; onChange: (v: Value) => void }) {
  return (
    <div className="mt-4">
      <div className="mb-2 font-medium">
        <span className="txt-acc2 mr-1.5">{n}.</span>
        {q.prompt}
      </div>
      {q.format === 'mc' ? (
        <div className="flex flex-col gap-2">
          {q.options.map((o, oi) => (
            <Option key={oi} text={o} sel={value === oi} onClick={() => onChange(oi)} />
          ))}
          <UnknownOption short sel={value === -1} onClick={() => onChange(-1)} />
        </div>
      ) : (
        <ShortAnswer value={value} onChange={onChange} placeholder="De 1 a 3 palabras" />
      )}
    </div>
  )
}

const answered = (v: Value) => v !== null

const correctText = (q: BankQuestion) => (q.format === 'mc' ? q.options[q.key] : q.accepted[0])
const givenText = (q: BankQuestion, v: Value) => (v === null || v === -1 ? 'No sé' : typeof v === 'number' && q.format === 'mc' ? q.options[v] : String(v))

/** Una voz del teléfono por hablante (por género, distintas entre sí si hay varias). */
async function voiceMap(speakers: Speaker[]): Promise<Record<string, number | null>> {
  const list = await englishVoices().catch(() => [])
  const used = new Set<number>()
  const out: Record<string, number | null> = {}
  for (const s of speakers) {
    const v = list.find((x) => x.gender === s.gender && !used.has(x.index)) ?? list.find((x) => x.gender === s.gender)
    if (v) used.add(v.index)
    out[s.id] = v ? v.index : null
  }
  return out
}

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onDone: () => void
  registerBack: (h: (() => void) | null) => void
}

export default function Calibration({ settings, update, onDone, registerBack }: Props) {
  const teacher = TEACHERS[settings.teacher]
  const mascot = THEME_INFO[settings.theme].mascot
  const mascotName = THEME_INFO[settings.theme].mascotName
  const [step, setStep] = useState<Step>({ k: 'loading' })
  const [profile, setProfile] = useState<Profile | null>(null)
  const usage = useRef<BankUsage>({ seen: [], uses: {} })
  const used = useRef<BankItem[]>([])
  const [hint, setHint] = useState<string | null>(null)
  // Ajustes vivos: al reintentar tras cambiar de modelo o de clave se usan los nuevos.
  const live = useRef(settings)
  useEffect(() => {
    live.current = settings
  }, [settings])

  // Gramática
  const [gItems, setGItems] = useState<GrammarItem[]>([])
  const [gAnswers, setGAnswers] = useState<GrammarAnswer[]>([])
  const [gValue, setGValue] = useState<Value>(null)
  const [gLevel, setGLevel] = useState<Level>('B1')

  // Lectura y audición
  const [blocks, setBlocks] = useState<Record<Kind, BlockResult[]>>({ reading: [], listening: [] })
  const [item, setItem] = useState<BlockItem | null>(null)
  const [itemLevel, setItemLevel] = useState<Level>('B1')
  const [cur, setCur] = useState<Value[]>([])
  const curRef = useRef<Value[]>([])
  // Audición
  const [phase, setPhase] = useState<'preview' | 'listen'>('preview')
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS)
  const [plays, setPlays] = useState(0) // reproducciones que puntúan (máx. 3)
  const [locked, setLocked] = useState<Value[] | null>(null) // respuestas al cerrar la nota
  const [confirm3, setConfirm3] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playToken = useRef(0)

  // Habla
  const [tasks, setTasks] = useState<SpeakingTask[]>([])
  const [speech, setSpeech] = useState<(SpeakingAnswer | null | 'skipped')[]>([null, null, null])
  const [micFailures, setMicFailures] = useState(0)
  const [recState, setRecState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)
  const preEval = useRef<Promise<TaskAssessment | null>[]>([])
  const preDone = useRef<(TaskAssessment | null | undefined)[]>([])

  const models = (): Models => mainModels(live.current)
  const onRetry = undefined as ((i: RetryInfo) => void) | undefined
  const retest = !!profile?.calibratedAt

  // El test es obligatorio: el botón atrás de Android no lo cierra.
  useEffect(() => {
    registerBack(() => {})
    return () => registerBack(null)
  }, [registerBack])

  useEffect(() => {
    Promise.all([getProfile(), loadDraft(), loadProgress()]).then(([p, d, prog]) => {
      setProfile(p)
      usage.current = p.bankUsage ?? { seen: [], uses: {} }
      // Un test terminado que no se pudo evaluar: se retoma en la evaluación, sin repetirlo.
      if (d) runEval(d)
      // Un test a medias (se cerró o se actualizó la app): sigue en el mismo paso.
      else if (prog && resumable(prog)) restore(prog)
      else setStep({ k: 'explain', i: 0 })
    })
    const rec = recorder.current
    return () => {
      rec.close()
      playToken.current++
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (recState !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [recState])

  // Vista previa de las preguntas antes de escuchar (30–40 s, como en IELTS).
  // Al llegar a 0 la vista previa termina sola (se deriva, sin efecto).
  const inPreview = step.k === 'block' && step.kind === 'listening' && phase === 'preview' && countdown > 0
  useEffect(() => {
    if (!inPreview) return
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [inPreview])

  const setAnswer = (qi: number, v: Value) => {
    const next = curRef.current.map((x, j) => (j === qi ? v : x))
    curRef.current = next
    setCur(next)
  }

  // ---- Test a medias: se guarda en cada punto seguro para poder retomarlo si la app se cierra.
  const resumable = (p: TestProgress) =>
    p.v === 1 && ['grammar', 'review', 'speaking', 'section'].includes(p.step.k) && (p.step.k !== 'section' || p.step.s === 'speaking')
  useEffect(() => {
    const k = step.k
    if (k !== 'grammar' && k !== 'review' && k !== 'speaking' && !(k === 'section' && step.s === 'speaking')) return
    saveProgress({
      v: 1,
      savedAt: Date.now(),
      step: step as TestProgress['step'],
      gItems,
      gAnswers,
      gLevel,
      blocks,
      tasks,
      speech,
      pre: tasks.map((_, j) => preDone.current[j] ?? null),
      usedIds: used.current.map((i) => i.id),
      usage: usage.current,
    }).catch(() => {})
  }, [step, gItems, gAnswers, gLevel, blocks, tasks, speech])

  const restore = (p: TestProgress) => {
    setGItems(p.gItems)
    setGAnswers(p.gAnswers)
    setGLevel(p.gLevel)
    setBlocks(p.blocks)
    setTasks(p.tasks)
    setSpeech(p.speech)
    if (p.usage) usage.current = p.usage
    // Preguntas ya vistas (para no repetirlas en el próximo test): las mismas que se habían apartado.
    const grammarUsed = p.step.k === 'grammar' ? p.gItems : p.gAnswers.map((a) => a.item)
    used.current = [...grammarUsed, ...p.blocks.reading.map((b) => b.item), ...p.blocks.listening.map((b) => b.item), ...p.tasks.map((t) => t.item)]
    // Evaluaciones de las respuestas de habla: las que ya estaban; las que faltan se piden otra vez.
    p.speech.forEach((ans, j) => {
      const prev = p.pre[j] ?? null
      preDone.current[j] = prev
      if (prev || !ans || ans === 'skipped' || !p.tasks[j]) preEval.current[j] = Promise.resolve(prev)
      else
        preEval.current[j] = assessSpeakingTask(live.current.geminiKey, models(), p.tasks[j], ans)
          .catch(() => null)
          .then((r) => (preDone.current[j] = r))
    })
    setHint('Seguimos donde lo dejaste.')
    setStep(p.step as Step)
  }

  const exclude = () => new Set(used.current.map((i) => i.id))

  // ---- 1. Gramática
  const startGrammar = () => {
    clearProgress()
    const items = buildGrammar(usage.current)
    used.current.push(...items)
    setGItems(items)
    setGAnswers([])
    setGValue(null)
    setStep({ k: 'section', s: 'grammar' })
  }

  const gCurrent = step.k === 'grammar' ? gItems[gAnswers.length] : undefined

  const answerGrammar = (value: number | string) => {
    if (!gCurrent) return
    const unknown = value === -1 || value === ''
    const next = [...gAnswers, { item: gCurrent, value, unknown, correct: !unknown && checkGrammar(gCurrent, value) }]
    setGAnswers(next)
    setGValue(null)
    if (grammarShouldStop(gItems, next)) {
      // Las preguntas que no llegaron a salir no cuentan como vistas.
      const asked = new Set(next.map((a) => a.item.id))
      used.current = used.current.filter((i) => i.skill !== 'grammar' || asked.has(i.id))
      setGLevel(grammarLevel(next))
      setStep({ k: 'review', kind: 'grammar', n: 0 })
    }
  }

  // ---- 2 y 3. Lectura y audición, por bloques
  const startBlock = (kind: Kind, n: number, level: Level, avoid: string[]) => {
    const it = pickBlock(kind, level, usage.current, exclude(), avoid)
    if (!it) {
      setStep({ k: 'prep', kind: 'test', title: 'Preparando el test', state: 'error', error: 'Falta contenido en el banco del test para este nivel.' })
      return
    }
    used.current.push(it)
    setItem(it)
    setItemLevel(level)
    const empty = it.questions.map(() => null)
    curRef.current = empty
    setCur(empty)
    setPhase('preview')
    setCountdown(PREVIEW_SECONDS)
    setPlays(0)
    setLocked(null)
    setConfirm3(false)
    setStep(n === 0 ? { k: 'section', s: kind } : { k: 'block', kind, n })
  }

  const finishReadingBlock = (n: number) => {
    if (!item) return
    const correct = item.questions.map((q, qi) => checkQuestion(q, cur[qi], false))
    const res: BlockResult = { item, level: itemLevel, answers: [...cur], correct }
    setBlocks((b) => ({ ...b, reading: [...b.reading, res] }))
    setStep({ k: 'review', kind: 'reading', n })
  }

  const playScript = async (it: ListeningItem) => {
    const token = ++playToken.current
    const voices = await voiceMap(it.speakers)
    for (const line of it.script) {
      if (playToken.current !== token) return false
      await speak(line.t, rateForLevel(it.level), voices[line.s] ?? settings.voiceIndex).catch(() => {})
    }
    return playToken.current === token
  }

  const stopPlay = () => {
    playToken.current++
    setPlaying(false)
    stopSpeaking()
  }

  const play = async () => {
    if (!item || item.skill !== 'listening' || playing) return
    const scored = !locked && plays < 3
    // Aviso antes de la 3.ª escucha: al terminar, la nota se cierra.
    if (scored && plays === 2 && !confirm3) {
      setConfirm3(true)
      return
    }
    setConfirm3(false)
    setPhase('listen')
    setPlaying(true)
    const n = plays + (scored ? 1 : 0)
    if (scored) setPlays(n)
    const ok = await playScript(item)
    setPlaying(false)
    if (scored && n === 3 && ok) setLocked([...curRef.current])
  }

  const finishListeningBlock = (n: number) => {
    if (!item) return
    stopPlay()
    const snap = locked ?? [...curRef.current]
    const correct = item.questions.map((q, qi) => checkQuestion(q, snap[qi], true))
    const late = item.questions.map((_, qi) => snap[qi] === null && curRef.current[qi] !== null)
    const res: BlockResult = { item, level: itemLevel, answers: snap, correct, plays: Math.max(1, plays), late }
    setBlocks((b) => ({ ...b, listening: [...b.listening, res] }))
    setStep({ k: 'review', kind: 'listening', n })
  }

  /** Tras el resumen de cada parte, lo siguiente según las reglas del test. */
  const afterReview = (kind: Kind | 'grammar', n: number) => {
    if (kind === 'grammar') return startBlock('reading', 0, readingStart(gLevel), [])
    const list = blocks[kind]
    if (n === 0) {
      const res = list[0]
      return startBlock(kind, 1, nextBlockLevel(res.level, blockScore(res)), [res.item.topic])
    }
    if (kind === 'reading') startBlock('listening', 0, listeningStart(gLevel, blocksLevel(list).level), [])
    else startSpeaking()
  }

  // ---- 4. Habla
  const sayTask = (task: SpeakingTask | undefined) => {
    if (task) speak(task.prompt, rateForLevel(gLevel), settings.voiceIndex).catch(() => {})
  }

  const startSpeaking = () => {
    const t1 = pickSpeaking(1, usage.current)
    const t2 = pickSpeaking(2, usage.current)
    const list = [t1, t2].filter((x) => !!x).map((x) => taskFromItem(x!))
    used.current.push(...list.map((x) => x.item))
    setTasks(list)
    setSpeech([null, null, null])
    setStep({ k: 'section', s: 'speaking' })
  }

  /** Tras la tarea 2: si las dos primeras quedaron en A2 o menos, la 3.ª es una opinión sencilla. */
  const decideTask3 = async () => {
    setStep({ k: 'deciding' })
    const wait = (p: Promise<TaskAssessment | null> | undefined) =>
      Promise.race([p ?? Promise.resolve(null), new Promise<null>((r) => setTimeout(() => r(null), 25_000))])
    const [a1, a2] = await Promise.all([wait(preEval.current[0]), wait(preEval.current[1])])
    const simple = simpleTask3(a1?.level ?? null, a2?.level ?? null, gLevel)
    const it = pickSpeaking(3, usage.current, simple)
    if (it) {
      used.current.push(it)
      const t3 = taskFromItem(it)
      setTasks((ts) => [...ts.slice(0, 2), t3])
      setStep({ k: 'speaking', i: 2 })
      setTimeout(() => sayTask(t3), 400)
    } else finish()
  }

  const toggleRecord = async (i: number) => {
    if (recState === 'processing') return
    if (recState === 'idle') {
      await stopSpeaking()
      try {
        await recorder.current.begin()
        recStart.current = performance.now()
        setElapsed(0)
        setHint(null)
        setRecState('recording')
      } catch (e) {
        setHint(e instanceof MicError ? e.message : 'No se pudo grabar.')
        setMicFailures((n) => n + 1)
      }
      return
    }
    setRecState('processing')
    try {
      const { blob, seconds } = await recorder.current.stop()
      const analysis = await analyzeSpeech(blob)
      if (seconds < 5 || blob.size === 0 || (analysis && !analysis.hasSpeech)) {
        setHint('Necesito oírte un poco más. Inténtalo otra vez y habla al menos 20 segundos.')
        if (blob.size === 0) setMicFailures((n) => n + 1)
        return
      }
      const answer: SpeakingAnswer = {
        base64: await blobToBase64(blob),
        mimeType: blob.type.split(';')[0] || 'audio/webm',
        wpm: null,
        pauses: analysis?.pauses.length ?? 0,
        seconds: analysis?.speechSeconds ?? seconds,
      }
      setSpeech((s) => s.map((x, j) => (j === i ? answer : x)))
      setHint(null)
      preDone.current[i] = undefined
      preEval.current[i] = assessSpeakingTask(settings.geminiKey, models(), tasks[i], answer)
        .catch(() => null)
        .then((r) => (preDone.current[i] = r))
    } catch {
      setHint('Algo falló al guardar la grabación. Vuelve a intentarlo.')
      setMicFailures((n) => n + 1)
      recorder.current.close()
    } finally {
      setRecState('idle')
    }
  }

  const skipTask = (i: number) => {
    setSpeech((s) => s.map((x, j) => (j === i ? 'skipped' : x)))
    setHint(null)
    setMicFailures(0)
  }

  const EVAL_TITLE = 'Evaluando tu habla y tu nivel'

  /** Fin del test: primero se guarda todo (respuestas y audios) y después se evalúa. */
  const finish = async () => {
    recorder.current.close()
    setStep({ k: 'prep', kind: 'eval', title: EVAL_TITLE, state: 'loading' })
    const draft: TestDraft = {
      v: 1,
      savedAt: Date.now(),
      gAnswers,
      gLevel,
      blocks,
      tasks,
      speech,
      pre: tasks.map((_, k) => preDone.current[k] ?? null),
      usedIds: used.current.map((i) => i.id),
    }
    await saveDraft(draft).catch(() => {})
    clearProgress()
    // Las evaluaciones de cada respuesta que aún estén en marcha.
    draft.pre = await Promise.all(tasks.map((_, k) => preEval.current[k] ?? Promise.resolve(null)))
    await saveDraft(draft).catch(() => {})
    return runEval(draft)
  }

  const runEval = async (d: TestDraft) => {
    setStep({ k: 'prep', kind: 'eval', title: EVAL_TITLE, state: 'loading' })
    try {
      const next = await evaluate(d)
      await clearDraft()
      setStep({ k: 'prep', kind: 'eval', title: EVAL_TITLE, state: 'done' })
      await new Promise((r) => setTimeout(r, 1300))
      setStep(next)
    } catch (e) {
      setStep({ k: 'evalFail', error: friendlyError(e) })
    }
  }
  const retryEval = async () => {
    const d = await loadDraft()
    if (d) runEval(d)
  }

  const evaluate = async (d: TestDraft): Promise<Step> => {
    const { gAnswers, gLevel, blocks, tasks, speech } = d
    const failed = gAnswers.filter((a) => !a.correct && !a.unknown).map((a) => a.item.point)
    const unknown = gAnswers.filter((a) => a.unknown).map((a) => a.item.point)
    for (const kind of ['reading', 'listening'] as const)
      blocks[kind].forEach((b) =>
        b.item.questions.forEach((q, qi) => {
          if (b.answers[qi] === -1 || b.answers[qi] === null) unknown.push(`${kind} comprehension at ${b.level} (${q.type}): "${q.prompt}"`)
        }),
      )
    const pairs = tasks
      .map((task, k) => ({ task, ans: speech[k], k }))
      .filter((p): p is { task: SpeakingTask; ans: SpeakingAnswer; k: number } => !!p.ans && p.ans !== 'skipped')
    const pre = pairs.map((p) => d.pre[p.k] ?? null)
    const ev: SpeakingEval = pairs.length
      ? await evaluateSpeaking(live.current.geminiKey, models(), pairs.map((p) => p.task), pairs.map((p) => p.ans), failed, unknown, onRetry, pre)
      : {
          // Sin ninguna grabación: el habla se estima un nivel por debajo de la gramática y se medirá en el próximo test.
          level: levelAt(levelIdx(gLevel) - 1),
          criteria: undefined as unknown as SpeakingEval['criteria'],
          reasonsEs: {},
          strengthsEs: [],
          weaknessesEs: ['No se pudo evaluar el habla en este test: se medirá en el próximo re-test.'],
          weaknessesEn: [],
          summaryEs: 'No pudimos grabar tu voz, así que tu nivel de habla es una estimación.',
        }
    const reading = blocksLevel(blocks.reading)
    const listen = blocksLevel(blocks.listening)
    const testLevels = buildLevels(gLevel, reading.level, listen.level, ev.level)
    const p = await getProfile()
    const fin = finalLevels(testLevels, p)
    const crit = ev.criteria ? Object.values(ev.criteria).map(levelIdx) : []
    const confidence: Record<Skill, Confidence> = {
      grammar: grammarConfidence(gAnswers, gLevel),
      reading: reading.confidence,
      listening: listeningConfidence(blocks.listening, listen),
      // Habla: alta con las 3 tareas evaluadas y criterios coherentes (a un nivel de distancia); baja si faltó alguna.
      speaking: pairs.length < 3 ? 'low' : pre.every(Boolean) && Math.max(...crit) - Math.min(...crit) <= 1 ? 'high' : 'medium',
    }
    const summary = buildSummary(gAnswers, blocks, { level: ev.level, criteria: ev.criteria, reasons: ev.reasonsEs as Record<string, string> })
    const r: CalibrationResult = { ...fin, testLevels, confidence, speaking: ev, grammar: gAnswers, reading: blocks.reading, listening: blocks.listening, summary }
    const usedItems = d.usedIds.map((id) => BANK.find((i) => i.id === id)).filter((i): i is BankItem => !!i)
    await saveCalibration(r, usedItems, live.current.geminiModel)
    update({ ttsRate: rateForLevel(r.levels.overall) })
    return { k: 'result', r }
  }

  // ---- UI
  const pad = 'relative z-[2] flex h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+20px)]'

  if (step.k === 'loading' || !profile) return null

  // Explicaciones de la mascota antes de empezar (primer test: cómo se evalúa; re-test: la ponderación).
  if (step.k === 'explain') {
    const pages = needsRecalibration(profile)
      ? [recalPage(profile, mascotName), ...firstPages(teacher.name, mascotName).slice(1)]
      : retest
        ? retestPages(profile, mascotName)
        : firstPages(teacher.name, mascotName)
    const page = pages[step.i]
    const last = step.i === pages.length - 1
    return (
      <MascotPage
        element={mascot}
        mood={step.i === 0 ? 'happy' : 'speaking'}
        step={{ i: step.i, n: pages.length }}
        title={page.title}
        subtitle={page.subtitle}
        onBack={step.i > 0 ? () => setStep({ k: 'explain', i: step.i - 1 }) : undefined}
        primary={{ label: last ? 'Empezar el test' : 'Siguiente', onClick: () => (last ? startGrammar() : setStep({ k: 'explain', i: step.i + 1 })) }}
      >
        {page.body}
      </MascotPage>
    )
  }

  if (step.k === 'section') {
    const info = SECTION_INFO[step.s]
    const start = () => {
      if (step.s === 'grammar') setStep({ k: 'grammar' })
      else if (step.s === 'speaking') {
        setStep({ k: 'speaking', i: 0 })
        setTimeout(() => sayTask(tasks[0]), 400)
      } else setStep({ k: 'block', kind: step.s, n: 0 })
    }
    return (
      <MascotPage
        element={mascot}
        mood="speaking"
        step={{ i: SECTION_IDX[step.s], n: 4 }}
        title={`Parte ${SECTION_IDX[step.s] + 1}: ${info.title}`}
        primary={{ label: 'Entendido, empezar', onClick: start }}
      >
        <ul className="flex flex-col gap-2.5">
          {info.points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[15px] leading-snug">
              <span className="txt-acc mt-0.5 flex-none">
                <Icon name="check" size={17} stroke={2.2} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        {info.tip && (
          <div className="glass mt-4 flex items-start gap-3 rounded-[20px] px-4 py-3">
            <span className="txt-acc2 mt-0.5 flex-none">
              <Icon name={info.icon} size={20} />
            </span>
            <span className="text-[14px] leading-snug">{info.tip}</span>
          </div>
        )}
      </MascotPage>
    )
  }

  if (step.k === 'evalFail') {
    return (
      <EvalFail
        error={step.error}
        mascot={mascot}
        settings={settings}
        update={update}
        onRetry={retryEval}
      />
    )
  }

  if (step.k === 'prep') {
    return <PrepareScreen kind={step.kind} state={step.state} mascot={mascot} teacherName={teacher.name} title={step.title} errorText={step.error} onRetry={step.retry} />
  }

  if (step.k === 'deciding') {
    return <MascotPage element={mascot} mood="thinking" title="Un momento…" subtitle="Estoy escuchando tus dos primeras respuestas para elegir la última pregunta." />
  }

  if (step.k === 'grammar' && gCurrent) {
    const it = gCurrent
    return (
      <div className={pad}>
        <Header section={0} />
        <div key={gAnswers.length} className="anim-in no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="txt-sub text-sm">
            Pregunta {gAnswers.length + 1} de {gItems.length} · {it.format === 'mc' ? 'elige la correcta' : 'escribe la forma correcta'}
          </div>
          <div className="glass mt-3 rounded-[24px] p-5 text-[19px] leading-snug font-medium">
            {it.prompt}
            {it.format === 'short' && (
              <span className="txt-acc2 ml-2 text-[16px] whitespace-nowrap">({it.hint})</span>
            )}
          </div>
          {it.format === 'mc' ? (
            <div className="mt-4 flex flex-col gap-2">
              {it.options.map((o, i) => (
                <Option key={i} text={o} sel={gValue === i} onClick={() => answerGrammar(i)} />
              ))}
              <UnknownOption sel={false} onClick={() => answerGrammar(-1)} />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <ShortAnswer value={gValue} onChange={setGValue} placeholder="De 1 a 4 palabras" />
              <button
                onClick={() => answerGrammar(gValue === -1 || gValue === null ? -1 : String(gValue))}
                disabled={gValue === null}
                className="btn-acc h-[54px] rounded-full text-[16px] disabled:opacity-45"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step.k === 'block' && item) {
    const { kind, n } = step
    const allDone = cur.every(answered)
    if (kind === 'reading' && item.skill === 'reading') {
      return (
        <div className={pad}>
          <Header section={1} />
          <div key={`r${n}`} className="anim-in no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
            <div className="txt-sub text-sm">Texto {n + 1} de 2 · {item.questions.length} preguntas</div>
            <div className="glass mt-3 rounded-[24px] p-4">
              <div className="mb-2 text-[17px] font-semibold">{item.title}</div>
              <div className="text-[15.5px] leading-relaxed whitespace-pre-line">{item.text}</div>
            </div>
            {item.questions.map((q, qi) => (
              <Question key={qi} q={q} n={qi + 1} value={cur[qi]} onChange={(v) => setAnswer(qi, v)} />
            ))}
            <button onClick={() => finishReadingBlock(n)} disabled={!allDone} className="btn-acc mt-5 mb-1 h-[54px] flex-none rounded-full text-[16px] disabled:opacity-45">
              {allDone ? 'Siguiente' : `Responde las ${item.questions.length} preguntas`}
            </button>
          </div>
        </div>
      )
    }
    if (item.skill === 'listening') {
      const scoredLeft = 3 - plays
      return (
        <div className={pad}>
          <Header section={2} />
          <div key={`l${n}`} className="anim-in no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
            <div className="txt-sub text-sm">
              Audio {n + 1} de 2 · {item.speakers.length > 1 ? `${item.speakers.length} voces` : 'una voz'} · dura unos {fmtDuration(audioSeconds(item))}
            </div>
            <div className="glass mt-3 rounded-[24px] p-4">
              {inPreview ? (
                <div className="flex items-center gap-4">
                  <div className="btn-acc grid h-16 w-16 flex-none place-items-center rounded-full text-[22px] font-semibold tabular-nums">{countdown}</div>
                  <div className="flex-1 text-[14.5px] leading-snug">
                    Lee las preguntas antes de escuchar. El audio se activa en {countdown} s.
                    <button onClick={() => setPhase('listen')} className="txt-acc2 mt-1 block text-[13.5px] underline underline-offset-2">
                      Ya las leí, escuchar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={play}
                    disabled={playing}
                    className="btn-acc grid h-16 w-16 flex-none place-items-center rounded-full disabled:opacity-50"
                    aria-label="Escuchar"
                  >
                    <Icon name="speakerWave" size={26} />
                  </button>
                  <div className="flex-1">
                    <Wave n={14} on={playing} />
                    <div className="txt-sub mt-1 text-[13px]">
                      {locked
                        ? 'Nota cerrada · puedes seguir escuchando para practicar'
                        : playing
                          ? `Escucha ${plays} de 3`
                          : plays === 0
                            ? 'Toca para escuchar (3 escuchas con nota)'
                            : `Te ${scoredLeft === 1 ? 'queda 1 escucha' : `quedan ${scoredLeft} escuchas`} con nota`}
                    </div>
                  </div>
                </div>
              )}
              {confirm3 && (
                <div className="mt-3 rounded-[18px] p-3 text-[14px] leading-snug" style={{ background: 'var(--field)' }}>
                  <b>Última escucha con nota.</b> Al terminar, las preguntas sin responder contarán como «No sé». Después podrás seguir escuchando, pero ya no puntuará.
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={play} className="btn-acc h-10 flex-1 rounded-full text-[14px]">
                      Escuchar
                    </button>
                    <button onClick={() => setConfirm3(false)} className="glass h-10 flex-1 rounded-full text-[14px]">
                      Aún no
                    </button>
                  </div>
                </div>
              )}
              {locked && (
                <div className="txt-sub mt-3 text-[12.5px] leading-snug">
                  Regla de evaluación: lo que respondas a partir de ahora es práctica y no cuenta para tu nota.
                </div>
              )}
            </div>
            {item.questions.map((q, qi) => (
              <Question key={qi} q={q} n={qi + 1} value={cur[qi]} onChange={(v) => setAnswer(qi, v)} />
            ))}
            <button
              onClick={() => finishListeningBlock(n)}
              disabled={plays === 0 || playing}
              className="btn-acc mt-5 mb-1 h-[54px] flex-none rounded-full text-[16px] disabled:opacity-45"
            >
              {plays === 0 ? 'Escucha el audio primero' : 'Terminar y ver respuestas'}
            </button>
          </div>
        </div>
      )
    }
  }

  // Resumen al final de cada test (gramática, cada texto y cada audio): pregunta, tu respuesta y la correcta (NC-01).
  if (step.k === 'review') {
    const { kind, n } = step
    const rows: ReviewRow[] =
      kind === 'grammar'
        ? gAnswers.map((g) => ({
            prompt: g.item.format === 'short' ? `${g.item.prompt} (${g.item.hint})` : g.item.prompt,
            given: g.unknown ? 'No sé' : g.item.format === 'mc' ? g.item.options[g.value as number] : String(g.value),
            correct: g.item.format === 'mc' ? g.item.options[g.item.key] : g.item.accepted[0],
            ok: g.correct,
          }))
        : (() => {
            const b = blocks[kind][n]
            if (!b) return []
            return b.item.questions.map((q, qi) => ({
              prompt: q.prompt,
              given: givenText(q, b.answers[qi]),
              correct: correctText(q),
              ok: b.correct[qi],
              late: b.late?.[qi],
            }))
          })()
    const okCount = rows.filter((r) => r.ok).length
    const b = kind === 'grammar' ? null : blocks[kind][n]
    const what = kind === 'grammar' ? 'la gramática' : kind === 'reading' ? `el texto ${n + 1}` : `el audio ${n + 1}`
    const next =
      kind === 'grammar'
        ? 'Pasar a la lectura'
        : n === 0
          ? kind === 'reading'
            ? 'Siguiente texto'
            : 'Siguiente audio'
          : kind === 'reading'
            ? 'Pasar a la audición'
            : 'Pasar a la parte de habla'
    return (
      <div className={pad}>
        <Header section={SECTION_IDX[kind]} />
        <div key={`${kind}${n}`} className="anim-in no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center gap-3">
            <Mascot element={mascot} size={64} mood={okCount / Math.max(1, rows.length) >= 0.6 ? 'happy' : 'idle'} />
            <div className="min-w-0">
              <div className="text-[20px] font-semibold">
                {okCount} de {rows.length} correctas
              </div>
              <div className="txt-sub text-[13.5px] leading-snug">Así fue {what}. Mira las respuestas antes de seguir.</div>
            </div>
          </div>
          {b?.item.skill === 'listening' && <Transcript item={b.item} />}
          <div className="mt-3 flex flex-col gap-2">
            {rows.map((r, i) => (
              <ReviewCard key={i} n={i + 1} row={r} />
            ))}
          </div>
          <button onClick={() => afterReview(kind, n)} className="btn-acc mt-4 mb-1 h-[54px] flex-none rounded-full text-[16px]">
            {next}
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'speaking') {
    const i = step.i
    const task = tasks[i]
    if (!task) return null
    const done = !!speech[i]
    const recording = recState === 'recording'
    return (
      <div className={pad}>
        <Header section={3} />
        <div key={i} className="anim-in no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="txt-sub text-sm">
            Tarea {i + 1} de 3 · {task.title} · unos {task.seconds} s
          </div>
          <div className="glass mt-3 rounded-[24px] p-4">
            <div className="flex items-start gap-3">
              <Mascot element={mascot} size={52} mood={recording ? 'listening' : recState === 'processing' ? 'thinking' : 'idle'} />
              <div className="flex-1 text-[16.5px] leading-snug">
                {task.item.task === 1 ? (
                  <ol className="list-decimal space-y-1 pl-5">
                    {task.prompts.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>
                ) : (
                  task.prompts[0]
                )}
                {task.cues && (
                  <ul className="txt-sub mt-2 list-disc space-y-0.5 pl-5 text-[14px]">
                    {task.cues.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => sayTask(task)} className="txt-sub mt-2 flex items-center gap-1.5 text-[13px]">
              <Icon name="speaker" size={14} /> Escuchar otra vez
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
            <div className="flex items-center gap-5">
              <Wave on={recording} />
              <button
                onClick={() => toggleRecord(i)}
                className="grid h-[92px] w-[92px] place-items-center rounded-full"
                style={{
                  border: '1px solid rgba(255,255,255,.35)',
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
                  color: 'var(--ink)',
                  boxShadow: recording ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
                  transform: recording ? 'scale(1.06)' : 'none',
                  transition: 'all .25s ease',
                }}
                aria-label={recording ? 'Parar' : 'Grabar'}
              >
                {recording ? <span className="h-7 w-7 rounded-md" style={{ background: 'var(--ink)' }} /> : <Icon name="mic" size={34} stroke={1.8} />}
              </button>
              <Wave on={recording} />
            </div>
            <div className="txt-sub text-center text-sm tabular-nums">
              {recording
                ? `${Math.floor(elapsed)} s · toca para terminar`
                : recState === 'processing'
                  ? 'Procesando…'
                  : speech[i] === 'skipped'
                    ? 'Pregunta saltada · puedes intentar grabarla otra vez'
                    : done
                      ? 'Grabado ✓ · toca para repetir la grabación'
                      : task.item.task === 1
                        ? 'Toca y contesta las dos preguntas seguidas'
                        : 'Toca para empezar a hablar'}
            </div>
            {hint && <div className="txt-sub text-center text-[13px]">{hint}</div>}
            {micFailures > 0 && !done && recState === 'idle' && (
              <button onClick={() => skipTask(i)} className="txt-sub h-10 rounded-[20px] px-4 text-[13.5px]" style={{ border: '1.5px dashed var(--sub)' }}>
                ¿Sigue sin funcionar? Saltar esta pregunta
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setMicFailures(0)
              if (i === 0) {
                setStep({ k: 'speaking', i: 1 })
                setTimeout(() => sayTask(tasks[1]), 400)
              } else if (i === 1) decideTask3()
              else finish()
            }}
            disabled={!done || recState !== 'idle'}
            className="btn-acc h-[54px] flex-none rounded-full text-[16px] disabled:opacity-45"
          >
            {i < 2 ? 'Siguiente' : 'Ver mi nivel'}
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'result') return <Result r={step.r} mascot={mascot} mascotName={mascotName} teacherName={teacher.name} onDone={onDone} />

  return null
}

interface ReviewRow {
  prompt: string
  given: string
  correct: string
  ok: boolean
  late?: boolean
}

/** Una fila del resumen: pregunta, tu respuesta y, si fallaste, la correcta (mismo formato en todos los tests). */
function ReviewCard({ n, row }: { n: number; row: ReviewRow }) {
  return (
    <div className="glass rounded-[18px] px-4 py-3 text-[14px] leading-snug">
      <div className="font-medium">
        {n}. {row.prompt}
      </div>
      <div className="mt-1 flex items-start gap-2">
        <span className={`flex-none ${row.ok ? 'txt-acc' : 'txt-sub'}`}>
          {row.ok ? <Icon name="check" size={16} stroke={2.2} /> : <span className="text-[14px] font-semibold">✕</span>}
        </span>
        <span className="min-w-0 break-words">
          {row.late ? (
            <>
              <b>No sé</b> · la respondiste después de cerrar la nota
            </>
          ) : (
            <>Tu respuesta: {row.given}</>
          )}
          {!row.ok && (
            <>
              <br />
              Correcta: <b>{row.correct}</b>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/** Transcripción del audio: una línea por interlocutor, con su nombre (NC-06). Se abre al tocarla. */
function Transcript({ item }: { item: ListeningItem }) {
  const [open, setOpen] = useState(false)
  const name = (id: string) => item.speakers.find((x) => x.id === id)?.name ?? id
  return (
    <div className="glass mt-3 rounded-[18px] px-4 py-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left text-[14.5px] font-semibold">
        Ver lo que se dijo
        <Icon name="chevD" size={15} stroke={2} />
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-2">
          {item.script.map((l, i) => (
            <li key={i} className="text-[14px] leading-snug">
              {item.speakers.length > 1 && <b className="txt-acc2 mr-1.5">{name(l.s)}:</b>}
              {l.t}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Duración estimada del audio a la velocidad con que lo lee el teléfono (~150 palabras/min a velocidad 1). */
function audioSeconds(item: ListeningItem) {
  return scriptSeconds(item) / rateForLevel(item.level)
}

function fmtDuration(sec: number) {
  const s = Math.round(sec / 5) * 5
  const m = Math.floor(s / 60)
  return m ? `${m} min${s % 60 ? ` ${s % 60} s` : ''}` : `${s} s`
}

/** La evaluación falló: el test está guardado; reintentar con otro modelo o con otra clave. */
function EvalFail({ error, mascot, settings, update, onRetry }: { error: string; mascot: MascotElement; settings: Settings; update: (p: Partial<Settings>) => void; onRetry: () => void }) {
  return (
    <MascotPage
      element={mascot}
      mood="thinking"
      title="No pude evaluar tu test"
      subtitle={`${error} Tus respuestas y tus audios están guardados: no se pierden aunque cierres la app.`}
      primary={{ label: 'Reintentar', onClick: onRetry }}
    >
      <GeminiFix settings={settings} update={update} />
    </MascotPage>
  )
}

/** Confianza en gramática: alta si el nivel final se aprobó con holgura (≥ 75 %); baja si no aprobó ni A1. */
function grammarConfidence(answers: GrammarAnswer[], level: Level): Confidence {
  const at = answers.filter((a) => a.item.level === level)
  const ok = at.filter((a) => a.correct).length
  if (!at.length || ok / at.length < 0.6) return 'low'
  return ok / at.length >= 0.75 ? 'high' : 'medium'
}

// ---------------------------------------------------------------------------
// Pantallas explicativas de la mascota.

interface Page {
  title: string
  subtitle?: string
  body: ReactNode
}

function Card({ children }: { children: ReactNode }) {
  return <div className="glass rounded-[20px] px-4 py-3 text-[14.5px] leading-snug">{children}</div>
}

/** Primer test hecho antes del banco calibrado: se repite y sustituye por completo (sin 70/30). */
function recalPage(p: Profile, mascotName: string): Page {
  const last = p.calibratedAt ? new Date(p.calibratedAt).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : ''
  return {
    title: 'Repitamos tu test',
    subtitle: `Soy ${mascotName}. Tu test del ${last} se hizo antes de calibrar las preguntas, y no era justo contigo.`,
    body: (
      <div className="flex flex-col gap-2">
        <Card>
          Este test nuevo usa un banco de preguntas revisado, de A1 a C2. <b>Lo sustituye por completo</b>: tu nivel será lo que saques hoy, sin
          mezclarlo con el anterior.
        </Card>
        <SkillProgressCard levels={p.levels} title={`Tu nivel del test anterior: ${p.levels.overall}`} />
        <Card>Son 4 partes y unos 25–30 minutos. A partir de este test, el re-test será cada 4 semanas.</Card>
      </div>
    ),
  }
}

function firstPages(teacherName: string, mascotName: string): Page[] {
  return [
    {
      title: 'Vamos a conocer tu inglés',
      subtitle: `Soy ${mascotName}. Te acompaño en el test para que ${teacherName} sepa desde dónde empezar. Son unos 25–30 minutos.`,
      body: (
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Gramática', '20 preguntas, de A1 a C2'],
            ['Lectura', '2 textos × 6 preguntas'],
            ['Audición', '2 audios × 6 preguntas'],
            ['Habla', '3 respuestas por voz'],
          ].map(([a, b]) => (
            <div key={a} className="glass rounded-[20px] px-3.5 py-3">
              <div className="font-semibold">{a}</div>
              <div className="txt-sub text-[12.5px]">{b}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Así calculo tu nivel',
      subtitle: 'Te lo cuento antes, para que no haya sorpresas.',
      body: (
        <div className="flex flex-col gap-2">
          <Card>
            <b>Gramática</b> marca el punto de partida: un nivel cuenta como aprobado con el 60 % de sus preguntas.
          </Card>
          <Card>
            <b>Lectura y audición</b> se adaptan a ti: si aciertas 6 de 6, el segundo bloque sube dos niveles; con 4–5 sube uno; con 3 se queda; con menos, baja. Tu nivel es el más alto con al menos 4 de 6.
          </Card>
          <Card>
            <b>Habla</b>: puntúo 4 criterios (fluidez, vocabulario, gramática y pronunciación) y me quedo con la mediana.
          </Card>
          <Card>
            <b>Nivel general</b>: la media de tus 4 destrezas.
            <div className="my-2.5 rounded-[16px] px-1 py-2.5" style={{ background: 'var(--field)' }}>
              <Fraction left="Nivel =" num="Gram. + Lect. + Aud. + Habla" den="4" />
            </div>
            <ul className="txt-sub flex list-disc flex-col gap-0.5 pl-5 text-[13.5px]">
              <li>A1 = 1, A2 = 2 … C2 = 6. Las cuatro pesan lo mismo.</li>
              <li>Un ,5 exacto se redondea hacia abajo.</li>
              <li>Nunca supera en más de 2 a tu destreza más baja.</li>
            </ul>
          </Card>
        </div>
      ),
    },
    {
      title: 'Mejor sincero que perfecto',
      subtitle: 'Este test es una colocación, no un examen oficial.',
      body: (
        <div className="flex flex-col gap-2">
          <Card>
            Si no sabes una respuesta, marca <b>«No lo sé»</b>. No resta, y así {teacherName} sabrá exactamente qué enseñarte.
          </Card>
          <Card>Junto a cada destreza verás la confianza del resultado (alta, media o baja), según cuánta evidencia hubo.</Card>
          <Card>
            Tu nivel no se cambia a mano. Las clases irán proponiendo tu progreso y, cada 4 semanas, un re-test lo ajusta: 70 % el test y 30 % lo que demostraste en clase.
          </Card>
        </div>
      ),
    },
  ]
}

function retestPages(p: Profile, mascotName: string): Page[] {
  const traj = trajectoryOf(p)
  const last = p.calibratedAt ? new Date(p.calibratedAt).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : ''
  const sessions = p.trajectory?.sessions ?? 0
  const ex = { test: levelAt(levelIdx(traj.speaking) + 1), traj: traj.speaking }
  const exW = weightedLevel(ex.test, ex.traj)
  return [
    {
      title: '¡Toca tu re-test!',
      subtitle: `Han pasado 4 semanas desde tu último test (${last}). Soy ${mascotName} y vamos a ver cuánto has avanzado.`,
      body: (
        <div className="flex flex-col gap-2">
          <Card>Las mismas 4 partes que la otra vez, con textos y audios nuevos: no repetirás ninguno que ya hayas visto.</Card>
          <SkillProgressCard levels={p.levels} title={`Tu nivel actual: ${p.levels.overall}`} />
        </div>
      ),
    },
    {
      title: 'Lo que proponen tus clases',
      subtitle: 'Las clases no cambian tu nivel: proponen una trayectoria.',
      body: (
        <div className="flex flex-col gap-2">
          {(['grammar', 'reading', 'listening', 'speaking'] as const).map((k) => {
            const now = levelAt(levelIdx(p.levels[k]))
            const prop = traj[k]
            return (
              <div key={k} className="glass flex items-center gap-3 rounded-[18px] px-4 py-2.5">
                <span className="w-[86px] text-[14.5px] font-medium">{SKILL_ES[k]}</span>
                <span className="txt-sub flex-1 text-[12.5px] leading-snug">
                  {k === 'speaking'
                    ? sessions
                      ? `según tus últimas ${sessions} clases habladas`
                      : 'aún sin clases suficientes: se mantiene'
                    : 'las clases no la miden por separado: se mantiene'}
                </span>
                <span className="txt-acc2 text-[15px] font-semibold whitespace-nowrap">{prop === now ? now : `${now} → ${prop}`}</span>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      title: 'Cómo decido tu nuevo nivel',
      subtitle: 'Solo el re-test ajusta tu nivel, y lo hace con esta fórmula:',
      body: (
        <div className="flex flex-col gap-2">
          <Card>
            <div className="text-center text-[16px] font-semibold">
              nivel = {Math.round(TEST_WEIGHT * 100)} % test + {Math.round((1 - TEST_WEIGHT) * 100)} % clases
            </div>
            <div className="txt-sub mt-1 text-center text-[12.5px]">por cada destreza, con A1 = 1 … C2 = 6 · un ,5 se redondea hacia abajo</div>
          </Card>
          <Card>
            Ejemplo: si en el test sacas <b>{ex.test}</b> en habla y tus clases proponen <b>{ex.traj}</b>: 0,7 × {levelIdx(ex.test) + 1} + 0,3 × {levelIdx(ex.traj) + 1} ={' '}
            {exW.value.toFixed(1).replace('.', ',')} → <b>{exW.level}</b>.
          </Card>
          <Card>Así un mal día no te hunde, y un buen día tampoco te sube de golpe. Después, el nivel general se calcula como siempre.</Card>
        </div>
      ),
    },
  ]
}

// ---------------------------------------------------------------------------
// Resultado: la mascota explica el nivel y la fórmula con tus números.

function Result({ r, mascot, mascotName, teacherName, onDone }: { r: CalibrationResult; mascot: MascotElement; mascotName: string; teacherName: string; onDone: () => void }) {
  const b = overallBreakdown(r.levels)
  const skills = ['grammar', 'reading', 'listening', 'speaking'] as const
  const fmt = (n: number) => n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
  const delta = r.prev ? levelIdx(r.levels.overall) - levelIdx(r.prev.overall) : 0
  const lowConf = skills.filter((k) => r.confidence[k] === 'low')
  return (
    <div className="relative z-[2] flex h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <div className="anim-up no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="glass flex flex-col items-center gap-1 rounded-[28px] p-5 text-center">
          <Mascot element={mascot} size={96} mood="happy" />
          <div className="txt-sub mt-1 text-sm">{r.prev && !r.trajectory ? `${mascotName}: tu nivel recalibrado` : r.prev ? `${mascotName}: tu nivel tras el re-test` : `${mascotName}: ¡ya te conozco! Tu nivel es`}</div>
          <div className="text-[56px] leading-none font-semibold tracking-[-2px]" style={{ color: 'var(--acc)' }}>
            {r.levels.overall}
          </div>
          {r.prev && (
            <div className="text-sm font-semibold">
              {delta > 0 ? `¡Has subido desde ${r.prev.overall}!` : delta < 0 ? `Antes: ${r.prev.overall}. Tu plan se adapta para recuperarlo.` : `Mantienes tu ${r.prev.overall}. El próximo salto está cerca.`}
            </div>
          )}
        </div>

        <div className="glass rounded-[24px] p-4 text-[14px] leading-snug">
          <div className="mb-3 font-semibold">Cómo lo calculé</div>
          <div className="rounded-[18px] px-2 py-3" style={{ background: 'var(--field)', color: 'var(--tx)' }}>
            <Fraction
              left="Nivel ="
              num={skills.map((k) => b.values[k]).join(' + ')}
              den="4"
              right={
                <>
                  = {fmt(b.mean)} <span style={{ color: 'var(--acc)' }}>→ {b.final}</span>
                </>
              }
            />
          </div>
          <ul className="txt-sub mt-3 flex list-disc flex-col gap-1 pl-5">
            <li>
              Arriba, tus 4 destrezas con A1 = 1 … C2 = 6: {skills.map((k) => `${SKILL_ES[k].toLowerCase()} ${r.levels[k]} = ${b.values[k]}`).join(', ')}.
            </li>
            <li>Abajo, cuántas son: 4. Todas pesan lo mismo.</li>
            <li>{b.mean % 1 === 0.5 ? `Un ,5 exacto se redondea hacia abajo: ${levelAt(b.rounded - 1)}.` : `Redondeado al más cercano: ${levelAt(b.rounded - 1)}.`}</li>
            <li>
              {b.capped
                ? `Tope: tu destreza más baja es ${levelAt(b.cap - 3)} y el nivel general no puede superarla en más de 2, así que se queda en ${b.final}.`
                : `Tope por destreza débil: ${levelAt(b.cap - 1)} (tu más baja + 2). No hace falta aplicarlo.`}
            </li>
          </ul>
        </div>

        {r.prev && r.trajectory && (
          <div className="glass rounded-[24px] p-4 text-[14px]">
            <div className="mb-1 font-semibold">Test 70 % + clases 30 %</div>
            {skills.map((k) => (
              <div key={k} className="flex items-center gap-2 py-1">
                <span className="w-[78px]">{SKILL_ES[k]}</span>
                <span className="txt-sub flex-1 text-[12.5px]">
                  test {r.testLevels[k]} · clases {r.trajectory![k]}
                </span>
                <span className="txt-acc2 font-semibold">{r.levels[k]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="glass rounded-[24px] p-4">
          <SkillProgressCard
            bare
            levels={r.levels}
            extra={Object.fromEntries(
              skills.map((k) => {
                const before = r.prev?.[k]
                return [
                  k,
                  <>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10.5px]"
                      style={{ border: '1px solid var(--gb)', color: r.confidence[k] === 'low' ? 'var(--acc2)' : 'var(--sub)' }}
                      title="Confianza"
                    >
                      {CONF_ES[r.confidence[k]]}
                    </span>
                    {before && before !== r.levels[k] && (
                      <span className="txt-sub text-[11px]">
                        {before}
                        {levelIdx(r.levels[k]) > levelIdx(before) ? '↗' : '↘'}
                      </span>
                    )}
                  </>,
                ]
              }),
            )}
          />
          <div className="txt-sub mt-2 text-[12px] leading-snug">
            Confianza: alta con dos bloques aprobados en niveles contiguos, media con uno, baja si hubo poca evidencia.
            {lowConf.length > 0 && ` En ${lowConf.map((k) => SKILL_ES[k].toLowerCase()).join(' y ')} la evidencia fue poca: el próximo re-test lo confirmará.`}
          </div>
        </div>

        {r.speaking.criteria && (
          <div className="glass rounded-[24px] p-4 text-[14px]">
            <div className="mb-1 font-semibold">Tu habla: mediana de 4 criterios</div>
            {SPEAK_CRITERIA.map((c) => (
              <div key={c} className="py-1">
                <div className="flex items-center justify-between">
                  <span>{CRITERION_ES[c]}</span>
                  <span className="txt-acc2 font-semibold">{r.speaking.criteria[c]}</span>
                </div>
                {r.speaking.reasonsEs[c] && <div className="txt-sub text-[12.5px] leading-snug">{r.speaking.reasonsEs[c]}</div>}
              </div>
            ))}
            <div className="txt-sub mt-1 text-[12.5px] leading-snug">{r.speaking.summaryEs}</div>
          </div>
        )}

        {r.speaking.strengthsEs.length > 0 && (
          <div className="glass rounded-[24px] p-4 text-[15px]">
            <div className="mb-1.5 font-semibold">Lo que haces bien</div>
            <ul className="list-disc space-y-1 pl-5">
              {r.speaking.strengthsEs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="glass rounded-[24px] p-4 text-[15px]">
          <div className="mb-1.5 font-semibold">En qué te ayudará {teacherName}</div>
          <ul className="list-disc space-y-1 pl-5">
            {r.speaking.weaknessesEs.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="txt-sub px-2 text-center text-[12.5px] leading-snug">
          {r.prev
            ? 'Tu plan de 12 semanas se adapta ahora a este resultado.'
            : 'A partir de ahora tus clases irán proponiendo tu progreso; el re-test de dentro de 4 semanas lo ajustará.'}{' '}
          Banco del test v{BANK_VERSION}.
        </div>
        <button onClick={onDone} className="btn-acc mt-1 h-[58px] flex-none rounded-full text-[17px]">
          Empezar a hablar
        </button>
      </div>
    </div>
  )
}
