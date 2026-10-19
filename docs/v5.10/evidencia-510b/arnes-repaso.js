// v5.10 · Puntos 4 y 5 (Repaso): arnés de navegador (origen aislado rep.localhost:5173). Se carga con fetch +
// AsyncFunction DESPUÉS de seed7.js (__seedN = 1). Claves ficticias; 0 llamadas reales.
// - Micro falso de oscilador (docs/auditoria/entorno.md) con registro de aperturas y cierres (window.__mic).
// - Gemini simulado: el veredicto del repaso sale de window.__verdicts por orden (correct, almost, wrong…).
// - Azure simulado: PronScore de window.__prons por orden.
// - 4 tarjetas pendientes (3 de correcciones y 1 de Gramática).
window.__mic = []
navigator.mediaDevices.getUserMedia = async (c) => {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  // Volumen que sube y baja (como una voz) para que las barras del TalkButton se muevan y analyzeSpeech oiga habla.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 2
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.5
  lfo.connect(lfoGain).connect(gain.gain)
  gain.gain.value = 0.5
  osc.frequency.value = 220
  const dst = ctx.createMediaStreamDestination()
  osc.connect(gain).connect(dst)
  osc.start()
  lfo.start()
  const s = dst.stream
  const id = window.__mic.length
  window.__mic.push({ id, open: performance.now(), c: JSON.stringify(c) })
  s.getTracks().forEach((t) => {
    const stop = t.stop.bind(t)
    t.stop = () => {
      window.__mic[id].close = performance.now()
      stop()
    }
  })
  return s
}

window.__verdicts = window.__verdicts ?? ['correct', 'almost', 'wrong', 'correct']
window.__prons = window.__prons ?? [92, 71, 48, 88]
window.__net = []
const realFetch = window.__realFetch ?? window.fetch.bind(window)
window.__realFetch = realFetch
let v = 0
let p = 0
window.fetch = async (url, init) => {
  const u = String(url instanceof Request ? url.url : url)
  if (/googleapis|microsoft/.test(u)) {
    window.__net.push({ host: new URL(u).host, at: Date.now() })
    let body
    if (/issueToken/.test(u)) return new Response('FAKE', { status: 200 })
    if (/stt\.speech/.test(u)) {
      const score = window.__prons[p++ % window.__prons.length]
      body = {
        RecognitionStatus: 'Success',
        DisplayText: 'I went yesterday.',
        NBest: [{ Display: 'I went yesterday.', PronunciationAssessment: { AccuracyScore: score, FluencyScore: score, CompletenessScore: 100, PronScore: score }, Words: [] }],
      }
    } else if (/models\?/.test(u)) {
      body = { models: [{ name: 'models/gemini-3.8-flash', displayName: 'x', supportedGenerationMethods: ['generateContent'] }] }
    } else {
      const verdict = window.__verdicts[v++ % window.__verdicts.length]
      const fb = { correct: '¡Perfecto! Lo dijiste natural.', almost: 'Casi: te faltó «the».', wrong: 'El tiempo verbal no es el correcto.' }[verdict]
      const text = JSON.stringify({ transcript: 'I went to the beach yesterday', verdict, feedback_es: fb })
      body = { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return realFetch(url, init)
}

const { db } = await import('/src/lib/db.ts')
const { loadSettings, saveSettings } = await import('/src/lib/settings.ts')
const now = Date.now()
const day = 86400000
const fsrs = { due: now - day, stability: 3, difficulty: 5, elapsed_days: 1, scheduled_days: 3, reps: 2, lapses: 0, state: 2, last_review: now - 4 * day }
const card = (source, sourceId, promptEs, answerEn, hintEs) => ({ source, sourceId, promptEs, answerEn, hintEs, createdAt: now - 5 * day, due: now - day, fsrs })
await db.transaction('rw', db.cards, db.mistakes, db.lookups, async () => {
  await db.cards.clear()
  await db.mistakes.clear()
  await db.lookups.clear()
  await db.cards.bulkAdd([
    card('mistake', 9001, 'Ayer fui a la playa', 'I went to the beach yesterday', 'Pasado simple: go → went'),
    card('mistake', 9002, 'Llevo dos años viviendo aquí', 'I have been living here for two years', 'Presente perfecto continuo'),
    card('mistake', 9003, 'Me interesa la música', "I'm interested in music", 'interested in'),
    card('grammar', 9004, 'She ___ (work) here since 2020.', 'She has worked here since 2020', 'since + presente perfecto'),
  ])
})
const s = await loadSettings()
await saveSettings({
  ...s,
  azureKey: 'AZTEST-NO-REAL-00000000000000000000',
  azureRegion: 'westeurope',
  azurePlan: 'S0',
  phoneticsOn: true,
  reviewHelpSeen: true,
})
JSON.stringify({ cards: await db.cards.count(), verdicts: window.__verdicts, prons: window.__prons })
