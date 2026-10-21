// Arnés del revisor para D2 (navegador, origen rev.localhost:5173). Se inyecta con:
// (0, eval)(await (await fetch('/docs/pruebas/regresion-5.10/evidencia/R/d2-nav.js')).text())
// Lleva a «Preposiciones de tiempo», espía la voz (speechSynthesis: idioma/texto) y el foco (audioFocusState().trace,
// la misma instancia del módulo que usa la app en Vite).
window.__d2 = {
  B: (s) => [...document.querySelectorAll('button')].find((b) => (b.textContent + ' ' + (b.getAttribute('aria-label') || '')).includes(s)),
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  async boot(sheet = false) {
    window.__REVCFG = {}
    ;(0, eval)(await (await fetch('/docs/correccion/arnes-rev/rev-mic.js')).text())
    await this.wait(1200)
    this.B('Continuar donde lo dejé')?.click()
    await this.wait(2500)
    window.__voz = []
    const ss = window.speechSynthesis
    if (!ss.__spy) {
      const os = ss.speak.bind(ss)
      ss.speak = (u) => (window.__voz.push({ t: Date.now(), lang: u.lang, pitch: u.pitch, text: u.text.slice(0, 140) }), os(u))
      ss.__spy = 1
    }
    this.af = await import('/src/lib/audioFocus.ts')
    this.tts = await import('/src/lib/tts.ts')
    await this.tts.stopSpeaking(); await this.wait(800)
    for (let i = 0; i < 4 && document.querySelector('[aria-label="Atrás"]'); i++) { document.querySelector('[aria-label="Atrás"]').click(); await this.wait(600) }
    if (!sheet) {
      this.B('Gramática').click(); await this.wait(900)
      this.B('PreposicionesPrep').click(); await this.wait(900)
      this.B('Prepositions of Time').click(); await this.wait(1000)
    }
    return this.state()
  },
  state() {
    const f = document.querySelector('[aria-label="Parar la explicación"]')
    const r = f?.getBoundingClientRect()
    return { key: this.tts?.speakingKey(), trace: this.af?.audioFocusState().trace, holders: this.af?.audioFocusState().holders,
      float: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } : null,
      vw: innerWidth, vh: innerHeight, voz: (window.__voz || []).length }
  },
  async play() { document.querySelector('[aria-label="Escuchar la explicación"]').click(); await this.wait(2500); return this.state() },
  async scroll(top = 600) { document.querySelectorAll('.tab-content').forEach((t) => t.offsetParent && t.scrollTo({ top })); await this.wait(700); return this.state() },
}
'd2-nav ok'
// Con el panel del navegador oculto Chrome no pinta y el IntersectionObserver real no avisa: este sustituto calcula la
// intersección con getBoundingClientRect en cada scroll (misma interfaz que usa GrammarTopicScreen).
window.__d2.fakeIO = () => {
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; this.els = []; this.h = () => this.check(); document.addEventListener('scroll', this.h, true) }
    check() { this.cb(this.els.map((el) => { const r = el.getBoundingClientRect(); return { target: el, isIntersecting: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth } })) }
    observe(el) { this.els.push(el); setTimeout(() => this.check(), 0) }
    disconnect() { this.els = []; document.removeEventListener('scroll', this.h, true) }
  }
  return 'fakeIO'
}
// Un escenario entero en una sola llamada (Vite recarga la página cada vez que otro desarrollador guarda un archivo).
window.__d2.run = async function (action) {
  const Orig = window.IntersectionObserver
  window.__ios = []
  window.IntersectionObserver = class extends Orig { constructor(cb) { super(cb); this.cb2 = cb; this.els = []; window.__ios.push(this) }
    observe(el) { this.els.push(el); super.observe(el) }
    check() { this.cb2(this.els.map((el) => { const r = el.getBoundingClientRect(); return { target: el, isIntersecting: r.bottom > 0 && r.top < innerHeight } })) } }
  await this.boot()
  const out = { start: await this.play() }
  const tc = [...document.querySelectorAll('.tab-content')].filter((t) => t.offsetParent).pop()
  tc.scrollTo({ top: 600 }); await this.wait(300); window.__ios.forEach((o) => o.check()); await this.wait(300)
  out.scrolled = this.state()
  const n = window.__voz.length
  const t = this.af.audioFocusState().trace.length
  await action(this)
  await this.wait(150)
  out.after = this.state()
  await this.wait(1800)
  out.later = this.state()
  out.newUtterances = window.__voz.length - n
  out.newTrace = this.af.audioFocusState().trace.slice(t)
  out.voz = window.__voz.map((v) => `${v.lang}|${v.pitch}|${v.text}`)
  out.buttons = [...document.querySelectorAll('button')].map((b) => (b.textContent.trim() || b.getAttribute('aria-label')).slice(0, 30)).slice(0, 6)
  return out
}
