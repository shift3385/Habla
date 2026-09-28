import { useRef } from 'react'

export type Phase = 'starting' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

const LABELS: Record<Phase, string> = {
  starting: 'Preparando…',
  idle: 'Mantén presionado para hablar',
  recording: 'Te escucho… suelta al terminar',
  transcribing: 'Transcribiendo…',
  thinking: 'El profe está pensando…',
  speaking: 'Mantén presionado para interrumpir y hablar',
}

interface Props {
  phase: Phase
  onPress: () => void
  onRelease: () => void
}

export default function TalkButton({ phase, onPress, onRelease }: Props) {
  const busy = phase === 'starting' || phase === 'transcribing' || phase === 'thinking'
  const recording = phase === 'recording'
  const pressed = useRef(false)
  const release = () => {
    if (!pressed.current) return
    pressed.current = false
    onRelease()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="Mantener para hablar"
        disabled={busy}
        onPointerDown={(e) => {
          if (busy) return
          e.currentTarget.setPointerCapture(e.pointerId)
          pressed.current = true
          onPress()
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        className={`no-select relative flex h-28 w-28 items-center justify-center rounded-full text-5xl shadow-xl transition-all duration-150 ${
          recording
            ? 'scale-110 bg-red-500 shadow-red-500/40'
            : busy
              ? 'bg-slate-700 opacity-70'
              : 'bg-brand shadow-brand/30 active:scale-95'
        }`}
      >
        {recording && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
        <span className="relative">{busy ? '⏳' : '🎙️'}</span>
      </button>
      <p className="h-5 text-center text-sm text-slate-300">{LABELS[phase]}</p>
    </div>
  )
}
