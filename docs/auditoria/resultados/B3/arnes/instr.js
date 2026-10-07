// B3 · Instrumentación del micrófono y red falsa. Se inyecta con Runtime.evaluate (teléfono) o javascript_tool (navegador).
// window.__B3CFG = { fake: true|false, gumDelay: ms, silentFirst: n, netDelay: ms }  (antes de inyectar)
(() => {
  if (window.__b3) return 'ya instalado'
  const cfg = Object.assign({ fake: false, gumDelay: 0, silentFirst: 0, netDelay: 300 }, window.__B3CFG || {})
  const T = () => Math.round(performance.now())
  const b3 = (window.__b3 = { cfg, mic: [], rec: [], net: [], tl: [], ev: [] })
  const log = (e) => b3.ev.push(T() + ' ' + e)
  const md = navigator.mediaDevices
  const orig = md.getUserMedia.bind(md)
  let silentLeft = cfg.silentFirst
  md.getUserMedia = async (c) => {
    const id = b3.mic.length
    const m = { id, req: T(), c: JSON.stringify(c).slice(0, 120), stack: new Error().stack.split('\n').slice(2, 5).join(' | ').slice(0, 300) }
    b3.mic.push(m)
    log('gUM req #' + id + ' hidden=' + document.hidden)
    if (cfg.gumDelay) await new Promise((r) => setTimeout(r, cfg.gumDelay))
    let s
    if (cfg.fake) {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      g.gain.value = silentLeft > 0 ? 0 : 0.1
      if (silentLeft > 0) silentLeft--
      else {
        // «habla» sintética: el volumen sube y baja (0–0,2) para que analyzeSpeech vea voz y pausas
        const lfo = ctx.createOscillator()
        lfo.type = 'square'
        lfo.frequency.value = 1.5
        const lg = ctx.createGain()
        lg.gain.value = 0.1
        lfo.connect(lg).connect(g.gain)
        lfo.start()
      }
      const dst = ctx.createMediaStreamDestination()
      osc.connect(g).connect(dst)
      osc.start()
      s = dst.stream
      m.silent = cfg.silentFirst > 0 && silentLeft >= 0 && g.gain.value === 0
    } else s = await orig(c)
    m.open = T()
    m.label = s.getAudioTracks()[0]?.label
    m.track = s.getAudioTracks()[0]
    log('gUM open #' + id + ' hidden=' + document.hidden)
    s.getTracks().forEach((t) => {
      const stop = t.stop.bind(t)
      t.stop = () => {
        if (!m.close) m.close = T()
        log('track stop #' + id)
        stop()
      }
    })
    return s
  }
  const MR = window.MediaRecorder
  window.MediaRecorder = class extends MR {
    constructor(...a) {
      super(...a)
      this.__id = b3.rec.length
      b3.rec.push({ id: this.__id, created: T(), obj: this })
    }
    start(...a) {
      b3.rec[this.__id].start = T()
      log('rec start #' + this.__id)
      return super.start(...a)
    }
    stop() {
      if (!b3.rec[this.__id].stop) b3.rec[this.__id].stop = T()
      log('rec stop #' + this.__id)
      return super.stop()
    }
  }
  // Red falsa (Gemini / Azure): nunca sale nada.
  const fakeText = JSON.stringify({
    transcript: 'I like to talk about music.', heard_speech: true, reply: 'Great! What kind of music do you like?', reply_es: '¡Genial!',
    corrections: [], text: 'Mi viaje a Japón', title: 'Music', titleEs: 'Música', summary: 'x', question: 'Do you like music?',
  })
  const gem = { candidates: [{ content: { parts: [{ text: fakeText }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }
  // En el teléfono (datos reales): a las peticiones con audio se responde «no se oyó voz», así no se guarda ningún turno.
  const deaf = { candidates: [{ content: { parts: [{ text: JSON.stringify({ transcript: '', heard_speech: false, reply: '', reply_es: '', corrections: [], text: '' }) }] }, finishReason: 'STOP' }] }
  const resp = (body) => (cfg.deafAudio && /inlineData/.test(typeof body === 'string' ? body : JSON.stringify(body ?? '')) ? deaf : gem)
  const record = (url, body) => {
    const s = typeof body === 'string' ? body : JSON.stringify(body ?? '')
    b3.net.push({ t: T(), url: String(url).replace(/key=[^&]+/, 'key=***').slice(0, 110), kb: Math.round((s?.length ?? 0) / 1024), audio: /inlineData|audio\//.test(s) })
    log('NET ' + String(url).slice(0, 60))
  }
  const isAI = (u) => /generativelanguage|microsoft|azure/i.test(String(u))
  const of = window.fetch.bind(window)
  window.fetch = async (u, o) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    record(url, o?.body)
    await new Promise((r) => setTimeout(r, cfg.netDelay))
    return new Response(JSON.stringify(resp(o?.body)), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const Cap = window.Capacitor
  if (Cap?.nativePromise) {
    const onp = Cap.nativePromise.bind(Cap)
    Cap.nativePromise = async (plugin, method, opts) => {
      if (plugin === 'CapacitorHttp' && isAI(opts?.url)) {
        record(opts.url, opts.data)
        await new Promise((r) => setTimeout(r, cfg.netDelay))
        return { status: 200, headers: {}, data: resp(opts.data), url: opts.url }
      }
      return onp(plugin, method, opts)
    }
  }
  b3.timer = setInterval(() => {
    const live = b3.mic.filter((m) => m.track && m.track.readyState === 'live').map((m) => m.id)
    const recs = b3.rec.filter((r) => r.obj.state === 'recording').map((r) => r.id)
    const last = b3.tl.at(-1)
    const key = live.join(',') + '|' + recs.join(',') + '|' + document.hidden
    if (!last || last.key !== key) b3.tl.push({ t: T(), key, live, recs, hidden: document.hidden })
  }, 250)
  b3.summary = () => ({
    now: T(),
    mic: b3.mic.map(({ track, stack, ...m }) => ({ ...m, live: track?.readyState === 'live', stack: stack.slice(0, 160) })),
    rec: b3.rec.map(({ obj, ...r }) => ({ ...r, state: obj.state })),
    net: b3.net,
    tl: b3.tl.map(({ t, live, recs, hidden }) => `${t} live=[${live}] rec=[${recs}] hidden=${hidden}`),
    ev: b3.ev,
  })
  return 'instalado ' + JSON.stringify(cfg)
})()
