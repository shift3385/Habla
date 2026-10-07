// Pruebas del Recorder (v5.8.1 «Micrófono seguro»): AUD-MIC-301, 302, 304, 800 y AUD-ARQ-100/113.
// Se ejecutan con `npm test` (node:test + Vite ssrLoadModule, sin dependencias nuevas).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { installMic, until } from './helpers/mic-mocks.mjs'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

/** Simulacros nuevos + módulo recién cargado (estado `chosen`/`defaultOk` limpio). */
async function setup(opts) {
  const mic = installMic(opts)
  const mod = await loadFresh('/src/lib/recorder.ts')
  return { mic, mod, rec: new mod.Recorder() }
}

const BT_AND_PHONE = [
  { deviceId: 'default', label: 'Default' },
  { deviceId: 'bt1', label: 'Bluetooth headset' },
  { deviceId: 'spk', label: 'Speakerphone' },
]

test('MIC-302: dos begin() simultáneos (doble toque) abren UN solo stream y UN MediaRecorder', async () => {
  const { mic, rec } = await setup({ hold: true })
  const a = rec.begin()
  const b = rec.begin()
  await until(() => mic.pending.length === 1, 'primera apertura')
  mic.resolveAll()
  assert.deepEqual(await Promise.all([a, b]), [true, true])
  assert.equal(mic.gum.length, 1, 'una sola llamada a getUserMedia')
  assert.equal(mic.liveTracks, 1)
  assert.equal(mic.recorders.length, 1)
  rec.close()
  assert.equal(mic.liveTracks, 0, 'close() lo cierra todo: no queda huérfano')
  assert.equal(mic.activeRecorders, 0)
})

test('MIC-302 / ARQ-100: begin() mientras la apertura inicial de la clase (open) sigue en curso comparte la apertura', async () => {
  const { mic, rec } = await setup({ hold: true })
  const opening = rec.open()
  const begun = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  mic.resolveAll()
  assert.equal(await opening, true)
  assert.equal(await begun, true)
  assert.equal(mic.gum.length, 1)
  assert.equal(mic.liveTracks, 1)
  rec.close()
  assert.equal(mic.liveTracks, 0)
})

test('MIC-301: close() mientras getUserMedia está pendiente deja 0 pistas vivas y no graba', async () => {
  const { mic, rec } = await setup({ hold: true })
  const p = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  rec.close()
  mic.resolveAll()
  assert.equal(await p, false, 'begin() informa de la cancelación')
  assert.equal(mic.liveTracks, 0)
  assert.equal(mic.recorders.length, 0, 'no se creó ningún MediaRecorder')
  assert.equal(rec.isOpen, false)
})

test('MIC-301: close() durante la medición de señal no abre el micro de respaldo (fallback)', async () => {
  const { mic, rec } = await setup({ signal: () => false, devices: BT_AND_PHONE })
  const p = rec.begin()
  await until(() => mic.measuring > 0, 'medición de señal')
  rec.close()
  assert.equal(await p, false)
  await new Promise((r) => setTimeout(r, 100))
  assert.equal(mic.gum.length, 1, 'ninguna reapertura tras el cierre')
  assert.equal(mic.liveTracks, 0)
})

test('MIC-301: releaseAllMics() (segundo plano) cancela una apertura en curso', async () => {
  const { mic, mod, rec } = await setup({ hold: true })
  const p = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  mod.releaseAllMics()
  mic.resolveAll()
  assert.equal(await p, false)
  assert.equal(mic.liveTracks, 0)
  assert.equal(mic.recorders.length, 0)
})

test('MIC-301: tras una apertura cancelada, la siguiente pulsación vuelve a abrir con normalidad', async () => {
  const { mic, rec } = await setup({ hold: true })
  const p = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  rec.close()
  mic.resolveAll()
  assert.equal(await p, false)
  mic.hold = false
  assert.equal(await rec.begin(), true)
  assert.equal(mic.liveTracks, 1)
  assert.equal(mic.activeRecorders, 1)
  rec.close()
  assert.equal(mic.liveTracks, 0)
})

test('MIC-304: un segundo start() con una grabación en marcha se ignora (sin MediaRecorder huérfano)', async () => {
  const { mic, rec } = await setup()
  assert.equal(await rec.begin(), true)
  assert.equal(rec.start(), false)
  assert.equal(await rec.begin(), false, 'un begin() con la grabación en marcha tampoco crea otro grabador')
  assert.equal(mic.recorders.length, 1)
  const { blob } = await rec.stop()
  assert.ok(blob.size > 0)
  assert.equal(mic.activeRecorders, 0, 'al parar no queda ningún grabador activo')
  assert.equal(rec.start(), true, 'después de parar se puede volver a grabar')
  assert.equal(mic.recorders.length, 2)
  rec.close()
  assert.equal(mic.activeRecorders, 0)
})

test('MIC-800: silencio sin micro Bluetooth = habitación en silencio; se queda el micro con procesado, sin reintentos', async () => {
  const { mic, rec } = await setup({ signal: () => false, devices: [{ deviceId: 'default', label: 'Default' }, { deviceId: 'spk', label: 'Speakerphone' }] })
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 1, 'ninguna reapertura')
  assert.equal(mic.gum[0].echoCancellation, true, 'conserva la cancelación de eco')
  rec.close()
  // La siguiente apertura ya no mide (el micro por defecto quedó validado).
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 2)
  assert.equal(mic.measuring, 0)
  rec.close()
})

test('MIC-800: micro mudo con auriculares BT → como mucho 1 reintento, con el micro del teléfono y procesado; stream registrado', async () => {
  const { mic, mod, rec } = await setup({ signal: () => false, devices: BT_AND_PHONE })
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 2, 'apertura + 1 solo reintento')
  assert.deepEqual(mic.gum[1].deviceId, { exact: 'spk' })
  assert.equal(mic.gum[1].echoCancellation, true)
  assert.equal(mic.liveTracks, 1, 'el stream del primer intento se cerró')
  mod.releaseAllMics()
  assert.equal(mic.liveTracks, 0, 'el stream del reintento está en `recorders`: el segundo plano lo cierra')
  assert.equal(mic.activeRecorders, 0)
})

test('MIC-800: el reintento con el micro del teléfono que da señal se recuerda para la sesión', async () => {
  const { mic, rec } = await setup({ signal: (_c, n) => n > 0, devices: BT_AND_PHONE })
  assert.equal(await rec.begin(), true)
  rec.close()
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 3)
  assert.deepEqual(mic.gum[2].deviceId, { exact: 'spk' }, 'la siguiente apertura usa directamente el micro elegido')
  rec.close()
})

test('MIC-800: un micro SIN cancelación de eco nunca se recuerda para la sesión', async () => {
  // Sin micro del teléfono identificable: el reintento es el micro por defecto sin procesado.
  const { mic, rec } = await setup({ signal: (_c, n) => n > 0, devices: [{ deviceId: 'default', label: 'Default' }, { deviceId: 'bt1', label: 'Bluetooth headset' }] })
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 2)
  assert.equal(mic.gum[1].echoCancellation, false, 'el reintento es sin procesado')
  rec.close()
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum[2].echoCancellation, true, 'la siguiente apertura vuelve al micro con procesado')
  rec.close()
})

test('MIC-800: una pista silenciada por el sistema (muted) cuenta como micro mudo aunque no haya Bluetooth', async () => {
  const { mic, rec } = await setup({ hold: true, signal: () => false, devices: [{ deviceId: 'default', label: 'Default' }, { deviceId: 'spk', label: 'Speakerphone' }] })
  const p = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  mic.resolveAll()
  await until(() => mic.tracks.length === 1, 'pista')
  mic.tracks[0].muted = true
  await until(() => mic.pending.length === 1, 'reintento')
  mic.resolveAll()
  assert.equal(await p, true)
  assert.equal(mic.gum.length, 2)
  rec.close()
  assert.equal(mic.liveTracks, 0)
})

test('MIC-301: close() mientras el reintento (fallback) espera a getUserMedia deja 0 pistas vivas', async () => {
  const { mic, rec } = await setup({ hold: true, signal: () => false, devices: BT_AND_PHONE })
  const p = rec.begin()
  await until(() => mic.pending.length === 1, 'apertura')
  mic.resolveAll()
  await until(() => mic.pending.length === 1, 'reintento')
  rec.close()
  mic.resolveAll()
  assert.equal(await p, false)
  assert.equal(mic.liveTracks, 0)
  assert.equal(mic.recorders.length, 0)
})

test('Permiso denegado: MicError con el texto del permiso, sin reintento y sin nada abierto', async () => {
  const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
  const { mic, mod, rec } = await setup({ fail: () => denied })
  await assert.rejects(rec.begin(), (e) => e instanceof mod.MicError && /permiso/i.test(e.message))
  assert.equal(mic.gum.length, 1)
  assert.equal(mic.liveTracks, 0)
})

test('Micro ocupado: un reintento con un stream nuevo y, si vuelve a fallar, MicError sin nada abierto', async () => {
  const busy = Object.assign(new Error('busy'), { name: 'NotReadableError' })
  const { mic, mod, rec } = await setup({ fail: () => busy })
  await assert.rejects(rec.begin(), (e) => e instanceof mod.MicError && /otras apps/i.test(e.message))
  assert.equal(mic.gum.length, 2)
  assert.equal(mic.liveTracks, 0)
})

test('MIC-309: cada grabación tiene sus propios trozos', async () => {
  const { rec } = await setup()
  assert.equal(await rec.begin(), true)
  const first = await rec.stop()
  assert.equal(rec.start(), true)
  const second = await rec.stop()
  assert.equal(first.blob.size, 1)
  assert.equal(second.blob.size, 1, 'la segunda no arrastra el trozo de la primera')
  rec.close()
})

test('MIC-800: modo auriculares con el micro BT mudo → 1 solo reintento (micro del teléfono con procesado)', async () => {
  const { mic, mod, rec } = await setup({ signal: () => false, devices: BT_AND_PHONE })
  mod.setMicMode('headset')
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 2, 'apertura + 1 reintento, nunca la cadena de 4 aperturas de la v5.8')
  assert.equal(mic.gum[1].echoCancellation, true)
  assert.equal(mic.liveTracks, 1)
  rec.close()
  assert.equal(mic.liveTracks, 0)
})

test('REV-T1-1: si el micro del teléfono no se puede abrir en el reintento, se prueba el por defecto sin procesado', async () => {
  const over = Object.assign(new Error('over'), { name: 'OverconstrainedError' })
  const { mic, mod, rec } = await setup({ signal: () => false, devices: BT_AND_PHONE, fail: (c) => (c.deviceId ? over : null) })
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum.length, 3, 'por defecto + teléfono (falla) + sin procesado')
  assert.equal(mic.gum[2].echoCancellation, false)
  assert.equal(mic.liveTracks, 1, 'una sola alternativa llegó a abrirse')
  mod.releaseAllMics()
  assert.equal(mic.liveTracks, 0, 'el stream sin procesado está en `recorders`')
  // No se recuerda: la siguiente apertura vuelve al micro con procesado.
  assert.equal(await rec.begin(), true)
  assert.equal(mic.gum[3].echoCancellation, true)
  rec.close()
})

test('REV-T1-1: si fallan también las alternativas, MicError en español y nada abierto', async () => {
  const busy = Object.assign(new Error('busy'), { name: 'NotReadableError' })
  const { mic, mod, rec } = await setup({ signal: () => false, devices: BT_AND_PHONE, fail: (_c, n) => (n > 0 ? busy : null) })
  await assert.rejects(rec.begin(), (e) => e instanceof mod.MicError && /otras apps/i.test(e.message))
  assert.equal(mic.liveTracks, 0)
})
