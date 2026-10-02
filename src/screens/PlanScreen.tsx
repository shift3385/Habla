import { useEffect, useState } from 'react'
import { friendlyError } from '../lib/errors'
import {
  createPlan,
  currentWeek,
  ensureWeekLessons,
  KIND_ES,
  LESSONS_PER_WEEK,
  PLAN_WEEKS,
  REVIEW_WEEKS,
  totalDone,
  weekDone,
  type StudyPlan,
} from '../lib/plan'
import { mainModels, type Settings } from '../lib/settings'
import { speak } from '../lib/tts'
import { Icon } from '../ui/icons'

interface Props {
  settings: Settings
  plan: StudyPlan | null
  level: string // nivel actual (para compararlo con el del inicio del plan)
  onPlanChange: (p: StudyPlan) => void
  onStartLesson: (id: string) => void
  onBack: () => void
}

/** Mi plan (fase 4): las 12 semanas, su progreso, los re-tests y las lecciones de cada semana. */
export default function PlanScreen({ settings, plan, level, onPlanChange, onStartLesson, onBack }: Props) {
  const cur = plan ? currentWeek(plan) : 1
  const [open, setOpen] = useState<number | null>(Math.min(cur, PLAN_WEEKS))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)

  const run = async (label: string, work: () => Promise<StudyPlan>) => {
    setBusy(label)
    setError(null)
    try {
      onPlanChange(await work())
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  // Al abrir una semana sin lecciones (actual o anterior), se preparan solas.
  const openWeek = plan?.weeks.find((w) => w.n === open)
  const autoPrepare = !busy && !error && !!openWeek && !openWeek.lessons && openWeek.n <= cur + 1 ? openWeek.n : null
  useEffect(() => {
    if (!autoPrepare) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(`Preparando las lecciones de la semana ${autoPrepare}…`, () => ensureWeekLessons(settings.geminiKey, mainModels(settings), autoPrepare))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrepare])

  const fmt = (ts: number) => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  const DAY = 86_400_000

  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="text-2xl font-semibold tracking-[-.4px]">Mi plan</div>
      </div>

      {!plan && (
        <div className="glass rounded-[28px] p-[18px] text-sm">
          {busy ?? 'Aún no tienes plan. Se crea solo en el Inicio después del test de nivel.'}
        </div>
      )}

      {plan && (
        <>
          <div className="glass grid grid-cols-3 gap-2 rounded-[28px] p-4 text-center">
            <div>
              <div className="text-2xl font-semibold">{Math.min(cur, PLAN_WEEKS)}</div>
              <div className="txt-sub text-xs">semana de {PLAN_WEEKS}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalDone(plan)}</div>
              <div className="txt-sub text-xs">de {PLAN_WEEKS * LESSONS_PER_WEEK} lecciones</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {plan.levelAtStart === level ? level : `${plan.levelAtStart}→${level}`}
              </div>
              <div className="txt-sub text-xs">tu nivel</div>
            </div>
          </div>
          {plan.adaptedAt && (
            <div className="txt-sub px-2 text-center text-xs">Adaptado a tu último re-test el {fmt(plan.adaptedAt)}.</div>
          )}
          {error && (
            <div className="glass rounded-[22px] p-3.5 text-sm" style={{ color: '#f87171' }}>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {plan.weeks.map((w) => {
              const done = weekDone(plan, w.n)
              const isCur = w.n === cur
              const past = w.n < cur
              const expanded = open === w.n
              const starts = plan.start + (w.n - 1) * 7 * DAY
              return (
                <div key={w.n}>
                  <div
                    className="glass rounded-[24px]"
                    style={isCur ? { borderColor: 'var(--acc)', boxShadow: '0 0 0 1px var(--acc)' } : undefined}
                  >
                    <button onClick={() => setOpen(expanded ? null : w.n)} className="flex w-full items-center gap-3 p-3 text-left">
                      <span
                        className={`grid h-10 w-10 flex-none place-items-center rounded-full text-sm font-semibold ${
                          done >= LESSONS_PER_WEEK ? 'btn-acc' : isCur ? 'field txt-acc2' : 'field txt-sub'
                        }`}
                      >
                        {done >= LESSONS_PER_WEEK ? <Icon name="check" size={17} stroke={2.2} /> : w.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{w.titleEs}</span>
                        <span className="txt-sub block truncate text-[12.5px]">
                          {isCur ? 'Esta semana' : past ? `Semana ${w.n}` : `Desde el ${fmt(starts)}`} · {done}/{LESSONS_PER_WEEK}
                          {w.review ? ' · repaso' : ''}
                        </span>
                      </span>
                      <span className="txt-sub transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
                        <Icon name="chevD" size={15} stroke={2} />
                      </span>
                    </button>
                    {expanded && (
                      <div className="anim-up px-3.5 pb-3.5">
                        <div className="text-[13.5px] leading-snug">{w.focusEs}</div>
                        <div className="txt-sub mt-1 text-[12.5px] leading-snug">{w.canDoEs}</div>
                        {!w.lessons && (
                          <div className="txt-sub mt-3 text-[13px]">
                            {busy ??
                              (w.n > cur + 1 ? (
                                'Las lecciones se preparan cuando llegue la semana, adaptadas a cómo vas.'
                              ) : (
                                <button
                                  onClick={() =>
                                    run(`Preparando las lecciones de la semana ${w.n}…`, () =>
                                      ensureWeekLessons(settings.geminiKey, mainModels(settings), w.n),
                                    )
                                  }
                                  className="btn-acc h-10 w-full rounded-[20px] text-sm"
                                >
                                  Preparar lecciones
                                </button>
                              ))}
                          </div>
                        )}
                        {w.lessons && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {w.lessons.map((l) => {
                              const ok = !!plan.done[l.id]
                              return (
                                <div key={l.id} className="field flex items-center gap-2.5 rounded-[18px] px-3 py-2.5">
                                  <span
                                    className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-semibold ${ok ? 'btn-acc' : 'txt-sub'}`}
                                    style={ok ? undefined : { border: '1px solid var(--gb)' }}
                                  >
                                    {ok ? <Icon name="check" size={14} stroke={2.2} /> : l.n}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[13.5px] leading-tight font-semibold">{l.titleEs}</span>
                                    <span className="txt-sub block text-[11.5px]">
                                      {KIND_ES[l.kind]}
                                      {ok ? ` · hecha el ${fmt(plan.done[l.id].date)}` : ''}
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => speak(l.phrases[0]?.en ?? '', settings.ttsRate, settings.voiceIndex)}
                                    className="txt-sub grid h-8 w-8 flex-none place-items-center"
                                    aria-label="Escuchar una frase de la lección"
                                  >
                                    <Icon name="speaker" size={15} />
                                  </button>
                                  <button
                                    onClick={() => onStartLesson(l.id)}
                                    className={`h-8 flex-none rounded-2xl px-3 text-[12.5px] ${ok ? 'glass' : 'btn-acc'}`}
                                  >
                                    {ok ? 'Repetir' : 'Empezar'}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {REVIEW_WEEKS.includes(w.n) && (
                    <div className="txt-sub flex items-center gap-2 px-4 py-2 text-xs">
                      <Icon name="target" size={14} />
                      Re-test de nivel al terminar la semana {w.n} (desde el {fmt(starts + 7 * DAY)})
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              if (!confirmNew) return setConfirmNew(true)
              setConfirmNew(false)
              run('Creando un plan nuevo…', () => createPlan(settings.geminiKey, mainModels(settings)))
            }}
            disabled={!!busy}
            className="txt-sub h-10 text-sm underline underline-offset-[3px]"
          >
            {confirmNew ? '¿Seguro? Toca otra vez: se empieza de cero' : 'Crear un plan nuevo'}
          </button>
        </>
      )}
    </div>
  )
}
