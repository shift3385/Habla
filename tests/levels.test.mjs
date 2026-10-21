// AUD-ARQ-113 (regresión 5.10, A1): reglas de nivel de levels.ts. Política (docs/decisiones.md): las clases solo
// proponen; el re-test pondera 70 % test + 30 % trayectoria; el nivel general tiene tope por la destreza más débil.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let L
before(async () => {
  L = await loadFresh('/src/lib/levels.ts')
})

const all = (l) => ({ grammar: l, reading: l, listening: l, speaking: l })

test('levelIdx / levelAt: «+» se ignora, lo desconocido cuenta como B1 y los extremos se recortan', () => {
  assert.equal(L.levelIdx('A1'), 0)
  assert.equal(L.levelIdx('C2'), 5)
  assert.equal(L.levelIdx('B1+'), 2)
  assert.equal(L.levelIdx('zz'), 2, 'nivel desconocido → B1')
  assert.equal(L.levelAt(-3), 'A1')
  assert.equal(L.levelAt(9), 'C2')
  assert.equal(L.levelAt(2.4), 'B1')
  assert.equal(L.levelAt(2.6), 'B2')
})

test('nivel general: media de las 4 destrezas, un ,5 exacto hacia abajo', () => {
  assert.equal(L.overallFrom(all('B2')), 'B2')
  // 2 + 2 + 3 + 3 = 10 → 2,5 → A2 (no sobrevalorar)
  const b = L.overallBreakdown({ grammar: 'A2', reading: 'A2', listening: 'B1', speaking: 'B1' })
  assert.equal(b.mean, 2.5)
  assert.equal(b.rounded, 2)
  assert.equal(b.final, 'A2')
  assert.equal(b.capped, false)
  // 3 + 4 + 4 + 4 = 15 → 3,75 → 4 (B2)
  assert.equal(L.overallFrom({ grammar: 'B1', reading: 'B2', listening: 'B2', speaking: 'B2' }), 'B2')
})

test('nivel general: nunca más de 2 niveles por encima de la destreza más baja', () => {
  const b = L.overallBreakdown({ grammar: 'C2', reading: 'C2', listening: 'C2', speaking: 'A1' })
  assert.equal(b.rounded, 5) // 4,75
  assert.equal(b.cap, 3) // A1 (1) + 2
  assert.equal(b.final, 'B1')
  assert.equal(b.capped, true)
})

test('re-test 70/30: el test pesa más; un ,5 exacto va hacia abajo', () => {
  assert.equal(L.TEST_WEIGHT, 0.7)
  assert.deepEqual(L.weightedLevel('B1', 'B1'), { level: 'B1', value: 3 })
  // 0,7·3 + 0,3·1 = 2,4 → B1
  assert.equal(L.weightedLevel('B2', 'A2').level, 'B1')
  // 0,7·3 + 0,3·5 = 2,1 + 1,5 = 3,6 → índice 4 = C1
  assert.equal(L.weightedLevel('B2', 'C2').level, 'C1')
  // ,5 exactos posibles: (A1, C2) = 1,5 → A2 y (C2, A1) = 3,5 → B2
  assert.equal(L.weightedLevel('A1', 'C2').level, 'A2')
  assert.equal(L.weightedLevel('C2', 'A1').level, 'B2')
  assert.equal(L.weightedLevel('C2', 'A1').value, 4.5, 'value en la escala 1–6')
})

test('trayectoria: solo el habla la proponen las clases; el resto es el nivel actual', () => {
  const p = { levels: { ...all('B1'), overall: 'B1' }, trajectory: { speaking: 'B2' } }
  assert.deepEqual(L.trajectoryOf(p), { grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'B2' })
  assert.equal(L.trajectoryOf({ levels: { ...all('A2'), overall: 'A2' } }).speaking, 'A2')
})

test('re-test: a los 28 días; un test anterior al banco (sin bankVersion) se puede repetir ya', () => {
  const at = Date.UTC(2026, 9, 1)
  assert.equal(L.nextRetestAt({ levels: all('B1') }), null, 'sin test, no hay re-test')
  const ok = { calibratedAt: at, tests: [{ bankVersion: 1 }] }
  assert.equal(L.needsRecalibration(ok), false)
  assert.equal(L.nextRetestAt(ok), at + 28 * 86400000)
  const old = { calibratedAt: at, tests: [{}] }
  assert.equal(L.needsRecalibration(old), true)
  assert.equal(L.nextRetestAt(old), at)
})

test('velocidad de voz por nivel: sube con el nivel', () => {
  const rates = L.LEVELS.map(L.rateForLevel)
  assert.deepEqual(rates, [0.8, 0.85, 0.95, 1, 1.05, 1.1])
  assert.equal(L.rateForLevel('raro'), 0.95, 'desconocido = B1')
})
