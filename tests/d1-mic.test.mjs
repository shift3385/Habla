// 5.10.1 · D1 «Micro y grabación»: REG-M-01 (ruta de los auriculares retenida y auriculares ya probados), REG-A1-01
// (billete al tocar) y REG-M-02 (descartes con motivo, aviso y registro).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { installMic, until } from './helpers/mic-mocks.mjs'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const BT_AND_PHONE = [
  { deviceId: 'default', label: 'Default' },
  { deviceId: 'bt1', label: 'Bluetooth headset' },
  { deviceId: 'spk', label: 'Speakerphone' },
]

// ------------------------------------------------------------------------------------------------
// REG-A1-01 · billete tomado al tocar

test('REG-A1-01: un billete tomado antes de releaseAllMics() (segundo plano en la espera de P6) no abre el micro', async () => {
  const mic = installMic()
  const mod = await loadFresh('/src/lib/recorder.ts')
  const rec = new mod.Recorder()
  const ticket = rec.ticket() // el toque
  mod.releaseAllMics() // minimizar durante stopSpeaking + 400 ms (la grabadora aún no estaba en `recorders`)
  assert.equal(await rec.begin(ticket), false)
  assert.equal(mic.gum.length, 0, 'no se llamó a getUserMedia')
  assert.equal(mic.recorders.length, 0)
})

test('REG-A1-01: un billete tomado antes de close() («Terminar» o salir de la clase) no abre el micro', async () => {
  const mic = installMic()
  const mod = await loadFresh('/src/lib/recorder.ts')
  const rec = new mod.Recorder()
  const ticket = rec.ticket()
  rec.close()
  assert.equal(await rec.begin(ticket), false)
  assert.equal(mic.gum.length, 0)
})

test('REG-A1-01: con un billete vigente (o sin billete) se graba como siempre', async () => {
  const mic = installMic()
  const mod = await loadFresh('/src/lib/recorder.ts')
  const rec = new mod.Recorder()
  assert.equal(await rec.begin(rec.ticket()), true)
  assert.equal(rec.isRecording, true)
  rec.close()
  assert.equal(await rec.begin(), true, 'begin() sin billete toma uno al momento (compatibilidad)')
  rec.close()
  assert.equal(mic.liveTracks, 0)
})

test('REG-A1-01: releaseAllMics() de una vez anterior no invalida un toque posterior', async () => {
  installMic()
  const mod = await loadFresh('/src/lib/recorder.ts')
  const rec = new mod.Recorder()
  mod.releaseAllMics()
  assert.equal(await rec.begin(rec.ticket()), true)
  rec.close()
})

// ------------------------------------------------------------------------------------------------
// REG-M-01 · auriculares ya probados: no se vuelve a medir la señal al reconectar

test('REG-M-01: unos auriculares que pasaron la prueba no se vuelven a medir aunque se olvide defaultOk', async () => {
  // El micro por defecto no da señal: si se midiera, buscaría el del teléfono (segunda llamada a getUserMedia).
  const mic = installMic({ devices: BT_AND_PHONE, signal: (c) => JSON.stringify(c).includes('spk') })
  const mod = await loadFresh('/src/lib/recorder.ts')
  mod.setMicMode('headset')
  mod.setHeadsetName('soundcore Liberty 4 Pro')
  mod.trustDefaultMic() // la prueba de sonido con tu voz
  assert.equal(mod.headsetTrusted(), true)
  // Reconexión: setMicMode (y devicechange) borran defaultOk y chosen.
  mod.setMicMode('split')
  mod.setMicMode('headset')
  const rec = new mod.Recorder()
  assert.equal(await rec.open(), true)
  assert.equal(mic.gum.length, 1, 'sin medición ni micro de respaldo: abre a la primera')
  rec.close()
})

test('REG-M-01: otros auriculares (sin probar) sí se miden; y una grabación vacía quita la confianza', async () => {
  const mic = installMic({ devices: BT_AND_PHONE, signal: (c) => JSON.stringify(c).includes('spk') })
  const mod = await loadFresh('/src/lib/recorder.ts')
  mod.setMicMode('headset')
  mod.setHeadsetName('soundcore')
  mod.trustDefaultMic()
  mod.setHeadsetName('MI03') // otros auriculares
  mod.setMicMode('split')
  mod.setMicMode('headset')
  const rec = new mod.Recorder()
  assert.equal(await rec.open(), true)
  await until(() => mic.gum.length >= 2, 'medición y micro de respaldo')
  rec.close()

  mod.setHeadsetName('soundcore')
  assert.equal(mod.headsetTrusted(), true)
  mod.distrustMic() // grabación vacía con ellos
  assert.equal(mod.headsetTrusted(), false)
})

test('REG-M-01: una apertura medida con señal en modo auriculares los deja como probados', async () => {
  installMic({ devices: BT_AND_PHONE })
  const mod = await loadFresh('/src/lib/recorder.ts')
  mod.setMicMode('headset')
  mod.setHeadsetName('soundcore')
  const rec = new mod.Recorder()
  assert.equal(await rec.open(), true)
  assert.equal(mod.headsetTrusted(), true)
  rec.close()
})

test('REG-M-01: al soltar un micro abierto se avisa (onMicClosed) para soltar la ruta; sin micro, no', async () => {
  installMic()
  const mod = await loadFresh('/src/lib/recorder.ts')
  let closed = 0
  mod.onMicClosed(() => closed++)
  const rec = new mod.Recorder()
  rec.close()
  assert.equal(closed, 0, 'cerrar sin micro abierto no avisa')
  assert.equal(await rec.begin(), true)
  await rec.finish()
  assert.equal(closed, 1)
})

// ------------------------------------------------------------------------------------------------
// REG-M-01 · ruta retenida solo con la pantalla que graba abierta y la app en uso

function fakeNative(headsetDelay = 0) {
  const calls = []
  let current = null
  return {
    calls,
    get headsetOn() {
      return !!current
    },
    setActive(on) {
      current = on ? { id: 7, type: 7, kind: 'bluetooth', name: 'bt', headset: true } : null
    },
    plugin: {
      async getDevices() {
        calls.push('getDevices')
        return { inputs: [], outputs: [], headset: true, headsetName: 'bt', headsetMic: true, btPermission: true, mode: current ? 3 : 0, current }
      },
      async requestBluetooth() {
        calls.push('requestBluetooth')
        return { granted: true }
      },
      async setRoute({ route }) {
        calls.push(`setRoute:${route}`)
        // Como el hilo de waitRoute del plugin: la ruta de los auriculares se hace efectiva al cabo de un rato.
        if (route === 'headset' && headsetDelay) await new Promise((r) => setTimeout(r, headsetDelay))
        current = route === 'headset' ? { id: 7, type: 7, kind: 'bluetooth', name: 'bt', headset: true } : null
        return { ok: true, state: { current } }
      },
    },
  }
}

const tick = () => new Promise((r) => setTimeout(r, 20))

/** audioRoute recién cargado con el plugin simulado y tiempos cortos (preparar 10 ms, soltar sin tocar a los 120 ms). */
async function routeSetup() {
  const route = await loadFresh('/src/lib/audioRoute.ts')
  const n = fakeNative()
  route.__setNativeForTests(n.plugin)
  route.__setRouteTimingsForTests(10, 120)
  route.setHeadsetWanted(true)
  return { route, n, routes: () => n.calls.filter((c) => c.startsWith('setRoute')) }
}

test('REG-M-01 (ronda 2): en el Inicio no se prepara nada; al entrar en la clase (sin voz) se prepara, sin micro', async () => {
  const { route, n, routes } = await routeSetup()
  await tick()
  assert.deepEqual(routes(), [], 'sin pantalla que grabe, no se fija')
  const release = route.holdRoute()
  await tick()
  assert.deepEqual(routes(), ['setRoute:headset'], 'al entrar se prepara')
  release()
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:phone', 'al salir se suelta')
})

test('REG-M-01 (ronda 2): mientras habla el profe la ruta está suelta (A2DP) y se prepara al acabar', async () => {
  const { route, n, routes } = await routeSetup()
  const release = route.holdRoute()
  await tick()
  n.calls.length = 0
  route.routeOnSpeech(true) // empieza a hablar el profe
  await tick()
  assert.deepEqual(routes(), ['setRoute:phone'], 'la voz no suena con calidad de llamada')
  route.routeOnSpeech(false) // acaba
  await tick()
  assert.deepEqual(routes(), ['setRoute:phone', 'setRoute:headset'], 'te toca: se prepara')
  // disarmRoute (say() de la clase) la suelta antes de la primera sílaba.
  await route.disarmRoute()
  assert.equal(n.calls.at(-1), 'setRoute:phone')
  release()
})

test('REG-M-01 (ronda 2): sin tocar el micro, la ruta preparada se suelta sola (~20 s; aquí 120 ms)', async () => {
  const { route, n } = await routeSetup()
  const release = route.holdRoute()
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:headset')
  await new Promise((r) => setTimeout(r, 200))
  assert.equal(n.calls.at(-1), 'setRoute:phone')
  release()
})

test('REG-M-01 (ronda 2): al tocar con la ruta lista solo se consulta; se mantiene grabando y se suelta al enviar', async () => {
  const { route, n, routes } = await routeSetup()
  const release = route.holdRoute()
  await tick()
  n.calls.length = 0
  assert.equal(await route.ensureHeadsetRoute(), true) // el Recorder abrió el micro
  assert.deepEqual(n.calls, ['getDevices'], 'ni permiso ni setRoute: ya estaba puesta')
  route.routeOnSpeech(true) // un ▶ mientras grabas no suelta la ruta del micro abierto
  await new Promise((r) => setTimeout(r, 200)) // ni el tiempo sin tocar
  assert.deepEqual(routes(), [])
  route.releaseAfterMic() // enviaste
  await tick()
  assert.deepEqual(routes(), ['setRoute:phone'], 'el profe responde con calidad normal')
  release()
})

test('REG-M-01 (ronda 2): si tocas antes de que esté lista, se aplica en el toque', async () => {
  const { route, n } = await routeSetup()
  const release = route.holdRoute()
  route.routeOnSpeech(true) // el profe habla: nada preparado
  await tick()
  n.calls.length = 0
  assert.equal(await route.ensureHeadsetRoute(), true)
  assert.deepEqual(n.calls, ['getDevices', 'requestBluetooth', 'setRoute:headset'], 'primera vez: permiso y ruta')
  route.releaseAfterMic()
  n.calls.length = 0
  assert.equal(await route.ensureHeadsetRoute(), true)
  assert.ok(!n.calls.includes('requestBluetooth'), 'el permiso concedido no se vuelve a pedir')
  route.releaseAfterMic()
  release()
})

test('REG-M-01 (privacidad): en segundo plano se suelta aunque la clase siga abierta, y al volver se prepara otra vez', async () => {
  const { route, n, routes } = await routeSetup()
  const release = route.holdRoute()
  await tick()
  route.suspendRoute() // minimizar, bloquear, pagehide, appStateChange inactiva, __hablaBackground
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:phone')
  n.calls.length = 0
  route.routeOnSpeech(false) // un final de voz tardío en segundo plano no la vuelve a pedir
  await tick()
  assert.deepEqual(routes(), [])
  route.resumeRoute()
  await tick()
  assert.deepEqual(routes(), ['setRoute:headset'], 'de vuelta con la clase abierta')
  release()
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:phone')
})

test('REG-M-01: elegir otro modo suelta la ruta; tras la prueba de sonido en el Inicio, también', async () => {
  const { route, n } = await routeSetup()
  const release = route.holdRoute()
  await tick()
  route.setHeadsetWanted(false)
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:phone')
  release()
  n.calls.length = 0
  route.settleRoute() // la prueba de sonido fijó la ruta por su cuenta; sin pantallas que graben se suelta
  await tick()
  assert.deepEqual(n.calls, ['setRoute:phone'])
})

test('REV-D1-01: salir o minimizar mientras se pide la ruta no la deja puesta (setRoute tardío)', async () => {
  for (const leave of ['salir', 'segundo plano', 'enviar']) {
    const route = await loadFresh('/src/lib/audioRoute.ts')
    const n = fakeNative(60)
    route.__setNativeForTests(n.plugin)
    route.__setRouteTimingsForTests(0, 10_000)
    route.setHeadsetWanted(true)
    const release = route.holdRoute()
    let opened = null
    if (leave === 'enviar') opened = route.ensureHeadsetRoute() // tocar el micro: la ruta se aplica en el toque
    await until(() => n.calls.includes('setRoute:headset'), 'petición de la ruta')
    if (leave === 'salir') release()
    else if (leave === 'segundo plano') route.suspendRoute()
    else route.releaseAfterMic()
    await opened
    await new Promise((r) => setTimeout(r, 150))
    assert.equal(n.headsetOn, false, `${leave}: ${n.calls.join(' > ')}`)
    release()
    route.resumeRoute()
  }
})

test('REG-M-01: dos pantallas que graban: la ruta sigue hasta que sale la última', async () => {
  const { route, n } = await routeSetup()
  const a = route.holdRoute()
  const b = route.holdRoute()
  await tick()
  a()
  a() // soltar dos veces no cuenta doble
  await tick()
  assert.ok(!n.calls.includes('setRoute:phone'))
  b()
  await tick()
  assert.equal(n.calls.at(-1), 'setRoute:phone')
})

test('REG-M-01: la clase suelta la ruta antes de que hable el profe (say → disarmRoute)', () => {
  const src = readFileSync(new URL('../src/screens/Conversation.tsx', import.meta.url), 'utf8')
  const say = src.slice(src.indexOf('const say = useCallback'), src.indexOf('// Turnos cuya pronunciación'))
  assert.ok(say.indexOf('await disarmRoute()') > 0 && say.indexOf('await disarmRoute()') < say.indexOf('speakSegments('), say)
})

test('REG-A3-04 / 5.10h / REG-A4-03: Gramática con speakSegments, aviso de fonética no al reanudar, colores del tema', () => {
  const conv = readFileSync(new URL('../src/screens/Conversation.tsx', import.meta.url), 'utf8')
  assert.ok(conv.includes('if (grammarClass.current) await speakSegments(replySegments(text), text)'))
  assert.ok(conv.includes('phoneticsActive(settings) && !finishNow && !resume'))
  for (const f of ['screens/Conversation.tsx', 'screens/ReviewScreen.tsx', 'components/GrammarSpeak.tsx', 'screens/Calibration.tsx', 'components/AudioPicker.tsx']) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')
    assert.ok(!/#22c58b|#f87171|#5fe3a1/i.test(src), f)
  }
})


test('REG-M-01: lifecycle suelta y reaplica la ruta en segundo plano y al volver', () => {
  const src = readFileSync(new URL('../src/lib/lifecycle.ts', import.meta.url), 'utf8')
  const bg = src.slice(src.indexOf('function goBackground'), src.indexOf('function goForeground'))
  const fg = src.slice(src.indexOf('function goForeground'), src.indexOf('export function interruptForSoundTest'))
  assert.match(bg, /suspendRoute\(\)/)
  assert.match(fg, /resumeRoute\(\)/)
  for (const ev of ['appStateChange', '__hablaBackground', 'visibilitychange', 'pagehide']) assert.ok(src.includes(ev), ev)
})

// ------------------------------------------------------------------------------------------------
// REG-M-02 · cada descarte tiene motivo, aviso y registro

test('REG-M-02: localDiscard da el motivo de cada camino de descarte local', async () => {
  const { localDiscard, MIN_TALK_SECONDS } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(MIN_TALK_SECONDS, 0.7)
  assert.equal(localDiscard({ seconds: 0.5, bytes: 4000, empty: false }), 'corta')
  assert.equal(localDiscard({ seconds: 3, bytes: 0, empty: true }), 'corta', '0 bytes')
  assert.equal(localDiscard({ seconds: 3.6, bytes: 300, empty: true }), 'vacia', 'solo cabecera WebM')
  assert.equal(localDiscard({ seconds: 18, bytes: 50000, empty: false, hasSpeech: false }), 'sin-voz', 'caso 21:59 (18 s)')
  assert.equal(localDiscard({ seconds: 18, bytes: 50000, empty: false, hasSpeech: true }), null)
  assert.equal(localDiscard({ seconds: 3, bytes: 9000, empty: false }), null, 'sin análisis (no se pudo decodificar): se envía')
})

test('REG-M-02: cada motivo tiene su aviso y el registro dice «descartada: motivo …» sin el texto del usuario', async () => {
  const { DISCARD_HINTS, logDiscard } = await loadFresh('/src/components/talkGesture.ts')
  for (const r of ['corta', 'vacia', 'sin-voz', 'gemini-sin-voz', 'idea-leida', 'cancelada', 'segundo-plano', 'no-abrio']) {
    assert.ok(DISCARD_HINTS[r]?.length > 20, `aviso para ${r}`)
  }
  const logs = []
  const orig = console.info
  console.info = (m) => logs.push(m)
  try {
    logDiscard('sin-voz', 'clase', { seconds: 18.234, bytes: 50000, mic: 'default', skip: undefined })
  } finally {
    console.info = orig
  }
  assert.deepEqual(logs, ['[HABLA-MIC] descartada: motivo sin-voz · clase · seconds=18.23 bytes=50000 mic=default'])
})

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('REG-M-02: la clase descarta siempre por discard() (aviso persistente + registro), nunca con una línea gris suelta', () => {
  const src = read('screens/Conversation.tsx')
  for (const r of ['corta', 'vacia', 'sin-voz', 'gemini-sin-voz', 'idea-leida', 'cancelada', 'segundo-plano', 'no-abrio']) {
    assert.ok(
      src.includes(`'${r}'`) || (['corta', 'vacia', 'sin-voz'].includes(r) && src.includes('localDiscard(')),
      `camino ${r}`,
    )
  }
  for (const old of ['No te he oído. Habla', 'No te he entendido. Prueba otra vez', "setHint('Grabación descartada')", 'Toca el micro, habla y vuelve a tocarlo']) {
    assert.ok(!src.includes(old), `aviso antiguo: ${old}`)
  }
  // El aviso solo se quita al tocar el micro (onPress) o al enviar igualmente.
  assert.equal(src.match(/setDropped\(null\)/g)?.length, 2)
  assert.match(src, /Enviar igualmente/)
})

test('REG-A4-02 / REG-A1-01: Repaso, «Dilo tú», test y clase muestran «Abriendo el micro… espera» y usan el billete', () => {
  for (const f of ['screens/ReviewScreen.tsx', 'components/GrammarSpeak.tsx', 'screens/Calibration.tsx', 'screens/Conversation.tsx']) {
    const src = read(f)
    assert.match(src, /\.ticket\(\)/, `${f}: billete`)
    assert.match(src, /begin\(ticket\)/, `${f}: begin(billete)`)
    assert.match(src, /holdRoute\(\)/, `${f}: retiene la ruta`)
    assert.match(src, /logDiscard\(|discard\(/, `${f}: registra los descartes`)
    assert.ok(src.includes("'opening'"), `${f}: fase de apertura`)
  }
  assert.ok(read('components/GrammarSpeak.tsx').includes('Abriendo el micro… espera'))
  assert.ok(read('screens/Calibration.tsx').includes('Abriendo el micro… espera'))
  assert.ok(read('components/TalkButton.tsx').includes('Abriendo el micro… espera'), 'Repaso y clase usan TalkButton')
})

test('REG-A2-06: AudioRoutePlugin solo escribe el nombre de los auriculares en logcat en el APK debug', () => {
  const java = readFileSync(new URL('../android/app/src/main/java/com/shift/habla/AudioRoutePlugin.java', import.meta.url), 'utf8')
  const logs = java.split('\n').filter((l) => /Log\.[iwdv]\(/.test(l))
  for (const l of logs) assert.ok(!/getProductName\(\)\s*\+/.test(l) || /dbg \?/.test(l), l)
  const i = java.indexOf('Log.i("HablaAudio"')
  const stmt = java.slice(i, java.indexOf(');', i))
  assert.ok(!/[^?] target\.getProductName/.test(stmt.replace(/dbg \? target\.getProductName/g, '')), 'nombre solo con dbg')
  assert.match(java, /FLAG_DEBUGGABLE/)
})
