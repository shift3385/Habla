// 5.10.1 (D2): foco de audio con varios dueños (REG-A1-02), un foco por lectura con suelta retrasada (REG-A1-03),
// lecturas largas que pausan la música (REG-M-06) y tono normal en los tramos españoles con Leo (REG-A1-06).
// En el PC no hay nativo: se mira lo que audioFocus.ts habría pedido a Android (`trace`). La voz es un speechSynthesis
// falso que, como el plugin en Android, no avisa al interrumpir una frase. Ninguna voz real.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const tick = () => new Promise((r) => setImmediate(r))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const LINGER = 700 // > RELEASE_DELAY_MS (600)

// Uno solo para todo el archivo: el plugin (módulo de node_modules, fuera del grafo de Vite) guarda el primero que ve.
let synth = null
function fakeVoice() {
  if (synth) {
    synth.current = null
    synth.spoken = []
    return synth
  }
  synth = { current: null, spoken: [] }
  globalThis.window = globalThis
  globalThis.addEventListener ??= () => {}
  globalThis.SpeechSynthesisUtterance = class {}
  globalThis.speechSynthesis = {
    getVoices: () => [],
    speak: (u) => {
      synth.current = u
      synth.spoken.push(u)
    },
    cancel: () => {
      synth.current = null
    },
  }
  /** La frase en curso termina sola. */
  synth.end = () => {
    const u = synth.current
    synth.current = null
    u?.onend?.()
  }
  return synth
}

/** Deja sonar la lectura entera: termina cada frase en cuanto llega al motor. */
async function playThrough(p) {
  let done = false
  p.then(() => (done = true))
  for (let i = 0; i < 200 && !done; i++) {
    await tick()
    if (synth.current) synth.end()
  }
  await p
}

test('REG-A1-02: grabando, un ▶ no cambia «pausar» por «bajar» ni suelta el foco del micro', async () => {
  const f = await loadFresh('/src/lib/audioFocus.ts')
  f.takeAudioFocus('mic')
  assert.equal(f.audioFocusState().kind, 'pause')
  f.takeAudioFocus('tts')
  assert.equal(f.audioFocusState().kind, 'pause', 'el micro manda: la música sigue en pausa')
  f.releaseAudioFocus('tts', true)
  assert.equal(f.audioFocusState().kind, 'pause', 'acabar el ▶ no devuelve la música con el micro abierto')
  f.releaseAudioFocus('mic')
  assert.equal(f.audioFocusState().kind, null)
  assert.deepEqual(f.audioFocusState().trace, ['pause', 'abandon'], 'una sola petición y una sola suelta')
})

test('REG-A1-02: el más fuerte gana (micro > lectura larga > ▶) y al soltar el fuerte se baja al siguiente', async () => {
  const f = await loadFresh('/src/lib/audioFocus.ts')
  f.takeAudioFocus('tts')
  assert.equal(f.audioFocusState().kind, 'duck')
  f.takeAudioFocus('read')
  assert.equal(f.audioFocusState().kind, 'pause')
  f.releaseAudioFocus('read', true)
  assert.equal(f.audioFocusState().kind, 'duck')
  f.releaseAudioFocus('tts', true)
  assert.deepEqual(f.audioFocusState().trace, ['duck', 'pause', 'duck', 'abandon'])
  // Soltar algo que no se tenía no hace nada (antes: «releaseAudioFocus('mic')» tras un ▶ no soltaba nada; ahora tampoco rompe).
  f.releaseAudioFocus('mic')
  assert.deepEqual(f.audioFocusState().trace, ['duck', 'pause', 'duck', 'abandon'])
})

test('REG-A1-03: la voz suelta el foco 600 ms después: dos frases seguidas, una sola petición', async () => {
  const f = await loadFresh('/src/lib/audioFocus.ts')
  f.takeAudioFocus('tts')
  f.releaseAudioFocus('tts')
  await wait(100)
  f.takeAudioFocus('tts')
  assert.deepEqual(f.audioFocusState().trace, ['duck'], 'la música no sube entre las dos')
  f.releaseAudioFocus('tts')
  assert.equal(f.audioFocusState().kind, 'duck')
  await wait(LINGER)
  assert.deepEqual(f.audioFocusState().trace, ['duck', 'abandon'])
  // El micro no espera.
  f.takeAudioFocus('mic')
  f.releaseAudioFocus('mic')
  assert.equal(f.audioFocusState().kind, null)
  // releaseAllAudioFocus (segundo plano) suelta también lo que esperaba.
  f.takeAudioFocus('read')
  f.releaseAudioFocus('read')
  f.releaseAllAudioFocus()
  assert.equal(f.audioFocusState().kind, null)
})

test('REG-A1-03: con la app oculta (temporizadores congelados) el foco se suelta al instante', async () => {
  const listeners = []
  globalThis.document = { hidden: false, addEventListener: (type, fn) => type === 'visibilitychange' && listeners.push(fn) }
  try {
    const f = await loadFresh('/src/lib/audioFocus.ts')
    f.takeAudioFocus('read')
    f.releaseAudioFocus('read')
    assert.equal(f.audioFocusState().kind, 'pause', 'en primer plano espera')
    globalThis.document.hidden = true
    listeners.forEach((fn) => fn())
    assert.equal(f.audioFocusState().kind, null, 'al ocultarse no espera al temporizador')
    f.takeAudioFocus('tts')
    f.releaseAudioFocus('tts')
    assert.equal(f.audioFocusState().kind, null, 'oculta, soltar es inmediato')
  } finally {
    delete globalThis.document
  }
})

test('REG-M-06: una frase larga (> ~12 s) pausa la música; una corta la baja', async () => {
  const f = await loadFresh('/src/lib/audioFocus.ts')
  assert.equal(f.focusOwnerFor('I went to the park yesterday.'), 'tts')
  assert.equal(f.focusOwnerFor('x'.repeat(400)), 'read')
  assert.equal(f.focusOwnerFor('x'.repeat(150), 1), 'tts')
  assert.equal(f.focusOwnerFor('x'.repeat(150), 0.5), 'read', 'más despacio, dura más')
})

test('REG-M-06/07 + A1-03: la explicación por tramos es UNA lectura: un ⏸ fijo y un solo foco «pausar»', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  const text = 'Con he, she e it el verbo lleva -s: works, watches. Para negar necesitas el auxiliar do/does. «On»: días y fechas (on Monday, on May 5th).'
  const keys = []
  const p = tts.toggleSpeakSpanish(text, 'explain:x')
  assert.equal(tts.speakingKey(), 'explain:x')
  // Durante toda la lectura la clave no vuelve a null (antes, ▶ un instante entre tramos).
  let done = false
  p.then(() => (done = true))
  for (let i = 0; i < 200 && !done; i++) {
    await tick()
    keys.push(tts.speakingKey())
    if (s.current) s.end()
  }
  await p
  assert.ok(s.spoken.length >= 5, `varios tramos: ${s.spoken.map((u) => u.text).join(' | ')}`)
  assert.ok(!s.spoken.some((u) => u.text === 'th' || u.text.startsWith('th,')), 'REG-M-10: «5th» no deja un «th» suelto')
  assert.ok(s.spoken.some((u) => u.text.includes('May fifth')), 'REG-M-10: «May fifth»')
  assert.ok(keys.slice(0, -1).every((k) => k === 'explain:x'), `la clave se mantiene: ${keys.join(',')}`)
  assert.equal(tts.speakingKey(), null, 'al acabar vuelve a ▶')
  assert.deepEqual(tts.audioFocusState().trace, ['pause'], 'un solo foco para todos los tramos, y pausa (no «bajar»)')
  await wait(LINGER)
  assert.deepEqual(tts.audioFocusState().trace, ['pause', 'abandon'])
})

test('REG-M-07: tocar ⏸ a mitad o pararla con stopSpeakingIf corta todos los tramos y suelta el foco', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  const text = 'Con he, she e it el verbo lleva -s: works, watches. Para negar necesitas el auxiliar do/does.'
  const p = tts.toggleSpeakSpanish(text, 'explain:y')
  await tick()
  await tick()
  assert.ok(s.current, 'suena el primer tramo')
  // Otra clave no la para (el profe de la clase de debajo de la hoja, por ejemplo).
  await tts.stopSpeakingIf('explain:z')
  assert.equal(tts.speakingKey(), 'explain:y')
  await tts.stopSpeakingIf('explain:y')
  await p
  const n = s.spoken.length
  for (let i = 0; i < 10; i++) await tick()
  assert.equal(s.spoken.length, n, 'no sigue con el siguiente tramo')
  assert.equal(tts.speakingKey(), null)
  await wait(LINGER)
  assert.deepEqual(tts.audioFocusState().trace, ['pause', 'abandon'])
  // Por prefijo también.
  const q = tts.toggleSpeakSpanish(text, 'explain:w')
  await tick()
  await tts.stopSpeakingIf('explain:', true)
  await q
  assert.equal(tts.speakingKey(), null)
})

test('REG-A1-03: el profe y otra frase seguidas no hacen rebotar la música; un ▶ corto baja, no pausa', async () => {
  fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  await playThrough(tts.speak('Hello there.', 1, null))
  await wait(100)
  await playThrough(tts.speak('How are you today?', 1, null))
  assert.deepEqual(tts.audioFocusState().trace, ['duck'])
  // Un ▶ que corta a otro hereda el foco sin soltarlo.
  const a = tts.toggleSpeak('I went yesterday', 1, null)
  await tick()
  const b = tts.toggleSpeak('She has been here', 1, null)
  await a
  await playThrough(b)
  assert.deepEqual(tts.audioFocusState().trace, ['duck'])
  await wait(LINGER)
  assert.deepEqual(tts.audioFocusState().trace, ['duck', 'abandon'])
  // Un texto largo leído con speak() (p. ej. un informe) pausa.
  await playThrough(tts.speak('This is a long text. '.repeat(15), 1, null))
  assert.deepEqual(tts.audioFocusState().trace, ['duck', 'abandon', 'pause'])
  await tts.stopSpeaking()
  await wait(LINGER)
  assert.equal(tts.audioFocusState().kind, null)
})

test('REG-A1-06: con Leo y sin voz masculina, el inglés va con tono 0,8 y el español con tono normal', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setTeacherVoice('en-GB', 'male')
  await playThrough(tts.toggleSpeakSpanish('Con he, she e it el verbo lleva -s: works, watches.', 'explain:leo'))
  const esU = s.spoken.filter((u) => u.lang === 'es-ES')
  const enU = s.spoken.filter((u) => u.lang !== 'es-ES')
  assert.ok(esU.length && enU.length)
  assert.ok(esU.every((u) => u.pitch === 1), `español: ${esU.map((u) => u.pitch)}`)
  assert.ok(enU.every((u) => u.pitch === 0.8), `inglés: ${enU.map((u) => u.pitch)}`)
  await wait(LINGER)
})

test('REG-A3-04: speakSegments lee la respuesta del profe por idiomas como UNA lectura', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setTeacherVoice('en-US', 'female')
  tts.setVoicePrefs(1, null)
  const segs = [
    { lang: 'en', text: 'Not quite. Try again: how would you say' },
    { lang: 'es', text: 'Mi cumpleaños es en julio' },
    { lang: 'en', text: '?' },
    { lang: 'en', text: 'Take your time.' },
  ]
  const keys = []
  const p = tts.speakSegments(segs)
  const key = 'Not quite. Try again: how would you say Mi cumpleaños es en julio Take your time.'
  assert.equal(tts.speakingKey(), key, 'clave por defecto: el texto entero (sin tramos vacíos)')
  let done = false
  p.then(() => (done = true))
  for (let i = 0; i < 200 && !done; i++) {
    await tick()
    keys.push(tts.speakingKey())
    if (s.current) s.end()
  }
  await p
  assert.deepEqual(
    s.spoken.map((u) => [u.lang === 'es-ES' ? 'es' : 'en', u.text]),
    [
      ['en', 'Not quite. Try again: how would you say'],
      ['es', 'Mi cumpleaños es en julio'],
      ['en', 'Take your time.'],
    ],
  )
  assert.equal(s.spoken[0].rate, 1, 'el inglés, a la velocidad del usuario')
  assert.equal(s.spoken[1].rate, 0.85, 'el español, a su ritmo')
  assert.ok(keys.slice(0, -1).every((k) => k === key), 'una sola clave ⏸ de principio a fin')
  assert.deepEqual(tts.audioFocusState().trace, ['duck'], 'respuesta corta: baja la música, un solo foco')
  await wait(LINGER)

  // Clave propia, ⏸ con toggle de la misma clave… y una larga pausa la música.
  const long = [{ lang: 'en', text: 'This is a long answer from the teacher. '.repeat(6) }, { lang: 'es', text: 'Quiero un café' }]
  const q = tts.speakSegments(long, 'reply:7')
  await tick()
  assert.equal(tts.speakingKey(), 'reply:7')
  assert.equal(tts.audioFocusState().kind, 'pause')
  await tts.stopSpeaking()
  await q
  assert.equal(tts.speakingKey(), null)
  // Nada que leer: vuelve sin sonar.
  await tts.speakSegments([{ lang: 'en', text: ' ' }])
  await wait(LINGER)
  assert.equal(tts.audioFocusState().kind, null)
})

test('REV-D2-02: un ▶ corto que corta la explicación cambia «pausar» por «bajar» y al final lo suelta todo', async () => {
  fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  const p = tts.toggleSpeakSpanish('Con he, she e it el verbo lleva -s: works, watches. Para negar necesitas do/does.', 'explain:q')
  await tick()
  await tick()
  assert.equal(tts.audioFocusState().kind, 'pause')
  const q = tts.toggleSpeak('Hello there.', 1, null)
  await p
  await playThrough(q)
  await wait(LINGER)
  assert.equal(tts.audioFocusState().kind, null, 'la música no se queda en pausa para siempre')
  assert.deepEqual(tts.audioFocusState().trace, ['pause', 'duck', 'abandon'])
  // Y al revés: un ▶ corto cortado por la explicación pasa a «pausar» y también acaba soltándose.
  const a = tts.toggleSpeak('Hello again.', 1, null)
  await tick()
  const b = tts.toggleSpeakSpanish('Con he, she e it el verbo lleva -s: works, watches.', 'explain:r')
  await a
  await playThrough(b)
  await wait(LINGER)
  assert.equal(tts.audioFocusState().kind, null)
  assert.deepEqual(tts.audioFocusState().trace.slice(3), ['duck', 'pause', 'abandon'])
})
