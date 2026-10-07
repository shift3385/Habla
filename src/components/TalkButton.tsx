import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../ui/icons'
import Wave from '../ui/Wave'
import { tapAction } from './talkGesture'

export type Phase = 'starting' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

const LABELS: Record<Phase, string> = {
  starting: 'Preparando…',
  idle: 'Toca para hablar',
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
  companion?: ReactNode // mascota del tema, a la izquierda del micrófono (diseño V4)
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
export default function TalkButton({ phase, elapsed, onPress, onRelease, onCancel, onKeyboard, companion, maxSeconds = MAX_TALK_SECONDS }: Props) {
  const busy = phase === 'starting' || phase === 'transcribing' || phase === 'thinking'
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
  const time = `quedan ${clock(left)}`

  const onPointerDown = () => {
    // Reglas de los toques en talkGesture.ts (AUD-MIC-302/304/305).
    const action = tapAction({ busy, recording, recordingMs: elapsed * 1000 })
    if (action === 'ignore' || autoSent.current) return
    haptic()
    if (action === 'send') onRelease()
    else onPress()
  }

  const wavesOn = recording || phase === 'speaking'
  const label = recording ? `${time} · toca para enviar` : phase === 'idle' ? `${LABELS.idle} · máx. ${maxSeconds} s` : LABELS[phase]
  // Últimos 10 s: el aviso se vuelve naranja.
  const ending = recording && left <= 10

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center gap-[22px]">
        <div className={`flex justify-center ${companion ? 'w-[84px]' : 'w-[52px]'}`}>
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
            (companion ?? <Wave on={wavesOn} />)
          )}
        </div>

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
            boxShadow: recording ? '0 0 0 14px var(--glow), 0 0 60px var(--glow)' : '0 0 0 6px var(--g), 0 14px 40px var(--glow)',
            transform: recording ? 'scale(1.08)' : 'scale(1)',
            transition: 'all .25s ease',
          }}
        >
          {recording ? <Icon name="send" size={30} stroke={1.8} /> : <Icon name="mic" size={32} stroke={1.8} />}
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
