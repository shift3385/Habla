// rev · Arnés de navegador para revisar la v5.8.1 «Micrófono seguro» (basado en B3/arnes/instr.js y B6/arnes/b6nav.js).
// Solo para el origen aislado http://rev.localhost:5173 (vista previa `habla-dev`). NUNCA en localhost:5173 ni en el teléfono.
//
// Uso (javascript_tool), tras CADA carga de página (se pierde al recargar):
//   window.__REVCFG = { gumDelay: 1500 }      // opcional, antes de inyectar
//   (0, eval)(await (await fetch('/docs/correccion/arnes-rev/rev-mic.js')).text())
//
// Configuración (__REVCFG o __rev.cfg en caliente):
//   gumDelay     ms que tarda getUserMedia en resolver (abre la ventana de carrera de MIC-301/302/303). 0 = inmediato.
//   silentFirst  n.º de aperturas que devuelven CEROS EXACTOS (MIC-800: micro procesado en silencio). Después, «voz».
//   silentAll    true = todas las aperturas en ceros exactos (habitación en silencio total).
//   fakeDevices  true = enumerateDevices devuelve 2 micros del teléfono con etiqueta (para que fallback() recorra opciones).
//   gumError     nombre de DOMException para forzar el fallo de getUserMedia ('NotAllowedError', 'NotReadableError').
//   netDelay     ms de la red falsa (Gemini/Azure). Nunca sale nada a internet.
//
// Lo que registra:
//   __rev.mic  aperturas: { id, req, open, close, hiddenReq, hiddenOpen, c (constraints), silent, stack, live }
//   __rev.rec  MediaRecorder: { id, mic, created, start, stop, state }
//   __rev.net  peticiones a IA interceptadas: { t, url (clave enmascarada), kb, audio }
//   __rev.ev   eventos con tiempo (ms de performance.now())
//   __rev.tl   línea de tiempo (cambios de pistas vivas / grabadores en 'recording' / hidden), muestreo cada 100 ms
// Ayudas:
//   __rev.setup()            prepara ajustes ficticios (clave AIzaTEST…, onboarded, avisos vistos) — solo en rev.localhost
//   __rev.seedProfile()      crea un perfil calibrado ficticio en Dexie (para llegar al Inicio sin hacer el test)
//   __rev.hide(true|false)   simula segundo plano / vuelta (document.hidden + visibilitychange [+ pagehide])
//   __rev.click(texto|selector, {exact})   click() en el botón/elemento visible que contiene el texto
//   __rev.tap(el, n, gapMs)  n click() seguidos con gapMs entre ellos (doble toque)
//   __rev.ptr(el, 'pointerdown'|'pointerup'|'pointercancel', pointerId)   PointerEvent sintético
//   __rev.wait(ms)
//   __rev.check()            { live: [ids], recording: [ids], audioSent: n, orphans } — orphans = pistas vivas que
//                            ya no están referenciadas por un Recorder vivo (heurística: viva y no es la última abierta)
//   __rev.summary()          volcado compacto para pegar como evidencia
//   __rev.reset()            vacía registros (no toca pistas)
(() => {
  if (window.__rev) return 'rev-mic ya instalado'
  if (location.hostname !== 'rev.localhost') return 'ABORTADO: usa http://rev.localhost:5173 (origen aislado), no ' + location.host
  const cfg = Object.assign({ gumDelay: 0, silentFirst: 0, silentAll: false, fakeDevices: false, gumError: '', netDelay: 300 }, window.__REVCFG || {})
  const T = () => Math.round(performance.now())
  const rev = (window.__rev = { cfg, mic: [], rec: [], net: [], ev: [], tl: [] })
  const log = (e) => rev.ev.push(T() + ' ' + e)
  rev.log = log

  // ---------- micrófono falso ----------
  const md = navigator.mediaDevices
  let silentLeft = cfg.silentFirst
  md.getUserMedia = async (c) => {
    const id = rev.mic.length
    const m = {
      id,
      req: T(),
      hiddenReq: document.hidden,
      c: JSON.stringify(c).slice(0, 140),
      stack: new Error().stack.split('\n').slice(2, 6).map((s) => s.trim().replace(/\(?https?:\/\/[^)]*\/src\//, '(').slice(0, 70)).join(' | '),
    }
    rev.mic.push(m)
    log('gUM req #' + id + ' hidden=' + document.hidden)
    if (rev.cfg.gumDelay) await new Promise((r) => setTimeout(r, rev.cfg.gumDelay))
    if (rev.cfg.gumError) {
      m.error = rev.cfg.gumError
      log('gUM error #' + id + ' ' + rev.cfg.gumError)
      throw new DOMException('falso', rev.cfg.gumError)
    }
    const ctx = new AudioContext()
    ctx.resume().catch(() => {})
    const dst = ctx.createMediaStreamDestination()
    const silent = rev.cfg.silentAll || silentLeft > 0
    if (silentLeft > 0) silentLeft--
    if (!silent) {
      // «voz» sintética: tono con volumen que sube y baja (analyzeSpeech ve voz y pausas)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      g.gain.value = 0.1
      const lfo = ctx.createOscillator()
      lfo.type = 'square'
      lfo.frequency.value = 1.5
      const lg = ctx.createGain()
      lg.gain.value = 0.1
      lfo.connect(lg).connect(g.gain)
      lfo.start()
      osc.connect(g).connect(dst)
      osc.start()
    } // sin fuente conectada: el destino da CEROS EXACTOS (como el micro procesado en silencio, MIC-800)
    const s = dst.stream
    m.silent = silent
    m.open = T()
    m.hiddenOpen = document.hidden
    m.track = s.getAudioTracks()[0]
    m.ctx = ctx
    log('gUM open #' + id + (silent ? ' (ceros)' : '') + ' hidden=' + document.hidden)
    s.getTracks().forEach((t) => {
      const stop = t.stop.bind(t)
      t.stop = () => {
        if (!m.close) {
          m.close = T()
          log('track stop #' + id)
        }
        stop()
        ctx.close().catch(() => {})
      }
    })
    s.__revId = id
    return s
  }
  const origEnum = md.enumerateDevices.bind(md)
  md.enumerateDevices = async () =>
    rev.cfg.fakeDevices
      ? [
          { kind: 'audioinput', deviceId: 'default', label: 'Default', groupId: 'g' },
          { kind: 'audioinput', deviceId: 'mic-bottom', label: 'Built-in microphone (bottom)', groupId: 'g' },
          { kind: 'audioinput', deviceId: 'mic-speaker', label: 'Speakerphone', groupId: 'g' },
          // fakeDevices: 'bt' → además unos auriculares Bluetooth (v5.8.1: el silencio solo cuenta como «mudo» con BT)
          ...(rev.cfg.fakeDevices === 'bt' ? [{ kind: 'audioinput', deviceId: 'bt-1', label: 'Bluetooth headset', groupId: 'b' }] : []),
        ]
      : origEnum()

  // ---------- MediaRecorder instrumentado ----------
  const MR = window.MediaRecorder
  window.MediaRecorder = class extends MR {
    constructor(stream, ...a) {
      super(stream, ...a)
      this.__id = rev.rec.length
      rev.rec.push({ id: this.__id, mic: stream?.__revId, created: T(), obj: this })
      log('rec new #' + this.__id + ' sobre mic #' + stream?.__revId)
    }
    start(...a) {
      rev.rec[this.__id].start = T()
      log('rec start #' + this.__id + ' hidden=' + document.hidden)
      return super.start(...a)
    }
    stop() {
      if (!rev.rec[this.__id].stop) rev.rec[this.__id].stop = T()
      log('rec stop #' + this.__id)
      return super.stop()
    }
  }

  // ---------- red falsa (Gemini / Azure): nunca sale nada ----------
  const fakeText = JSON.stringify({
    transcript: 'I like to talk about music.', heard_speech: true, reply: 'Great! What kind of music do you like?', reply_es: '¡Genial!',
    corrections: [], text: 'Mi viaje a Japón', title: 'Music', titleEs: 'Música', summary: 'x', question: 'Do you like music?',
  })
  const gem = { candidates: [{ content: { parts: [{ text: fakeText }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }
  const models = { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }
  const isAI = (u) => /googleapis|generativelanguage|microsoft|azure|cognitive/i.test(String(u))
  const record = (url, body) => {
    const s = typeof body === 'string' ? body : body ? JSON.stringify(body) : ''
    const e = { t: T(), url: String(url).replace(/key=[^&]+/, 'key=***').slice(0, 110), kb: Math.round(s.length / 1024), audio: /inlineData|audio\//.test(s) }
    rev.net.push(e)
    log('NET ' + e.url.slice(0, 70) + ' kb=' + e.kb + (e.audio ? ' AUDIO' : ''))
  }
  const of = window.fetch.bind(window)
  window.fetch = async (u, o) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    record(url, o?.body)
    await new Promise((r) => setTimeout(r, rev.cfg.netDelay))
    // cfg.aiStatus (400/403/429/503…) fuerza esa respuesta de error; cfg.aiOffline = true simula «sin conexión».
    if (rev.cfg.aiOffline) throw new TypeError('Failed to fetch (rev: sin conexión simulada)')
    if (rev.cfg.aiStatus) {
      const err = { error: { code: rev.cfg.aiStatus, message: 'rev: error simulado', status: rev.cfg.aiStatus === 400 ? 'INVALID_ARGUMENT' : 'X' } }
      return new Response(JSON.stringify(err), { status: rev.cfg.aiStatus, headers: { 'content-type': 'application/json' } })
    }
    const body = /\/models(\?|$)/.test(url) ? models : gem
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  // Red de seguridad: ninguna XHR a la IA (por si algún camino no usa fetch).
  const xo = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (m, u, ...a) {
    if (isAI(u)) {
      log('XHR BLOQUEADA ' + String(u).slice(0, 60))
      throw new Error('rev: XHR a la IA bloqueada')
    }
    return xo.call(this, m, u, ...a)
  }

  // ---------- línea de tiempo ----------
  rev.timer = setInterval(() => {
    const live = rev.mic.filter((m) => m.track && m.track.readyState === 'live').map((m) => m.id)
    const recs = rev.rec.filter((r) => r.obj.state === 'recording').map((r) => r.id)
    const last = rev.tl.at(-1)
    const key = live.join(',') + '|' + recs.join(',') + '|' + document.hidden
    if (!last || last.key !== key) rev.tl.push({ t: T(), key, live, recs, hidden: document.hidden })
  }, 100)

  // ---------- ayudas ----------
  rev.wait = (ms) => new Promise((r) => setTimeout(r, ms))
  rev.find = (q, { exact = false } = {}) => {
    if (q instanceof Element) return q
    try {
      const el = document.querySelector(q)
      if (el) return el
    } catch {
      // no es un selector
    }
    const els = [...document.querySelectorAll('button, [role=button], a, label, [aria-label]')].filter((e) => e.offsetParent !== null || e.getClientRects().length)
    const txt = (e) => ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || '')).trim()
    return els.find((e) => (exact ? (e.innerText || '').trim() === q || e.getAttribute('aria-label') === q : txt(e).includes(q))) || null
  }
  rev.click = (q, o) => {
    const el = rev.find(q, o)
    if (!el) return 'NO ENCONTRADO: ' + q
    el.click()
    log('click «' + String(q).slice(0, 40) + '»')
    return 'ok'
  }
  rev.tap = async (q, n = 2, gap = 150) => {
    const el = rev.find(q)
    if (!el) return 'NO ENCONTRADO: ' + q
    for (let i = 0; i < n; i++) {
      el.click()
      log('tap ' + (i + 1) + '/' + n + ' «' + String(q).slice(0, 30) + '»')
      if (i < n - 1) await rev.wait(gap)
    }
    return 'ok'
  }
  rev.ptr = (q, type, pointerId = 1) => {
    const el = rev.find(q)
    if (!el) return 'NO ENCONTRADO: ' + q
    const r = el.getBoundingClientRect()
    const ev = new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, pointerId, pointerType: 'touch', isPrimary: pointerId === 1,
      clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, button: 0, buttons: type === 'pointerdown' ? 1 : 0,
    })
    el.dispatchEvent(ev)
    log(type + ' id=' + pointerId)
    return 'ok'
  }
  let hidden = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
  rev.hide = (h = true, { pagehide = false } = {}) => {
    hidden = h
    log('hidden=' + h)
    document.dispatchEvent(new Event('visibilitychange'))
    if (h && pagehide) window.dispatchEvent(new Event('pagehide'))
    return 'hidden=' + h
  }
  rev.check = () => {
    const live = rev.mic.filter((m) => m.track && m.track.readyState === 'live').map((m) => m.id)
    const recording = rev.rec.filter((r) => r.obj.state === 'recording').map((r) => r.id)
    return {
      opened: rev.mic.length,
      live,
      recording,
      liveWhileHidden: document.hidden ? live : [],
      openedWhileHidden: rev.mic.filter((m) => m.hiddenReq || m.hiddenOpen).map((m) => m.id),
      recStartedWhileHidden: rev.ev.filter((e) => /rec start .* hidden=true/.test(e)).length,
      net: rev.net.length,
      audioSent: rev.net.filter((n) => n.audio).map((n) => n.kb + ' KB'),
    }
  }
  rev.summary = () => ({
    now: T(),
    cfg: rev.cfg,
    mic: rev.mic.map(({ track, ctx, ...m }) => ({ ...m, live: track?.readyState === 'live' })),
    rec: rev.rec.map(({ obj, ...r }) => ({ ...r, state: obj.state })),
    net: rev.net,
    tl: rev.tl.map(({ t, live, recs, hidden }) => `${t} live=[${live}] rec=[${recs}] hidden=${hidden}`),
    ev: rev.ev,
    check: rev.check(),
  })
  rev.reset = () => {
    rev.ev.length = 0
    rev.net.length = 0
    rev.tl.length = 0
    return 'ok'
  }
  // Ajustes ficticios SOLO en el origen aislado. La clave es falsa y la red está simulada.
  rev.setup = async () => {
    const v = await (await of('/version.json')).json()
    const prev = JSON.parse(localStorage.getItem('CapacitorStorage.habla.settings') || '{}')
    const s = {
      ...prev,
      geminiKey: 'AIzaTEST-NO-REAL-0000000000000000000',
      onboarded: true,
      keysIntroSeen: true,
      lastSeenVersion: v.version,
      mascotTapped: true,
      mascotNudgeSeen: true,
      mascotNotices: false,
      mascotAdvice: false,
      homeworkSeen: Date.now() + 1e12,
    }
    localStorage.setItem('CapacitorStorage.habla.settings', JSON.stringify(s))
    return 'ajustes ficticios listos (versión ' + v.version + '); recarga la página'
  }
  rev.seedProfile = async () => {
    const { db } = await import('/src/lib/db.ts')
    const L = 'B1'
    await db.profile.put({
      id: 'me', name: 'Rev', about: 'tester', weaknesses: [], goal: 'x', startedAt: Date.now() - 864e5,
      levels: { overall: L, grammar: L, reading: L, listening: L, speaking: L }, calibratedAt: Date.now() - 3600e3, purposes: [], interests: [],
      // Plan vacío: así PlanCard no lanza «Creando tu plan…» al cargar (esa petición saldría ANTES de inyectar la red falsa).
      plan: { createdAt: Date.now(), start: Date.now(), levelAtStart: L, weeks: [], done: {} },
    })
    return 'perfil ficticio calibrado; recarga la página'
  }
  return 'rev-mic instalado ' + JSON.stringify(cfg)
})()
