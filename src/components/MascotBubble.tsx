import { useEffect, useRef, useState, type RefObject } from 'react'
import { firstDelay, nextGap, tipDuration, type Tip } from '../lib/mascotTips'
import { Icon } from '../ui/icons'

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
  onShown,
}: {
  tips: Tip[]
  wrap: RefObject<HTMLElement | null>
  mascot: RefObject<HTMLElement | null>
  avoid?: RefObject<HTMLElement | null>
  nudge: number
  paused?: boolean
  onAction: (tip: Tip) => void
  onSpeaking: (on: boolean) => void
  /** Cada vez que se muestra un globo (para recordar por qué consejo se va). */
  onShown?: (tip: Tip) => void
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
    const right = a && a.left - m.right >= 222 ? w.right - a.left + 14 : 6
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
    onShownRef.current?.(list[next])
  }
  const onShownRef = useRef(onShown)
  useEffect(() => {
    onShownRef.current = onShown
  })
  const showRef = useRef(showNext)
  useEffect(() => {
    showRef.current = showNext
  })

  // Ciclo: aparece, se va, pausa, el siguiente. Quieto con la app en segundo plano o en pausa.
  useEffect(() => {
    if (paused || open || !tips.length) return
    const t = window.setTimeout(
      () => (document.hidden ? setRetry((r) => r + 1) : showRef.current()),
      live.current.idx < 0 ? firstDelay() : nextGap(),
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
      className="tip-bubble absolute z-30 flex flex-col items-start gap-1.5 rounded-[16px] px-3 py-2 text-left text-[12.5px] leading-snug shadow-lg transition-[opacity,transform] duration-300"
      style={{
        left: box.left,
        right: box.right,
        top: box.top,
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
        style={{ background: 'var(--tip-bg)', borderLeft: '1px solid var(--tip-border)', borderBottom: '1px solid var(--tip-border)' }}
      />
      <span className="relative min-w-0">{tip.text}</span>
      {/* La acción va DENTRO del globo, como botón con texto y a la izquierda: no se confunde con los botones de al lado. */}
      {tip.action && tip.cta && (
        <span className="btn-acc relative flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold">
          <Icon name={tip.action === 'review' ? 'cards' : 'mic'} size={12} />
          {tip.cta}
        </span>
      )}
    </button>
  )
}
