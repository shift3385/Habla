import { useId } from 'react'

/** Anillo de progreso (nota de fluidez o meta diaria). */
export default function ScoreRing({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  label,
  sublabel,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  label: string
  sublabel?: string
}) {
  // useId puede traer caracteres no válidos dentro de url(#…)
  const gid = 'ring' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }}
        />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center leading-tight">
        <span className="font-bold text-slate-50" style={{ fontSize: size * 0.24 }}>
          {label}
        </span>
        {sublabel && <span className="text-[11px] text-slate-400">{sublabel}</span>}
      </div>
    </div>
  )
}
