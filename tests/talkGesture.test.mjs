// Reglas de los dedos del botón de hablar (AUD-MIC-304, REV-T2-1). Lógica pura de src/components/talkGesture.ts.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const idle = { busy: false, locked: false, recording: false }

test('REV-T2-1: un segundo dedo DURANTE la apertura (aún no «grabando») se ignora y no se queda con el gesto', async () => {
  const { pointerDownAction, isOwnPointer } = await loadFresh('/src/components/talkGesture.ts')
  let g = { active: false, id: -1, done: false }
  assert.equal(pointerDownAction(g, 1, idle), 'press')
  g = { active: true, id: 1, done: false } // lo que guarda TalkButton al empezar
  // El micro aún se abre: fase sin «recording».
  assert.equal(pointerDownAction(g, 2, idle), 'ignore')
  assert.equal(isOwnPointer(g, 2), false, 'soltar el dedo 2 no envía ni corta la grabación')
  assert.equal(isOwnPointer(g, 1), true, 'el dedo 1 sigue mandando')
})

test('MIC-304: con la grabación en marcha, otro dedo o un toque nuevo no empieza otra grabación', async () => {
  const { pointerDownAction } = await loadFresh('/src/components/talkGesture.ts')
  const rec = { busy: false, locked: false, recording: true }
  assert.equal(pointerDownAction({ active: true, id: 1, done: false }, 2, rec), 'ignore')
  assert.equal(pointerDownAction({ active: false, id: 1, done: false }, 3, rec), 'ignore', 'justo tras soltar, sin dedo activo')
})

test('Grabación bloqueada: un toque envía; ocupado (pensando): se ignora', async () => {
  const { pointerDownAction } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(pointerDownAction({ active: false, id: 1, done: true }, 4, { busy: false, locked: true, recording: true }), 'send')
  assert.equal(pointerDownAction({ active: false, id: -1, done: false }, 1, { busy: true, locked: false, recording: false }), 'ignore')
})

test('El mismo dedo puede volver a pulsar (p. ej. si se perdió su pointerup) y no queda el botón bloqueado', async () => {
  const { pointerDownAction } = await loadFresh('/src/components/talkGesture.ts')
  assert.equal(pointerDownAction({ active: true, id: 1, done: false }, 1, idle), 'press')
})
