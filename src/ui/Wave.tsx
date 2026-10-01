/** Barras de onda animadas (al grabar o cuando habla el profe). */
export default function Wave({
  n = 5,
  color = 'var(--acc)',
  on,
  w = 3,
  h = 26,
}: {
  n?: number
  color?: string
  on: boolean
  w?: number
  h?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: h, opacity: on ? 1 : 0.35 }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            width: w,
            height: h,
            borderRadius: w,
            background: color,
            transformOrigin: 'center',
            transform: on ? undefined : 'scaleY(.25)',
            animation: on ? `hb-wave ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.09}s infinite` : 'none',
          }}
        />
      ))}
    </div>
  )
}
