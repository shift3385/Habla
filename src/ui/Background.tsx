import type { ThemeVars } from './theme'

/**
 * Fondo del tema: tres manchas de color desenfocadas, más un velo.
 * v5.8.2 (AUD-RES-700): las manchas ya NO se mueven. Animar capas enormes con `blur()` obligaba a redibujarlas en
 * cada fotograma (≈1 núcleo en reposo en el POCO); quietas, el WebView las pinta una vez y las reutiliza.
 */
export default function Background({ t }: { t: ThemeVars }) {
  const blob = (style: React.CSSProperties) => <div style={{ position: 'absolute', borderRadius: '50%', ...style }} />
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, background: t.bg, overflow: 'hidden', zIndex: 0, transition: 'background .4s' }}
    >
      {blob({ width: 420, height: 420, left: -150, top: -70, background: t.b1, filter: 'blur(70px)', opacity: 0.85 })}
      {blob({ width: 380, height: 380, right: -170, top: 240, background: t.b2, filter: 'blur(80px)', opacity: 0.8 })}
      {blob({ width: 360, height: 360, left: -70, bottom: -150, background: t.b3, filter: 'blur(80px)', opacity: 0.75 })}
      <div style={{ position: 'absolute', inset: 0, background: t.veil }} />
    </div>
  )
}
