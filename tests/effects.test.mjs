// 5.11.x · Modo ligero (src/lib/effects.ts).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

const fx = await loadFresh('/src/lib/effects.ts')
after(closeServer)

test('ajuste antiguo o roto → todo encendido; lo que esté en false se respeta', () => {
  assert.deepEqual(fx.normalizeEffects(undefined), fx.ALL_EFFECTS)
  assert.deepEqual(fx.normalizeEffects('x'), fx.ALL_EFFECTS)
  assert.deepEqual(fx.normalizeEffects({ blur: false }), { ...fx.ALL_EFFECTS, blur: false })
  assert.deepEqual(fx.normalizeEffects(fx.LIGHT_EFFECTS), fx.LIGHT_EFFECTS)
})

test('preajuste: completo, ligero o a medida', () => {
  assert.equal(fx.effectsPreset(fx.ALL_EFFECTS), 'full')
  assert.equal(fx.effectsPreset(fx.LIGHT_EFFECTS), 'light')
  assert.equal(fx.effectsPreset({ ...fx.ALL_EFFECTS, mascot: false }), 'custom')
})

test('applyEffects: una clase por grupo apagado y desplazamiento suave solo con animaciones', () => {
  const on = new Set()
  const root = { classList: { toggle: (c, v) => (v ? on.add(c) : on.delete(c)) } }
  fx.applyEffects({ ...fx.ALL_EFFECTS, blur: false, motion: false }, root)
  assert.deepEqual([...on].sort(), ['fx-no-blur', 'fx-no-motion'])
  assert.equal(fx.scrollBehavior(), 'auto')
  fx.applyEffects(fx.ALL_EFFECTS, root)
  assert.equal(on.size, 0)
  assert.equal(fx.scrollBehavior(), 'smooth')
})

test('looksModest: el A11 (2–3 GB) sí; el POCO (8–12 GB, 8 núcleos) no; sin datos, no', () => {
  assert.equal(fx.looksModest({ deviceMemory: 2, hardwareConcurrency: 8 }), true)
  assert.equal(fx.looksModest({ deviceMemory: 8, hardwareConcurrency: 8 }), false)
  assert.equal(fx.looksModest({}), false)
  assert.equal(fx.looksModest({ hardwareConcurrency: 4 }), true)
})
