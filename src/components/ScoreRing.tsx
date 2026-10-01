/** Anillo grande de la nota de fluidez (estilo del rediseño: acento sobre pista de cristal). */
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
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gb)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--acc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 4px 12px var(--glow))' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-tight">
        <span className="font-semibold" style={{ fontSize: size * 0.26, letterSpacing: '-1px' }}>
          {label}
        </span>
        {sublabel && <span className="txt-sub text-xs">{sublabel}</span>}
      </div>
    </div>
  )
}
