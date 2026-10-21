// 5.10.1 · D1 fase 2 · REG-M-03 «prueba de sonido en un paso»: frase solo hablada, escucha sola, detector de voz local,
// «probado» por auriculares en Preferences y orden respecto a la bienvenida y el test de nivel.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const mod = () => loadFresh('/src/lib/soundCheck.ts')
const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

/** Fotogramas de 20 ms: [nivel, duración ms]. */
function feed(vad, parts) {
  let st
  for (const [rms, ms] of parts) for (let t = 0; t < ms; t += 20) st = vad.push(rms, 20)
  return st
}

test('REG-M-03: frases cortas y distintas al repetir; espera de 400 ms (teléfono) y 600 ms (Bluetooth)', async () => {
  const { CHECK_PHRASES, pickPhrase, listenDelayMs } = await mod()
  assert.ok(CHECK_PHRASES.length >= 6)
  for (const p of CHECK_PHRASES) assert.ok(p.split(' ').length <= 3, p)
  for (let i = 0; i < 20; i++) {
    const a = pickPhrase()
    assert.notEqual(pickPhrase(a), a, 'el siguiente intento no repite la frase')
  }
  assert.equal(listenDelayMs(false), 400)
  assert.equal(listenDelayMs(true), 600)
})

test('REG-M-03: dos palabras por encima del ruido y 800 ms de silencio → oído', async () => {
  const { VoiceDetector } = await mod()
  const vad = new VoiceDetector()
  assert.equal(feed(vad, [[0.005, 300]]), 'listening', 'calibra el ruido de fondo')
  assert.equal(feed(vad, [[0.08, 700]]), 'voice')
  assert.equal(feed(vad, [[0.005, 780]]), 'voice', 'aún no son 800 ms de silencio')
  assert.equal(feed(vad, [[0.005, 40]]), 'heard')
})

test('REG-M-03: el ruido de fondo constante (música, ventilador) no cuenta como voz; el umbral es relativo', async () => {
  const { VoiceDetector } = await mod()
  const vad = new VoiceDetector()
  // Habitación ruidosa: 0,05 de fondo; una «voz» a 0,06 no basta (umbral = máx(3×ruido, ruido + 0,012, 0,01) = 0,15).
  assert.equal(feed(vad, [[0.05, 300], [0.06, 3000], [0.05, 6000]]), 'timeout')
  assert.equal(VoiceDetector.thresholdFor(0), 0.012, 'silencio absoluto: un mínimo fijo')
  assert.ok(VoiceDetector.thresholdFor(0.05) > 0.14)
})

test('REG-M-03: un golpe o una tos corta (< 400 ms) no pasa la prueba; sin voz en 8 s → no te oigo', async () => {
  const { VoiceDetector } = await mod()
  const vad = new VoiceDetector()
  assert.equal(feed(vad, [[0.004, 300], [0.3, 200], [0.004, 900]]), 'listening', 'el golpe se olvida')
  assert.equal(feed(vad, [[0.004, 7000]]), 'timeout')
})

test('REG-M-03: 2,5 s de voz seguida ya basta (no espera al silencio); voz suficiente al acabar el tiempo, también', async () => {
  const { VoiceDetector } = await mod()
  assert.equal(feed(new VoiceDetector(), [[0.004, 300], [0.1, 2500]]), 'heard')
  const late = new VoiceDetector()
  assert.equal(feed(late, [[0.004, 300], [0.004, 7600], [0.1, 500]]), 'heard')
})

test('REG-M-03: rmsOfBytes con muestras de 8 bits (silencio = 128)', async () => {
  const { rmsOfBytes } = await mod()
  assert.equal(rmsOfBytes(new Uint8Array(64).fill(128)), 0)
  assert.ok(Math.abs(rmsOfBytes(Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 192 : 64))) - 0.5) < 1e-9)
})

test('REG-M-03: «probado» por auriculares en Preferences: no se repite salvo nuevos, otro modo o fallo', async () => {
  const m = await mod()
  const mem = new Map()
  m.__setCheckStoreForTests({ get: async (k) => mem.get(k) ?? null, set: async (k, v) => void mem.set(k, v) })
  assert.equal(m.needsCheck((await m.loadChecked())['soundcore'], 'headset'), true, 'auriculares nuevos')
  await m.markChecked('soundcore', 'headset', true)
  const saved = JSON.parse(mem.get('habla.soundChecked'))
  assert.deepEqual(Object.keys(saved.soundcore).sort(), ['at', 'mode', 'ok'], 'solo nombre, modo, resultado y fecha')
  // Otro arranque (caché vacía): se lee de Preferences.
  m.__setCheckStoreForTests({ get: async (k) => mem.get(k) ?? null, set: async (k, v) => void mem.set(k, v) })
  const rec = (await m.loadChecked())['soundcore']
  assert.equal(m.needsCheck(rec, 'headset'), false, 'mismo modo y pasada: sin prueba')
  assert.equal(m.needsCheck(rec, 'split'), true, 'cambió la ruta elegida')
  await m.markChecked('soundcore', 'headset', false)
  assert.equal(m.needsCheck((await m.loadChecked())['soundcore'], 'headset'), true, 'la última falló')
  // Preferences con basura: no rompe.
  mem.set('habla.soundChecked', '{roto')
  m.__setCheckStoreForTests({ get: async (k) => mem.get(k) ?? null, set: async (k, v) => void mem.set(k, v) })
  assert.deepEqual(await m.loadChecked(), {})
})

test('REG-M-03: un micro mudo en uso real (distrustMic) avisa con el nombre de los auriculares', async () => {
  const rec = await loadFresh('/src/lib/recorder.ts')
  const seen = []
  rec.onMicDistrusted((n) => seen.push(n))
  rec.setHeadsetName('soundcore')
  rec.distrustMic()
  assert.deepEqual(seen, ['soundcore'])
})

test('REG-M-03: durante la prueba, las voces de la clase de debajo no tocan la ruta; al acabar se recoloca', async () => {
  const route = await loadFresh('/src/lib/audioRoute.ts')
  const calls = []
  let current = null
  route.__setNativeForTests({
    getDevices: async () => ({ inputs: [], outputs: [], headset: true, headsetName: 'bt', headsetMic: true, btPermission: true, mode: current ? 3 : 0, current }),
    requestBluetooth: async () => ({ granted: true }),
    setRoute: async ({ route: r }) => {
      calls.push(r)
      current = r === 'headset' ? { id: 1, type: 7, kind: 'bluetooth', name: 'bt', headset: true } : null
      return { ok: true, state: { current } }
    },
  })
  route.__setRouteTimingsForTests(0, 10_000)
  route.setHeadsetWanted(true)
  const release = route.holdRoute()
  await new Promise((r) => setTimeout(r, 20))
  calls.length = 0
  await route.soundTestRoute(true, true)
  assert.deepEqual(calls, ['headset'], 'la prueba fija la ruta de los auriculares')
  route.routeOnSpeech(true) // la instrucción de la mascota suena: no se suelta
  await new Promise((r) => setTimeout(r, 20))
  assert.deepEqual(calls, ['headset'])
  await route.soundTestRoute(false, true)
  release()
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(calls.at(-1), 'phone', 'sin pantalla que grabe, vuelve al teléfono')
})

test('REG-M-03: la prueba es de un paso, sin «Sí, te oigo», con «No te oigo» siempre y «Ver la frase» tras 2 fallos', () => {
  const src = read('components/SoundTest.tsx')
  assert.ok(!src.includes('Sí, te oigo'), 'ya no hay que confirmar tocando')
  assert.ok(!/primary=\{\{ label: 'Sí/.test(src))
  assert.match(src, /secondary=\{notHear\}/, '«No te oigo» en el paso de la prueba')
  assert.match(src, /tries >= 2 && !showPhrase/, '«Ver la frase» tras 2 fallos')
  assert.match(src, /'Si me oyes, dime:'/, 'la frase solo se dice')
  assert.match(src, /listenDelayMs\(bluetooth\)/, 'espera tras la voz')
  assert.match(src, /Haptics\.impact/, 'vibración al empezar a escuchar')
  assert.match(src, /'Te escucho…'/)
  assert.match(src, /whenBackground\(/, 'en segundo plano se cancela y se cierra el micro')
  assert.match(src, /getTracks\(\)\.forEach\(\(tr\) => tr\.stop\(\)\)/, 'el micro se cierra al terminar')
  assert.ok(!/from '\.\.\/lib\/(gemini|teacher|grammarAi)'|fetch\(|CapacitorHttp/.test(src), 'comprobación local, sin Gemini')
})

test('REG-M-03: no sale antes de la bienvenida y la clave, ni durante el test de nivel; no se repite si ya se probó', () => {
  const app = read('App.tsx')
  assert.match(app, /const audioReady = !splash && settings\.onboarded/)
  assert.match(app, /ready=\{audioReady\}/)
  const cal = app.slice(app.indexOf('if (!calibrated || retest)'), app.indexOf('<Calibration'))
  assert.match(cal, /ready=\{false\}/, 'el test de nivel no se corta')
  const picker = read('components/AudioPicker.tsx')
  assert.match(picker, /if \(!readyRef\.current \|\| !isForeground\(\)\) return/)
  assert.match(picker, /needsCheck\(\(await loadChecked\(\)\)\[s\.headsetName\], pref\)/)
  assert.match(picker, /markChecked\(state\.headsetName, mode, true\)/)
  assert.match(picker, /markChecked\(state\.headsetName, mode, false\)/)
})

// ------------------------------------------------------------------------------------------------
// REV-D1-02 (MEDIA, privacidad): conectar auriculares con Habla minimizada no debe dejar el modo llamada.

async function routeWithFake(delay = 0) {
  const route = await loadFresh('/src/lib/audioRoute.ts')
  const calls = []
  let current = null
  route.__setNativeForTests({
    getDevices: async () => ({ inputs: [], outputs: [], headset: true, headsetName: 'bt', headsetMic: true, btPermission: true, mode: current ? 3 : 0, current }),
    requestBluetooth: async () => ({ granted: true }),
    setRoute: async ({ route: r }) => {
      calls.push(r)
      if (r === 'headset' && delay) await new Promise((res) => setTimeout(res, delay))
      current = r === 'headset' ? { id: 1, type: 7, kind: 'bluetooth', name: 'bt', headset: true } : null
      return { ok: true, state: { current } }
    },
  })
  return { route, calls, on: () => !!current }
}

test('REV-D1-02: con la app en segundo plano, la prueba de sonido no fija la ruta', async () => {
  const { route, calls, on } = await routeWithFake()
  route.suspendRoute() // Habla minimizada
  assert.equal(route.isForeground(), false)
  calls.length = 0
  assert.equal(await route.soundTestRoute(true, true), false)
  assert.deepEqual(calls, [], 'ningún setRoute con la app oculta')
  assert.equal(on(), false)
  route.resumeRoute()
  assert.equal(await route.soundTestRoute(true, true), true, 'a la vista, sí')
  await route.soundTestRoute(false, true)
})

test('REV-D1-02: minimizar mientras la prueba pide la ruta no la deja puesta (setRoute tardío)', async () => {
  const { route, calls, on } = await routeWithFake(60)
  const p = route.soundTestRoute(true, true)
  await new Promise((r) => setTimeout(r, 10))
  route.suspendRoute()
  assert.equal(await p, false)
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(on(), false, calls.join(' > '))
})

test('REV-D1-02: AudioPicker no pregunta ni monta la prueba con la app oculta; SoundTest no habla ni abre el micro', () => {
  const picker = read('components/AudioPicker.tsx')
  assert.match(picker, /if \(!readyRef\.current \|\| !isForeground\(\)\) return/)
  const st = read('components/SoundTest.tsx')
  assert.match(st, /if \(!isForeground\(\)\) \{\s*cleanup\(\)/)
  assert.match(st, /if \(!isForeground\(\)\) throw new Error\('segundo plano'\)/)
})

// ------------------------------------------------------------------------------------------------
// REG-N-01 (POCO, T7a): la prueba salió encima de «Dejamos una clase a medias» y, tras un fallo, cambió a 'split' sin que
// el dueño lo notara.

test('REG-N-01: la prueba espera a que no haya avisos de NoticeGate (clase a medias, novedades…)', () => {
  const app = read('App.tsx')
  assert.match(app, /const audioReady = !splash && settings\.onboarded && !gate\.length/)
})

test('REG-N-01: tras el 1.er fallo con auriculares, lo primero es «Probar otra vez»; el micro del teléfono solo si lo eliges', () => {
  const st = read('components/SoundTest.tsx')
  const noVoice = st.slice(st.indexOf("if (step === 'noVoice')"), st.indexOf("if (step === 'micError')"))
  // 1.er fallo: principal = probar otra vez; el teléfono queda como secundario.
  assert.match(noVoice, /headset && tries >= 2\s*\? \{ label: 'Vale, usar el micro del teléfono', onClick: onUsePhoneMic \}\s*: \{ label: 'Probar otra vez', onClick: retry \}/)
  assert.match(noVoice, /: \{ label: 'Hablar al micro del teléfono', onClick: onUsePhoneMic \}/)
  // 2 fallos: mensaje claro de la mascota.
  assert.ok(noVoice.includes('Te escucharé por el micro del teléfono') && noVoice.includes('Puedes cambiarlo en Ajustes'))
  // Ningún cambio de modo automático: onUsePhoneMic solo en botones.
  assert.equal((st.match(/onUsePhoneMic/g) ?? []).length, 4, 'props + 2 botones (sin llamadas automáticas)')
  // Si se pasó con el micro del teléfono, se dice.
  assert.match(st, /mode === 'split'\s*\? 'Te escucharé por el micro del teléfono/)
})
