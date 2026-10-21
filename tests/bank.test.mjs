// AUD-ARQ-113 (regresión 5.10, A1): banco del test de nivel (bank.ts): carga, selección sin repetir y corrección en
// código de las respuestas escritas (NC-04: misma raíz = misma respuesta; en audición, una letra de tolerancia).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let B
before(async () => {
  B = await loadFresh('/src/lib/bank.ts')
})

const empty = () => ({ seen: [], uses: {} })

test('carga: los 450 ítems del banco, con ids únicos', () => {
  assert.equal(B.BANK.length, 450)
  assert.equal(new Set(B.BANK.map((i) => i.id)).size, 450)
  assert.equal(B.BANK.filter(B.isGrammarMC('B1')).length, 25)
  assert.ok(B.BANK.filter(B.isGrammarGap('C1')).length > 0)
  assert.equal(B.BANK.filter(B.isGrammarGap('A1')).length, 0, 'no hay huecos escritos en A1')
  assert.equal(B.BANK.filter(B.isReading('A2')).length, 10)
  assert.equal(B.BANK.filter(B.isSpeaking(3, true)).length, 15, 'tarea 3 sencilla')
  assert.equal(B.BANK.filter(B.isSpeaking(3)).length, 30, 'tarea 3 normal (sin la sencilla)')
})

test('pickItems: no repite lo ya visto mientras quede banco y respeta los excluidos', () => {
  const filter = B.isGrammarMC('A2')
  const pool = B.BANK.filter(filter)
  const seen = pool.slice(0, 20).map((i) => i.id)
  const got = B.pickItems({ filter, n: 5, usage: { seen, uses: {} } })
  assert.equal(got.length, 5)
  assert.ok(got.every((i) => !seen.includes(i.id)), 'quedan 5 sin ver: salen esos')
  const exclude = new Set(got.map((i) => i.id))
  const more = B.pickItems({ filter, n: 3, usage: { seen, uses: {} }, exclude })
  assert.ok(more.every((i) => !exclude.has(i.id)))
  assert.equal(new Set(more.map((i) => i.id)).size, more.length, 'sin duplicados')
})

test('pickItems: con el banco agotado repite lo menos usado y evita los temas pedidos si puede', () => {
  const filter = B.isReading('B1')
  const pool = B.BANK.filter(filter)
  const uses = Object.fromEntries(pool.map((i, k) => [i.id, k === 3 ? 0 : 5]))
  const [least] = B.pickItems({ filter, n: 1, usage: { seen: pool.map((i) => i.id), uses } })
  assert.equal(least.id, pool[3].id)
  const topic = pool[0].topic
  const fresh = B.pickItems({ filter, n: 1, usage: empty(), avoidTopics: [topic] })
  if (pool.some((i) => i.topic !== topic)) assert.notEqual(fresh[0].topic, topic)
  assert.equal(B.pickItems({ filter, n: 50, usage: empty() }).length, pool.length, 'nunca más de lo que hay')
})

test('recordUse: suma usos y añade a vistos sin duplicar', () => {
  const [a, b] = B.BANK
  const u1 = B.recordUse(empty(), [a, b])
  const u2 = B.recordUse(u1, [a])
  assert.deepEqual(u2.seen, [a.id, b.id])
  assert.equal(u2.uses[a.id], 2)
  assert.equal(u2.uses[b.id], 1)
  assert.deepEqual(empty().uses, {}, 'no muta la entrada')
})

test('normalizeAnswer: mayúsculas, puntuación y contracciones', () => {
  assert.equal(B.normalizeAnswer("  Don't  STOP! "), 'do not stop')
  assert.equal(B.normalizeAnswer('won’t'), 'will not')
  assert.equal(B.normalizeAnswer("can't"), 'cannot')
  assert.equal(B.normalizeAnswer('can not'), 'cannot')
  assert.equal(B.normalizeAnswer("they're, we've, I'll, I'd, I'm"), 'they are we have i will i would i am')
})

test('stem: misma raíz para formas derivadas; los números no se recortan', () => {
  assert.equal(B.stem('reversibility'), B.stem('reversible'))
  assert.equal(B.stem('repairing'), B.stem('repair'))
  assert.equal(B.stem('biologically'), B.stem('biology'))
  assert.equal(B.stem('earlier'), B.stem('early'))
  assert.equal(B.stem('eighty'), 'eighty')
  assert.notEqual(B.stem('sixty'), B.stem('six'))
})

test('checkShort: exacta, sin artículo, misma raíz; palabras distintas no; tolerancia de una letra solo en audición', () => {
  assert.equal(B.checkShort('The station', ['station']), true, 'el artículo no cuenta')
  assert.equal(B.checkShort('exposed', ['exposure']), true)
  assert.equal(B.checkShort("doesn't", ['does not']), true)
  assert.equal(B.checkShort('train', ['station']), false)
  assert.equal(B.checkShort('', ['station']), false)
  assert.equal(B.checkShort('stasion', ['station']), false, 'en lectura no se tolera la errata')
  assert.equal(B.checkShort('stasion', ['station'], true), true, 'en audición sí')
  assert.equal(B.checkShort('sity', ['six'], true), false, 'palabras de menos de 4 letras: sin tolerancia')
  assert.equal(B.checkShort('red car', ['car']), false, 'una palabra de más no vale')
})

test('scriptSeconds / wordCount: ≈150 palabras por minuto', () => {
  assert.equal(B.wordCount('  one two   three '), 3)
  const item = { script: [{ s: 'a', t: Array(75).fill('w').join(' ') }, { s: 'b', t: Array(75).fill('w').join(' ') }] }
  assert.equal(B.scriptSeconds(item), 60)
})
