import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Milestone } from '../lib/db'
import { markCelebrated, milestoneDef, milestoneSays, nextToCelebrate, syncMilestones } from '../lib/milestones'
import type { Settings } from '../lib/settings'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

/** Duración de la animación de entrada (≤ 2 s, PLAN §1.7: batería). Después no se anima nada más que la mascota. */
export const CELEBRATION_MS = 1200

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 5.11 (M-03): celebración de un hito al volver al Inicio. Lo monta D4 en el Inicio (integración I-1):
 * `<MilestoneGate settings onDone />`. Sincroniza los hitos (milestones.ts) y, si hay uno sin celebrar, la mascota del
 * tema en `happy` lo cuenta con su frase; «Seguir» lo marca como celebrado y llama a `onDone`. Uno por vez: si hay
 * varios, el siguiente sale la próxima vez que vuelvas al Inicio. Sin hitos nuevos, no pinta nada y llama a `onDone`.
 * Con los avisos de la mascota apagados (`mascotNotices`), los hitos se guardan (salen en «Tus logros») sin celebración.
 * No tapa la barra de pestañas (abajo en vertical, a la derecha en horizontal) y con la app en segundo plano no se
 * anima: la animación de entrada dura 1,2 s y solo empieza con la app visible; la mascota se para sola (Mascot.tsx).
 */
export default function MilestoneGate({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const [current, setCurrent] = useState<Milestone | null>(null)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })
  const notices = settings.mascotNotices

  useEffect(() => {
    let alive = true
    syncMilestones()
      .then(async ({ saved }) => {
        if (!alive) return
        const next = nextToCelebrate(saved)
        if (!next) return doneRef.current()
        if (!notices) {
          // Sin avisos de la mascota: se dan por celebrados sin enseñar nada (no se acumulan para más tarde).
          for (const m of saved) if (!m.celebratedAt) await markCelebrated(m.id)
          return doneRef.current()
        }
        setCurrent(next)
      })
      .catch(() => alive && doneRef.current())
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
    // Si la app está en segundo plano al llegar, la animación espera a que vuelvas (y no se repite).
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      document.removeEventListener('visibilitychange', start)
      anim?.cancel()
    }
  }, [current])

  if (!current) return null
  const def = milestoneDef(current.id)
  if (!def) return null
  const element = THEME_INFO[settings.theme]?.mascot ?? 'aqua'
  const close = () => {
    setCurrent(null)
    markCelebrated(current.id)
      .catch(() => {})
      .finally(() => doneRef.current())
  }

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[40] flex items-center justify-center px-4 pt-[env(safe-area-inset-top)] bottom-[calc(env(safe-area-inset-bottom)+96px)] [html[data-landscape]_&]:right-[calc(env(safe-area-inset-right)+86px)] [html[data-landscape]_&]:bottom-0"
      style={{ background: 'rgba(0,0,0,.35)', color: 'var(--tx)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
      data-milestone={current.id}
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
          <div className="txt-acc2 fs-13 font-semibold tracking-wide uppercase">¡Nuevo logro!</div>
          <div id="milestone-title" className="mt-0.5 fs-22 leading-tight font-semibold text-balance">
            <span aria-hidden>{def.emoji}</span> {def.title}
          </div>
          <p className="mt-2 fs-15 leading-snug text-pretty">{milestoneSays(current.id, element)}</p>
          <button onClick={close} className="btn-acc mt-3.5 h-[52px] w-full flex-none rounded-full fs-16" autoFocus>
            Seguir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
