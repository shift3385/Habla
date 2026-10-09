// Error 400 del repaso (2026-10-08): con los auriculares Bluetooth desconectados cada grabación salía con solo la
// cabecera WebM y se mandaba a Gemini sin audio. `isEmptyRecording` la detecta y `distrustMic` hace que la siguiente
// apertura vuelva a medir la señal en vez de fiarse del micro anterior.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { installMic, until } from './helpers/mic-mocks.mjs'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const blob = (bytes) => new Blob([new Uint8Array(bytes)])

test('isEmptyRecording: vacía, solo cabecera sin decodificar, y grabaciones reales', async () => {
  const { isEmptyRecording } = await loadFresh('/src/lib/speech.ts')
  const voice = { hasSpeech: true, speechSeconds: 2, pauses: [] }
  assert.equal(isEmptyRecording(blob(0), null), true, '0 bytes')
  assert.equal(isEmptyRecording(blob(0), voice), true, '0 bytes aunque haya análisis')
  assert.equal(isEmptyRecording(blob(300), null), true, 'solo cabecera WebM (caso del POCO): no se puede decodificar')
  assert.equal(isEmptyRecording(blob(8000), null), false, 'audio real que este navegador no sabe decodificar: se envía')
  assert.equal(isEmptyRecording(blob(300), voice), false, 'si se pudo decodificar, decide el análisis de voz')
})

test('distrustMic: tras fiarse del micro por defecto, la siguiente apertura vuelve a medir y cambia a uno con señal', async () => {
  // El micro por defecto (fijado a los auriculares, que ya no dan audio) no da señal; el del teléfono, sí.
  // La grabadora solo prueba otros micros si hay uno Bluetooth en la lista (si no, el silencio es tuyo).
  const mic = installMic({
    devices: [
      { deviceId: 'default', label: 'Default' },
      { deviceId: 'bt1', label: 'Bluetooth headset' },
      { deviceId: 'spk', label: 'Speakerphone' },
    ],
    signal: (c) => JSON.stringify(c).includes('spk'),
  })
  const mod = await loadFresh('/src/lib/recorder.ts')
  mod.trustDefaultMic() // MOV-4: la prueba de sonido de los auriculares lo dio por bueno
  const rec = new mod.Recorder()

  assert.equal(await rec.open(), true)
  assert.equal(mic.gum.length, 1, 'con la confianza puesta no se mide: se queda con el micro muerto')
  rec.close()

  mod.distrustMic()
  assert.equal(await rec.open(), true)
  await until(() => mic.gum.length >= 2, 'nueva apertura')
  assert.ok(
    mic.gum.slice(1).some((c) => JSON.stringify(c).includes('spk')),
    `tras distrustMic busca otro micro: ${JSON.stringify(mic.gum)}`,
  )
  rec.close()
  assert.equal(mic.liveTracks, 0)
})
