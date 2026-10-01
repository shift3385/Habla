/** Selector segmentado con indicador que se desliza (Temas / Prácticas, Errores / Palabras…). */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const n = options.length
  return (
    <div
      className="glass relative grid h-12 rounded-3xl p-1"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <div
        className="absolute top-1 bottom-1 rounded-[20px]"
        style={{
          width: `calc(${100 / n}% - ${8 / n}px)`,
          left: `calc(${(100 / n) * idx}% + ${4 - (8 / n) * idx}px)`,
          background: 'var(--acc)',
          boxShadow: '0 6px 18px var(--glow)',
          transition: 'left .45s cubic-bezier(.3,1.4,.5,1)',
        }}
      />
      {options.map((o) => {
        const sel = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative z-[1] flex items-center justify-center gap-1.5 rounded-[20px] text-[15px] transition-colors"
            style={{ fontWeight: sel ? 600 : 500, color: sel ? 'var(--ink)' : 'var(--sub)' }}
          >
            {o.label}
            {o.count !== undefined && <span className="text-xs opacity-75">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
