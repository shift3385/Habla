// 5.11 · D1 · Fonética: M-11 («te salió /s/ en vez de /θ/» con NBestPhonemeCount), M-12 (consejos de /θ/ y /ð/ que
// valen en Latinoamérica) y S-06 (`assessWord` para Sonidos, con la política F0/S0 de phonetics.ts).
// Sin audio ni claves: respuestas de Azure en tests/fixtures/azure-*.json (las «azure-doc-*» siguen el formato de la
// documentación de Microsoft; las reales de F0-4 irán en «azure-f0-*» y se prueban solas en el último test).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { after, afterEach, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const FIX = new URL('./fixtures/', import.meta.url)
const fixture = (name) => JSON.parse(readFileSync(new URL(name, FIX), 'utf8'))
const load = () => loadFresh('/src/lib/pronunciation.ts')

// fetch simulado: guarda cada petición (URL, cabeceras, tamaño del audio) y responde lo que diga la cola.
let calls = []
// Entre tests, ninguna petición sale a la red de verdad (una promesa olvidada llamaría a Azure con una clave falsa).
const noNetwork = async () => {
  throw new Error('red real prohibida en los tests')
}
globalThis.fetch = noNetwork
function mockFetch(...responses) {
  calls = []
  globalThis.fetch = async (url, init) => {
    const config = JSON.parse(decodeURIComponent(escape(atob(init.headers['Pronunciation-Assessment']))))
    calls.push({ url, config, bytes: init.body.length })
    const [status, body] = responses.length > 1 ? responses.shift() : responses[0]
    return { status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }
  }
}
afterEach(() => {
  globalThis.fetch = noNetwork
})
const wav = (seconds = 1) => ({ base64: Buffer.alloc(44 + Math.round(seconds * 32000)).toString('base64'), seconds })

// ---------------------------------------------------------------------------------------------------------------
// M-11

test('M-11: se leen los NBestPhonemes (REST plano), ordenados del más probable al menos', async () => {
  const P = await load()
  const r = P.parseAssessment(fixture('azure-doc-think-sink.json'))
  const th = r.words[0].phonemes[0]
  assert.equal(th.phoneme, 'θ')
  assert.equal(th.accuracy, 18)
  assert.deepEqual(th.nbest.map((c) => c.phoneme), ['s', 'θ', 'f', 't', 'ʃ'])
  assert.equal(P.heardInstead(th), 's')
})

test('M-11: la palabra a cuidar lleva «/θ/ 18 · te salió /s/» (datos del chip)', async () => {
  const P = await load()
  const [w] = P.weakWords(P.parseAssessment(fixture('azure-doc-think-sink.json')))
  assert.equal(w.word, 'think')
  assert.equal(w.phoneme, 'θ')
  assert.equal(w.phonemeAccuracy, 18)
  assert.equal(w.heard, 's')
  assert.match(w.tip, /sopla, sin voz/)
})

test('M-11: formato del SDK (anidado): very → /b/, sheep → /ɪ/; /ɡ/ dicho «g» es el mismo sonido', async () => {
  const P = await load()
  const r = P.parseAssessment(fixture('azure-doc-sdk-very-sheep.json'))
  const weak = P.weakWords(r)
  const by = Object.fromEntries(weak.map((w) => [w.word, w]))
  assert.equal(by.very.heard, 'b')
  assert.equal(by.sheep.phoneme, 'i')
  assert.equal(by.sheep.heard, 'ɪ')
  assert.equal(by.go.phoneme, 'ɡ')
  assert.equal(by.go.heard, undefined, 'ɡ/g normalizados: no hay «te salió»')
})

test('M-11: normalización de símbolos (i/iː, u/uː, g/ɡ, ɝ/ɚ)', async () => {
  const P = await load()
  for (const [a, b] of [['i', 'iː'], ['u', 'uː'], ['g', 'ɡ'], ['ɝ', 'ɚ']]) assert.equal(P.normPhoneme(a), P.normPhoneme(b), `${a} = ${b}`)
  assert.notEqual(P.normPhoneme('ɪ'), P.normPhoneme('i'))
  assert.notEqual(P.normPhoneme('s'), P.normPhoneme('θ'))
  const p = (phoneme, accuracy, nbest) => ({ phoneme, accuracy, nbest: nbest.map(([x, score]) => ({ phoneme: x, score })) })
  assert.equal(P.heardInstead(p('iː', 40, [['i', 80], ['ɪ', 30]])), undefined)
  assert.equal(P.heardInstead(p('ɚ', 40, [['ɝ', 80], ['ə', 30]])), undefined)
})

test('M-11: umbrales configurables; casi empate, nota buena o sin NBest → no se dice nada', async () => {
  const P = await load()
  const p = (accuracy, nbest) => ({ phoneme: 'θ', accuracy, nbest: nbest?.map(([x, score]) => ({ phoneme: x, score })) })
  assert.equal(P.heardInstead(p(40, [['s', 45], ['θ', 40]])), undefined, 'ventaja 5 < 15')
  assert.equal(P.heardInstead(p(40, [['s', 45], ['θ', 40]]), { minMargin: 0 }), 's')
  assert.equal(P.heardInstead(p(20, [['s', 30], ['θ', 10]])), undefined, 'probabilidad 30 < 40')
  assert.equal(P.heardInstead(p(20, [['s', 30], ['θ', 10]]), { minScore: 20 }), 's')
  assert.equal(P.heardInstead(p(75, [['s', 90], ['θ', 20]])), undefined, 'nota del fonema ≥ 70: no es un sonido flojo')
  assert.equal(P.heardInstead(p(20, undefined)), undefined)
  assert.equal(P.heardInstead(p(20, [])), undefined)
  assert.deepEqual(Object.keys(P.HEARD_RULES).sort(), ['maxAccuracy', 'minMargin', 'minScore'])
})

test('M-11: sin el campo NBest todo queda como en la 5.10.1 (sin «te salió»)', async () => {
  const P = await load()
  const r = P.parseAssessment(fixture('azure-doc-sin-nbest.json'))
  assert.equal('nbest' in r.words[0].phonemes[0], false)
  const [w] = P.weakWords(r)
  assert.deepEqual({ word: w.word, error: w.error, accuracy: w.accuracy, phoneme: w.phoneme }, { word: 'think', error: 'Mispronunciation', accuracy: 52, phoneme: 'θ' })
  assert.equal('heard' in w, false)
  // La frase del coach es la misma con o sin NBest.
  assert.equal(P.pronunciationLine(r), P.pronunciationLine(P.parseAssessment(fixture('azure-doc-think-sink.json'))))
})

test('M-11: la clase pide NBestPhonemeCount 5 en la MISMA petición: mismas peticiones y mismo audio que en la 5.10.1', async () => {
  const P = await load()
  const ok = fixture('azure-doc-think-sink.json')
  // Azure entiende lo mismo que Gemini: una sola petición, sin referencia.
  mockFetch([200, ok])
  await P.assessPronunciation('k', 'eastus', wav(2), async () => 'Think.')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].config.NBestPhonemeCount, 5)
  assert.equal(calls[0].config.ReferenceText, '')
  assert.equal(calls[0].config.EnableProsodyAssessment, true, 'la clase sigue con prosodia')
  assert.equal(calls[0].bytes, 44 + 64000, 'el audio que se envía no cambia')
  // No coincide: segunda pasada con referencia, como antes (2 peticiones, el mismo audio).
  mockFetch([200, ok])
  await P.assessPronunciation('k', 'eastus', wav(2), async () => 'I sink so')
  assert.equal(calls.length, 2)
  assert.equal(calls[1].config.ReferenceText, 'I sink so')
  assert.equal(calls[1].config.EnableMiscue, true)
  assert.ok(calls.every((c) => c.bytes === 44 + 64000))
})

test('M-11: si Azure rechazara NBestPhonemeCount (400), se repite una vez sin él y no se vuelve a pedir', async () => {
  const P = await load()
  mockFetch([400, 'Invalid parameter NBestPhonemeCount'], [200, fixture('azure-doc-sin-nbest.json')])
  const r = await P.assessPronunciation('k', 'eastus', wav(), async () => 'Think.')
  assert.ok(r)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].config.NBestPhonemeCount, 5)
  assert.equal('NBestPhonemeCount' in calls[1].config, false)
  mockFetch([200, fixture('azure-doc-sin-nbest.json')])
  await P.assessPronunciation('k', 'eastus', wav(), async () => 'Think.')
  assert.equal('NBestPhonemeCount' in calls[0].config, false, 'en esta sesión ya no se pide')
})

// ---------------------------------------------------------------------------------------------------------------
// S-06

test('S-06: assessWord hace UNA petición con referencia, sin miscue, con NBest 5, y devuelve la nota del sonido objetivo', async () => {
  const P = await load()
  mockFetch([200, fixture('azure-doc-think-sink.json')])
  const s = await P.assessWord('k', 'eastus', wav(1.2), 'think', 'θ')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].config.ReferenceText, 'think')
  assert.equal(calls[0].config.EnableMiscue, false)
  assert.equal(calls[0].config.NBestPhonemeCount, 5)
  assert.equal(calls[0].config.EnableProsodyAssessment, false)
  assert.equal(s.accuracy, 52)
  assert.deepEqual(s.target, { phoneme: 'θ', accuracy: 18, heard: 's' })
  assert.deepEqual(s.phonemes.map((p) => p.phoneme), ['θ', 'ɪ', 'ŋ', 'k'])
})

test('S-06: wordScore busca el sonido objetivo normalizado y toma su peor aparición; sin él, sin target', async () => {
  const P = await load()
  const r = P.parseAssessment(fixture('azure-doc-sdk-very-sheep.json'))
  assert.deepEqual(P.wordScore(r, 'iː').target, { phoneme: 'i', accuracy: 35, heard: 'ɪ' }, '«iː» encuentra la «i» de Azure; la peor es la de sheep')
  assert.deepEqual(P.wordScore(r, 'g').target, { phoneme: 'ɡ', accuracy: 55 })
  assert.equal(P.wordScore(r, 'θ').target, undefined)
  assert.equal(P.wordScore(r).target, undefined)
  // Sin NBest: nota del sonido, sin «heard».
  assert.deepEqual(P.wordScore(P.parseAssessment(fixture('azure-doc-sin-nbest.json')), 'θ').target, { phoneme: 'θ', accuracy: 18 })
})

test('S-06: Azure no oye habla → null; cuota agotada → AzureError «quota»', async () => {
  const P = await load()
  mockFetch([200, { RecognitionStatus: 'InitialSilenceTimeout' }])
  assert.equal(await P.assessWord('k', 'eastus', wav(), 'think', 'θ'), null)
  mockFetch([403, 'Quota exceeded'])
  await assert.rejects(P.assessWord('k', 'eastus', wav(), 'think'), (e) => e.kind === 'quota')
})

test('S-06: 300 ms de silencio delante y detrás (wav.ts) y cuentan en los segundos facturados', async () => {
  const W = await loadFresh('/src/lib/wav.ts')
  assert.equal(W.WORD_PAD_MS, 300)
  const x = new Float32Array([0.5, -0.5, 0.25])
  const y = W.padSamples(x, 16000, 300)
  assert.equal(y.length, 3 + 4800 * 2)
  assert.deepEqual([...y.subarray(4800, 4803)], [0.5, -0.5, 0.25])
  assert.ok(y.subarray(0, 4800).every((v) => v === 0) && y.subarray(4803).every((v) => v === 0))
  assert.equal(W.padSamples(x, 16000, 0), x, 'sin relleno, las mismas muestras')

  // toWav16k con el navegador simulado: 0,5 s de voz + 0,6 s de silencio = 1,1 s.
  globalThis.AudioContext = class {
    decodeAudioData = async () => ({ duration: 0.5 })
    close = async () => {}
  }
  globalThis.OfflineAudioContext = class {
    constructor(_c, len) {
      this.len = len
      this.destination = {}
    }
    createBufferSource = () => ({ connect() {}, start() {} })
    startRendering = async () => ({ getChannelData: () => new Float32Array(this.len) })
  }
  const blob = new Blob([new Uint8Array(8)])
  const plain = await W.toWav16k(blob)
  assert.equal(plain.seconds, 0.5, 'la clase: igual que en la 5.10.1')
  const padded = await W.toWav16k(blob, { padMs: 300 })
  assert.ok(Math.abs(padded.seconds - 1.1) < 1e-9)
  assert.equal(Buffer.from(padded.base64, 'base64').length, 44 + (8000 + 9600) * 2)
})

const settings = (patch = {}) => ({ azureKey: 'k', azureRegion: 'eastus', azurePlan: 'F0', phoneticsOn: true, f0ExhaustedMonth: '', ...patch })

test('S-06: runWordPhonetics sigue la política F0/S0: apagada, sin Azure o F0 agotado → no llama y devuelve null («sin nota»)', async () => {
  const Ph = await loadFresh('/src/lib/phonetics.ts')
  mockFetch([200, fixture('azure-doc-think-sink.json')])
  const blob = new Blob([new Uint8Array(8)])
  const noop = () => {}
  assert.equal(Ph.runWordPhonetics(settings({ f0ExhaustedMonth: Ph.monthKey() }), noop, blob, 'think', 'θ'), null)
  assert.equal(Ph.runWordPhonetics(settings({ phoneticsOn: false }), noop, blob, 'think', 'θ'), null)
  assert.equal(Ph.runWordPhonetics(settings({ azureKey: '' }), noop, blob, 'think', 'θ'), null)
  assert.equal(Ph.runWordPhonetics(settings(), noop, blob, '  ', 'θ'), null, 'sin palabra no hay nada que evaluar')
  assert.equal(calls.length, 0, 'ninguna petición a Azure')
  // S0 de pago con el mes «agotado» de un F0 anterior: sí evalúa.
  // (Se espera la respuesta: si no, la petición saldría al terminar el test, con el fetch real.)
  assert.equal(typeof (await Ph.runWordPhonetics(settings({ azurePlan: 'S0payg', f0ExhaustedMonth: Ph.monthKey() }), noop, blob, 'think', 'θ')), 'object')
  assert.equal(calls.length, 1)
})

test('S-06: runWordPhonetics evalúa con silencio y, si se agota la cuota, apaga la fonética y avisa como la clase', async () => {
  const Ph = await loadFresh('/src/lib/phonetics.ts')
  const blob = new Blob([new Uint8Array(8)])
  mockFetch([200, fixture('azure-doc-think-sink.json')])
  const ok = await Ph.runWordPhonetics(settings(), () => {}, blob, 'think', 'θ')
  assert.deepEqual(ok.target, { phoneme: 'θ', accuracy: 18, heard: 's' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].bytes, 44 + (8000 + 9600) * 2, '0,5 s + 2 × 300 ms')

  mockFetch([403, 'Quota exceeded for this month'])
  const patches = []
  let alerted = 0
  const off = Ph.onPhoneticsQuota(() => alerted++)
  const msg = await Ph.runWordPhonetics(settings(), (p) => patches.push(p), blob, 'think', 'θ')
  off()
  assert.equal(typeof msg, 'string')
  assert.match(msg, /horas gratis/)
  assert.equal(patches[0].phoneticsOn, false)
  assert.equal(patches[0].f0ExhaustedMonth, Ph.monthKey())
  assert.equal(alerted, 1)

  mockFetch([200, { RecognitionStatus: 'NoMatch' }])
  assert.match(await Ph.runWordPhonetics(settings(), () => {}, blob, 'think'), /no oyó habla/)
})

// ---------------------------------------------------------------------------------------------------------------
// S-11 (parte lógica): qué sonido se enlaza con Sonidos

test('S-11: se propone un solo sonido: s + consonante → rasgo s-cluster (E1), -ed → ed (E4), omisión → sin enlace', async () => {
  const P = await load()
  const ww = (word, error, phoneme) => ({ word, error, accuracy: 40, ...(phoneme ? { phoneme } : {}) })
  assert.deepEqual(P.practiceSound([ww('Spain', 'Mispronunciation', 's')]), { word: 'Spain', phoneme: 's', feature: 's-cluster' })
  assert.deepEqual(P.practiceSound([ww('worked', 'Mispronunciation', 't')]), { word: 'worked', phoneme: 't', feature: 'ed' })
  assert.equal(P.practiceSound([ww('last', 'Omission')]), null)
  assert.equal(P.practiceSound([ww('cat', 'Mispronunciation')]), null, 'sin fonema flojo no hay enlace')
  assert.deepEqual(P.practiceSound([ww('last', 'Omission'), ww('think', 'Mispronunciation', 'θ'), ww('very', 'Mispronunciation', 'v')]), { word: 'think', phoneme: 'θ' })
  // Sin ficha para /θ/ (p. ej. contenido aún no cargado), pasa al siguiente con ficha.
  assert.deepEqual(P.practiceSound([ww('think', 'Mispronunciation', 'θ'), ww('very', 'Mispronunciation', 'v')], (s) => s.phoneme !== 'θ'), { word: 'very', phoneme: 'v' })
  assert.equal(P.practiceSound([]), null)
})

// ---------------------------------------------------------------------------------------------------------------
// M-12

test('M-12: /θ/ y /ð/ con pistas latinoamericanas; ningún consejo nombra España (sin alternativa)', async () => {
  const P = await load()
  assert.equal(P.SOUND_TIPS['θ'], 'punta de la lengua entre los dientes y sopla, sin voz: think')
  assert.match(P.SOUND_TIPS['ð'], /d suave de «nada», con la lengua entre los dientes: this/)
  for (const [ph, tip] of Object.entries(P.SOUND_TIPS)) assert.doesNotMatch(tip, /España|español de España|castellan/i, `/${ph}/: ${tip}`)
  // Los casos especiales siguen igual.
  assert.match(P.soundTipEs('Spain', 's'), /no digas «es-»/)
  assert.match(P.soundTipEs('worked', 't'), /-ed/)
  assert.equal(P.soundTipEs('think', 'θ'), P.SOUND_TIPS['θ'])
})

test('M-12b: cada consejo con ficha sale de tipShortEs (phonemes.json → tips.json); el código solo cubre lo que aún no tiene ficha', async () => {
  const P = await load()
  const { phonemes } = JSON.parse(readFileSync(new URL('../src/sounds/phonemes.json', import.meta.url), 'utf8'))
  const tips = JSON.parse(readFileSync(new URL('../src/sounds/tips.json', import.meta.url), 'utf8'))
  // Lo esperado desde las fichas (si dos comparten símbolo, manda la primera, como en sounds.ts › loadSoundTips).
  const want = {}
  for (const ph of phonemes) for (const az of ph.azure) want[az] ??= ph.tipShortEs
  // tips.json está al día con las fichas (lo exige también validate-sounds) …
  assert.deepEqual(tips.byAzure, want, 'tips.json desfasado: node scripts/validate-sounds.mjs --write-tips')
  let compared = 0
  for (const [az, tip] of Object.entries(want)) {
    // … y el consejo que da la app es exactamente el de la ficha.
    assert.equal(P.SOUND_TIPS[az], tip, `/${az}/`)
    assert.equal(P.soundTipEs('word', az), tip, `soundTipEs /${az}/`)
    compared++
  }
  assert.ok(compared >= 41, `comparados: ${compared}`)
  // Una sola fuente: la app no tiene ningún consejo que no venga de una ficha.
  assert.deepEqual(P.SOUND_TIPS, tips.byAzure)
  // Azure escribe /iː/ como «i» y /uː/ como «u»: el consejo es el de la ficha.
  assert.equal(P.soundTipEs('sheep', 'iː'), tips.byAzure.i)
  if (tips.byAzure.u) assert.equal(P.soundTipEs('food', 'uː'), tips.byAzure.u)
  // Los sonidos de la tabla de la 5.10.1 siguen teniendo consejo (ahora el de su ficha).
  for (const az of ['ɪ', 'i', 'v', 'b', 'θ', 'ð', 'ʃ', 'tʃ', 'z', 'ə', 'ɚ', 'æ', 'ʌ', 'ʊ', 'u', 'h', 'dʒ', 'j', 'ɹ', 'ɝ', 'ŋ']) {
    assert.ok(P.soundTipEs('word', az), `/${az}/ sin consejo`)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// Respuestas reales de F0-4 (las deja el orquestador en tests/fixtures/azure-f0-*.json): todas se leen sin errores.

test('F0-4: las respuestas reales de Azure (si ya están) se leen y, con NBest, dan candidatos', async () => {
  const P = await load()
  const real = readdirSync(FIX).filter((f) => /^azure-f0-.*\.json$/.test(f))
  for (const f of real) {
    const data = fixture(f)
    const r = P.parseAssessment(data)
    if (data.RecognitionStatus !== 'Success') continue
    assert.ok(r, `${f}: sin evaluación`)
    if (JSON.stringify(data).includes('NBestPhonemes')) assert.ok(r.words.some((w) => w.phonemes.some((p) => p.nbest?.length)), `${f}: NBest no leído`)
    P.weakWords(r)
  }
})

test('S-11: la línea apunta a la ficha del sonido más flojo con ficha (mapa real de sounds.ts) y dice qué practicar', async () => {
  const P = await load()
  const S = await loadFresh('/src/lib/sounds.ts')
  const { phonemes } = JSON.parse(readFileSync(new URL('../src/sounds/phonemes.json', import.meta.url), 'utf8'))
  const find = (x) => S.phonemeByAzure(phonemes, x.phoneme, x.word)
  const ww = (word, error, phoneme) => ({ word, error, accuracy: 40, ...(phoneme ? { phoneme } : {}) })
  const th = P.practiceSheet([ww('think', 'Mispronunciation', 'θ')], find)
  assert.equal(th.id, 'th')
  assert.equal(P.practiceLabel(th), 'Practicar el sonido /θ/ en Sonidos')
  // Azure /iː/ como «i» → ficha iy.
  assert.equal(P.practiceSheet([ww('sheep', 'Mispronunciation', 'i')], find).id, 'iy')
  // Un sonido sin ficha (ʔ) se salta y va al siguiente; omisión, nunca.
  assert.equal(P.practiceSheet([ww('last', 'Omission'), ww('uh-oh', 'Mispronunciation', 'ʔ'), ww('ship', 'Mispronunciation', 'ɪ')], find).id, 'ih')
  assert.equal(P.practiceSheet([ww('last', 'Omission')], find), undefined)
  // Rasgos (cuando estén sus fichas): s + consonante → s-cluster (E1), -ed → ed (E4).
  if (phonemes.some((p) => p.id === 's-cluster')) {
    const sc = P.practiceSheet([ww('Spain', 'Mispronunciation', 's')], find)
    assert.equal(sc.id, 's-cluster')
    assert.match(P.practiceLabel(sc), /^Practicar «.+» en Sonidos$/)
  }
  if (phonemes.some((p) => p.id === 'ed')) assert.equal(P.practiceSheet([ww('worked', 'Mispronunciation', 't')], find).id, 'ed')
  assert.equal(P.practiceLabel({ kind: 'feature', ipa: '', nameEs: 's + consonante' }), 'Practicar «s + consonante» en Sonidos')
})
