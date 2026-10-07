// Reglas de los toques del botón de hablar (v5.9: toca para hablar, toca para enviar; AUD-MIC-302/304/305).
// Lógica pura de src/components/talkGesture.ts.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

test('Toque en reposo: empieza a grabar; ocupado (pensando, procesando): se ignora', async () => {
  const { tapAction } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(tapAction({ busy: false, recording: false, recordingMs: 0 }), 'press')
  assert.equal(tapAction({ busy: true, recording: false, recordingMs: 0 }), 'ignore')
})

test('MIC-305: con la grabación en marcha, un toque envía', async () => {
  const { tapAction } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(tapAction({ busy: false, recording: true, recordingMs: 4000 }), 'send')
})

test('MIC-302/304: el rebote de un doble toque (o un segundo dedo) justo al empezar no envía una grabación vacía', async () => {
  const { tapAction, MIN_SEND_MS } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(tapAction({ busy: false, recording: true, recordingMs: 120 }), 'ignore')
  assert.equal(tapAction({ busy: false, recording: true, recordingMs: MIN_SEND_MS }), 'send')
})
