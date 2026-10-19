(() => {
  if (window.__lex) return 'ya'
  const lex = (window.__lex = { calls: [], delay: 600, fail: false })
  const D = {
    big: { t: 'grande', m: 'De gran tamaño.', syn: ['large', 'huge', 'enormous', 'Big', 'massive', 'vast', 'giant', 'immense'], ant: ['small', 'little'] },
    large: { t: 'grande', m: 'De tamaño grande.', syn: ['big', 'huge', 'sizeable'], ant: ['small', 'tiny'] },
    small: { t: 'pequeño', m: 'De poco tamaño.', syn: ['little', 'tiny'], ant: ['big', 'large'] },
  }
  const orig = window.fetch.bind(window)
  window.fetch = async (url, init) => {
    const u = String(url)
    if (!/googleapis|generativelanguage/.test(u)) return orig(url, init)
    let body = {}
    try { body = JSON.parse(init?.body || '{}') } catch { /* */ }
    const prompt = (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n')
    const q = (prompt.match(/asks about: "([^"]+)"/) || [])[1] || 'word'
    lex.calls.push({ q, prompt: prompt.slice(0, 1200), schemaHasSyn: JSON.stringify(body).includes('"synonyms"') })
    await new Promise((r) => setTimeout(r, lex.delay))
    if (/models\?|\/models$/.test(u)) return new Response(JSON.stringify({ models: [] }), { status: 200 })
    if (lex.fail) return new Response(JSON.stringify({ error: { code: 400, message: 'Fallo simulado de red' } }), { status: 400 })
    const d = D[q.toLowerCase()] || { t: 'x', m: 'Significado simulado.', syn: [], ant: [] }
    const text = JSON.stringify({
      headword: q, ipa: '/' + q + '/', part_of_speech: 'adjetivo', translation: d.t, meaning_es: d.m, why_es: 'Por el contexto.',
      other_meanings: [], register: 'neutro', collocations: [q + ' house'], false_friend_es: '', example_en: 'A ' + q + ' dog.', example_es: 'Un perro.',
      synonyms: d.syn, antonyms: d.ant,
      transcript: 'Hello', heard_speech: true, reply: 'It was a big house near the river.', reply_es: 'Era una casa grande junto al río.', translation_es: 'Era una casa grande.', corrections: [],
      title: 'Houses', title_es: 'Casas', summary: 'x', question: 'Do you like big houses?', vocab: [], ideas: [],
    })
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  // Voz falsa: «suena» 3 s y termina (en headless no hay motor de voz); así se ve ▶/⏸.
  try {
    const ss = window.speechSynthesis
    ss.speak = (u) => { lex.spoken = (lex.spoken || []).concat(u.text); u.onstart && u.onstart(); lex.t = setTimeout(() => u.onend && u.onend(), 3000) }
    ss.cancel = () => clearTimeout(lex.t)
  } catch { /* */ }
  return 'ok'
})()
