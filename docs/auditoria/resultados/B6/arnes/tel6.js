// B6 · Arnés del TELÉFONO (POCO, APK debuggable) por CDP: node cdp6.mjs -f tel6.js
// - Red: TODAS las peticiones a Gemini/Azure se BLOQUEAN (respuesta falsa de error, sin datos) salvo que se habilite
//   expresamente una llamada real: __b6t.allow = 1 (Gemini) / __b6t.allowAzure = 1. Cada llamada real descuenta 1.
//   Las del plan («12-week», lecciones de la semana) se bloquean siempre (503 falso): nunca escriben en el perfil.
// - Registro: __b6t.net (url sin clave, tipo, audio, real/bloqueada, estado, ms, document.hidden),
//   __b6t.tts (TextToSpeech.speak/stop con document.hidden), __b6t.mic (aperturas/cierres).
// - Micro sintético: getUserMedia devuelve un stream propio (NO abre el micro real); al empezar cada MediaRecorder se
//   reproduce dentro el WAV elegido en __b6t.next ('w1' | 'w2'), cargado con __b6t.load(nombre, base64).
// Nunca devuelve claves: cabeceras y URL se enmascaran.
(() => {
  if (window.__b6t) return 'ya instalado'
  const T = () => Math.round(performance.now())
  const b = (window.__b6t = { allow: 0, allowAzure: 0, net: [], tts: [], mic: [], wav: {}, next: 'w1', ev: [] })
  const Cap = window.Capacitor
  // ---------- audio sintético
  const ctx = new AudioContext()
  b.load = async (name, b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    b.wav[name] = await ctx.decodeAudioData(bin.buffer)
    return name + ' ' + b.wav[name].duration.toFixed(1) + ' s'
  }
  const dst = ctx.createMediaStreamDestination()
  navigator.mediaDevices.getUserMedia = async (c) => {
    const id = b.mic.length
    const m = { id, open: T(), hidden: document.hidden }
    b.mic.push(m)
    if (ctx.state !== 'running') await ctx.resume().catch(() => {})
    const s = new MediaStream(dst.stream.getAudioTracks().map((t) => t.clone()))
    m.track = s.getAudioTracks()[0]
    s.getTracks().forEach((t) => {
      const stop = t.stop.bind(t)
      t.stop = () => {
        if (!m.close) m.close = T()
        stop()
      }
    })
    return s
  }
  const MR = window.MediaRecorder
  window.MediaRecorder = class extends MR {
    start(...a) {
      const buf = b.wav[b.next]
      if (buf) {
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(dst)
        src.start()
        b.ev.push(T() + ' rec start + wav ' + b.next)
      } else b.ev.push(T() + ' rec start SIN wav')
      return super.start(...a)
    }
    stop() {
      b.ev.push(T() + ' rec stop')
      return super.stop()
    }
  }
  // ---------- red
  const isGem = (u) => /generativelanguage\.googleapis/.test(String(u))
  const isAz = (u) => /microsoft|azure/i.test(String(u))
  const kindOf = (d) => {
    try {
      const j = typeof d === 'string' ? JSON.parse(d) : d
      const sys = j?.systemInstruction?.parts?.[0]?.text || ''
      const txt = (j?.contents || []).flatMap((c) => c.parts || []).filter((p) => p.text).map((p) => p.text).at(-1) || ''
      return (sys.slice(0, 40) + ' ¦ ' + txt.slice(0, 50)).replace(/\s+/g, ' ')
    } catch {
      return ''
    }
  }
  const hasAudio = (o) => /inlineData/.test(typeof o?.data === 'string' ? o.data : JSON.stringify(o?.data ?? '')) || o?.dataType === 'file'
  const onp = Cap.nativePromise.bind(Cap)
  Cap.nativePromise = async (plugin, method, opts) => {
    if (plugin === 'TextToSpeech') b.tts.push({ t: T(), method, hidden: document.hidden, len: (opts?.text || '').length })
    if (plugin !== 'CapacitorHttp' || !(isGem(opts?.url) || isAz(opts?.url))) return onp(plugin, method, opts)
    const url = String(opts.url)
    const e = { t: T(), hidden: document.hidden, host: url.replace(/^https?:\/\//, '').split('/')[0], path: url.replace(/^https?:\/\/[^/]+/, '').replace(/key=[^&]+/, 'key=***').slice(0, 70), kind: isGem(url) ? kindOf(opts.data) : 'azure', audio: hasAudio(opts) }
    b.net.push(e)
    const plan = /12-week|Design weeks|lessons of week|Week \d+ of a 12/i.test(e.kind) || /12-week/.test(typeof opts.data === 'string' ? opts.data.slice(0, 4000) : '')
    let real = false
    if (isGem(url) && !plan && b.allow > 0) {
      b.allow--
      real = true
    }
    if (isAz(url) && b.allowAzure > 0) {
      b.allowAzure--
      real = true
    }
    e.real = real
    e.plan = plan
    if (real) {
      try {
        const r = await onp(plugin, method, opts)
        e.status = r?.status
        e.ms = T() - e.t
        e.doneHidden = document.hidden
        return r
      } catch (err) {
        e.status = 'EXC ' + String(err?.message || err).slice(0, 60)
        throw err
      }
    }
    await new Promise((r) => setTimeout(r, 200))
    e.status = isAz(url) ? 500 : 503
    e.ms = T() - e.t
    return isAz(url)
      ? { status: 500, headers: {}, data: 'blocked by B6 harness', url }
      : { status: 503, headers: {}, data: { error: { code: 503, message: 'B6 harness: blocked (no real call)', status: 'UNAVAILABLE' } }, url }
  }
  // ---------- ayudas
  window.s = (ms) => new Promise((r) => setTimeout(r, ms))
  window.clickText = (t) => {
    const el = [...document.querySelectorAll('button,a,[role=button]')].find((x) => x.innerText.trim().includes(t))
    if (!el) return 'no ' + t
    el.click()
    return 'ok ' + el.innerText.trim().slice(0, 30)
  }
  window.clickAria = (t) => {
    const el = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '') === t)
    if (!el) return 'no ' + t
    el.click()
    return 'ok ' + t
  }
  window.btns = () => [...document.querySelectorAll('button')].map((x) => (x.innerText.trim() || x.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean)
  window.talk = async (ms) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Mantener para hablar')
    if (!el) return 'sin botón de hablar'
    const o = { bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'touch' }
    el.dispatchEvent(new PointerEvent('pointerdown', o))
    await window.s(ms)
    el.dispatchEvent(new PointerEvent('pointerup', o))
    return 'habló ' + ms + ' ms'
  }
  b.sum = () => ({
    now: T(),
    allow: b.allow,
    allowAzure: b.allowAzure,
    net: b.net,
    tts: b.tts,
    mic: b.mic.map(({ track, ...m }) => ({ ...m, live: track?.readyState === 'live' })),
    ev: b.ev.slice(-10),
  })
  return 'tel6 instalado'
})()
