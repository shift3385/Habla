import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { challengeHistory, closePastWeeks, currentChallenge, doneDay, markChallengeCelebrated, measureChallenge, nextChallengeToCelebrate } from '../lib/challenge'
import type { WeeklyChallenge } from '../lib/db'
import type { Settings } from '../lib/settings'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'
import MilestoneGate, { CELEBRATION_MS } from './MilestoneGate'

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 5.13 (P-14): «¡Reto cumplido!» al volver al Inicio, con la mascota del tema (mismo formato que los logros de
 * MilestoneGate, que va antes: App la monta cuando esa termina, así nunca salen dos a la vez). Mide el reto de la semana
 * (y cierra las pasadas) y, si hay uno cumplido sin celebrar, lo cuenta; «Seguir» lo marca como celebrado. Con los avisos
 * de la mascota apagados se marca sin enseñar nada (sigue en Progreso como cumplido).
 */
export default function ChallengeGate({ settings, onOpen }: { settings: Settings; onOpen?: () => void }) {
  const [current, setCurrent] = useState<WeeklyChallenge | null>(null)
  const notices = settings.mascotNotices

  useEffect(() => {
    let alive = true
    ;(async () => {
      await closePastWeeks()
      const c = await currentChallenge()
      if (c) await measureChallenge(c)
      const next = nextChallengeToCelebrate(await challengeHistory())
      if (!alive || !next) return
      if (!notices) return void (await markChallengeCelebrated(next.id))
      setCurrent(next)
    })().catch(() => {})
    return () => {
      alive = false
    }
  }, [notices])

  const card = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = card.current
    if (!current || !el || reducedMotion() || typeof el.animate !== 'function') return
    let anim: Animation | null = null
    const start = () => {
      if (document.hidden || anim) return
      anim = el.animate(
        [
          { transform: 'scale(.82) translateY(18px)', opacity: 0 },
          { transform: 'scale(1.04) translateY(0)', opacity: 1, offset: 0.55 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: CELEBRATION_MS, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
      )
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      document.removeEventListener('visibilitychange', start)
      anim?.cancel()
    }
  }, [current])

  if (!current) return null
  const element = THEME_INFO[settings.theme]?.mascot ?? 'aqua'
  const close = (open?: boolean) => {
    setCurrent(null)
    markChallengeCelebrated(current.id)
      .catch(() => {})
      .finally(() => open && onOpen?.())
  }

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[40] flex items-center justify-center px-4 pt-[env(safe-area-inset-top)] bottom-[calc(env(safe-area-inset-bottom)+96px)] [html[data-landscape]_&]:right-[calc(env(safe-area-inset-right)+86px)] [html[data-landscape]_&]:bottom-0"
      style={{ background: 'rgba(0,0,0,.35)', color: 'var(--tx)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-title"
      data-challenge-done={current.id}
    >
      <div
        ref={card}
        className="glass no-scrollbar flex max-h-full w-full max-w-sm flex-col items-center overflow-y-auto rounded-[28px] px-5 py-4 text-center [html[data-landscape]_&]:max-w-lg [html[data-landscape]_&]:flex-row [html[data-landscape]_&]:gap-4 [html[data-landscape]_&]:text-left"
        style={{ boxShadow: '0 18px 50px var(--glow)' }}
      >
        <div className="flex-none">
          <Mascot element={element} mood="happy" size={104} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center [html[data-landscape]_&]:items-start">
          <div className="txt-acc2 fs-13 font-semibold tracking-wide uppercase">¡Reto cumplido!</div>
          <div id="challenge-title" className="mt-0.5 fs-22 leading-tight font-semibold text-balance">
            <span aria-hidden>🏅</span> {current.titleEs}
          </div>
          <p className="mt-2 fs-15 leading-snug text-pretty">
            Lo conseguiste {current.doneAt ? `el ${doneDay(current.doneAt)}` : 'esta semana'}: {current.goalEs.replace(/\.$/, '').replace(/^./, (x) => x.toLowerCase())}. ¡Qué
            bien lo has hecho!
          </p>
          <button onClick={() => close()} className="btn-acc mt-3.5 h-[52px] w-full flex-none rounded-full fs-16" autoFocus>
            Seguir
          </button>
          {onOpen && (
            <button onClick={() => close(true)} className="txt-sub mt-1.5 h-10 fs-14 font-semibold">
              Ver mis retos
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * 5.13 (P-14): las celebraciones del Inicio en orden: primero un logro nuevo (MilestoneGate) y, cuando termina, el reto
 * cumplido. Se monta y desmonta con el Inicio, así cada visita empieza otra vez por los logros.
 */
export function HomeGates({ settings, onOpenChallenge }: { settings: Settings; onOpenChallenge?: () => void }) {
  const [milestonesDone, setMilestonesDone] = useState(false)
  return (
    <>
      <MilestoneGate settings={settings} onDone={() => setMilestonesDone(true)} />
      {milestonesDone && <ChallengeGate settings={settings} onOpen={onOpenChallenge} />}
    </>
  )
}
