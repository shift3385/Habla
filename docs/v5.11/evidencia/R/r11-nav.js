// Arnés de navegador de R para la 5.11 (no va al repo de código). SOLO en el origen aislado http://r11.localhost:5173.
// Red de IA falsa (Gemini y Azure): nunca sale nada a internet. Uso (javascript_tool), tras cada carga:
//   (0, eval)(await (await fetch('/docs/v5.11/evidencia/R/r11-nav.js')).text())
//   __R.cfg.status = 503   // fuerza esa respuesta en Gemini (0 = respuesta vacía 200)
(() => {
  if (location.hostname !== 'r11.localhost') return 'ABORTADO: usa http://r11.localhost:5173'
  if (window.__R) return 'ya instalado'
  const R = (window.__R = { cfg: { status: 503 }, net: [] })
  const isAI = (u) => /generativelanguage|googleapis|microsoft\.com|cognitive/.test(String(u))
  const of = window.fetch.bind(window)
  window.fetch = async (u, o) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    R.net.push(String(url).replace(/key=[^&]+/, 'key=***').slice(0, 100))
    await new Promise((r) => setTimeout(r, 200))
    // cfg.status = 0 → respuesta «universal» válida (sirve al tema, al profe y a las ideas: cada uno lee sus campos).
    if (!R.cfg.status && /generativelanguage/.test(url)) {
      const text = JSON.stringify({
        heard_speech: true, transcript: 'I like pizza with cheese.', corrections: [], reply: 'Nice! What is your favorite pizza topping?', reply_es: '¡Bien! ¿Cuál es tu ingrediente favorito?',
        title: 'Pizza around the world', title_es: 'Pizza por el mundo', summary: 'Pizza styles.', question: 'Do you like pizza?', vocab: [{ en: 'cheese', es: 'queso' }], ideas: [],
        verdict: R.cfg.verdict ?? 'correct', feedback_es: '¡Muy bien dicho!',
        // Plan de 12 semanas (createPlan / ensureWeekLessons): semanas y lecciones de ejemplo.
        weeks: Array.from({ length: 12 }, (_, i) => ({ title_es: `Semana ${i + 1}: hablar de tu día`, focus_en: 'daily routines', focus_es: 'rutinas', can_do_es: 'Podrás contar tu día.', theme_en: 'daily life' })),
        lessons: Array.from({ length: 5 }, (_, i) => ({ title_es: `Pedir en una cafetería (${i + 1})`, kind: 'roleplay', situation_en: 'A café.', target_en: 'Can I have…', phrases: [{ en: 'Can I have a coffee?', es: '¿Me das un café?' }], mission_es: 'Pide un café.', opener_en: 'Hi! What can I get you?' })),
      })
      await new Promise((r) => setTimeout(r, R.cfg.slowMs ?? 0))
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const code = R.cfg.status || 200
    return new Response(JSON.stringify({ error: { code, message: 'r11: error simulado', status: 'UNAVAILABLE' } }), { status: code, headers: { 'content-type': 'application/json' } })
  }
  R.wait = (ms) => new Promise((r) => setTimeout(r, ms))
  R.setup = async (patch = {}) => {
    const v = await (await of('/version.json')).json()
    const prev = JSON.parse(localStorage.getItem('CapacitorStorage.habla.settings') || '{}')
    localStorage.setItem('CapacitorStorage.habla.settings', JSON.stringify({
      ...prev, geminiKey: 'AIzaTEST-NO-REAL-0000000000000000000', onboarded: true, keysIntroSeen: true, lastSeenVersion: v.version,
      mascotTapped: true, mascotNudgeSeen: true, mascotNotices: false, mascotAdvice: false, homeworkSeen: Date.now() + 1e12, soundsIntroSeen: true, ...patch,
    }))
    return 'ajustes ficticios'
  }
  R.seed = async (interests = ['food', 'travel', 'movies']) => {
    const { db } = await import('/src/lib/db.ts')
    const L = 'B1'
    await db.profile.put({
      id: 'me', name: 'Rev', about: 'tester', weaknesses: [], goal: 'x', startedAt: Date.now() - 864e5,
      levels: { overall: L, grammar: L, reading: L, listening: L, speaking: L }, calibratedAt: Date.now() - 3600e3, purposes: [], interests,
    })
    return 'perfil sin plan (PlanCard intentará crearlo)'
  }
  R.scroll = () => [...document.querySelectorAll('.tab-content')].filter((t) => t.getClientRects().length).map((t) => ({ sh: t.scrollHeight, ch: t.clientHeight, over: t.scrollHeight - t.clientHeight }))
  R.overflow = () => {
    const out = []
    for (const el of document.querySelectorAll('button, p, span, div')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !el.textContent.trim()) continue
      if (r.right > innerWidth + 1 || r.left < -1) out.push(`${el.tagName} «${el.textContent.trim().slice(0, 30)}» ${Math.round(r.left)}–${Math.round(r.right)}`)
    }
    return [...new Set(out)].slice(0, 10)
  }
  R.card = () => {
    const b = [...document.querySelectorAll('[role=status]')].find((e) => /preparar/.test(e.textContent))
    if (!b) return null
    const card = b.closest('.glass')
    const r = card.getBoundingClientRect()
    const btns = [...card.querySelectorAll('button')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.textContent.trim().slice(0, 30), w: Math.round(q.width), h: Math.round(q.height) } })
    return { text: b.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vh: innerHeight, vw: innerWidth, btns, red: getComputedStyle(b).color }
  }
  // Regresión final: arranque (pantalla de bienvenida y avisos) y medidas de las 4 pestañas del Inicio.
  R.B = (re) => [...document.querySelectorAll('button,[role=button],[role=tab]')].filter((b) => b.getClientRects().length).find((b) => re.test(b.textContent.trim()) || re.test(b.getAttribute('aria-label') || ''))
  R.boot = async () => {
    for (let i = 0; i < 20 && !R.B(/Continuar donde|^Entrar$|^Empezar$/); i++) await R.wait(300)
    R.B(/Continuar donde/)?.click()
    await R.wait(1500)
    for (const re of [/^Entrar$/, /^Seguir$/, /^Ahora no$/]) { const b = R.B(re); if (b) { b.click(); await R.wait(500) } }
    return document.body.innerText.replace(/\s+/g, ' ').slice(0, 80)
  }
  R.tabs = ['Temas', 'Prácticas', 'Gramática', 'Sonidos']
  R.go = async (k) => { const b = [...document.querySelectorAll('button,[role=tab]')].filter((x) => x.getClientRects().length).find((x) => x.textContent.trim().startsWith(R.tabs[k])); b?.click(); await R.wait(500); for (const re of [/^Ahora no$/]) { const c = R.B(re); if (c && k !== 3) { /* intro de Gramática: se deja */ } } return !!b }
  R.all = async (tag) => {
    dispatchEvent(new Event('resize'))
    await R.wait(400)
    const out = []
    for (let k = 0; k < 4; k++) {
      await R.go(k)
      const tc = [...document.querySelectorAll('.tab-content')].filter((t) => t.getClientRects().length)
      const seg = [...document.querySelectorAll('button,[role=tab]')].filter((x) => x.getClientRects().length && R.tabs.some((t) => x.textContent.trim().startsWith(t)))
      out.push(`${R.tabs[k]} ${tc.map((t) => t.scrollHeight - t.clientHeight).join(',')}${seg.some((x) => x.scrollWidth > x.clientWidth + 1) ? ' CORTE' : ''}${document.scrollingElement.scrollWidth > innerWidth ? ' HSCROLL' : ''}`)
    }
    return `${tag} ${innerWidth}x${innerHeight} zoom ${getComputedStyle(document.documentElement).zoom} --fs ${getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()} · ${out.join(' · ')}`
  }
  R.set = (patch) => { const s = JSON.parse(localStorage.getItem('CapacitorStorage.habla.settings') || '{}'); localStorage.setItem('CapacitorStorage.habla.settings', JSON.stringify({ ...s, ...patch })); return 'ok' }
  return 'r11 instalado'
})()
