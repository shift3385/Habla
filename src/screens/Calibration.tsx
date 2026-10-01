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
import type { Models, RetryInfo } from '../lib/gemini'
import { levelIdx, rateForLevel, type Level } from '../lib/levels'
import { MicError, Recorder } from '../lib/recorder'
import type { Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64 } from '../lib/speech'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Orb from '../ui/Orb'
import { TEACHERS, type ThemeVars } from '../ui/theme'
import Wave from '../ui/Wave'

type Step =
  | { k: 'intro' }
  | { k: 'loading'; text: string }
  | { k: 'mcq' }
  | { k: 'reading'; i: number }
  | { k: 'listening'; i: number }
  | { k: 'speaking'; i: number }
  | { k: 'result'; r: CalibrationResult }
  | { k: 'error'; text: string; retry: () => void }

const SECTIONS = ['Gramática', 'Lectura', 'Audición', 'Habla']

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
  const [speech, setSpeech] = useState<(SpeakingAnswer | null)[]>([null, null, null])
  const [recState, setRecState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef(new Recorder())
  const recStart = useRef(0)

  const models = (): Models => ({ primary: settings.geminiModel, fallback: settings.geminiFallbackModel })
  const onRetry = ({ attempt, total }: RetryInfo) => setHint(`Gemini está saturado, reintentando (${attempt}/${total})…`)

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
  const startMcq = async () => {
    setStep({ k: 'loading', text: `${teacher.name} está preparando tus preguntas…` })
    try {
      const p = await generateMcqPool(settings.geminiKey, models(), onRetry)
      if (p.length < 18) throw new Error('No se pudieron generar suficientes preguntas.')
      setPool(p)
      setAnswers([])
      setHint(null)
      setStep({ k: 'mcq' })
    } catch (e) {
      setHint(null)
      setStep({ k: 'error', text: (e as Error).message, retry: startMcq })
    }
  }

  const current = step.k === 'mcq' ? nextMcq(pool, answers) : null

  const answerMcq = (i: number) => {
    if (!current || picked !== null) return
    setPicked(i)
    setTimeout(() => {
      const next = [...answers, { item: current, chosen: i, correct: i === current.answer }]
      setAnswers(next)
      setPicked(null)
      if (next.length >= MCQ_COUNT || !nextMcq(pool, next)) startComprehension(estimateMcqLevel(next))
    }, 350)
  }

  // ---- 2 y 3. Lectura y audición
  const startComprehension = async (lv: Level) => {
    setBase(lv)
    setStep({ k: 'loading', text: 'Preparando lectura y audición…' })
    try {
      const c = await generateComprehension(settings.geminiKey, models(), lv, onRetry)
      if (!c.reading.length || !c.listening.length) throw new Error('No se pudieron generar los textos.')
      setComp(c)
      setHint(null)
      setStep({ k: 'reading', i: 0 })
    } catch (e) {
      setHint(null)
      setStep({ k: 'error', text: (e as Error).message, retry: () => startComprehension(lv) })
    }
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
        if (!recorder.current.isOpen) await recorder.current.open()
        recorder.current.start()
        recStart.current = performance.now()
        setElapsed(0)
        setRecState('recording')
      } catch (e) {
        setHint(e instanceof MicError ? e.message : 'No se pudo grabar.')
      }
      return
    }
    setRecState('processing')
    const { blob, seconds } = await recorder.current.stop()
    const analysis = await analyzeSpeech(blob)
    if (seconds < 5 || (analysis && !analysis.hasSpeech)) {
      setHint('Necesito oírte un poco más. Inténtalo otra vez y habla al menos 20 segundos.')
      setRecState('idle')
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
    setRecState('idle')
  }

  const finish = async () => {
    setStep({ k: 'loading', text: `${teacher.name} está evaluando tu inglés…` })
    recorder.current.close()
    try {
      const failed = answers.filter((a) => !a.correct).map((a) => a.item.point)
      const ev = await evaluateSpeaking(settings.geminiKey, models(), tasks, speech as SpeakingAnswer[], failed, onRetry)
      const levels = buildLevels(estimateMcqLevel(answers), scoreComp('reading'), scoreComp('listening'), ev.level)
      const r: CalibrationResult = { levels, speaking: ev, mcq: answers }
      await saveCalibration(r)
      update({ ttsRate: rateForLevel(levels.overall) })
      setHint(null)
      setStep({ k: 'result', r })
    } catch (e) {
      setHint(null)
      setStep({ k: 'error', text: (e as Error).message, retry: finish })
    }
  }

  // ---- UI
  const section =
    step.k === 'mcq' ? 0 : step.k === 'reading' ? 1 : step.k === 'listening' ? 2 : step.k === 'speaking' ? 3 : -1
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
            Responde sin ayuda: si no sabes algo, elige lo que creas. Tu nivel no se puede cambiar a mano; irá subiendo con la práctica y con un nuevo test cada 4 semanas.
          </p>
          <button onClick={startMcq} className="btn-acc mt-5 h-[58px] rounded-full text-[17px]">
            Empezar el test
          </button>
        </div>
      </div>
    )
  }

  if (step.k === 'loading') {
    return (
      <div className={pad}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Orb size={130} colors={t[settings.teacher]} active />
          <p className="txt-sub animate-pulse">{step.text}</p>
          {hint && <p className="txt-sub text-sm">{hint}</p>}
        </div>
      </div>
    )
  }

  if (step.k === 'error') {
    return (
      <div className={pad}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Orb size={100} colors={t[settings.teacher]} />
          <p style={{ color: '#f87171' }}>{step.text}</p>
          <button onClick={step.retry} className="btn-acc h-12 rounded-full px-8">
            Reintentar
          </button>
        </div>
      </div>
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
      else if (kind === 'reading') setStep({ k: 'listening', i: 0 })
      else {
        setStep({ k: 'speaking', i: 0 })
        setTimeout(() => sayTask(0), 400)
      }
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
                  : done
                    ? 'Grabado ✓ · toca para repetir la grabación'
                    : 'Toca para empezar a hablar'}
            </div>
            {hint && <div className="txt-sub text-center text-[13px]">{hint}</div>}
          </div>
          <button
            onClick={() => {
              if (i < tasks.length - 1) {
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
