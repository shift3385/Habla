import { useEffect, useRef, useState, type RefObject } from 'react'
import { tipDuration, type Tip } from '../lib/mascotTips'
import { Icon } from '../ui/icons'

/** Pausa entre un globo y el siguiente, y espera antes del primero. */
const GAP_MS = 8000
const FIRST_MS = 1500

/**
 * Globo flotante de la mascota en el Inicio. Va mostrando los consejos de uno en uno: aparece junto a la mascota,
 * encima de su tarjeta (sin ocupar sitio ni tapar `avoid`, p. ej. el botón Sorpréndeme), se queda unos segundos y se va.
 * Tocarlo hace su acción (si la tiene) o lo oculta; `nudge` cambia cuando tocas a la mascota: pasa al siguiente ya.
 */
export default function MascotBubble({
  tips,
  wrap,
  mascot,
  avoid,
  nudge,
  paused,
  onAction,
  onSpeaking,
}: {
  tips: Tip[]
  wrap: RefObject<HTMLElement | null>
  mascot: RefObject<HTMLElement | null>
  avoid?: RefObject<HTMLElement | null>
  nudge: number
  paused?: boolean
  onAction: (tip: Tip) => void
  onSpeaking: (on: boolean) => void
}) {
  const [idx, setIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{ left: number; right: number; top: number } | null>(null)
  const [retry, setRetry] = useState(0)
  const hideTimer = useRef(0)
  const live = useRef({ idx, tips })
  useEffect(() => {
    live.current = { idx, tips }
  })

  // Junto a la mascota, a su derecha, sin llegar al botón que hay que dejar a la vista.
  const place = () => {
    const w = wrap.current?.getBoundingClientRect()
    const m = mascot.current?.getBoundingClientRect()
    if (!w || !m) return
    const a = avoid?.current?.getBoundingClientRect()
    // Si al lado del botón no cabe con holgura (p. ej. Ember), usa todo el ancho: lo tapa solo mientras se ve.
    const right = a && a.left - m.right >= 210 ? w.right - a.left + 6 : 6
    setBox({ left: m.right - w.left - 4, right, top: m.top + m.height / 2 - w.top })
  }
  const showNext = () => {
    const { idx: i, tips: list } = live.current
    if (!list.length) return
    window.clearTimeout(hideTimer.current)
    const next = (i + 1) % list.length
    place()
    setIdx(next)
    setOpen(true)
    hideTimer.current = window.setTimeout(() => setOpen(false), tipDuration(list[next].text))
  }
  const showRef = useRef(showNext)
  useEffect(() => {
    showRef.current = showNext
  })

  // Ciclo: aparece, se va, pausa, el siguiente. Quieto con la app en segundo plano o en pausa.
  useEffect(() => {
    if (paused || open || !tips.length) return
    const t = window.setTimeout(
      () => (document.hidden ? setRetry((r) => r + 1) : showRef.current()),
      live.current.idx < 0 ? FIRST_MS : GAP_MS,
    )
    return () => window.clearTimeout(t)
  }, [open, paused, tips.length, retry])

  // Tocar a la mascota: el siguiente consejo ya.
  useEffect(() => {
    if (nudge) showRef.current()
  }, [nudge])

  useEffect(() => onSpeaking(open), [open, onSpeaking])
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  const tip = idx >= 0 && tips.length ? tips[idx % tips.length] : null
  if (!tip || !box) return null
  return (
    <button
      type="button"
      role="status"
      aria-live="polite"
      aria-hidden={!open}
      tabIndex={open ? 0 : -1}
      onClick={() => {
        window.clearTimeout(hideTimer.current)
        setOpen(false)
        if (tip.action) onAction(tip)
      }}
      className="absolute z-30 flex items-center gap-1 rounded-[16px] px-3 py-2 text-left text-[12.5px] leading-snug shadow-lg transition-[opacity,transform] duration-300"
      style={{
        left: box.left,
        right: box.right,
        top: box.top,
        background: 'var(--bg)',
        border: '1px solid var(--gb)',
        color: 'var(--tx)',
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transform: `translateY(-50%) scale(${open ? 1 : 0.92})`,
        transformOrigin: 'left center',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Piquito hacia la mascota. */}
      <span
        className="absolute top-1/2 -left-[6px] h-3 w-3 -translate-y-1/2 rotate-45"
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--gb)', borderBottom: '1px solid var(--gb)' }}
      />
      <span className="relative min-w-0 flex-1">{tip.text}</span>
      {tip.action && (
        <span className="txt-acc2 relative flex-none">
          <Icon name="chevR" size={14} stroke={2} />
        </span>
      )}
    </button>
  )
}
