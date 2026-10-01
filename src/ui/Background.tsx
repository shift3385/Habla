import type { ThemeVars } from './theme'

/** Fondo del tema: tres manchas de color desenfocadas que se mueven despacio, más un velo. */
export default function Background({ t }: { t: ThemeVars }) {
  const blob = (style: React.CSSProperties) => (
    <div style={{ position: 'absolute', borderRadius: '50%', willChange: 'transform', ...style }} />
  )
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, background: t.bg, overflow: 'hidden', zIndex: 0, transition: 'background .4s' }}
    >
      {blob({ width: 420, height: 420, left: -150, top: -70, background: t.b1, filter: 'blur(70px)', opacity: 0.85, animation: 'hb-drift 14s ease-in-out infinite' })}
      {blob({ width: 380, height: 380, right: -170, top: 240, background: t.b2, filter: 'blur(80px)', opacity: 0.8, animation: 'hb-drift 18s ease-in-out infinite reverse' })}
      {blob({ width: 360, height: 360, left: -70, bottom: -150, background: t.b3, filter: 'blur(80px)', opacity: 0.75, animation: 'hb-drift 22s ease-in-out infinite' })}
      <div style={{ position: 'absolute', inset: 0, background: t.veil }} />
    </div>
  )
}
