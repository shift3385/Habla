// B7 · N turnos hablados en la clase del navegador (micro falso y red falsa de B6/arnes/b6nav.js). const N = … antes.
// Devuelve por turno: peticiones nuevas (tipo, kB, audio), heap usado, nodos DOM, audios/blobs creados.
window.__b7blobs ??= (() => { const o = URL.createObjectURL; let n = 0; URL.createObjectURL = (b) => { n++; return o(b) }; const r = URL.revokeObjectURL; let k = 0; URL.revokeObjectURL = (u) => { k++; return r(u) }; return { get made() { return n }, get revoked() { return k } } })()
window.__b7ctx ??= (() => { const O = window.AudioContext; let made = 0, closed = 0; window.AudioContext = class extends O { constructor(...a) { super(...a); made++ } close() { closed++; return super.close() } }; return { get made() { return made }, get closed() { return closed } } })()
const press = async (ms) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Mantener para hablar')
  if (!el) return false
  const o = { bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'touch' }
  el.dispatchEvent(new PointerEvent('pointerdown', o)); await wait(ms); el.dispatchEvent(new PointerEvent('pointerup', o)); return true
}
const rows = []
for (let i = 0; i < N; i++) {
  const n0 = __b6.net.length, t0 = performance.now()
  let ok = false
  for (let w = 0; w < 40 && !ok; w++) { ok = !!document.querySelector('button[aria-label="Mantener para hablar"]') && !/Pensando|Hablando…/.test(document.body.innerText); if (!ok) await wait(500) }
  window.speechSynthesis?.cancel?.()
  const pressed = await press(2500)
  for (let w = 0; w < 60; w++) { await wait(500); if (__b6.net.length > n0 && !/Pensando/.test(document.body.innerText)) break }
  await wait(800)
  rows.push({ i: i + 1, pressed, ms: Math.round(performance.now() - t0), calls: __b6.net.slice(n0).map((e) => e.kind.slice(0, 22) + (e.audio ? '+audio' : '') + ':' + e.kb + 'kB:' + e.status), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, dom: document.getElementsByTagName('*').length })
}
JSON.stringify({ rows, blobs: { made: __b7blobs.made, revoked: __b7blobs.revoked }, ctx: { made: __b7ctx.made, closed: __b7ctx.closed }, mic: __b6.sum().mic.map((m) => [m.id, m.open, m.close, m.live]) })
