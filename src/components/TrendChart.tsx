import { useState } from 'react'

export interface Point {
  label: string // fecha corta
  value: number
  detail?: string
}

const MARK = '#ea580c' // validado contra el fondo oscuro (#0f172a)

/** Línea de una sola serie (nota de fluidez por sesión) con tooltip al tocar cada punto. */
export default function TrendChart({ points, max = 100, unit = '' }: { points: Point[]; max?: number; unit?: string }) {
  const [active, setActive] = useState<number | null>(points.length ? points.length - 1 : null)
  if (points.length === 0) return null

  const W = 320
  const H = 140
  const pad = { l: 28, r: 12, t: 12, b: 22 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const y = (v: number) => pad.t + ih - (Math.max(0, Math.min(max, v)) / max) * ih
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${path} L${x(points.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`
  const a = active !== null ? points[active] : null

  return (
    <div>
      <div className="mb-1 h-10 text-sm">
        {a && (
          <p>
            <span className="text-lg font-bold text-slate-50">
              {a.value}
              {unit}
            </span>{' '}
            <span className="text-slate-400">· {a.label}</span>
            {a.detail && <span className="block text-xs text-slate-400">{a.detail}</span>}
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución de tu nota de fluidez">
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.07)" />
            <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
              {g}
            </text>
          </g>
        ))}
        <path d={area} fill={MARK} opacity={0.12} />
        <path d={path} fill="none" stroke={MARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + ih} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
        )}
        {points.map((p, i) => (
          <g key={i} onClick={() => setActive(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x(i)} cy={y(p.value)} r={14} fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r={i === active ? 5 : 4} fill={MARK} stroke="#0f172a" strokeWidth={2} />
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="9" fill="#94a3b8">
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text x={W - pad.r} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="end">
            {points[points.length - 1].label}
          </text>
        )}
      </svg>
    </div>
  )
}
