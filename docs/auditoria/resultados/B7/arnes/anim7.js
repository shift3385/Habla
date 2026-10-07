// B7 · Qué anima la pantalla: animaciones CSS/Web activas, rAF por segundo, mascotas montadas. Solo lectura.
const an = document.getAnimations()
const inf = an.filter((a) => a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running')
const desc = (a) => { const t = a.effect?.target; return (a.animationName || a.constructor.name) + '@' + (t ? (t.tagName + '.' + String(t.className?.baseVal ?? t.className).slice(0, 30)) : '?') }
let n = 0; const o = window.requestAnimationFrame; let cb = 0
window.requestAnimationFrame = (f) => { cb++; return o.call(window, f) }
let frames = 0; const t0 = performance.now(); const f = () => { frames++; if (performance.now() - t0 < 2000) o.call(window, f) }; o.call(window, f)
await new Promise((r) => setTimeout(r, 2000))
window.requestAnimationFrame = o
JSON.stringify({ hidden: document.hidden, anims: an.length, running: an.filter((a) => a.playState === 'running').length, infinite: inf.length, infList: [...new Set(inf.map(desc))].slice(0, 15), rafCallsPerS: cb / 2, framesPerS: frames / 2, svgs: document.querySelectorAll('svg').length, screen: document.body.innerText.slice(0, 60).replace(/\n/g, ' | ') })
