// B7 · Un turno hablado con una regla de red falsa (b6nav). Antes: const RULE = { re, status|netError, delay, times, message }.
// Devuelve: peticiones del turno (t relativo, modelo, kB, audio, estado), tiempo hasta que la UI sale de «Pensando…»,
// botones visibles durante la espera y el mensaje final.
__b6.rules.length = 0; if (RULE) __b6.rules.push(RULE)
const el = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Mantener para hablar')
if (!el) return JSON.stringify({ error: 'sin botón de hablar', view: view() })
const o = { bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'touch' }
const n0 = __b6.net.length
el.dispatchEvent(new PointerEvent('pointerdown', o)); await wait(2500); el.dispatchEvent(new PointerEvent('pointerup', o))
const t0 = performance.now(); let during = null, end = null
for (let w = 0; w < (window.__maxS ?? 150); w++) {
  await wait(1000)
  const txt = document.body.innerText
  if (w === 4) during = { btns: btns().slice(0, 12), txt: txt.slice(-220).replace(/\n/g, ' | ') }
  if (!/Pensando|Reintentando|reintent/i.test(txt) && w > 1) { end = Math.round((performance.now() - t0) / 1000); break }
}
await wait(1000)
__b6.rules.length = 0
JSON.stringify({ endS: end, calls: __b6.net.slice(n0).map((e) => ({ t: Math.round(e.t - t0), url: e.url.replace(/^generativelanguage\.googleapis\.com\/v1beta\/models\//, '').slice(0, 45), kb: e.kb, audio: e.audio, st: e.status })), during, final: document.body.innerText.slice(-400).replace(/\n/g, ' | '), btns: btns().slice(0, 14) })
