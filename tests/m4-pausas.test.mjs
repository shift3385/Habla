// 5.11 · D4 «Pausas naturales al leer» (petición del dueño): entre tramos es/en se espera según la puntuación y algo
// más antes de un ejemplo; los ejemplos en inglés de una explicación van al 85 %; la pausa se corta al instante con ⏸ o
// stop y no suelta el foco de audio. Voz simulada (speechSynthesis falso): ninguna voz real.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const seg = (lang, text, quoted) => (quoted ? { lang, text, quoted } : { lang, text })

test('pauseBetween: coma/punto y coma 200, dos puntos 400, punto/¿?/¡! 500, antes de un ejemplo 600', async () => {
  const { pauseBetween, PAUSE_MS } = await loadFresh('/src/lib/speechLang.ts')
  assert.deepEqual({ ...PAUSE_MS }, { comma: 200, colon: 400, stop: 500, example: 600 })
  const en = seg('en', 'I work')
  const es = seg('es', 'y además')
  assert.equal(pauseBetween(undefined, es), 0, 'el primer tramo no espera')
  assert.equal(pauseBetween(seg('en', 'I work,'), es), 200)
  assert.equal(pauseBetween(seg('en', 'I work;'), es), 200)
  assert.equal(pauseBetween(seg('en', 'Two forms:'), es), 400)
  assert.equal(pauseBetween(seg('en', 'I work.'), es), 500)
  assert.equal(pauseBetween(seg('en', 'Do you work?'), es), 500)
  assert.equal(pauseBetween(seg('en', 'Great!'), es), 500)
  assert.equal(pauseBetween(seg('en', 'I work.»'), es), 500, 'la comilla de cierre no esconde el punto')
  assert.equal(pauseBetween(seg('en', 'I work'), es), 0, 'sin puntuación, de inglés a español: seguido')
  // Antes de un ejemplo: de español a inglés, «ejemplo:», «por ejemplo», «como», o una cita.
  assert.equal(pauseBetween(seg('es', 'para horarios fijos, ejemplo:'), en), 600)
  assert.equal(pauseBetween(seg('es', 'se usa'), seg('en', 'I work from home')), 0, 'de español a inglés sin punto ni anuncio: seguido')
  assert.equal(pauseBetween(seg('es', 'se usa así:'), seg('en', 'I work from home')), 600, 'el español la anuncia con dos puntos')
  assert.equal(pauseBetween(seg('es', 'Con'), seg('en', 'he, she or it')), 0, '«Con he, she or it el verbo…»: sin pausa a mitad de frase')
  assert.equal(pauseBetween(seg('es', 'se usa'), seg('en', 'I work.')), 600, 'o que acaba en punto')
  // Palabras sueltas metidas en la frase («Con he, she or it el verbo…»): seguidas (medido en el navegador).
  assert.equal(pauseBetween(seg('es', 'Con'), seg('en', 'he, she')), 0)
  assert.equal(pauseBetween(seg('es', 'el verbo termina en'), seg('en', 's')), 0)
  assert.equal(pauseBetween(seg('es', 'mira este caso, por ejemplo'), es), 600)
  assert.equal(pauseBetween(seg('es', 'se dice como'), es), 600)
  assert.equal(pauseBetween(seg('en', 'works'), seg('en', 'watches', true)), 600, 'antes de una cita «…»')
  assert.equal(pauseBetween(seg('es', 'cómo'), es), 0, '«cómo» con tilde no es «como»')
})

test('splitForReading: el ejemplo del dueño («…fijos, ejemplo: I work from home») lleva 600 ms delante; splitByLanguage no cambia', async () => {
  const L = await loadFresh('/src/lib/speechLang.ts')
  const text = 'Se usa para horarios fijos, ejemplo: «I work from home». Con he, she e it el verbo lleva -s.'
  const segs = L.splitForReading(text)
  const i = segs.findIndex((s) => s.text.startsWith('I work from home'))
  assert.ok(i > 0, JSON.stringify(segs))
  assert.equal(segs[i].lang, 'en')
  assert.equal(segs[i].quoted, true, 'empieza en una cita')
  assert.equal(L.pauseBetween(segs[i - 1], segs[i]), 600)
  // splitByLanguage sigue dando solo { lang, text } (los tests de la 5.10.1 no cambian).
  assert.ok(L.splitByLanguage(text).every((s) => Object.keys(s).sort().join() === 'lang,text'))
})

// ---- Voz simulada con tiempos ----

let synth = null
function fakeVoice() {
  if (!synth) {
    synth = { spoken: [], hold: false }
    globalThis.window = globalThis
    globalThis.addEventListener ??= () => {}
    globalThis.SpeechSynthesisUtterance = class {}
    globalThis.speechSynthesis = {
      getVoices: () => [],
      speak: (u) => {
        synth.spoken.push({ u, at: performance.now() })
        // Cada frase «dura» 5 ms y acaba sola.
        setTimeout(() => {
          u.endedAt = performance.now()
          u.onend?.()
        }, 5)
      },
      cancel: () => {},
    }
  }
  synth.spoken = []
  return synth
}

test('Pausas reales entre tramos (voz simulada): ~600 ms antes del ejemplo inglés, al 85 %, y una sola petición de foco', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setVoicePrefs(1, null)
  await tts.toggleSpeakSpanish('Se usa para horarios fijos, ejemplo: «I work from home». Y ya está.', 'k1')
  const texts = s.spoken.map((x) => x.u.text)
  const i = texts.findIndex((t) => t.startsWith('I work from home'))
  assert.ok(i > 0, JSON.stringify(texts))
  const gap = s.spoken[i].at - s.spoken[i - 1].u.endedAt
  assert.ok(gap >= 580 && gap < 900, `pausa antes del ejemplo: ${Math.round(gap)} ms`)
  const gap2 = s.spoken[i + 1].at - s.spoken[i].u.endedAt
  assert.ok(gap2 >= 480 && gap2 < 800, `pausa tras el punto del ejemplo: ${Math.round(gap2)} ms`)
  assert.equal(s.spoken[i].u.rate, tts.EN_IN_ES_RATE, 'ejemplo en inglés al 85 %')
  assert.equal(tts.EN_IN_ES_RATE, 0.85)
  assert.equal(s.spoken[0].u.rate, 0.85, 'el español a su ritmo')
  // El foco se pide una vez para toda la lectura: las pausas no lo sueltan ni lo vuelven a pedir.
  const trace = tts.audioFocusState().trace
  assert.equal(trace.filter((x) => x !== 'abandon').length, 1, `foco: ${trace}`)
})

test('⏸ / stop durante una pausa: corta al instante (no espera a la pausa) y no suena nada más', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setVoicePrefs(1, null)
  const reading = tts.toggleSpeakSpanish('Mira este caso, por ejemplo: «I work from home». Y otro más.', 'k2')
  // Espera a que acabe el primer tramo y entre en la pausa de 600 ms.
  for (let k = 0; k < 100 && !s.spoken[0]?.u.endedAt; k++) await new Promise((r) => setTimeout(r, 2))
  await new Promise((r) => setTimeout(r, 50))
  const before = s.spoken.length
  const t0 = performance.now()
  await tts.stopSpeaking()
  await reading
  const took = performance.now() - t0
  assert.ok(took < 100, `la lectura termina al parar: ${Math.round(took)} ms`)
  await new Promise((r) => setTimeout(r, 700))
  assert.equal(s.spoken.length, before, 'tras parar en la pausa no suena el siguiente tramo')
  assert.equal(tts.speakingKey(), null)

  // Lo mismo con el propio ⏸ de esa lectura (toggle de la misma clave) y con stopSpeakingIf.
  for (const stop of [() => tts.toggleSpeakSpanish('x', 'k3'), () => tts.stopSpeakingIf('k3')]) {
    s.spoken = []
    const r = tts.toggleSpeakSpanish('Hay dos formas: «I work» y «I am working».', 'k3')
    for (let k = 0; k < 100 && !s.spoken[0]?.u.endedAt; k++) await new Promise((res) => setTimeout(res, 2))
    await new Promise((res) => setTimeout(res, 30))
    const n = s.spoken.length
    const t1 = performance.now()
    await stop()
    await r
    assert.ok(performance.now() - t1 < 100, 'corta al instante')
    await new Promise((res) => setTimeout(res, 700))
    assert.equal(s.spoken.length, n)
  }
})

test('Respuesta del profe por tramos (speakSegments): también respira entre tramos', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setVoicePrefs(1, null)
  await tts.speakSegments([
    { lang: 'en', text: 'Good try!' },
    { lang: 'es', text: '¿cómo dirías «trabajo desde casa»?' },
    { lang: 'en', text: 'Say it in English.' },
  ])
  assert.equal(s.spoken.length, 3)
  const g1 = s.spoken[1].at - s.spoken[0].u.endedAt
  const g2 = s.spoken[2].at - s.spoken[1].u.endedAt
  assert.ok(g1 >= 480 && g1 < 800, `tras «Good try!»: ${Math.round(g1)} ms`)
  assert.ok(g2 >= 580 && g2 < 900, `de español a inglés: ${Math.round(g2)} ms`)
  assert.equal(s.spoken[0].u.rate, 1, 'la respuesta del profe, a la velocidad del usuario')
})

test('Citas en la respuesta del profe: pausa de ejemplo antes de la cita en español y la de su coma al volver', async () => {
  const { pauseBetween } = await loadFresh('/src/lib/speechLang.ts')
  const q = { lang: 'es', text: 'yo trabajo desde casa', quoted: true }
  assert.equal(pauseBetween({ lang: 'en', text: 'How would you say' }, q), 600)
  assert.equal(pauseBetween(q, { lang: 'en', text: ', using the present simple? Try it.' }), 200, 'el tramo empieza por su coma')
  assert.equal(pauseBetween(q, { lang: 'en', text: '. Try it.' }), 500)
})

test('«Con he, she or it el verbo…»: «or» (y but, with, from…) va con la voz inglesa; «a», «no», «son» siguen decidiendo por las vecinas', async () => {
  const { splitByLanguage } = await loadFresh('/src/lib/speechLang.ts')
  const segs = splitByLanguage('Con he, she or it el verbo termina en -s o -es.')
  assert.deepEqual(segs.map((s) => [s.lang, s.text]).slice(0, 3), [
    ['es', 'Con'],
    ['en', 'he, she or it'],
    ['es', 'el verbo termina en'],
  ])
  const en = (t) => splitByLanguage(t).filter((s) => s.lang === 'en').map((s) => s.text)
  assert.deepEqual(en('Se dice «tired but happy» o «with my friends».'), ['tired but happy', 'with my friends.'])
  assert.deepEqual(en('Usa «from Monday to Friday» con días.'), ['from Monday to Friday'])
  // Español intacto: «o», «a», «no», «son», «sin» siguen en español entre español.
  assert.deepEqual(en('No uses el auxiliar: son verbos que no lo llevan, o sea, a veces sin él.'), [])
})

test('REV-11-PAU-01: ⏸ en el hueco entre letras del deletreo corta al instante y no dice la letra siguiente', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setVoicePrefs(1, null)
  for (const stop of [() => tts.toggleSpeakUS(['B.', 'O.', 'B.'], { key: 'spell:1', gapMs: 450 }), () => tts.stopSpeaking(), () => tts.stopSpeakingIf('spell:1')]) {
    s.spoken = []
    const reading = tts.speakUS(['B.', 'O.', 'B.'], { key: 'spell:1', gapMs: 450 })
    // Primera letra dicha y ya en el hueco de 450 ms.
    for (let k = 0; k < 100 && !s.spoken[0]?.u.endedAt; k++) await new Promise((r) => setTimeout(r, 2))
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(s.spoken.length, 1)
    assert.equal(tts.speakingKey(), 'spell:1', 'durante el hueco el botón sigue en ⏸')
    const t0 = performance.now()
    await stop()
    await reading
    assert.ok(performance.now() - t0 < 100, `corta al instante: ${Math.round(performance.now() - t0)} ms`)
    await new Promise((r) => setTimeout(r, 500))
    assert.equal(s.spoken.length, 1, 'no dice la «O»')
    assert.equal(tts.speakingKey(), null)
  }
})
