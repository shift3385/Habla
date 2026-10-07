import { useCallback, useEffect, useState } from 'react'
import { friendlyError } from '../lib/errors'
import {
  createPlan,
  currentWeek,
  doneToday,
  ensureWeekLessons,
  LESSONS_PER_WEEK,
  PLAN_WEEKS,
  todayLesson,
  weekDone,
  type StudyPlan,
} from '../lib/plan'
import { mainModels, type Settings } from '../lib/settings'
import { Icon } from '../ui/icons'

interface Props {
  settings: Settings
  plan: StudyPlan | null
  calibrated: boolean
  onPlanChange: (p: StudyPlan) => void
  onStartLesson: (id: string) => void
  onOpenPlan: () => void
}

// AUD-RES-703 (v5.8.2): el error se recuerda fuera del componente. Antes vivía en su estado y se perdía al cambiar de
// pestaña: cada vuelta al Inicio relanzaba la cadena entera de reintentos (5 peticiones) sin que el usuario lo pidiera.
// Ahora, tras un fallo, solo se vuelve a intentar con «Reintentar», al cambiar de clave o de modelo, o pasado un rato.
const FAIL_MEMORY_MS = 10 * 60_000
let lastFail: { sig: string; at: number; error: string } | null = null

/**
 * "Lección de hoy" en el Inicio (fase 4). Si aún no hay plan lo crea, y si la semana que toca no tiene
 * lecciones las prepara: todo automático, con un estado de carga y un botón de reintentar si falla.
 */
export default function PlanCard({ settings, plan, calibrated, onPlanChange, onStartLesson, onOpenPlan }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const sig = `${settings.geminiKey}|${settings.geminiModel}|${settings.geminiFallbackModel}`
  const [error, setError] = useState<string | null>(() =>
    lastFail && lastFail.sig === sig && Date.now() - lastFail.at < FAIL_MEMORY_MS ? lastFail.error : null,
  )
  const today = plan ? todayLesson(plan) : null
  const needsLessons = !!today && !today.lesson
  const keyReady = !!settings.geminiKey.trim()

  const run = useCallback(
    async (label: string, work: () => Promise<StudyPlan>) => {
      setBusy(label)
      setError(null)
      try {
        onPlanChange(await work())
        lastFail = null
      } catch (e) {
        const msg = friendlyError(e)
        lastFail = { sig, at: Date.now(), error: msg }
        setError(msg)
      } finally {
        setBusy(null)
      }
    },
    [onPlanChange, sig],
  )

  const create = useCallback(
    () => run('Creando tu plan de 12 semanas…', () => createPlan(settings.geminiKey, mainModels(settings))),
    [run, settings],
  )
  const prepareWeek = useCallback(
    (n: number) => run(`Preparando las lecciones de la semana ${n}…`, () => ensureWeekLessons(settings.geminiKey, mainModels(settings), n)),
    [run, settings],
  )

  // Automático: plan nuevo tras el test, y lecciones de la semana cuando empieza.
  const auto = !busy && !error && keyReady && calibrated
  const autoCreate = auto && !plan
  const autoWeek = auto && needsLessons ? today!.week.n : null
  useEffect(() => {
    // La generación es asíncrona: el estado de carga se pone dentro de run(), no aquí directamente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoCreate) create()
    else if (autoWeek) prepareWeek(autoWeek)
  }, [autoCreate, autoWeek, create, prepareWeek])

  if (!calibrated || !keyReady) return null

  const shell = (children: React.ReactNode) => (
    <div className="glass anim-up mt-2 rounded-[24px] px-3.5 py-3">{children}</div>
  )

  if (busy) {
    return shell(
      <div className="flex items-center gap-3">
        <span className="field txt-acc2 grid h-10 w-10 flex-none animate-pulse place-items-center rounded-full">
          <Icon name="spark" size={18} />
        </span>
        <span className="txt-sub text-sm">{busy}</span>
      </div>,
    )
  }

  if (error) {
    return shell(
      <>
        <div className="text-sm" style={{ color: '#f87171' }}>
          {error}
        </div>
        <button
          onClick={() => (plan && needsLessons ? prepareWeek(today!.week.n) : create())}
          className="btn-acc mt-2.5 h-10 w-full rounded-[20px] text-sm"
        >
          Reintentar
        </button>
      </>,
    )
  }

  if (!plan) return null

  // Plan terminado
  if (currentWeek(plan) > PLAN_WEEKS || !today) {
    return shell(
      <div className="flex items-center gap-3">
        <span className="btn-acc grid h-10 w-10 flex-none place-items-center rounded-full">
          <Icon name="star" size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">¡Plan de 12 semanas completado!</span>
          <span className="txt-sub block text-[12.5px]">Crea uno nuevo con tu nivel actual.</span>
        </span>
        <button onClick={create} className="btn-acc h-9 flex-none rounded-[18px] px-3.5 text-[13px]">
          Nuevo plan
        </button>
      </div>,
    )
  }

  const { week, lesson, ahead } = today
  const done = weekDone(plan, week.n)
  const finishedToday = doneToday(plan)

  return shell(
    <>
      <button onClick={onOpenPlan} className="flex w-full items-center justify-between text-left">
        <span className="txt-acc2 text-[11px] tracking-[1.2px] uppercase">
          {finishedToday ? '✓ Lección de hoy hecha' : 'Lección de hoy'} · Semana {week.n} de {PLAN_WEEKS}
        </span>
        <span className="txt-sub flex items-center gap-0.5 text-xs">
          Mi plan
          <Icon name="chevR" size={13} stroke={2} />
        </span>
      </button>
      {lesson && (
        <>
          <div className="mt-1 truncate text-[16px] leading-tight font-semibold">{lesson.titleEs}</div>
          <div className="txt-sub mt-0.5 truncate text-[12.5px]">
            {ahead ? 'Adelantas la semana siguiente · ' : ''}
            {lesson.missionEs}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex flex-1 gap-1">
              {Array.from({ length: LESSONS_PER_WEEK }, (_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-[3px]"
                  style={{ background: i < done ? 'var(--acc)' : 'var(--gb)' }}
                />
              ))}
            </div>
            <button
              onClick={() => onStartLesson(lesson.id)}
              className={`flex h-9 flex-none items-center gap-1.5 rounded-[18px] px-4 text-sm ${finishedToday ? 'glass' : 'btn-acc'}`}
            >
              <Icon name="mic" size={15} stroke={1.8} />
              {finishedToday ? 'Otra más' : 'Empezar'}
            </button>
          </div>
        </>
      )}
    </>,
  )
}
