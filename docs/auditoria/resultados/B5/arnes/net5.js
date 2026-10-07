// B5 · Red falsa para el navegador: TODA petición fuera de localhost se registra (cabeceras de credenciales
// enmascaradas a 4 caracteres) y se responde en local. Nunca sale nada a la red real.
// window.__b5.gemini = { text, grounding } cambia la respuesta de Gemini (para respuestas maliciosas).
(() => {
  if (window.__b5) return 'ya instalado'
  const b5 = (window.__b5 = { net: [], gemini: null })
  const mask = (v) => (v == null ? v : String(v).slice(0, 4) + '…(' + String(v).length + ')')
  const SECRET = /key|authorization|secret|token/i
  const of = window.fetch.bind(window)
  const DEF = { transcript: 'I like music.', heard_speech: true, reply: 'Great! What music do you like?', reply_es: 'x', corrections: [], title: 'Music', title_es: 'Música', summary: 'Music is fun.', question: 'Do you like music?', vocab: [], ideas: [{ en: 'I think', es: 'Creo' }] }
  window.fetch = async (u, o = {}) => {
    const url = typeof u === 'string' ? u : u.url
    let host
    try { host = new URL(url, location.href).host } catch { host = 'URL-INVALIDA' }
    if (host === location.host) return of(u, o)
    const h = {}
    const hs = o.headers instanceof Headers ? [...o.headers.entries()] : Object.entries(o.headers || {})
    for (const [k, v] of hs) h[k] = SECRET.test(k) ? mask(v) : String(v).slice(0, 60)
    let sys = ''
    try { sys = JSON.parse(o.body).systemInstruction.parts[0].text } catch { /* no gemini */ }
    b5.net.push({ t: Math.round(performance.now()), method: o.method || 'GET', host, path: String(url).replace(/^https?:\/\/[^/]+/, '').slice(0, 120), headers: h, sysLen: sys.length, sys })
    let body
    if (/oauth2\/v2\.0\/token/.test(url)) body = { access_token: 'TOKEN-FALSO-B5' }
    else if (/issueToken/.test(url)) body = 'FAKE'
    else if (/models\?/.test(url)) body = { models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] }
    else if (/generateContent/.test(url)) {
      const g = b5.gemini || {}
      body = { candidates: [{ content: { parts: [{ text: g.text ?? JSON.stringify(DEF) }] }, finishReason: 'STOP', groundingMetadata: g.grounding }], usageMetadata: { promptTokenCount: 1 } }
    } else body = {}
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return 'b5 net instalado'
})()
