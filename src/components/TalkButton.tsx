import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../ui/icons'
import Wave from '../ui/Wave'
import { isOwnPointer, pointerDownAction } from './talkGesture'

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
  companion?: ReactNode // mascota del tema, a la izquierda del micrófono (diseño V4)
  /** Duración máxima de la respuesta (p. ej. 60 s con el corrector fonético): cuenta atrás y envío automático. */
  maxSeconds?: number
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
export default function TalkButton({ phase, elapsed, onPress, onRelease, onCancel, onKeyboard, companion, maxSeconds }: Props) {
  const busy = phase === 'starting' || phase === 'transcribing' || phase === 'thinking'
  const recording = phase === 'recording'
  const [lockedRaw, setLocked] = useState(false)
  // El bloqueo solo vale mientras se graba; si la grabación acaba por otra vía (error, envío), deja de aplicar.
  const locked = lockedRaw && recording
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  // `id` = pointerId del dedo que manda (AUD-MIC-304: los demás dedos se ignoran).
  const gesture = useRef({ active: false, x0: 0, y0: 0, done: false, id: -1 })

  const reset = () => {
    gesture.current.active = false
    setDrag({ x: 0, y: 0 })
  }

  // Límite de duración: al llegar, se envía solo (una vez); soltar el dedo después ya no vuelve a enviar.
  const autoSent = useRef(false)
  useEffect(() => {
    if (!recording) {
      autoSent.current = false
      return
    }
    if (maxSeconds && elapsed >= maxSeconds && !autoSent.current) {
      autoSent.current = true
      gesture.current = { ...gesture.current, active: false, done: true }
      setDrag({ x: 0, y: 0 })
      setLocked(false)
      haptic()
      onRelease()
    }
  }, [elapsed, recording, maxSeconds, onRelease])
  const left = maxSeconds ? Math.max(0, maxSeconds - elapsed) : null
  const time = left !== null ? `quedan ${clock(left)}` : clock(elapsed)

  // REV-T2-1: si el gesto se quedara «activo» (un pointerup perdido), al pasar a procesar o pensar se suelta, para que
  // la guarda de otros dedos no bloquee el botón en el turno siguiente.
  useEffect(() => {
    if (busy) gesture.current.active = false
  }, [busy])

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Reglas de los dedos en talkGesture.ts (AUD-MIC-304, REV-T2-1).
    const action = pointerDownAction(gesture.current, e.pointerId, { busy, locked, recording })
    if (action === 'ignore') return
    if (action === 'send') {
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
    gesture.current = { active: true, x0: e.clientX, y0: e.clientY, done: false, id: e.pointerId }
    onPress()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!isOwnPointer(g, e.pointerId) || g.done) return
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

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!isOwnPointer(g, e.pointerId)) return
    reset()
    if (!g.done) onRelease()
  }

  const holding = recording && !locked
  const lockProgress = Math.min(1, drag.y / LOCK_DY)
  const cancelProgress = Math.min(1, drag.x / CANCEL_DX)
  const wavesOn = recording || phase === 'speaking'

  const label = locked
    ? `Bloqueado · ${time} · toca ➤ para enviar`
    : recording
      ? `${time} · suelta para enviar · ↑ bloquear · ← cancelar`
      : maxSeconds && phase === 'idle'
        ? `${LABELS[phase]} · máx. ${maxSeconds} s`
        : LABELS[phase]
  // Últimos 10 s: el aviso se vuelve naranja.
  const ending = recording && left !== null && left <= 10

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

        <div className={`flex justify-center ${companion ? 'w-[84px]' : 'w-[52px]'}`}>
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
            (companion ?? <Wave on={wavesOn} />)
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
          onLostPointerCapture={onPointerUp}
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
      <div className="txt-sub h-5 text-center text-[13px] tabular-nums" style={ending ? { color: '#f59e0b', fontWeight: 600 } : undefined}>
        {label}
      </div>
    </div>
  )
}
