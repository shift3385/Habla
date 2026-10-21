import { useCallback, useEffect, useState } from 'react'
import { friendlyError } from '../lib/errors'
import { topicForLesson } from '../lib/grammar'
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
  /** v5.10 (D3): la lección del día enlaza a su tema de Gramática (si lo nombra con claridad). */
  onOpenGrammar?: (topicId: string) => void
  onOpenPlan: () => void
}

// AUD-RES-703 (v5.8.2): el error se recuerda fuera del componente. Antes vivía en su estado y se perdía al cambiar de
// pestaña: cada vuelta al Inicio relanzaba la cadena entera de reintentos (5 peticiones) sin que el usuario lo pidiera.
// Ahora, tras un fallo, solo se vuelve a intentar con «Reintentar», al cambiar de clave o de modelo, o pasado un rato.
// El fallo se guarda con la operación que falló («create» o «week:N»): si esa operación ya no hace falta (el plan se
// creó o la semana se preparó desde «Mi plan», o empezó otra semana), el error no vuelve. Y «Reintentar» repite esa
// misma operación: nunca crea un plan nuevo encima de uno que ya funciona.
const FAIL_MEMORY_MS = 10 * 60_000
type Fail = { op: string; sig: string; error: string }
let lastFail: Fail | null = null
let forgetTimer = 0

/**
 * "Lección de hoy" en el Inicio (fase 4). Si aún no hay plan lo crea, y si la semana que toca no tiene
 * lecciones las prepara: todo automático, con un estado de carga y un botón de reintentar si falla.
 */
export default function PlanCard({ settings, plan, calibrated, onPlanChange, onStartLesson, onOpenPlan, onOpenGrammar }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<Fail | null>(null)
  const sig = `${settings.geminiKey}|${settings.geminiModel}|${settings.geminiFallbackModel}`
  const today = plan ? todayLesson(plan) : null
  const needsLessons = !!today && !today.lesson
  const keyReady = !!settings.geminiKey.trim()
  // Lo que toca hacer ahora mismo; el error solo se enseña si es de esto mismo y con la misma clave y modelos.
  const op = !plan ? 'create' : needsLessons ? `week:${today!.week.n}` : null
  const matches = (f: Fail | null) => !!f && f.op === op && f.sig === sig
  const error = matches(failed)
    ? failed!.error
    : matches(lastFail)
      ? lastFail!.error
      : null

  const run = useCallback(
    async (label: string, failOp: string, work: () => Promise<StudyPlan>) => {
      setBusy(label)
      setFailed(null)
      try {
        onPlanChange(await work())
        if (lastFail?.op === failOp) lastFail = null
      } catch (e) {
        const f = { op: failOp, sig, error: friendlyError(e) }
        lastFail = f
        // Pasado un rato se olvida y se vuelve a intentar solo al volver al Inicio.
        clearTimeout(forgetTimer)
        forgetTimer = window.setTimeout(() => lastFail === f && (lastFail = null), FAIL_MEMORY_MS)
        setFailed(f)
      } finally {
        setBusy(null)
      }
    },
    [onPlanChange, sig],
  )

  const create = useCallback(
    () => run('Creando tu plan de 12 semanas…', 'create', () => createPlan(settings.geminiKey, mainModels(settings))),
    [run, settings],
  )
  const prepareWeek = useCallback(
    (n: number) =>
      run(`Preparando las lecciones de la semana ${n}…`, `week:${n}`, () => ensureWeekLessons(settings.geminiKey, mainModels(settings), n)),
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
        <div className="text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </div>
        <button
          onClick={() => (op === 'create' ? create() : prepareWeek(today!.week.n))}
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
          <span className="block fs-15 font-semibold">¡Plan de 12 semanas completado!</span>
          <span className="txt-sub block fs-12.5">Crea uno nuevo con tu nivel actual.</span>
        </span>
        <button onClick={create} className="btn-acc h-9 flex-none rounded-[18px] px-3.5 fs-13">
          Nuevo plan
        </button>
      </div>,
    )
  }

  const { week, lesson, ahead } = today
  const gram = lesson && onOpenGrammar ? topicForLesson(week, lesson) : undefined
  const done = weekDone(plan, week.n)
  const finishedToday = doneToday(plan)

  return shell(
    <>
      <button onClick={onOpenPlan} className="flex w-full flex-wrap items-center justify-between gap-x-2 text-left">
        <span className="txt-acc2 fs-11 tracking-[1.2px] uppercase">
          {finishedToday ? '✓ Lección de hoy hecha' : 'Lección de hoy'}
          <span className="plan-week"> · Semana {week.n} de {PLAN_WEEKS}</span>
        </span>
        <span className="txt-sub flex items-center gap-0.5 text-xs">
          Mi plan
          <Icon name="chevR" size={13} stroke={2} />
        </span>
      </button>
      {lesson && (
        <>
          <div className="mt-1 truncate fs-16 leading-tight font-semibold">{lesson.titleEs}</div>
          <div className="plan-mission txt-sub mt-0.5 truncate fs-12.5">
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
            {gram && (
              // En la misma fila que el botón: la tarjeta no crece (Inicio sin scroll).
              <button
                onClick={() => onOpenGrammar!(gram.id)}
                className="field flex h-9 max-w-[42%] min-w-0 flex-none items-center gap-1 rounded-[18px] px-2.5 fs-12"
                title={`Gramática: ${gram.nameEs}`}
                aria-label={`Ver en Gramática: ${gram.nameEs}`}
              >
                <span aria-hidden>📘</span>
                <span className="truncate">{gram.nameEs}</span>
              </button>
            )}
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
