import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useRef, useState } from 'react'

export type Phase = 'starting' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

const LABELS: Record<Phase, string> = {
  starting: 'Preparando…',
  idle: 'Mantén presionado para hablar',
  recording: 'Suelta para enviar',
  transcribing: 'Procesando audio…',
  thinking: 'El profe te escucha y piensa…',
  speaking: 'Mantén presionado para interrumpir y hablar',
}

/** Distancias (px) para bloquear deslizando hacia arriba y cancelar deslizando a la izquierda. */
const LOCK_DY = 80
const CANCEL_DX = 110

interface Props {
  phase: Phase
  onPress: () => void // empieza a grabar
  onRelease: () => void // envía
  onCancel: () => void // descarta la grabación
}

function haptic() {
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
}

/**
 * Botón de hablar estilo WhatsApp:
 * - mantener y soltar → envía
 * - mantener y deslizar ↑ → bloquea: puedes soltar y seguir hablando; tocar ➤ envía
 * - mantener y deslizar ← → cancela
 */
export default function TalkButton({ phase, onPress, onRelease, onCancel }: Props) {
  const busy = phase === 'starting' || phase === 'transcribing' || phase === 'thinking'
  const recording = phase === 'recording'
  const [lockedRaw, setLocked] = useState(false)
  // El bloqueo solo vale mientras se graba; si la grabación acaba por otra vía (error, envío), deja de aplicar.
  const locked = lockedRaw && recording
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const gesture = useRef<{ active: boolean; x0: number; y0: number; done: boolean }>({
    active: false,
    x0: 0,
    y0: 0,
    done: false,
  })

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

  const showGestureHints = recording && !locked
  const lockProgress = Math.min(1, drag.y / LOCK_DY)
  const cancelProgress = Math.min(1, drag.x / CANCEL_DX)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex w-full items-center justify-center">
        {/* Candado: aparece al grabar y sube con el dedo */}
        {showGestureHints && (
          <div
            className="pointer-events-none absolute -top-20 flex flex-col items-center text-slate-300 transition-opacity"
            style={{ transform: `translateY(${-lockProgress * 16}px)`, opacity: 0.6 + lockProgress * 0.4 }}
          >
            <span
              className={`flex h-12 w-10 flex-col items-center justify-center rounded-full ${
                lockProgress > 0.6 ? 'bg-orange-500 text-white' : 'bg-slate-800'
              }`}
            >
              <span className="text-lg leading-none">🔒</span>
              <span className="text-[10px] leading-none">▲</span>
            </span>
          </div>
        )}
        {/* Cancelar: a la izquierda */}
        {showGestureHints && (
          <div
            className="pointer-events-none absolute left-0 flex items-center gap-1 text-sm"
            style={{ opacity: 0.5 + cancelProgress * 0.5, color: cancelProgress > 0.6 ? '#fca5a5' : '#94a3b8' }}
          >
            🗑 ‹ desliza para cancelar
          </div>
        )}
        {/* Con bloqueo: botón para descartar */}
        {locked && recording && (
          <button
            type="button"
            onClick={() => {
              setLocked(false)
              onCancel()
            }}
            className="absolute left-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl active:bg-slate-700"
            aria-label="Descartar grabación"
          >
            🗑
          </button>
        )}

        <button
          type="button"
          aria-label={locked ? 'Enviar' : 'Mantener para hablar'}
          disabled={busy}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          style={showGestureHints ? { transform: `translate(${-drag.x * 0.5}px, ${-drag.y * 0.5}px) scale(1.1)` } : undefined}
          className={`no-select relative flex h-28 w-28 items-center justify-center rounded-full text-5xl shadow-xl transition-[background-color,box-shadow,opacity] duration-150 ${
            locked
              ? 'bg-emerald-500 shadow-emerald-500/40'
              : recording
                ? 'bg-red-500 shadow-red-500/40'
                : busy
                  ? 'bg-slate-700 opacity-70'
                  : 'bg-brand shadow-brand/30 active:scale-95'
          }`}
        >
          {recording && !locked && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
          <span className="relative">{busy ? '⏳' : locked ? '➤' : '🎙️'}</span>
        </button>
      </div>
      <p className="h-5 text-center text-sm text-slate-300">
        {locked && recording
          ? '🔒 Bloqueado: habla tranquilo y toca ➤ para enviar'
          : recording
            ? 'Suelta para enviar · ↑ bloquear · ← cancelar'
            : LABELS[phase]}
      </p>
    </div>
  )
}
