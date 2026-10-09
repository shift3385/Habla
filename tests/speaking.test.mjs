// v5.9.1 (▶/⏸ en toda la app): estado observable de «qué está sonando» (src/lib/speaking.ts) y su uso en tts.ts.
// La voz se simula con un speechSynthesis falso que, como el plugin en Android, NO avisa al interrumpir una frase:
// así se comprueba que finishCurrent/turnos devuelven los botones a ▶ igualmente. Ninguna voz real.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const tick = () => new Promise((r) => setTimeout(r, 0))

// Uno solo para todo el archivo: el plugin (módulo de node_modules, fuera del grafo de Vite) guarda el primero que ve.
let synth = null

/** speechSynthesis falso: guarda la frase en curso; cancel() la quita sin disparar onend (como Android). */
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
      synth.spoken.push(u.text)
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

test('speaking: el final tardío de una frase interrumpida no devuelve la nueva a ▶', async () => {
  const s = await loadFresh('/src/lib/speaking.ts')
  const seen = []
  const off = s.subscribeSpeaking(() => seen.push(s.speakingKey()))
  const a = s.beginSpeaking('A')
  const b = s.beginSpeaking('B')
  assert.equal(a.active(), false)
  assert.equal(b.active(), true)
  a.end()
  assert.equal(s.speakingKey(), 'B')
  b.end()
  assert.equal(s.speakingKey(), null)
  s.beginSpeaking('C')
  s.endSpeaking()
  assert.equal(s.speakingKey(), null)
  off()
  s.beginSpeaking('D')
  assert.deepEqual(seen, ['A', 'B', null, 'C', null], 'avisa en cada cambio y deja de avisar al darse de baja')
})

test('toggleSpeak: ▶ → ⏸ → ▶, otro botón para el anterior y al terminar solo vuelve a ▶', async () => {
  const synth = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')

  // Tocar ▶: suena y su clave pasa a «sonando».
  const pA = tts.toggleSpeak('I went yesterday', 1, null)
  assert.equal(tts.speakingKey(), 'I went yesterday', 'el icono cambia al instante, antes de que arranque la voz')
  await tick()
  assert.deepEqual(synth.spoken, ['I went yesterday'])

  // Tocar otro ▶: el primero se para (su promesa se resuelve aunque el motor no avise) y solo el segundo queda en ⏸.
  const pB = tts.toggleSpeak('She has been here', 1, null)
  assert.equal(tts.speakingKey(), 'She has been here')
  await pA
  await tick()
  assert.equal(tts.speakingKey(), 'She has been here')

  // Volver a tocar el mismo: se para y vuelve a ▶.
  await tts.toggleSpeak('She has been here', 1, null)
  await pB
  assert.equal(tts.speakingKey(), null)

  // Termina solo: vuelve a ▶.
  const pC = tts.toggleSpeak('Nice to meet you', 1, null)
  await tick()
  synth.end()
  await pC
  assert.equal(tts.speakingKey(), null)

  // Otra parte de la app (el profe en clase, segundo plano): speak/stopSpeaking también mueven los iconos.
  const pD = tts.speak('Hello there', 1, null)
  assert.equal(tts.speakingKey(), 'Hello there', 'speak sin clave usa la frase: el «Repetir» de ese mensaje pasa a ⏸')
  await tts.stopSpeaking()
  await pD
  assert.equal(tts.speakingKey(), null)
})

test('stopSpeaking mientras se prepara la voz: la frase ya no se lanza', async () => {
  const synth = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  const p = tts.speak('Too late', 1, null)
  await tts.stopSpeaking()
  await p
  assert.deepEqual(synth.spoken, [], 'no suena con el botón ya en ▶')
  assert.equal(tts.speakingKey(), null)
  // Control: sin parar, la misma frase sí llega al motor (el falso es el que usa el plugin).
  const q = tts.speak('In time', 1, null)
  await tick()
  assert.deepEqual(synth.spoken, ['In time'])
  synth.end()
  await q
})
