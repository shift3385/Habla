// AUD-ARQ-113 (regresión 5.10, A1): reglas del test de nivel (placement.ts) con ítems reales del banco.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let P
before(async () => {
  P = await loadFresh('/src/lib/placement.ts')
})

const empty = () => ({ seen: [], uses: {} })
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Respuestas a la escalera: `okUpTo` = último nivel acertado entero (índice); por encima, todo mal. */
function answer(items, okUpTo, { gapOk = true } = {}) {
  return items.map((item) => {
    const ok = LEVELS.indexOf(item.level) <= okUpTo && (item.format === 'mc' || gapOk)
    const value = item.format === 'mc' ? (ok ? item.key : (item.key + 1) % 4) : ok ? item.accepted[0] : 'zzz'
    return { item, value, unknown: false, correct: P.checkGrammar(item, value) }
  })
}

test('gramática: escalera de 20 (15 opción múltiple + 5 huecos), de A1 a C2 y sin repetir', () => {
  const items = P.buildGrammar(empty())
  assert.equal(items.length, P.GRAMMAR_COUNT)
  assert.equal(items.filter((i) => i.format === 'mc').length, 15)
  assert.equal(items.filter((i) => i.format === 'short').length, 5)
  assert.equal(new Set(items.map((i) => i.id)).size, 20)
  const idx = items.map((i) => LEVELS.indexOf(i.level))
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b), 'de menor a mayor nivel')
})

test('checkGrammar: opción correcta y hueco con la respuesta aceptada', () => {
  const items = P.buildGrammar(empty())
  const mc = items.find((i) => i.format === 'mc')
  const gap = items.find((i) => i.format === 'short')
  assert.equal(P.checkGrammar(mc, mc.key), true)
  assert.equal(P.checkGrammar(mc, -1), false, '«No lo sé»')
  assert.equal(P.checkGrammar(gap, gap.accepted[0].toUpperCase()), true)
  assert.equal(P.checkGrammar(gap, 7), false)
})

test('nivel de gramática: el más alto aprobado con los anteriores; C1/C2 exigen un hueco acertado', () => {
  const items = P.buildGrammar(empty())
  assert.equal(P.grammarLevel(answer(items, -1)), 'A1', 'si no aprueba A1 se queda en A1')
  assert.equal(P.grammarLevel(answer(items, 2)), 'B1')
  assert.equal(P.grammarLevel(answer(items, 5)), 'C2')
  // Todo bien salvo los huecos: B1 y B2 tienen huecos que cuentan en el 60 %, C1 exige el hueco.
  const noGaps = P.grammarLevel(answer(items, 5, { gapOk: false }))
  assert.ok(LEVELS.indexOf(noGaps) < 4, `sin huecos no llega a C1 (dio ${noGaps})`)
})

test('fin anticipado: todo mal en dos niveles seguidos', () => {
  const items = P.buildGrammar(empty())
  const all = answer(items, 0) // solo A1 bien
  const upToB1 = all.filter((a) => ['A1', 'A2', 'B1'].includes(a.item.level))
  assert.equal(P.grammarShouldStop(items, upToB1), true, 'A2 y B1 a cero')
  const upToA2 = all.filter((a) => ['A1', 'A2'].includes(a.item.level))
  assert.equal(P.grammarShouldStop(items, upToA2), false, 'solo un nivel a cero')
  assert.equal(P.grammarShouldStop(items, answer(items, 5)), true, 'respondidas todas')
})

test('lectura y audición: niveles de inicio (mínimo A2) y salto del segundo bloque', () => {
  assert.equal(P.readingStart('A1'), 'A2')
  assert.equal(P.readingStart('B2'), 'B1')
  assert.equal(P.listeningStart('C1', 'B2'), 'B1')
  assert.equal(P.listeningStart('A1', 'A1'), 'A2')
  assert.equal(P.nextBlockLevel('B1', 6), 'C1')
  assert.equal(P.nextBlockLevel('B1', 5), 'B2')
  assert.equal(P.nextBlockLevel('B1', 4), 'B2')
  assert.equal(P.nextBlockLevel('B1', 3), 'B1')
  assert.equal(P.nextBlockLevel('B1', 2), 'A2')
  assert.equal(P.nextBlockLevel('C2', 6), 'C2', 'no pasa de C2')
  assert.equal(P.nextBlockLevel('A1', 0), 'A1', 'no baja de A1')
})

test('checkQuestion: sin responder o «No sé» nunca cuenta; errata tolerada solo con tolerateTypo', () => {
  const mc = { type: 'gist', format: 'mc', prompt: '', options: ['a', 'b', 'c', 'd'], key: 2 }
  const sh = { type: 'detail', format: 'short', prompt: '', accepted: ['library'], maxWords: 1 }
  assert.equal(P.checkQuestion(mc, 2, false), true)
  assert.equal(P.checkQuestion(mc, null, false), false)
  assert.equal(P.checkQuestion(mc, -1, false), false)
  assert.equal(P.checkQuestion(sh, '', true), false)
  assert.equal(P.checkQuestion(sh, 'libary', false), false)
  assert.equal(P.checkQuestion(sh, 'libary', true), true)
})

const block = (level, score, plays) => ({ item: {}, level, answers: [], correct: Array.from({ length: 6 }, (_, i) => i < score), plays })

test('nivel por bloques y confianza', () => {
  assert.deepEqual(P.blocksLevel([block('B1', 2), block('A2', 1)]), { level: 'A1', confidence: 'low' }, 'ninguno aprobado: uno por debajo del más bajo')
  assert.deepEqual(P.blocksLevel([block('B1', 5), block('B2', 4)]), { level: 'B2', confidence: 'high' }, 'dos aprobados contiguos')
  assert.deepEqual(P.blocksLevel([block('B1', 4), block('B2', 2)]), { level: 'B1', confidence: 'medium' })
  assert.deepEqual(P.blocksLevel([block('A2', 2), block('B2', 5)]), { level: 'B2', confidence: 'low' }, 'subió dos de golpe con un solo bloque')
  const r = P.blocksLevel([block('B2', 6), block('C1', 5)])
  assert.equal(r.confidence, 'high')
  assert.equal(P.listeningConfidence([block('B2', 6, 3), block('C1', 5, 3)], r), 'medium', 'C1 con 3 escuchas en los dos audios')
  assert.equal(P.listeningConfidence([block('B2', 6, 1), block('C1', 5, 3)], r), 'high')
})

test('habla: tarea 3 sencilla si las dos primeras ≤ A2; mediana hacia abajo', () => {
  assert.equal(P.simpleTask3('A2', 'A1', 'B2'), true)
  assert.equal(P.simpleTask3('A2', 'B1', 'A1'), false)
  assert.equal(P.simpleTask3(null, null, 'A2'), true, 'sin datos: el nivel de reserva')
  assert.equal(P.medianLevel(['B1', 'B2', 'C1']), 'B2')
  assert.equal(P.medianLevel(['A2', 'B1', 'B2', 'C1']), 'B1', '(B1 + B2) / 2 → hacia abajo')
  assert.equal(P.medianLevel([]), 'A2')
  const t1 = P.pickSpeaking(1, empty())
  assert.equal(t1.task, 1)
  assert.equal(P.pickSpeaking(3, empty(), true).variant, 'simple')
})
