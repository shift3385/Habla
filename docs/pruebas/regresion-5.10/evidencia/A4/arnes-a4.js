// A4 · Arnés de navegador de la regresión 5.10 (interfaz y navegación). SOLO en el origen aislado http://reg.localhost:5173.
// Uso (javascript_tool), tras CADA carga:  (0, eval)(await (await fetch('/docs/pruebas/regresion-5.10/evidencia/A4/arnes-a4.js')).text())
// - Red falsa de Gemini/Azure que responde según generationConfig.responseJsonSchema (nunca sale nada a internet).
// - Micro falso (oscilador), voz falsa (speechSynthesis «suena» 2,5 s), Atrás de Android simulado, medidas de diseño.
(() => {
  if (window.__a4) return 'a4 ya instalado'
  if (location.hostname !== 'reg.localhost') return 'ABORTADO: usa http://reg.localhost:5173, no ' + location.host
  const a4 = (window.__a4 = { calls: [], over: {}, delay: 400, mic: 0, spoken: [] })
  // ---------- red falsa según el esquema ----------
  const S = {
    transcript: () => a4.over.transcript ?? 'Yesterday I go to the beach with my friends and we eat fish.',
    heard_speech: () => true,
    reply: () => 'Sounds fun! What did you eat at the beach?',
    reply_es: () => '¡Qué divertido! ¿Qué comiste en la playa?',
    corrections: () =>
      a4.over.corrections ?? [
        { original: 'I go to the beach', corrected: 'I went to the beach', explanation_es: 'Ayer → pasado simple: «went».', category: 'tenses', spanish: 'Fui a la playa', grammar_topics: ['past-simple', 'regular-irregular-verbs'] },
        { original: 'in my breakfast', corrected: 'for breakfast', explanation_es: 'Se dice «for breakfast».', category: 'prepositions', spanish: 'de desayuno', grammar_topics: ['prepositions-of-time', 'for-since-during-ago', 'tema-inventado-xyz'] },
      ],
    ideas: () => [
      { en: 'I went to the beach last weekend.', es: 'Fui a la playa el fin de semana pasado.' },
      { en: 'I usually cook pasta at home.', es: 'Normalmente cocino pasta en casa.' },
      { en: 'My favourite food is paella.', es: 'Mi comida favorita es la paella.' },
    ],
    verdict: () => a4.over.verdict ?? 'correct',
    feedback_es: () => 'Muy bien: usas la estructura correctamente.',
    answer_es: () => ['«Should» sirve para dar consejos: «You should rest».', '«Ought to» es igual pero más formal.'],
    examples: () => [{ en: 'You should sleep more.', es: 'Deberías dormir más.' }],
    topics: () => ['should-could-would', 'tema-inventado-xyz'],
  }
  const gen = (sc, name, depth = 0) => {
    if (!sc || depth > 8) return null
    if (name && S[name]) return S[name]()
    if (sc.enum) return sc.enum[0]
    const ty = Array.isArray(sc.type) ? sc.type[0] : sc.type
    if (ty === 'object' || sc.properties) {
      const o = {}
      for (const [k, v] of Object.entries(sc.properties || {})) o[k] = gen(v, k, depth + 1)
      return o
    }
    if (ty === 'array') return [0, 1].map(() => gen(sc.items, null, depth + 1))
    if (ty === 'number' || ty === 'integer') return /score|accuracy|fluency|level/i.test(name || '') ? 70 : 1
    if (ty === 'boolean') return true
    return name ? 'Texto simulado (' + name + ')' : 'Texto simulado'
  }
  const isAI = (u) => /googleapis|generativelanguage|microsoft|azure|cognitive/i.test(String(u))
  const of = window.fetch.bind(window)
  a4.of = of
  window.fetch = async (u, o) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    let body = {}
    try {
      body = JSON.parse(o?.body || '{}')
    } catch {
      /* */
    }
    const schema = body.generationConfig?.responseJsonSchema || body.generationConfig?.responseSchema
    const sys = JSON.stringify(body.systemInstruction || '').slice(0, 300)
    a4.calls.push({ url: String(url).replace(/key=[^&]+/, 'key=***').slice(0, 100), props: schema ? Object.keys(schema.properties || {}) : null, sys, audio: /inlineData/.test(o?.body || '') })
    await new Promise((r) => setTimeout(r, a4.delay))
    if (/\/models(\?|$)/.test(url)) return new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 })
    if (!/generativelanguage/.test(url)) return new Response('{}', { status: 404 })
    const text = JSON.stringify(schema ? gen(schema) : { text: 'ok' })
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  // ---------- micro falso ----------
  navigator.mediaDevices.getUserMedia = async () => {
    a4.mic++
    const ctx = new AudioContext()
    ctx.resume().catch(() => {})
    const dst = ctx.createMediaStreamDestination()
    const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    g.gain.value = 0.1; lfo.type = 'square'; lfo.frequency.value = 1.5; lg.gain.value = 0.1
    lfo.connect(lg).connect(g.gain); lfo.start(); osc.connect(g).connect(dst); osc.start()
    if (a4.gumDelay) await new Promise((r) => setTimeout(r, a4.gumDelay))
    const s = dst.stream
    s.getTracks().forEach((t) => { const st = t.stop.bind(t); t.stop = () => { st(); ctx.close().catch(() => {}) } })
    return s
  }
  // ---------- voz falsa ----------
  try {
    const ss = window.speechSynthesis
    ss.speak = (u) => { a4.spoken.push(u.text?.slice(0, 60)); a4.speaking = true; u.onstart && u.onstart(); clearTimeout(a4.tt); a4.tt = setTimeout(() => { a4.speaking = false; u.onend && u.onend() }, 2500) }
    ss.cancel = () => { clearTimeout(a4.tt); a4.speaking = false }
  } catch {
    /* */
  }
  // ---------- ayudas ----------
  a4.wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const vis = (e) => e.offsetParent !== null || e.getClientRects().length
  a4.find = (q, exact = false) => {
    try { const el = document.querySelector(q); if (el) return el } catch { /* no es selector */ }
    const els = [...document.querySelectorAll('button, [role=button], [role=tab], a, label, [aria-label]')].filter(vis)
    const txt = (e) => ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || '')).trim()
    return els.find((e) => (exact ? (e.innerText || '').trim() === q || e.getAttribute('aria-label') === q : txt(e).includes(q))) || null
  }
  a4.click = (q, exact) => { const el = a4.find(q, exact); if (!el) return 'NO ENCONTRADO: ' + q; el.click(); return 'ok' }
  // Atrás de Android: el listener de @capacitor/app (web) se dispara con notifyListeners del plugin registrado.
  a4.back = async () => {
    const P = window.Capacitor?.Plugins?.App
    const mod = await import('/node_modules/@capacitor/app/dist/esm/index.js').catch(() => null)
    const target = (mod && mod.App) || P
    if (target?.notifyListeners) { target.notifyListeners('backButton', { canGoBack: false }); return 'back (notifyListeners)' }
    return 'SIN backButton'
  }
  // Medidas: scroll de página y de los contenedores, desbordes horizontales, toques pequeños y solapes.
  a4.measure = () => {
    const de = document.documentElement
    const sc = [...document.querySelectorAll('.tab-content, main, [class*="overflow-y-auto"]')].filter(vis).map((e) => ({ cls: (e.className + '').slice(0, 40), sh: e.scrollHeight, ch: e.clientHeight }))
    const W = innerWidth
    const wide = [...document.querySelectorAll('body *')].filter((e) => {
      if (!vis(e)) return false
      const r = e.getBoundingClientRect()
      if (r.right <= W + 1 || r.width === 0) return false
      // ignora lo que está dentro de un contenedor con scroll horizontal propio
      for (let p = e.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX)) return false }
      return true
    }).slice(0, 5).map((e) => e.tagName + '.' + (e.className + '').slice(0, 30) + ' r=' + Math.round(e.getBoundingClientRect().right))
    const small = [...document.querySelectorAll('button, a, [role=button], [role=tab], input, select')].filter(vis).map((e) => {
      const r = e.getBoundingClientRect()
      return { n: (e.getAttribute('aria-label') || e.innerText || e.tagName).trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) }
    }).filter((b) => b.w > 0 && (b.w < 40 || b.h < 40) && b.y >= 0 && b.y < innerHeight)
    const noLabel = [...document.querySelectorAll('button')].filter(vis).filter((b) => !(b.innerText || '').trim().replace(/[▶⏸✕×←→⋯…]/g, '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).length
    return { vw: W, vh: innerHeight, page: { sh: de.scrollHeight, ch: de.clientHeight, sw: de.scrollWidth, cw: de.clientWidth }, scrollers: sc, wide, small, noLabel }
  }
  a4.text = () => document.body.innerText.slice(0, 1500)
  // Ejercicios de Gramática: responde (elegir = 1.ª opción, completar = «went», ordenar = en el orden mostrado) hasta
  // encontrar el tipo `stopAt` sin responder o el resultado.
  a4.step = async (stopAt) => {
    const log = []
    for (let n = 0; n < 12; n++) {
      if (a4.find('Siguiente', true)) { a4.click('Siguiente', true); await a4.wait(700) }
      else if (a4.find('Ver resultado', true)) { a4.click('Ver resultado', true); await a4.wait(1200); log.push('resultado'); return log }
      const t = document.body.innerText
      const k = /ELIGE LA CORRECTA/i.test(t) ? 'choice' : /Toca las palabras|ORDENA LAS/i.test(t) ? 'order' : /\nCOMPLETA\n/i.test(t) ? 'gap' : '?'
      log.push(k)
      if (k === stopAt || k === '?') return log
      if (k === 'choice') [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.className.includes('min-h-[48px]'))[0]?.click()
      else if (k === 'gap') {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        for (const inp of document.querySelectorAll('input[aria-label^="Hueco"]')) { set.call(inp, 'went'); inp.dispatchEvent(new Event('input', { bubbles: true })) }
        await a4.wait(200); a4.click('Comprobar', true)
      } else if (k === 'order') {
        for (const w of [...document.querySelectorAll('button.field')].filter((b) => b.offsetParent && b.className.includes('h-9'))) { w.click(); await a4.wait(80) }
        await a4.wait(200); a4.click('Comprobar', true)
      }
      await a4.wait(800)
    }
    return log
  }
  a4.goTopic = async (section, topicLabel) => {
    if (document.body.innerText.includes('Ya te vas')) a4.click('Quedarme')
    a4.click('Gramática'); await a4.wait(800); a4.click(section); await a4.wait(900); a4.click(topicLabel); await a4.wait(900)
    return document.body.innerText.slice(0, 60)
  }
  // Pasa las puertas del arranque («Continuar donde lo dejé», tarea de hoy) hasta el Inicio.
  a4.boot = async () => {
    for (let i = 0; i < 3; i++) {
      if (a4.find('Continuar donde lo dejé')) { a4.click('Continuar donde lo dejé'); await a4.wait(2500) }
      if (a4.find('Entrar', true)) { a4.click('Entrar', true); await a4.wait(1800) }
    }
    return document.body.innerText.slice(0, 60)
  }
  return 'a4 instalado'
})()
