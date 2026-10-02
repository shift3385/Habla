import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useRef, useState } from 'react'
import { Icon } from '../ui/icons'
import Wave from '../ui/Wave'

export type Phase = 'starting' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

const LABELS: Record<Phase, string> = {
  starting: 'Preparando…',
  idle: 'Mantén presionado para hablar',
  recording: 'Suelta para enviar',
  transcribing: 'Procesando audio…',
  thinking: 'Tu profe está pensando…',
  speaking: 'Mantén presionado para interrumpir y hablar',
}

/** Distancias (px) para bloquear deslizando hacia arriba y cancelar deslizando a la izquierda. */
const LOCK_DY = 80
const CANCEL_DX = 110

interface Props {
  phase: Phase
  elapsed: number // segundos grabando
  onPress: () => void // empieza a grabar
  onRelease: () => void // envía
  onCancel: () => void // descarta la grabación
  onKeyboard?: () => void // cambia a escribir la respuesta
}

function haptic() {
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
}

function clock(s: number) {
  const n = Math.floor(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/**
 * Botón de hablar estilo WhatsApp, con el aspecto del rediseño:
 * - mantener y soltar → envía
 * - mantener y deslizar ↑ → bloquea: puedes soltar y seguir hablando; tocar ➤ envía
 * - mantener y deslizar ← → cancela
 */
export default function TalkButton({ phase, elapsed, onPress, onRelease, onCancel, onKeyboard }: Props) {
  const busy = phase === 'starting' || phase === 'transcribing' || phase === 'thinking'
  const recording = phase === 'recording'
  const [lockedRaw, setLocked] = useState(false)
  // El bloqueo solo vale mientras se graba; si la grabación acaba por otra vía (error, envío), deja de aplicar.
  const locked = lockedRaw && recording
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const gesture = useRef({ active: false, x0: 0, y0: 0, done: false })

  const reset = () => {
    gesture.current.active = false
    setDrag({ x: 0, y: 0 })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (busy) return
    if (locked) {
      // Grabación bloqueada: este toque envía.
      setLocked(false)
      onRelease()
      return
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Algunos WebView no lo permiten; soltar fuera del botón igual llega por pointercancel.
    }
    setLocked(false)
    gesture.current = { active: true, x0: e.clientX, y0: e.clientY, done: false }
    onPress()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!g.active || g.done) return
    const dy = Math.max(0, g.y0 - e.clientY)
    const dx = Math.max(0, g.x0 - e.clientX)
    setDrag({ x: dx, y: dy })
    if (dy > LOCK_DY && dy > dx) {
      g.done = true
      haptic()
      setLocked(true)
      reset()
    } else if (dx > CANCEL_DX) {
      g.done = true
      haptic()
      reset()
      onCancel()
    }
  }

  const onPointerUp = () => {
    const g = gesture.current
    if (!g.active) return
    reset()
    if (!g.done) onRelease()
  }

  const holding = recording && !locked
  const lockProgress = Math.min(1, drag.y / LOCK_DY)
  const cancelProgress = Math.min(1, drag.x / CANCEL_DX)
  const wavesOn = recording || phase === 'speaking'

  const label = locked
    ? `Bloqueado · ${clock(elapsed)} · toca ➤ para enviar`
    : recording
      ? `${clock(elapsed)} · suelta para enviar · ↑ bloquear · ← cancelar`
      : LABELS[phase]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center gap-[22px]">
        {/* Candado: aparece al grabar y sube con el dedo */}
        {holding && (
          <div
            className="pointer-events-none absolute -top-[74px] left-1/2 -ml-5 flex h-12 w-10 flex-col items-center justify-center rounded-full transition-colors"
            style={{
              transform: `translateY(${-lockProgress * 16}px)`,
              background: lockProgress > 0.6 ? 'var(--acc)' : 'var(--g)',
              color: lockProgress > 0.6 ? 'var(--ink)' : 'var(--tx)',
              border: '1px solid var(--gb)',
            }}
          >
            <Icon name="lock" size={17} />
            <span className="text-[9px] leading-none">▲</span>
          </div>
        )}

        <div className="flex w-[52px] justify-center">
          {locked ? (
            <button
              type="button"
              onClick={() => {
                setLocked(false)
                onCancel()
              }}
              className="glass grid h-[52px] w-[52px] place-items-center rounded-full"
              aria-label="Descartar grabación"
            >
              <Icon name="trash" size={20} />
            </button>
          ) : holding && cancelProgress > 0.15 ? (
            <span className="transition-colors" style={{ color: cancelProgress > 0.6 ? '#f87171' : 'var(--sub)' }}>
              <Icon name="trash" size={22} />
            </span>
          ) : (
            <Wave on={wavesOn} />
          )}
        </div>

        <button
          type="button"
          aria-label={locked ? 'Enviar' : 'Mantener para hablar'}
          disabled={busy}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="no-select grid h-[88px] w-[88px] place-items-center rounded-full disabled:opacity-60"
          style={{
            border: '1px solid rgba(255,255,255,.35)',
            background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
            color: 'var(--ink)',
            boxShadow: recording ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
            transform: holding
              ? `translate(${-drag.x * 0.5}px, ${-drag.y * 0.5}px) scale(1.08)`
              : recording
                ? 'scale(1.08)'
                : 'scale(1)',
            transition: holding ? 'box-shadow .25s ease' : 'all .25s ease',
          }}
        >
          {locked ? <Icon name="send" size={30} stroke={1.8} /> : <Icon name="mic" size={32} stroke={1.8} />}
        </button>

        <div className="flex w-[52px] justify-center">
          {onKeyboard && !recording ? (
            <button
              type="button"
              onClick={onKeyboard}
              className="glass grid h-[52px] w-[52px] place-items-center rounded-full"
              aria-label="Escribir la respuesta"
            >
              <Icon name="keyboard" size={22} />
            </button>
          ) : (
            <Wave on={wavesOn} />
          )}
        </div>
      </div>
      <div className="txt-sub h-5 text-center text-[13px] tabular-nums">{label}</div>
    </div>
  )
}
