/** Orbe del profe: gradiente cónico girando dentro de una esfera de cristal. Late más rápido al hablar. */
export default function Orb({ size, colors, active = false }: { size: number; colors: [string, string]; active?: boolean }) {
  const [c0, c1] = colors
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: 'none',
        animation: active ? 'hb-pulse 1.4s ease-in-out infinite' : 'hb-pulse 5s ease-in-out infinite',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.28,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c0}66, transparent 65%)`,
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.4)',
          boxShadow: `inset 0 0 ${size * 0.2}px rgba(255,255,255,.3)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-25%',
            background: `conic-gradient(from 0deg, ${c0}, transparent 28%, ${c1} 50%, transparent 72%, ${c0})`,
            filter: `blur(${Math.max(3, size * 0.09)}px)`,
            opacity: 0.95,
            animation: `hb-spin ${active ? 2.5 : 9}s linear infinite`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.9), rgba(255,255,255,0) 24%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '54%',
            width: size * 0.1,
            height: size * 0.1,
            marginLeft: -size * 0.05,
            marginTop: -size * 0.05,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: `0 0 ${size * 0.22}px ${size * 0.07}px rgba(255,255,255,.75)`,
          }}
        />
      </div>
    </div>
  )
}
