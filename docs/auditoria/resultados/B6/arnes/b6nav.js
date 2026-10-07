// B6 · Arnés del NAVEGADOR (vista previa habla-dev): micro falso instrumentado + red falsa de Gemini/Azure con reglas.
// Inyectar con javascript_tool tras cada carga de página (se pierde al recargar).
//   window.__B6CFG = { delay: 300 }          (opcional, antes de inyectar)
//   __b6.rules.push({ re: /generateContent/, status: 503, delay: 0, times: 2, body: {...} })  → respuesta forzada
//   __b6.net   → registro de peticiones (URL sin clave, kb, audio, tipo, estado devuelto)
//   __b6.mic / __b6.rec → aperturas/cierres de micro y MediaRecorder
// La respuesta OK por defecto es un JSON «universal» con todos los campos que esperan clase, test, plan, lecciones,
// consulta de palabras, ideas, repaso y dictado (los campos sobrantes se ignoran).
(() => {
  if (window.__b6) return 'ya instalado'
  const cfg = Object.assign({ delay: 300 }, window.__B6CFG || {})
  const T = () => Math.round(performance.now())
  const b6 = (window.__b6 = { cfg, rules: [], net: [], mic: [], rec: [], ev: [] })
  const log = (e) => b6.ev.push(T() + ' ' + e)
  // ---- micro falso: oscilador con volumen que sube y baja (analyzeSpeech ve voz y pausas)
  const md = navigator.mediaDevices
  md.getUserMedia = async (c) => {
    const id = b6.mic.length
    const m = { id, req: T(), stack: new Error().stack.split('\n').slice(2, 4).join(' | ').slice(0, 200) }
    b6.mic.push(m)
    const ctx = new AudioContext()
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
    const dst = ctx.createMediaStreamDestination()
    osc.connect(g).connect(dst)
    osc.start()
    const s = dst.stream
    m.open = T()
    m.track = s.getAudioTracks()[0]
    log('mic open #' + id)
    s.getTracks().forEach((t) => {
      const stop = t.stop.bind(t)
      t.stop = () => {
        if (!m.close) m.close = T()
        log('mic close #' + id)
        stop()
      }
    })
    return s
  }
  const MR = window.MediaRecorder
  window.MediaRecorder = class extends MR {
    constructor(...a) {
      super(...a)
      this.__id = b6.rec.length
      b6.rec.push({ id: this.__id, obj: this })
    }
    start(...a) {
      b6.rec[this.__id].start = T()
      return super.start(...a)
    }
    stop() {
      if (!b6.rec[this.__id].stop) b6.rec[this.__id].stop = T()
      return super.stop()
    }
  }
  // ---- red falsa
  const weeks = Array.from({ length: 12 }, (_, i) => ({ title_es: 'Semana falsa ' + (i + 1), focus_en: 'Past simple ' + (i + 1), focus_es: 'Pasado ' + (i + 1), can_do_es: 'Podrás hablar', theme_en: 'Travel' }))
  const lessons = Array.from({ length: 5 }, (_, i) => ({ title_es: 'Lección falsa ' + (i + 1), kind: 'conversation', situation_en: 'Chat', target_en: 'Past simple', phrases: [{ en: 'I went', es: 'Fui' }], mission_es: 'Cuenta algo', opener_en: 'What did you do yesterday?' }))
  const universal = {
    transcript: 'I like to talk about music.', heard_speech: true, reply: 'Great! What kind of music do you like?', reply_es: '¡Genial! ¿Qué música te gusta?', translation_es: 'Me gusta hablar de música.',
    corrections: [], level: 'B1', notes: 'ok', text: 'Mi viaje a Japón', title: 'Music', title_es: 'Música', titleEs: 'Música', summary: 'Music is fun.', question: 'Do you like music?',
    criteria: { fluency: 'B1', vocabulary: 'B1', grammar: 'B1', pronunciation: 'B1' }, reasons_es: { fluency: 'x', vocabulary: 'x', grammar: 'x', pronunciation: 'x' },
    strengths_es: ['Buena actitud'], weaknesses_es: ['Tiempos verbales'], weaknesses_en: ['Tenses'], summary_es: 'Hablas bien.',
    weeks, lessons, ideas: [{ en: 'I think music is great', es: 'Creo que la música es genial' }], verdict: 'good', feedback_es: 'Bien',
    headword: 'run', ipa: 'rʌn', partOfSpeech: 'verb', translation: 'correr', meaningEs: 'moverse rápido', whyEs: 'x', otherMeanings: [], register: 'neutral', collocations: [], falseFriendEs: '', exampleEn: 'I run.', exampleEs: 'Corro.',
  }
  const okGem = (obj) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } })
  const fakeOk = (u) => {
    if (/oauth2\/v2\.0\/token/.test(u)) return { access_token: 'FAKE-TOKEN-B6', token_type: 'Bearer', expires_in: 3600 }
    if (/metrics/.test(u)) return { value: [] }
    if (/issueToken/.test(u)) return 'FAKE'
    if (/stt\.speech/.test(u)) return { RecognitionStatus: 'Success', DisplayText: 'I like music.', NBest: [{ Display: 'I like music.', PronunciationAssessment: { AccuracyScore: 90, FluencyScore: 90, CompletenessScore: 100, PronScore: 90 }, Words: [] }] }
    if (/models(\?|$)/.test(u)) return { models: [{ name: 'models/gemini-3.8-flash', displayName: 'x', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', displayName: 'y', supportedGenerationMethods: ['generateContent'] }] }
    return okGem(universal)
  }
  const kindOf = (s) => {
    const m = s.match(/"text":"([^"]{0,60})/)
    return m ? m[1] : ''
  }
  const isAI = (u) => /googleapis|microsoft|azure/i.test(String(u))
  const of = window.fetch.bind(window)
  window.fetch = async (u, o = {}) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    const s = typeof o.body === 'string' ? o.body : JSON.stringify(o.body ?? '')
    const e = { t: T(), url: String(url).replace(/key=[^&]+/, 'key=***').replace(/^https?:\/\//, '').slice(0, 100), kb: Math.round(s.length / 1024), audio: /inlineData|audio\//.test(s), kind: kindOf(s), hidden: document.hidden }
    b6.net.push(e)
    const rule = b6.rules.find((r) => r.re.test(url) && (r.times == null || r.times > 0) && (!r.match || r.match.test(s)))
    if (rule && rule.times != null) rule.times--
    const delay = rule?.delay ?? cfg.delay
    if (rule?.netError) {
      await new Promise((r) => setTimeout(r, delay))
      e.status = 'TypeError'
      throw new TypeError('Failed to fetch')
    }
    await new Promise((r) => setTimeout(r, delay))
    const status = rule?.status ?? 200
    const body = rule?.body ?? (status === 200 ? fakeOk(url) : { error: { code: status, message: rule?.message ?? 'fake ' + status, status: rule?.gstatus ?? 'UNAVAILABLE' } })
    e.status = status
    e.done = T()
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }
  b6.sum = () => ({
    now: T(),
    mic: b6.mic.map(({ track, stack, ...m }) => ({ ...m, live: track?.readyState === 'live' })),
    rec: b6.rec.map(({ obj, ...r }) => ({ ...r, state: obj.state })),
    net: b6.net,
  })
  window.clickText = (t) => {
    const el = [...document.querySelectorAll('button,a,[role=button],label')].find((b) => b.innerText.trim().includes(t))
    if (!el) return 'no ' + t
    el.click()
    return 'ok ' + el.innerText.trim().slice(0, 40)
  }
  window.btns = () => [...document.querySelectorAll('button')].map((b) => (b.innerText.trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean)
  // Test de nivel: marca «No lo sé» en todas las preguntas visibles y devuelve el texto del último botón.
  window.nose = async () => {
    for (const b of [...document.querySelectorAll('button')].filter((b) => /No lo sé/.test(b.innerText))) {
      b.click()
      await new Promise((r) => setTimeout(r, 120))
    }
    await new Promise((r) => setTimeout(r, 300))
    return window.btns().at(-1)
  }
  window.wait = (ms) => new Promise((r) => setTimeout(r, ms))
  window.view = () => ({ text: document.body.innerText.slice(0, 700), btns: window.btns() })
  return 'b6 instalado ' + JSON.stringify(cfg)
})()
