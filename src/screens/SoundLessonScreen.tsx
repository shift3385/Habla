import { useEffect, useRef, useState } from 'react'
import { ListenChoose, OddOneOut, Sort, SpellListen, type ExerciseResult } from '../components/SoundExercises'
import SoundSay, { type SayResult } from '../components/SoundSay'
import { useSoundData } from '../components/useSoundData'
import SpeakIcon from '../components/SpeakIcon'
import { phoneticsActive } from '../lib/phonetics'
import { lessonKey, loadSoundProgress, markSoundSeen, recordAzureScore, recordLessonTime, recordListen, stateOf, type SoundProgress } from '../lib/sounds'
import { lessonPhases, PHASE_LABEL, phaseOf, STATE_STYLE, type Phase } from '../lib/soundGame'
import type { Settings } from '../lib/settings'
import { stopSpeaking, stopSpeakingIf, toggleSpeakSpanishUS, useSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot, { type MascotElement } from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'
import { WordChip } from './SoundScreen'

interface Tally {
  listen: [number, number]
  sort: [number, number]
  say: [number, number]
  spell: [number, number]
  scores: { id: string; accuracy: number }[]
}
/** Minutos (≥ 1) desde `t`. Fuera del componente: solo se llama al terminar la lección (en un toque, no al pintar). */
const minutesSince = (t: number) => Math.max(1, Math.round((Date.now() - t) / 60000))
const nowMs = () => Date.now()

const EMPTY: Tally = { listen: [0, 0], sort: [0, 0], say: [0, 0], spell: [0, 0], scores: [] }

/**
 * 5.11 (S-10): una lección de la ruta (DISENO §5.3): Explícame → Escucha → Clasifica → Dilo tú → Cierre (las fases que
 * tenga). Cada ejercicio terminado se guarda al momento en la tabla `sounds` (sounds.ts: rondas de «Escucha» del sonido
 * principal y notas de Azure), así salir a medias no pierde nada. El tiempo HABLADO suma a la meta del día y a la racha
 * (recordLessonTime → addPracticeSeconds): al llegar al cierre, o al salir antes si hablaste algo.
 * Política de niveles intacta: Sonidos no cambia el nivel.
 */
export default function SoundLessonScreen({
  id,
  settings,
  update,
  onBack,
  onOpenSound,
}: {
  id: string
  settings: Settings
  update: (p: Partial<Settings>) => void
  onBack: () => void
  onOpenSound: (id: string) => void
}) {
  const data = useSoundData()
  const info = THEME_INFO[settings.theme]
  const [step, setStep] = useState(-1) // -1 = Explícame; n = Cierre
  const [tally, setTally] = useState<Tally>(EMPTY)
  const [final, setFinal] = useState<{ p?: SoundProgress; justMastered: boolean } | null>(null)
  const [minutes, setMinutes] = useState(1)
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const started = useRef(0)
  const spoken = useRef(0) // segundos hablados aún sin apuntar
  const top = useRef<HTMLDivElement>(null)
  const introKey = `explain:lesson:${id}`
  const introOn = useSpeaking(introKey)
  const lesson = data?.lessons.find((l) => l.id === id)
  const azure = phoneticsActive(settings)

  useEffect(() => {
    started.current = nowMs()
    markSoundSeen(lessonKey(id)).catch(() => {})
    return () => {
      stopSpeaking()
      // Saliste antes del cierre: lo que hablaste cuenta igual para la meta del día.
      if (spoken.current > 0) recordLessonTime(id, spoken.current, false).catch(() => {})
      spoken.current = 0
    }
  }, [id])
  useEffect(() => {
    top.current?.closest('.tab-content')?.scrollTo({ top: 0 })
  }, [step])

  const back = (
    <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
      <Icon name="back" size={20} stroke={1.8} />
    </button>
  )
  if (!data) return <div className="txt-sub p-5 text-center text-sm">Cargando…</div>
  if (!lesson) {
    return (
      <div className="anim-in flex flex-col gap-3">
        {back}
        <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Esta lección ya no existe.</div>
      </div>
    )
  }
  const n = lesson.exercises.length
  const ex = step >= 0 && step < n ? lesson.exercises[step] : undefined
  const phases = lessonPhases(lesson)
  const phase: Phase = step < 0 ? 'explain' : ex ? phaseOf(ex.type) : 'done'
  const main = data.phonemes.find((p) => p.id === lesson.phonemes[0])
  const sounds = lesson.phonemes.map((x) => data.phonemes.find((p) => p.id === x)).filter((p) => !!p)

  /** Guarda lo de un ejercicio en el progreso del sonido. Devuelve si con ello el sonido principal quedó dominado. */
  const save = async (k: keyof Omit<Tally, 'scores'>, r: ExerciseResult | SayResult): Promise<boolean> => {
    let mastered = false
    if (main && (k === 'listen' || k === 'sort'))
      for (let j = 0; j < r.total; j++) mastered = (await recordListen(main.id, j < r.correct, azure)).justMastered || mastered
    if ('scores' in r) for (const x of r.scores) mastered = (await recordAzureScore(x.id, x.accuracy, azure)).justMastered || mastered
    return mastered
  }
  const add = (k: keyof Omit<Tally, 'scores'>, r: ExerciseResult | SayResult) => {
    const t: Tally = { ...tally, [k]: [tally[k][0] + r.correct, tally[k][1] + r.total], scores: [...tally.scores, ...('scores' in r ? r.scores : [])] }
    if ('seconds' in r) spoken.current += r.seconds
    setTally(t)
    const job = save(k, r).catch(() => false)
    if (step + 1 >= n) {
      setMinutes(minutesSince(started.current))
      finish(job)
    }
    setStep(step + 1)
  }
  const finish = async (job: Promise<boolean>) => {
    let justMastered = false
    try {
      justMastered = await job
      const secs = spoken.current
      spoken.current = 0
      await recordLessonTime(lesson.id, secs, true)
    } catch {
      // sin base de datos: el cierre se enseña igual
    }
    const p = main ? (await loadSoundProgress().catch(() => ({}) as Record<string, SoundProgress>))[main.id] : undefined
    setFinal({ p, justMastered })
  }
  const common = { mascot: info.mascot, mascotName: info.mascotName }

  return (
    <div ref={top} className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        {back}
        <div className="min-w-0 flex-1">
          <div className="fs-19 leading-tight font-semibold tracking-[-.3px] break-words">{lesson.titleEs}</div>
          <div className="txt-sub fs-12.5 leading-tight">
            {lesson.level ? `${lesson.level} · ` : ''}
            {lesson.minutes} min
          </div>
        </div>
      </div>
      {/* Pasos de la lección: el actual resaltado. */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {phases.map((p) => {
          const k = phases.indexOf(phase)
          const i = phases.indexOf(p)
          return (
            <span
              key={p}
              className={`flex h-[26px] flex-none items-center rounded-[13px] px-2.5 fs-11.5 font-semibold ${p === phase ? 'btn-acc' : 'field'}`}
              style={i < k ? { color: 'var(--ok)' } : p === phase ? undefined : { color: 'var(--sub)' }}
            >
              {i < k && '✓ '}
              {PHASE_LABEL[p]}
            </span>
          )
        })}
      </div>

      {step < 0 ? (
        <div key="intro" className="anim-up flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Mascot element={info.mascot} size={64} mood="speaking" />
            <div className="tip-bubble relative min-w-0 flex-1 rounded-[20px] px-4 py-3 fs-14.5 leading-snug">
              <button
                type="button"
                onClick={() => toggleSpeakSpanishUS(lesson.introEs, introKey)}
                className="txt-acc2 float-right -mt-1.5 -mr-2.5 ml-1 grid h-10 w-10 place-items-center rounded-full"
                aria-pressed={introOn}
                aria-label={introOn ? 'Parar' : 'Escuchar'}
              >
                <SpeakIcon speakKey={introKey} size={17} stroke={1.8} />
              </button>
              {lesson.introEs}
              <div className="txt-sub mt-1.5 fs-11.5">— {info.mascotName}</div>
            </div>
          </div>
          {sounds.map((p) => (
            <div key={p.id} className="glass flex flex-wrap items-center gap-2 rounded-[20px] px-3 py-2.5">
              <button onClick={() => onOpenSound(p.id)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left" aria-label={`Ficha de /${p.ipa}/`}>
                <span className="txt-acc fs-20 font-semibold">/{p.ipa}/</span>
                <span className="txt-sub min-w-0 truncate fs-13">{p.nameEs}</span>
              </button>
              <WordChip word={p.keyword} />
              <WordChip word={p.keyword} slow />
            </div>
          ))}
          <button
            onClick={() => {
              stopSpeakingIf(introKey)
              setStep(0)
            }}
            className="btn-acc h-[54px] rounded-full fs-16"
          >
            Empezar
          </button>
        </div>
      ) : ex ? (
        <div key={ex.id} className="anim-up">
          {ex.type === 'listen-choose' ? (
            <ListenChoose ex={ex} seed={seed} alphabet={data.alphabet} {...common} onDone={(r) => add('listen', r)} />
          ) : ex.type === 'odd-one-out' ? (
            <OddOneOut ex={ex} alphabet={data.alphabet} {...common} onDone={(r) => add('sort', r)} />
          ) : ex.type === 'sort' ? (
            <Sort ex={ex} phonemes={data.phonemes} seed={seed} alphabet={data.alphabet} {...common} onDone={(r) => add('sort', r)} />
          ) : ex.type === 'spell-listen' ? (
            <SpellListen ex={ex} alphabet={data.alphabet} {...common} onDone={(r) => add('spell', r)} />
          ) : (
            <SoundSay ex={ex} phonemes={data.phonemes} main={main?.id} settings={settings} update={update} {...common} onDone={(r) => add('say', r)} />
          )}
        </div>
      ) : (
        <Closing
          tally={tally}
          state={final?.p ? STATE_STYLE[stateOf(final.p)].label : null}
          earOnly={!!final?.p?.earOnly}
          justMastered={!!final?.justMastered}
          closingEs={lesson.closingEs}
          mainIpa={main?.ipa}
          minutes={minutes}
          mascot={info.mascot}
          onAgain={() => {
            setTally(EMPTY)
            setFinal(null)
            started.current = nowMs()
            setStep(-1)
          }}
          onBack={onBack}
          onOpenSound={main ? () => onOpenSound(main.id) : undefined}
        />
      )}
    </div>
  )
}

function Closing({
  tally,
  state,
  earOnly,
  justMastered,
  closingEs,
  mainIpa,
  minutes,
  mascot,
  onAgain,
  onBack,
  onOpenSound,
}: {
  tally: Tally
  state: string | null
  earOnly: boolean
  justMastered: boolean
  closingEs?: string
  mainIpa?: string
  minutes: number
  mascot: MascotElement
  onAgain: () => void
  onBack: () => void
  onOpenSound?: () => void
}) {
  const rows: [string, [number, number]][] = [
    ['Escucha', tally.listen],
    ['Clasifica', tally.sort],
    ['Deletrea', tally.spell],
    ['Dilo tú', tally.say],
  ]
  const shown = rows.filter(([, [, t]]) => t > 0)
  const best = tally.scores.length ? Math.max(...tally.scores.map((s) => s.accuracy)) : null
  return (
    <div className="anim-up flex flex-col items-center gap-3 text-center">
      <Mascot element={mascot} size={100} mood="happy" />
      <div className="fs-24 font-semibold tracking-[-.4px]">{justMastered && mainIpa ? `¡Dominaste /${mainIpa}/!` : '¡Lección terminada!'}</div>
      {closingEs && <div className="tip-bubble max-w-[360px] rounded-[18px] px-3.5 py-2.5 fs-14 leading-snug">{closingEs}</div>}
      <div className="grid w-full gap-1.5">
        {shown.map(([label, [c, t]]) => (
          <div key={label} className="glass flex h-[44px] items-center justify-between rounded-[22px] px-4 fs-15">
            <span>{label}</span>
            <b className="tabular-nums">
              {c}/{t}
            </b>
          </div>
        ))}
        {best !== null && (
          <div className="glass flex h-[44px] items-center justify-between rounded-[22px] px-4 fs-15">
            <span>Mejor nota de Azure</span>
            <b className="tabular-nums">{best}</b>
          </div>
        )}
      </div>
      <div className="txt-sub max-w-[340px] fs-13.5 leading-snug">
        {state && mainIpa ? `El sonido /${mainIpa}/ está ahora «${state}»${earOnly ? ' (de oído)' : ''}. ` : ''}
        {minutes === 1 ? 'Le dedicaste cerca de 1 min.' : `Le dedicaste unos ${minutes} min.`} Lo que dijiste en voz alta suma a tu meta del día.
      </div>
      <div className="mt-1 grid w-full grid-cols-2 gap-2">
        {onOpenSound ? (
          <button onClick={onOpenSound} className="glass h-[50px] rounded-[25px] fs-14.5 font-semibold">
            Ver la ficha
          </button>
        ) : (
          <button onClick={onAgain} className="glass h-[50px] rounded-[25px] fs-14.5 font-semibold">
            Otra vez
          </button>
        )}
        <button onClick={onBack} className="btn-acc h-[50px] rounded-[25px] fs-14.5">
          Volver
        </button>
      </div>
    </div>
  )
}
