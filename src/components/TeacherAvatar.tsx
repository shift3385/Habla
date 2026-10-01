import type { Phase } from './TalkButton'

/** Avatar del profe: late al hablar, puntos al pensar. */
export default function TeacherAvatar({ phase, size = 44 }: { phase: Phase; size?: number }) {
  const speaking = phase === 'speaking'
  const thinking = phase === 'thinking' || phase === 'transcribing' || phase === 'starting'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-orange-400/40" />}
      <div
        className={`relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 shadow-lg ${
          speaking ? 'scale-105' : ''
        } transition-transform`}
        style={{ fontSize: size * 0.5 }}
      >
        🦉
      </div>
      {thinking && (
        <span className="absolute -right-1 -bottom-1 flex gap-0.5 rounded-full bg-slate-800 px-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 animate-bounce rounded-full bg-orange-300"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      )}
    </div>
  )
}
