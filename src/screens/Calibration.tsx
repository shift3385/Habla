import { useEffect, useRef, useState } from 'react'
import {
  buildLevels,
  comprehensionLevel,
  estimateMcqLevel,
  evaluateSpeaking,
  generateComprehension,
  generateMcqPool,
  MCQ_COUNT,
  nextMcq,
  saveCalibration,
  speakingTasks,
  type CalibrationResult,
  type Comprehension,
  type McqAnswer,
  type McqItem,
  type SpeakingAnswer,
} from '../lib/calibration'
import PrepareScreen, { type PrepareKind, type PrepareState } from '../components/PrepareScreen'
import { friendlyError } from '../lib/errors'
import type { Models, RetryInfo } from '../lib/gemini'
import { levelAt, levelIdx, rateForLevel, type Level } from '../lib/levels'
import { MicError, Recorder } from '../lib/recorder'
import type { Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64 } from '../lib/speech'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import Orb from '../ui/Orb'
import { TEACHERS, type ThemeVars } from '../ui/theme'
import Wave from '../ui/Wave'

type Step =
  | { k: 'intro' }
  | { k: 'prep'; kind: PrepareKind; title: string; state: PrepareState; error?: string; retry?: () => void }
  | { k: 'mcq' }
  | { k: 'section'; s: SectionKey } // instrucciones antes de cada parte
  | { k: 'reading'; i: number }
  | { k: 'listening'; i: number }
  | { k: 'speaking'; i: number }
  | { k: 'result'; r: CalibrationResult }

const SECTIONS = ['Gramática', 'Lectura', 'Audición', 'Habla']
type SectionKey = 'grammar' | 'reading' | 'listening' | 'speaking'

/** Instrucciones breves antes de cada parte, para quien hace el test sin que nadie le explique. */
const SECTION_INFO: Record<SectionKey, { title: string; icon: IconName; points: string[]; tip?: string }> = {
  grammar: {
    title: 'Prueba de gramática y vocabulario',
    icon: 'pencil',
    points: [
      'Vas a responder 15 preguntas cortas: completa la frase o elige la palabra correcta.',
      'Las preguntas se adaptan a ti: si aciertas, la siguiente es más difícil; si fallas, más fácil. Es normal que algunas cuesten.',
      'Si no sabes la respuesta, marca «No lo sé» en vez de adivinar.',
    ],
  },
  reading: {
    title: 'Prueba de lectura',
    icon: 'book',
    points: [
      'Vas a leer 2 textos cortos en inglés.',
      'Después de cada texto hay 2 preguntas. La respuesta está en el texto: puedes releerlo las veces que quieras.',
      'Si no encuentras la respuesta, marca «No lo sé».',
    ],
  },
  listening: {
    title: 'Prueba de escucha',
    icon: 'headphones',
    points: [
      'Vas a escuchar 2 audios cortos en inglés. No hay texto: solo audio.',
      'Toca el botón de reproducir. Cada audio se puede escuchar hasta 3 veces.',
      'Las respuestas a las 2 preguntas salen de lo que escuchas. Si no lo entendiste, marca «No lo sé».',
    ],
    tip: 'Recomendado: usa auriculares, sube el volumen y busca un lugar tranquilo.',
  },
  speaking: {
    title: 'Prueba de habla',
    icon: 'mic',
    points: [
      'El profe te hará 3 preguntas en voz alta (puedes volver a escucharlas).',
      'Toca el micrófono para empezar a hablar y tócalo otra vez para terminar.',
      'Habla al menos 20–30 segundos en cada una. No pasa nada si dudas: lo importante es que hables.',
    ],
    tip: 'Si tienes auriculares con micrófono, úsalos: el reconocimiento de tu voz será mucho mejor que con el micrófono del teléfono. Busca un lugar sin ruido.',
  },
}

function Header({ section }: { section: number }) {
  return (
    <div className="mb-4">
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

function Option({ text, sel, onClick }: { text: string; sel: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[52px] w-full items-center rounded-[18px] px-4 py-2.5 text-left text-[15px] ${sel ? 'btn-acc' : 'glass'}`}
    >
      {text}
    </button>
  )
}

/** Quinta opción honesta: distinta a propósito (borde discontinuo, color apagado) para no confundirla con una respuesta. */
function UnknownOption({ sel, onClick }: { sel: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 flex min-h-[48px] w-full items-center gap-2.5 rounded-[18px] px-4 py-2 text-left text-[14.5px] transition-colors"
      style={{
        border: `1.5px dashed ${sel ? 'var(--acc2)' : 'var(--sub)'}`,
        background: sel ? 'var(--field)' : 'transparent',
        color: sel ? 'var(--acc2)' : 'var(--sub)',
      }}
    >
      <span
        className="grid h-6 w-6 flex-none place-items-center rounded-full text-[13px] font-semibold"
        style={{ border: '1.5px solid currentColor' }}
      >
        ?
      </span>
      <span>
        No lo sé <span className="text-[12px] opacity-80">· mejor ser sincero que adivinar</span>
      </span>
    </button>
  )
}

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onDone: () => void
  registerBack: (h: (() => void) | null) => void
}

export default function Calibration({ settings, t, update, onDone, registerBack }: Props) {
  const teacher = TEACHERS[settings.teacher]
  const [step, setStep] = useState<Step>({ k: 'intro' })
  const [hint, setHint] = useState<string | null>(null)
  const [pool, setPool] = useState<McqItem[]>([])
  const [answers, setAnswers] = useState<McqAnswer[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [comp, setComp] = useState<{ reading: Comprehension[]; listening: Comprehension[] } | null>(null)
  const [compAnswers, setCompAnswers] = useState<Record<string, number>>({})
  const [plays, setPlays] = useState<Record<number, number>>({})
  const [playing, setPlaying] = useState(false)
  const [base, setBase] = useState<Level>('B1')
  const [speech, setSpeech] = useState<(SpeakingAnswer | null | 'skipped')[]>([null, null, null])
  const [micFailures, setMicFailures] = useState(0)
  const [recState, setRecState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)

  const models = (): Models => ({ primary: settings.geminiModel, fallback: settings.geminiFallbackModel })
  // Los reintentos ocurren en segundo plano, sin mensajes (la animación de preparación cubre la espera).
  const onRetry = undefined as ((i: RetryInfo) => void) | undefined

  // El test es obligatorio: el botón atrás de Android no lo cierra.
  useEffect(() => {
    registerBack(() => {})
    return () => registerBack(null)
  }, [registerBack])

  useEffect(() => {
    const rec = recorder.current
    return () => {
      rec.close()
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (recState !== 'recording') return
    const id = setInterval(() => setElapsed((performance.now() - recStart.current) / 1000), 250)
    return () => clearInterval(id)
  }, [recState])

  // ---- 1. Gramática y vocabulario
  /** Animación de preparación: carga → "¡Listo!" (1,3 s) → siguiente paso; o tarjeta de error con Reintentar. */
  // `title` dice qué parte se prepara, para no perderse si ya se hizo otra ("Preparando el test de gramática").
  const prepare = async (kind: PrepareKind, title: string, work: () => Promise<Step>, retry: () => void) => {
    setStep({ k: 'prep', kind, title, state: 'loading' })
    try {
      const next = await work()
      setStep({ k: 'prep', kind, title, state: 'done' })
      await new Promise((r) => setTimeout(r, 1300))
      setStep(next)
    } catch (e) {
      setStep({ k: 'prep', kind, title, state: 'error', error: friendlyError(e), retry })
    }
  }

  const startMcq = () =>
    prepare(
      'test',
      'Preparando el test de gramática',
      async () => {
        const p = await generateMcqPool(settings.geminiKey, models(), onRetry)
        if (p.length < 18) throw new Error('No se pudieron generar suficientes preguntas.')
        setPool(p)
        setAnswers([])
        return { k: 'section', s: 'grammar' }
      },
      startMcq,
    )

  const current = step.k === 'mcq' ? nextMcq(pool, answers) : null

  const answerMcq = (i: number) => {
    if (!current || picked !== null) return
    setPicked(i)
    setTimeout(() => {
      const next = [...answers, { item: current, chosen: i, correct: i === current.answer, unknown: i === -1 }]
      setAnswers(next)
      setPicked(null)
      if (next.length >= MCQ_COUNT || !nextMcq(pool, next)) startComprehension(estimateMcqLevel(next))
    }, 350)
  }

  // ---- 2 y 3. Lectura y audición
  const startComprehension = (lv: Level) => {
    setBase(lv)
    return prepare(
      'test',
      'Preparando la lectura y la escucha',
      async () => {
        const c = await generateComprehension(settings.geminiKey, models(), lv, onRetry)
        if (!c.reading.length || !c.listening.length) throw new Error('No se pudieron generar los textos.')
        setComp(c)
        return { k: 'section', s: 'reading' }
      },
      () => startComprehension(lv),
    )
  }

  const compDone = (kind: 'reading' | 'listening', i: number) => {
    const c = comp![kind][i]
    return c.questions.every((_, qi) => compAnswers[`${kind}-${i}-${qi}`] !== undefined)
  }

  const scoreComp = (kind: 'reading' | 'listening'): Level =>
    comprehensionLevel(
      base,
      comp![kind].map((c, i) => ({
        level: c.level,
        total: c.questions.length,
        correct: c.questions.filter((q, qi) => compAnswers[`${kind}-${i}-${qi}`] === q.answer).length,
      })),
    )

  const play = async (i: number) => {
    if (playing || (plays[i] ?? 0) >= 3) return
    setPlaying(true)
    setPlays((p) => ({ ...p, [i]: (p[i] ?? 0) + 1 }))
    await speak(comp!.listening[i].text, rateForLevel(comp!.listening[i].level), settings.voiceIndex).catch(() => {})
    setPlaying(false)
  }

  // ---- 4. Habla
  const tasks = speakingTasks(base)

  const sayTask = (i: number) => speak(tasks[i].prompt, rateForLevel(base), settings.voiceIndex).catch(() => {})

  const toggleRecord = async (i: number) => {
    if (recState === 'processing') return
    if (recState === 'idle') {
      await stopSpeaking()
      try {
        await recorder.current.begin() // reabre el micrófono si Android lo cortó
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
    } catch {
      setHint('Algo falló al guardar la grabación. Vuelve a intentarlo.')
      setMicFailures((n) => n + 1)
      recorder.current.close() // la próxima vez se abre un micrófono nuevo
    } finally {
      // Pase lo que pase, el botón vuelve a estar disponible.
      setRecState('idle')
    }
  }

  /** Red de seguridad: si la grabación falla, se puede saltar la pregunta para no quedarse atascado. */
  const skipTask = (i: number) => {
    setSpeech((s) => s.map((x, j) => (j === i ? 'skipped' : x)))
    setHint(null)
    setMicFailures(0)
  }

  const finish = () => {
    recorder.current.close()
    return prepare('eval', 'Evaluando tu habla y tu nivel', evaluate, finish)
  }

  const evaluate = async (): Promise<Step> => {
    {
      const failed = answers.filter((a) => !a.correct && !a.unknown).map((a) => a.item.point)
      const unknown = answers.filter((a) => a.unknown).map((a) => a.item.point)
      // Las preguntas de lectura/audición marcadas como "No lo sé" también son lagunas reconocidas.
      for (const kind of ['reading', 'listening'] as const)
        comp?.[kind].forEach((c, i) =>
          c.questions.forEach((q, qi) => {
            if (compAnswers[`${kind}-${i}-${qi}`] === -1)
              unknown.push(`${kind === 'reading' ? 'reading' : 'listening'} comprehension at ${c.level}: "${q.q}"`)
          }),
        )
      // Solo se evalúan las tareas grabadas (las saltadas por un fallo del micrófono se omiten).
      const pairs = tasks.map((task, k) => ({ task, ans: speech[k] })).filter((p): p is { task: (typeof tasks)[number]; ans: SpeakingAnswer } => !!p.ans && p.ans !== 'skipped')
      const ev = pairs.length
        ? await evaluateSpeaking(settings.geminiKey, models(), pairs.map((p) => p.task), pairs.map((p) => p.ans), failed, unknown, onRetry)
        : {
            // Sin ninguna grabación: el habla se estima un nivel por debajo de la gramática y se mide en el próximo test.
            level: levelAt(levelIdx(estimateMcqLevel(answers)) - 1),
            criteria: undefined as unknown as Record<'fluency' | 'grammar' | 'vocabulary' | 'pronunciation' | 'coherence', Level>,
            strengthsEs: [],
            weaknessesEs: ['No se pudo evaluar el habla en este test: se medirá con tus clases y en el próximo re-test.'],
            weaknessesEn: [],
            summaryEs: 'No pudimos grabar tu voz, así que tu nivel de habla es una estimación.',
          }
      const levels = buildLevels(estimateMcqLevel(answers), scoreComp('reading'), scoreComp('listening'), ev.level)
      const r: CalibrationResult = { levels, speaking: ev, mcq: answers }
      await saveCalibration(r)
      update({ ttsRate: rateForLevel(levels.overall) })
      return { k: 'result', r }
    }
  }

  // ---- UI
  const section =
    step.k === 'mcq' || (step.k === 'section' && step.s === 'grammar')
      ? 0
      : step.k === 'reading' || (step.k === 'section' && step.s === 'reading')
        ? 1
        : step.k === 'listening' || (step.k === 'section' && step.s === 'listening')
          ? 2
          : step.k === 'speaking' || (step.k === 'section' && step.s === 'speaking')
            ? 3
            : -1
  const pad = 'relative z-[2] flex h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+24px)]'

  if (step.k === 'intro') {
    return (
      <div className={pad}>
        <div className="anim-up flex flex-1 flex-col">
          <div className="grid flex-1 place-items-center">
            <Orb size={150} colors={t[settings.teacher]} />
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-.8px]">Test de nivel</h1>
          <p className="txt-sub mt-2 text-[15px] leading-snug">
            {teacher.name} necesita conocer tu inglés para adaptar las clases. Son unos 12–15 minutos y tiene 4 partes:
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ['Gramática', '15 preguntas adaptativas'],
              ['Lectura', '2 textos cortos'],
              ['Audición', '2 audios'],
              ['Habla', '3 respuestas por voz'],
            ].map(([a, b]) => (
              <div key={a} className="glass rounded-[20px] px-3.5 py-3">
                <div className="font-semibold">{a}</div>
                <div className="txt-sub text-[12.5px]">{b}</div>
              </div>
            ))}
          </div>
          <p className="txt-sub mt-3 text-[13px] leading-snug">
            Responde sin ayuda. Si no sabes una respuesta, marca <b>«No lo sé»</b> en vez de adivinar: así {teacher.name} sabrá exactamente qué enseñarte. Tu nivel no se puede cambiar a mano; irá subiendo con la práctica y con un nuevo test cada 4 semanas.
          </p>
          <button onClick={startMcq} className="btn-acc mt-5 h-[58px] rounded-full text-[17px]">
            Empezar el test
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'section') {
    const info = SECTION_INFO[step.s]
    const start = () => {
      if (step.s === 'grammar') setStep({ k: 'mcq' })
      else if (step.s === 'speaking') {
        setStep({ k: 'speaking', i: 0 })
        setTimeout(() => sayTask(0), 400)
      } else setStep({ k: step.s, i: 0 })
    }
    return (
      <div className={pad}>
        <Header section={section} />
        <div key={step.s} className="anim-in flex flex-1 flex-col">
          <div className="grid flex-1 place-items-center">
            <div className="btn-acc grid h-28 w-28 place-items-center rounded-full" style={{ boxShadow: '0 0 0 10px var(--g), 0 14px 40px var(--glow)' }}>
              <Icon name={info.icon} size={48} stroke={1.5} />
            </div>
          </div>
          <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">Parte {section + 1} de 4</div>
          <h1 className="mt-1 text-[30px] leading-tight font-semibold tracking-[-.6px]">{info.title}</h1>
          <ul className="mt-4 flex flex-col gap-2.5">
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
                <Icon name="headphones" size={20} />
              </span>
              <span className="text-[14px] leading-snug">{info.tip}</span>
            </div>
          )}
          <button onClick={start} className="btn-acc mt-6 h-[58px] rounded-full text-[17px]">
            Entendido, empezar
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'prep') {
    return (
      <PrepareScreen
        kind={step.kind}
        state={step.state}
        colors={t[settings.teacher]}
        teacherName={teacher.name}
        title={step.title}
        errorText={step.error}
        onRetry={step.retry}
      />
    )
  }

  if (step.k === 'mcq' && current) {
    return (
      <div className={pad}>
        <Header section={section} />
        <div key={answers.length} className="anim-in flex flex-1 flex-col">
          <div className="txt-sub text-sm">
            Pregunta {answers.length + 1} de {MCQ_COUNT} · {current.skill === 'grammar' ? 'Gramática' : 'Vocabulario'}
          </div>
          <div className="glass mt-3 rounded-[24px] p-5 text-[19px] leading-snug font-medium">{current.question}</div>
          <div className="mt-4 flex flex-col gap-2">
            {current.options.map((o, i) => (
              <Option key={i} text={o} sel={picked === i} onClick={() => answerMcq(i)} />
            ))}
            <UnknownOption sel={picked === -1} onClick={() => answerMcq(-1)} />
          </div>
        </div>
      </div>
    )
  }

  if ((step.k === 'reading' || step.k === 'listening') && comp) {
    const kind = step.k
    const i = step.i
    const c = comp[kind][i]
    const isLast = i === comp[kind].length - 1
    const next = () => {
      stopSpeaking()
      setPlaying(false)
      if (!isLast) setStep({ k: kind, i: i + 1 })
      else if (kind === 'reading') setStep({ k: 'section', s: 'listening' })
      else setStep({ k: 'section', s: 'speaking' })
    }
    const used = plays[i] ?? 0
    return (
      <div className={pad}>
        <Header section={section} />
        <div key={`${kind}-${i}`} className="anim-in no-scrollbar -mx-1 flex flex-1 flex-col overflow-y-auto px-1">
          <div className="txt-sub text-sm">
            {kind === 'reading' ? 'Lee el texto' : 'Escucha el audio'} {i + 1} de {comp[kind].length}
          </div>
          {kind === 'reading' ? (
            <div className="glass mt-3 rounded-[24px] p-4 text-[15.5px] leading-relaxed">{c.text}</div>
          ) : (
            <div className="glass mt-3 flex items-center gap-4 rounded-[24px] p-4">
              <button
                onClick={() => play(i)}
                disabled={playing || used >= 3}
                className="btn-acc grid h-16 w-16 flex-none place-items-center rounded-full disabled:opacity-50"
                aria-label="Escuchar"
              >
                <Icon name="speakerWave" size={26} />
              </button>
              <div className="flex-1">
                <Wave n={14} on={playing} />
                <div className="txt-sub mt-1 text-[13px]">
                  {used >= 3 ? 'Ya no quedan reproducciones' : `Puedes escucharlo ${3 - used} ${3 - used === 1 ? 'vez' : 'veces'} más`}
                </div>
              </div>
            </div>
          )}
          {c.questions.map((q, qi) => {
            const key = `${kind}-${i}-${qi}`
            return (
              <div key={key} className="mt-4">
                <div className="mb-2 font-medium">{q.q}</div>
                <div className="flex flex-col gap-2">
                  {q.options.map((o, oi) => (
                    <Option key={oi} text={o} sel={compAnswers[key] === oi} onClick={() => setCompAnswers((a) => ({ ...a, [key]: oi }))} />
                  ))}
                  <UnknownOption sel={compAnswers[key] === -1} onClick={() => setCompAnswers((a) => ({ ...a, [key]: -1 }))} />
                </div>
              </div>
            )
          })}
          <button
            onClick={next}
            disabled={!compDone(kind, i) || (kind === 'listening' && used === 0)}
            className="btn-acc mt-5 mb-1 h-[54px] flex-none rounded-full text-[16px]"
          >
            Siguiente
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'speaking') {
    const i = step.i
    const task = tasks[i]
    const done = !!speech[i]
    const recording = recState === 'recording'
    return (
      <div className={pad}>
        <Header section={section} />
        <div key={i} className="anim-in flex flex-1 flex-col">
          <div className="txt-sub text-sm">
            Tarea {i + 1} de {tasks.length} · {task.title} · unos {task.seconds} s
          </div>
          <div className="glass mt-3 rounded-[24px] p-5">
            <div className="flex items-start gap-3">
              <Orb size={40} colors={t[settings.teacher]} />
              <div className="flex-1 text-[17px] leading-snug">{task.prompt}</div>
            </div>
            <button onClick={() => sayTask(i)} className="txt-sub mt-3 flex items-center gap-1.5 text-[13px]">
              <Icon name="speaker" size={14} /> Escuchar otra vez
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-5">
              <Wave on={recording} />
              <button
                onClick={() => toggleRecord(i)}
                className="grid h-[96px] w-[96px] place-items-center rounded-full"
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
                    : 'Toca para empezar a hablar'}
            </div>
            {hint && <div className="txt-sub text-center text-[13px]">{hint}</div>}
            {micFailures > 0 && !done && recState === 'idle' && (
              <button
                onClick={() => skipTask(i)}
                className="txt-sub h-10 rounded-[20px] px-4 text-[13.5px]"
                style={{ border: '1.5px dashed var(--sub)' }}
              >
                ¿Sigue sin funcionar? Saltar esta pregunta
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (i < tasks.length - 1) {
                setMicFailures(0)
                setStep({ k: 'speaking', i: i + 1 })
                setTimeout(() => sayTask(i + 1), 400)
              } else finish()
            }}
            disabled={!done || recState !== 'idle'}
            className="btn-acc h-[54px] rounded-full text-[16px]"
          >
            {i < tasks.length - 1 ? 'Siguiente' : 'Ver mi nivel'}
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'result') {
    const { r } = step
    const rows: [string, Level][] = [
      ['Gramática', r.levels.grammar],
      ['Lectura', r.levels.reading],
      ['Audición', r.levels.listening],
      ['Habla', r.levels.speaking],
    ]
    return (
      <div className={pad}>
        <div className="anim-up no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
          <div className="glass flex flex-col items-center gap-2 rounded-[28px] p-5 text-center">
            <div className="txt-sub text-sm">Tu nivel de inglés</div>
            <div className="text-[56px] leading-none font-semibold tracking-[-2px]" style={{ color: 'var(--acc)' }}>
              {r.levels.overall}
            </div>
            <p className="txt-sub text-sm leading-snug">{r.speaking.summaryEs}</p>
          </div>
          <div className="glass rounded-[28px] p-4">
            {rows.map(([n, l]) => (
              <div key={n} className="flex items-center gap-3 py-1.5">
                <span className="w-[84px] text-sm">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded" style={{ background: 'var(--gb)' }}>
                  <div className="h-full rounded" style={{ width: `${((levelIdx(l) + 1) / 6) * 100}%`, background: 'var(--acc)' }} />
                </div>
                <span className="txt-acc2 w-7 text-right font-semibold">{l}</span>
              </div>
            ))}
          </div>
          <div className="glass rounded-[24px] p-4 text-[15px]">
            <div className="mb-1.5 font-semibold">Lo que haces bien</div>
            <ul className="list-disc space-y-1 pl-5">
              {r.speaking.strengthsEs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-[24px] p-4 text-[15px]">
            <div className="mb-1.5 font-semibold">En qué te ayudará {teacher.name}</div>
            <ul className="list-disc space-y-1 pl-5">
              {r.speaking.weaknessesEs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <button onClick={onDone} className="btn-acc mt-1 h-[58px] flex-none rounded-full text-[17px]">
            Empezar a hablar
          </button>
        </div>
      </div>
    )
  }

  return null
}
