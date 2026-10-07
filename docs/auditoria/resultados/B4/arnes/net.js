// B4 · Red falsa que registra QUÉ sale en cada petición (navegador: fetch; teléfono: Capacitor.nativePromise('CapacitorHttp')).
// Las cabeceras de credenciales se enmascaran (4 primeros caracteres + longitud). Nunca sale nada a la red real
// salvo que window.__B4CFG.passthrough = true (solo para la llamada real autorizada, y entonces solo se resume).
(() => {
  if (window.__b4) return 'ya instalado'
  const cfg = Object.assign({ passthrough: false }, window.__B4CFG || {})
  const b4 = (window.__b4 = { cfg, net: [] })
  const SECRET_H = /key|authorization|secret|token/i
  const mask = (v) => (v == null ? v : String(v).slice(0, 4) + '…(' + String(v).length + ')')
  const maskHeaders = (h) => {
    const o = {}
    const entries = h instanceof Headers ? [...h.entries()] : Object.entries(h || {})
    for (const [k, v] of entries) o[k] = SECRET_H.test(k) ? mask(v) : String(v).slice(0, 80)
    return o
  }
  const summarizeBody = (body) => {
    if (body == null) return null
    if (body instanceof Uint8Array || body instanceof ArrayBuffer) return { binary: true, bytes: body.byteLength }
    let s = typeof body === 'string' ? body : JSON.stringify(body)
    let j = null
    try { j = typeof body === 'string' ? JSON.parse(body) : body } catch { /* no json */ }
    if (j && (j.contents || j.systemInstruction)) {
      const parts = (j.contents || []).flatMap((c) => c.parts || [])
      return {
        gemini: true, kb: Math.round(s.length / 1024),
        system: (j.systemInstruction?.parts?.[0]?.text || ''),
        contents: (j.contents || []).length,
        audioParts: parts.filter((p) => p.inlineData).map((p) => p.inlineData.mimeType + ' ' + Math.round(p.inlineData.data.length * 0.75 / 1024) + 'KB'),
        textParts: parts.filter((p) => p.text).map((p) => p.text),
        tools: j.tools ? JSON.stringify(j.tools) : undefined,
      }
    }
    if (j && typeof j === 'object') {
      const o = {}
      for (const [k, v] of Object.entries(j)) o[k] = SECRET_H.test(k) ? mask(v) : String(v).slice(0, 80)
      return { form: o }
    }
    if (typeof body === 'string' && body.includes('=')) {
      const o = {}
      for (const [k, v] of new URLSearchParams(body)) o[k] = SECRET_H.test(k) ? mask(v) : v.slice(0, 80)
      return { form: o }
    }
    return { len: s.length }
  }
  const isAI = (u) => /googleapis|microsoft|azure|evil|127\.0\.0\.1:8099/i.test(String(u))
  const host = (u) => { try { return new URL(u).host } catch { return 'URL-INVALIDA' } }
  const fake = (url, body) => {
    const u = String(url)
    if (/oauth2\/v2\.0\/token/.test(u)) return { access_token: 'FAKE-TOKEN-B4', token_type: 'Bearer', expires_in: 3600 }
    if (/metrics/.test(u)) return { value: [] }
    if (/issueToken/.test(u)) return 'FAKE'
    if (/stt\.speech/.test(u)) return { RecognitionStatus: 'Success', DisplayText: 'I like music.', NBest: [{ Display: 'I like music.', PronunciationAssessment: { AccuracyScore: 90, FluencyScore: 90, CompletenessScore: 100, PronScore: 90 }, Words: [] }] }
    if (/models\?/.test(u)) return { models: [{ name: 'models/gemini-3.8-flash', displayName: 'x', supportedGenerationMethods: ['generateContent'] }] }
    const text = JSON.stringify({
      transcript: 'I like to talk about music.', heard_speech: true, reply: 'Great! What kind of music do you like?', reply_es: '¡Genial!', translation_es: 'x',
      corrections: [], title: 'Music', title_es: 'Música', summary: 'Music is fun.', question: 'Do you like music?', vocab: [{ en: 'song', es: 'canción' }],
      headword: 'run', ipa: 'x', partOfSpeech: 'verb', translation: 'correr', meaningEs: 'x', whyEs: 'x', otherMeanings: [], register: 'x', collocations: [], falseFriendEs: '', exampleEn: 'x', exampleEs: 'x',
      ideas: [{ en: 'I think', es: 'Creo' }],
    })
    return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }
  }
  const rec = (via, method, url, headers, body) => {
    b4.net.push({ t: Math.round(performance.now()), via, method, host: host(url), path: String(url).replace(/^https?:\/\/[^/]+/, '').slice(0, 140), urlHasKey: /key=|AIza/.test(String(url)), headers: maskHeaders(headers), body: summarizeBody(body) })
  }
  const of = window.fetch.bind(window)
  window.fetch = async (u, o = {}) => {
    const url = typeof u === 'string' ? u : u.url
    if (!isAI(url)) return of(u, o)
    rec('fetch', o.method || 'GET', url, o.headers, o.body)
    if (cfg.passthrough) return of(u, o)
    const f = fake(url, o.body)
    return new Response(typeof f === 'string' ? f : JSON.stringify(f), { status: 200, headers: { 'content-type': typeof f === 'string' ? 'text/plain' : 'application/json' } })
  }
  const Cap = window.Capacitor
  if (Cap?.nativePromise && Cap.isNativePlatform?.()) {
    const onp = Cap.nativePromise.bind(Cap)
    Cap.nativePromise = async (plugin, method, opts) => {
      if (plugin === 'CapacitorHttp' && isAI(opts?.url)) {
        rec('native', opts.method || method, opts.url, opts.headers, opts.dataType === 'file' ? { fileBase64Len: String(opts.data || '').length } : opts.data)
        if (cfg.passthrough) {
          const r = await onp(plugin, method, opts)
          b4.net.at(-1).status = r?.status
          return r
        }
        return { status: 200, headers: {}, data: fake(opts.url, opts.data), url: opts.url }
      }
      return onp(plugin, method, opts)
    }
  }
  return 'b4 net instalado ' + JSON.stringify(cfg)
})()
