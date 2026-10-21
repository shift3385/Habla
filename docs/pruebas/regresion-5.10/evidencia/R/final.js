// Arnés de la regresión final 5.10.1 (R). Origen aislado rev.localhost:5173. Encima de docs/correccion/arnes-rev/rev-mic.js
// (red de IA falsa, micro falso): respuestas de Gemini a medida (__F.gem), espía de voz (speechSynthesis) y del foco.
// Uso: (0, eval)(await (await fetch('/docs/pruebas/regresion-5.10/evidencia/R/final.js')).text()); await __F.init()
window.__F = {
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  B(s) {
    const els = [...document.querySelectorAll('button, [role=button], [role=radio], a')].filter((e) => e.getClientRects().length)
    return els.find((b) => ((b.getAttribute('aria-label') || '') + ' ' + b.textContent).includes(s))
  },
  async click(s, ms = 600) { const b = this.B(s); if (!b) return 'NO: ' + s; b.click(); await this.wait(ms); return 'ok' },
  btns(n = 40) { return [...document.querySelectorAll('button')].filter((e) => e.getClientRects().length).map((b) => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 38)).slice(0, n) },
  text(n = 1500) { return document.body.innerText.replace(/\s+/g, ' ').slice(0, n) },
  queue: [],
  async init() {
    window.__REVCFG = window.__REVCFG || {}
    if (!window.__rev) (0, eval)(await (await fetch('/docs/correccion/arnes-rev/rev-mic.js')).text())
    // Gemini a medida: si hay algo en la cola, se responde con eso (texto JSON del modelo).
    if (!window.__Fwrapped) {
      const inner = window.fetch
      window.fetch = async (u, o) => {
        const url = typeof u === 'string' ? u : u.url
        if (/generativelanguage/.test(url) && !/\/models(\?|$)/.test(url) && __F.queue.length) {
          await inner(u, o) // lo registra el arnés base
          const text = JSON.stringify(__F.queue.shift())
          __F.sent.push(url)
          return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        return inner(u, o)
      }
      window.__Fwrapped = 1
    }
    this.sent = []
    window.__voz = []
    const ss = window.speechSynthesis
    if (!ss.__spy) {
      const os = ss.speak.bind(ss)
      ss.speak = (u) => (window.__voz.push({ lang: u.lang, pitch: u.pitch, rate: +u.rate.toFixed(2), text: u.text.slice(0, 120) }), os(u))
      ss.__spy = 1
    }
    this.af = await import('/src/lib/audioFocus.ts')
    this.tts = await import('/src/lib/tts.ts')
    await this.wait(300)
    if (this.B('Continuar donde lo dejé')) await this.click('Continuar donde lo dejé', 2500)
    return { fs: getComputedStyle(document.documentElement).getPropertyValue('--fs'), dataFs: document.documentElement.dataset.fs ?? null, vw: innerWidth, vh: innerHeight, btns: this.btns(12) }
  },
  // ¿Desplaza la vista? (contenedor visible .tab-content)
  scrollInfo() {
    return [...document.querySelectorAll('.tab-content')].filter((t) => t.getClientRects().length).map((t) => ({ sh: t.scrollHeight, ch: t.clientHeight, over: t.scrollHeight - t.clientHeight }))
  },
  // Elementos que se salen por la derecha o textos cortados con elipsis no deseada
  overflow() {
    const out = []
    for (const el of document.querySelectorAll('button, p, span, div, h1, h2, h3')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !el.getClientRects().length || !el.textContent.trim()) continue
      if (r.right > innerWidth + 1 || r.left < -1) out.push(`fuera: ${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(r.left)}–${Math.round(r.right)}`)
    }
    return [...new Set(out)].slice(0, 12)
  },
  rect(s) { const b = this.B(s); if (!b) return null; const r = b.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } },
  focus() { return this.af.audioFocusState() },
  // Ajustes guardados (Preferences en web = localStorage)
  setSettings(patch) {
    const k = 'CapacitorStorage.habla.settings'
    const s = JSON.parse(localStorage.getItem(k) || '{}')
    Object.assign(s, patch)
    localStorage.setItem(k, JSON.stringify(s))
    return Object.keys(patch)
  },
}
'final ok'
// Inicio: las 3 pestañas, ¿desplaza? ¿algo se sale?
__F.home = async function () {
  const out = { fs: getComputedStyle(document.documentElement).getPropertyValue('--fs').trim(), dataFs: document.documentElement.dataset.fs ?? null, size: `${innerWidth}x${innerHeight}` }
  for (const tab of ['Temas', 'Prácticas', 'Gramática']) {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(tab))
    if (!b) { out[tab] = 'NO'; continue }
    b.click(); await this.wait(700)
    const mic = this.rect('Hablar')
    out[tab] = { scroll: this.scrollInfo().map((s) => s.over), overflow: this.overflow(), hablarBottom: mic?.bottom }
  }
  return out
}
// IntersectionObserver comprobable a mano (con el panel oculto Chrome no avisa): __F.ioCheck() fuerza el cálculo.
__F.ioWrap = function () {
  if (window.__iosWrapped) return 'ya'
  const Orig = window.IntersectionObserver
  window.__ios = []
  window.IntersectionObserver = class extends Orig { constructor(cb) { super(cb); this.cb2 = cb; this.els = []; window.__ios.push(this) }
    observe(el) { this.els.push(el); super.observe(el) }
    check() { this.cb2(this.els.map((el) => { const r = el.getBoundingClientRect(); return { target: el, isIntersecting: r.bottom > 0 && r.top < innerHeight } })) } }
  window.__iosWrapped = 1
  return 'ok'
}
__F.ioCheck = async function () { (window.__ios || []).forEach((o) => o.check()); await this.wait(300) }
__F.scrollTo = async function (top) { const t = [...document.querySelectorAll('.tab-content')].filter((x) => x.getClientRects().length).pop(); t.scrollTo({ top }); await this.wait(300); await this.ioCheck(); return t.scrollTop }
