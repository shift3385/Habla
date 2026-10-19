import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useEffect, useRef } from 'react'
import { Icon } from '../ui/icons'
import Wave from '../ui/Wave'
import { tapAction } from './talkGesture'

export type Phase = 'starting' | 'idle' | 'opening' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

const LABELS: Record<Phase, string> = {
  starting: 'Preparando…',
  idle: 'Toca para hablar',
  // P7: mientras Android abre el micro; lo que digas aquí aún no se graba.
  opening: 'Abriendo el micro… espera',
  recording: 'Toca para enviar',
  transcribing: 'Procesando audio…',
  thinking: 'Tu profe está pensando…',
  speaking: 'Toca para interrumpir y hablar',
}

/** Duración máxima de una respuesta (decisión del dueño, v5.9): al llegar se envía sola. */
export const MAX_TALK_SECONDS = 60

interface Props {
  phase: Phase
  elapsed: number // segundos grabando
  onPress: () => void // empieza a grabar
  onRelease: () => void // envía
  onCancel: () => void // descarta la grabación
  onKeyboard?: () => void // cambia a escribir la respuesta
  /** Nivel de la voz (0–1) mientras grabas: las barras junto al micro lo siguen (Recorder.level()). */
  level?: () => number
  /** Duración máxima de la respuesta: cuenta atrás y envío automático. Por defecto, 60 s. */
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
 * Botón de hablar (v5.9, AUD-MIC-305): toca para empezar a grabar y vuelve a tocar para enviar; la papelera
 * descarta. Como mucho `maxSeconds` (60 s): al llegar, se envía solo. El micrófono solo está abierto mientras
 * grabas (lo cierra la pantalla con `Recorder.finish()`). Antes había que mantener pulsado y el micro seguía
 * abierto toda la clase.
 */
/** 10 barras (petición del dueño): más altas en el centro, como una onda de voz. */
const SHAPE = [0.45, 0.6, 0.75, 0.9, 1, 1, 0.9, 0.75, 0.6, 0.45]

/** Barras que siguen el volumen real del micrófono (petición del dueño): quietas en silencio, altas al hablar. */
export function VoiceMeter({ level }: { level: () => number }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    let id = 0
    let last = 0
    let smooth = 0
    const tick = (t: number) => {
      id = requestAnimationFrame(tick)
      if (t - last < 50) return // ~20 lecturas por segundo bastan para seguir la voz
      last = t
      const v = level()
      smooth = v > smooth ? v : smooth * 0.75 + v * 0.25 // sube rápido, baja suave
      bars.current.forEach((b, i) => {
        if (!b) return
        const shape = SHAPE[i] ?? 1
        b.style.transform = `scaleY(${Math.max(0.15, Math.min(1, smooth * shape * (0.85 + Math.random() * 0.3)))})`
      })
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [level])
  return (
    <div className="flex items-center gap-[2px]" style={{ height: 30 }} aria-hidden>
      {SHAPE.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el
          }}
          style={{ width: 3, height: 30, borderRadius: 3, background: 'var(--acc)', transform: 'scaleY(.15)', transition: 'transform 90ms linear' }}
        />
      ))}
    </div>
  )
}

/** Color del anillo según lo que queda: el de tu tema; naranja en los últimos 10 s; rojo en los últimos 5 s. */
function ringColor(left: number) {
  return left <= 5 ? '#ef4444' : left <= 10 ? '#f59e0b' : 'var(--acc)'
}

export default function TalkButton({ phase, elapsed, onPress, onRelease, onCancel, onKeyboard, level, maxSeconds = MAX_TALK_SECONDS }: Props) {
  const busy = phase === 'starting' || phase === 'opening' || phase === 'transcribing' || phase === 'thinking'
  const recording = phase === 'recording'

  // Límite de duración: al llegar, se envía solo (una vez).
  const autoSent = useRef(false)
  useEffect(() => {
    if (!recording) {
      autoSent.current = false
      return
    }
    if (elapsed >= maxSeconds && !autoSent.current) {
      autoSent.current = true
      haptic()
      onRelease()
    }
  }, [elapsed, recording, maxSeconds, onRelease])
  const left = Math.max(0, maxSeconds - elapsed)

  const onPointerDown = () => {
    // Reglas de los toques en talkGesture.ts (AUD-MIC-302/304/305).
    const action = tapAction({ busy, recording, recordingMs: elapsed * 1000 })
    if (action === 'ignore' || autoSent.current) return
    haptic()
    if (action === 'send') onRelease()
    else onPress()
  }

  const wavesOn = recording || phase === 'speaking'
  // Petición del dueño (2026-10-07): el tiempo ya no va en texto; lo cuenta el anillo alrededor del micro.
  const label = LABELS[phase]
  const ending = recording && left <= 10
  // Anillo de cuenta atrás: se vacía en el sentido de las agujas del reloj durante los `maxSeconds` de la respuesta
  // (el desplazamiento negativo hace avanzar el principio del trazo desde las 12 hacia las 3).
  const R = 54
  const C = 2 * Math.PI * R
  const used = Math.min(1, elapsed / maxSeconds)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center gap-[22px]">
        <div className="flex w-[52px] justify-center">
          {recording ? (
            <button
              type="button"
              onClick={() => {
                haptic()
                onCancel()
              }}
              className="glass grid h-[52px] w-[52px] place-items-center rounded-full"
              aria-label="Descartar grabación"
            >
              <Icon name="trash" size={20} />
            </button>
          ) : (
            <Wave n={10} w={2} on={phase === 'speaking'} />
          )}
        </div>

        <div className="relative grid place-items-center">
          {recording && (
            <svg
              className="pointer-events-none absolute"
              width={2 * R + 8}
              height={2 * R + 8}
              viewBox={`0 0 ${2 * R + 8} ${2 * R + 8}`}
              style={{ transform: 'rotate(-90deg)' }}
              aria-hidden
            >
              <circle cx={R + 4} cy={R + 4} r={R} fill="none" stroke="var(--gb)" strokeWidth={5} />
              <circle
                cx={R + 4}
                cy={R + 4}
                r={R}
                fill="none"
                stroke={ringColor(left)}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={-C * used}
                style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s ease' }}
              />
            </svg>
          )}
          <button
            type="button"
            aria-label={recording ? 'Enviar' : 'Tocar para hablar'}
            disabled={busy}
            onPointerDown={onPointerDown}
            onContextMenu={(e) => e.preventDefault()}
            className="no-select grid h-[88px] w-[88px] place-items-center rounded-full disabled:opacity-60"
            style={{
              border: '1px solid rgba(255,255,255,.35)',
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 45%), var(--acc)',
              color: 'var(--ink)',
              boxShadow: recording ? '0 0 40px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
              transition: 'all .25s ease',
            }}
          >
            {recording ? <Icon name="send" size={30} stroke={1.8} /> : <Icon name="mic" size={32} stroke={1.8} />}
          </button>
        </div>

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
          ) : recording && level ? (
            <VoiceMeter level={level} />
          ) : (
            <Wave n={10} w={2} on={wavesOn} />
          )}
        </div>
      </div>
      <div className="txt-sub h-5 text-center text-[13px] tabular-nums" style={ending ? { color: ringColor(left), fontWeight: 600 } : undefined}>
        {ending ? `${label} · ${clock(left)}` : label}
      </div>
    </div>
  )
}
