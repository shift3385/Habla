// B7 · Experimento de atribución de CPU (temporal, sin tocar datos). MODO se fija con argumento previo: const MODO = '...'
// 'base' = todo normal; 'css' = pausa las animaciones CSS infinitas; 'raf' = congela requestAnimationFrame (la mascota);
// 'ambos' = las dos. Al volver a 'base' se reanudan las animaciones y se re-programan los rAF retenidos.
const W = window
W.__b7raf ??= { orig: W.requestAnimationFrame, held: [] }
const st = W.__b7raf
const freeze = MODO === 'raf' || MODO === 'ambos'
const pauseCss = MODO === 'css' || MODO === 'ambos'
if (freeze) W.requestAnimationFrame = (f) => { st.held.push(f); return 0 }
else { W.requestAnimationFrame = st.orig; const h = st.held.splice(0); h.forEach((f) => st.orig.call(W, f)) }
document.getAnimations().filter((a) => a.effect?.getTiming?.().iterations === Infinity).forEach((a) => (pauseCss ? a.pause() : a.play()))
await new Promise((r) => setTimeout(r, 300))
JSON.stringify({ MODO, held: st.held.length, running: document.getAnimations().filter((a) => a.playState === 'running').length })
