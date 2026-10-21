// 5.11 · D3 · S-05 «Motor de Sonidos»: mapa de símbolos de Azure → ficha/lección, regla de «dominado» y progreso.
// Lógica pura de src/lib/sounds.ts (las funciones de Dexie se prueban en el navegador) y el contenido real de src/sounds/.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let S
before(async () => {
  S = await loadFresh('/src/lib/sounds.ts')
})

const json = (f) => JSON.parse(readFileSync(new URL(`../src/sounds/${f}`, import.meta.url), 'utf8'))
const { phonemes } = json('phonemes.json')
const { lessons } = json('lessons.json')

/** Día de octubre de 2026 a mediodía. */
const oct = (d) => new Date(2026, 9, d, 12, 0, 0).getTime()

test('normalizeAzure: quita «ː» y pasa g a ɡ', () => {
  assert.equal(S.normalizeAzure('iː'), 'i')
  assert.equal(S.normalizeAzure('uː'), 'u')
  assert.equal(S.normalizeAzure('g'), 'ɡ')
  assert.equal(S.normalizeAzure(' θ '), 'θ')
})

test('Mapa de Azure → ficha (contenido real): cada símbolo lleva a una sola ficha, salvo /ɝ ɚ/', () => {
  const owners = new Map()
  for (const p of phonemes)
    for (const a of p.azure) {
      const k = S.normalizeAzure(a)
      if (!(owners.get(k) ?? []).includes(p.id)) owners.set(k, [...(owners.get(k) ?? []), p.id])
    }
  for (const [sym, ids] of owners) if (ids.length > 1) assert.deepEqual(ids.toSorted(), ['axr', 'er'], `símbolo ${sym}: ${ids}`)
  const map = S.buildAzureMap(phonemes)
  for (const p of phonemes) for (const a of p.azure) assert.ok(map.has(S.normalizeAzure(a)))
  // Los rasgos no tienen símbolo: solo se llega a ellos por los casos especiales.
  for (const p of phonemes.filter((x) => x.kind === 'feature')) assert.deepEqual(p.azure, [])
})

// Fichas mínimas para probar los casos especiales aunque el contenido aún sea la muestra.
const mini = [
  { id: 'th', azure: ['θ'], kind: 'consonant' },
  { id: 's', azure: ['s'], kind: 'consonant' },
  { id: 't', azure: ['t'], kind: 'consonant' },
  { id: 'd', azure: ['d'], kind: 'consonant' },
  { id: 'iy', azure: ['i'], kind: 'vowel' },
  { id: 'g', azure: ['ɡ', 'g'], kind: 'consonant' },
  { id: 's-cluster', azure: [], kind: 'feature' },
  { id: 'ed', azure: [], kind: 'feature' },
]

test('phonemeByAzure: casos de soundTipEs (s + consonante → s-cluster, -ed → ed), omisión sin enlace', () => {
  const id = (sym, word, omission) => S.phonemeByAzure(mini, sym, word, omission)?.id
  assert.equal(id('θ', 'think'), 'th')
  assert.equal(id('iː', 'sheep'), 'iy', 'Azure puede traer «iː» o «i»')
  assert.equal(id('g', 'go'), 'g')
  assert.equal(id('s', 'school'), 's-cluster')
  assert.equal(id('s', 'Spain'), 's-cluster')
  assert.equal(id('s', 'sun'), 's', 's + vocal no es el caso especial')
  assert.equal(id('t', 'worked'), 'ed')
  assert.equal(id('d', 'played'), 'ed')
  assert.equal(id('t', 'wanted'), 't', '-ted/-ded: la -ed sí es sílaba; no es el error de la sílaba de más')
  assert.equal(id('t', 'top'), 't')
  assert.equal(id('θ', 'think', true), undefined, 'omisión: sin enlace')
  assert.equal(id(undefined, 'think'), undefined)
  assert.equal(id('x', 'box'), undefined, 'símbolo sin ficha')
})

test('lessonFor: la lección donde la ficha es la principal; si no, la primera que la trabaja', () => {
  const ls = [
    { id: 'C2a', order: 26, phonemes: ['th', 's', 't'] },
    { id: 'E1', order: 7, phonemes: ['s-cluster', 's'] },
    { id: 'V1', order: 5, phonemes: ['ih', 'iy'] },
  ]
  assert.equal(S.lessonFor(ls, 'th').id, 'C2a')
  assert.equal(S.lessonFor(ls, 'iy').id, 'V1')
  assert.equal(S.lessonFor(ls, 's').id, 'E1', 'la primera por orden de la ruta')
  assert.equal(S.lessonFor(ls, 'zh'), undefined)
  // Contenido real: cada lección cita fichas que existen y su principal la encuentra lessonFor.
  for (const l of lessons) if (l.phonemes[0]) assert.ok(S.lessonFor(lessons, l.phonemes[0]), l.id)
})

const key = (d) => {
  const x = new Date(oct(d))
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const scores = (...days) => Object.fromEntries(days.map(([d, ok, total]) => [key(d), { ok, total }]))

test('Dominado: «Escucha» ≥ 85 % y Azure ≥ 80 en 4 de 5, en dos días distintos; sin Azure, «solo de oído»', () => {
  const m = (listen, azure, hasAzure) => S.masteryOf({ listen: scores(...listen), azure: scores(...azure) }, hasAzure)
  // Un solo día perfecto: no.
  assert.deepEqual(m([[20, 8, 8]], [[20, 5, 5]], true), { mastered: false, earOnly: false })
  // Dos días: sí.
  assert.deepEqual(m([[20, 8, 8], [21, 7, 8]], [[20, 4, 5], [21, 5, 5]], true), { mastered: true, earOnly: false })
  // Con Azure pero sin haber dicho las palabras (o con 3 de 5): no.
  assert.equal(m([[20, 8, 8], [21, 8, 8]], [], true).mastered, false)
  assert.equal(m([[20, 8, 8], [21, 8, 8]], [[20, 3, 5], [21, 3, 5]], true).mastered, false)
  // Menos del 85 % en un día (6/8 = 75 %): ese día no cuenta.
  assert.equal(m([[20, 6, 8], [21, 8, 8]], [[20, 5, 5], [21, 5, 5]], true).mastered, false)
  // Pocas rondas (3/3) no bastan para contar el día.
  assert.equal(m([[20, 3, 3], [21, 8, 8]], [[20, 5, 5], [21, 5, 5]], true).mastered, false)
  // Pocas palabras con Azure (2/2) tampoco.
  assert.equal(m([[20, 8, 8], [21, 8, 8]], [[20, 2, 2], [21, 5, 5]], true).mastered, false)
  // Sin Azure: «Escucha» en dos días basta y queda marcado.
  assert.deepEqual(m([[20, 8, 8], [21, 7, 8]], [], false), { mastered: true, earOnly: true })
  assert.deepEqual(m([[20, 8, 8]], [], false), { mastered: false, earOnly: false })
})

test('Progreso: withListen/withAzure suman por día, el estado nunca baja y aplicar dos veces da lo mismo', () => {
  let p
  // 8 rondas el día 20 (7 bien) → practicado, no dominado.
  for (let i = 0; i < 8; i++) p = S.withListen(p, 'ih', i !== 3, false, oct(20) + i)
  assert.equal(p.state, 'practiced')
  assert.deepEqual(p.listen[key(20)], { ok: 7, total: 8 })
  assert.equal(p.mastered, false)
  assert.deepEqual(p.days, [key(20)])
  // El día 21, otras 8 (8 bien) → dominado solo de oído (sin Azure).
  for (let i = 0; i < 8; i++) p = S.withListen(p, 'ih', true, false, oct(21) + i)
  assert.equal(p.mastered, true)
  assert.equal(p.earOnly, true)
  assert.equal(p.state, 'mastered')
  assert.equal(p.masteredAt, oct(21) + 5, 'se domina en la 6.ª ronda buena del segundo día (mínimo de rondas por día)')
  assert.deepEqual(p.days, [key(20), key(21)])
  // Idempotente: asentarlo otra vez no cambia nada; fallar luego no lo quita.
  assert.deepEqual(S.settle(p, false, oct(22)), p)
  const after = S.withListen(p, 'ih', false, false, oct(22))
  assert.equal(after.mastered, true)
  assert.equal(after.state, 'mastered')
  assert.equal(after.masteredAt, p.masteredAt)
  // Con Azure: notas por palabra (≥ 80 cuenta), mejor nota guardada.
  let q
  for (const d of [20, 21]) {
    for (let i = 0; i < 8; i++) q = S.withListen(q, 'th', true, true, oct(d) + i)
    for (const score of [85, 90, 79, 95, 81]) q = S.withAzure(q, 'th', score, true, oct(d) + 100)
  }
  assert.deepEqual(q.azure[key(20)], { ok: 4, total: 5 })
  assert.equal(q.bestScore, 95)
  assert.equal(q.mastered, true)
  assert.equal(q.earOnly, undefined, 'con Azure no es «solo de oído»')
  // Solo de oído que luego consigue la nota con Azure: deja de ser solo de oído.
  let r = { ...p }
  for (const d of [23, 24]) for (const score of [90, 90, 90, 90, 90]) r = S.withAzure(r, 'ih', score, true, oct(d))
  assert.equal(r.mastered, true)
  assert.equal(r.earOnly, undefined)
})

test('stateOf: nuevo → visto → practicado → dominado, sin bajar nunca', () => {
  assert.equal(S.stateOf(undefined), 'new')
  assert.equal(S.stateOf({ seenAt: 1 }), 'seen')
  assert.equal(S.stateOf({ seenAt: 1, listen: {} }), 'practiced')
  assert.equal(S.stateOf({ mastered: true }), 'mastered')
  assert.equal(S.stateOf({ state: 'mastered', mastered: false }), 'mastered', 'no baja')
})

test('routeProgress: terminadas, total y siguiente lección en orden de la ruta', () => {
  const ls = [
    { id: 'C2a', order: 26, phonemes: ['th'] },
    { id: 'S0', order: 1, phonemes: [] },
    { id: 'V1', order: 5, phonemes: ['ih'] },
  ]
  assert.deepEqual(
    (({ done, total, next }) => ({ done, total, next: next?.id }))(S.routeProgress(ls, {})),
    { done: 0, total: 3, next: 'S0' },
  )
  const prog = { 'lesson:S0': { completedAt: 1 }, 'lesson:C2a': { completedAt: 2 } }
  const r = S.routeProgress(ls, prog)
  assert.equal(r.done, 2)
  assert.equal(r.next.id, 'V1')
  assert.equal(S.routeProgress(ls, { ...prog, 'lesson:V1': { completedAt: 3 } }).next, undefined)
  assert.equal(S.lessonKey('V1'), 'lesson:V1')
})

test('Los JSON de Sonidos se cargan perezosos (import.meta.glob sin eager) y no los importa nadie de forma estática', () => {
  const src = readFileSync(new URL('../src/lib/sounds.ts', import.meta.url), 'utf8')
  assert.match(src, /import\.meta\.glob<[^>]+>\('\.\.\/sounds\/\{phonemes,lessons,alphabet,credits\}\.json'\)/)
  assert.doesNotMatch(src, /eager: true/)
  assert.doesNotMatch(src, /from '\.\.\/sounds\//)
})

test('Contenido real: 41 fichas + 3 rasgos, 12 lecciones del MVP en orden, y el mapa de Azure lleva a la lección buena', () => {
  assert.equal(phonemes.filter((p) => p.kind !== 'feature').length, 41)
  assert.deepEqual(phonemes.filter((p) => p.kind === 'feature').map((p) => p.id), ['s-cluster', 'ed', 's-ending'])
  assert.deepEqual(
    [...lessons].sort((a, b) => a.order - b.order).map((l) => l.id),
    ['S0', 'A1', 'A2', 'A3', 'V1', 'C1', 'E1', 'V3a', 'V3b', 'E4', 'E3', 'C2a'],
  )
  const lessonOf = (sym, word) => S.lessonFor(lessons, S.phonemeByAzure(phonemes, sym, word)?.id ?? '')?.id
  assert.equal(lessonOf('θ', 'think'), 'C2a')
  assert.equal(lessonOf('s', 'school'), 'E1')
  assert.equal(lessonOf('t', 'worked'), 'E4')
  assert.equal(lessonOf('v', 'very'), 'C1')
  assert.equal(lessonOf('ɪ', 'ship'), 'V1')
  assert.equal(lessonOf('i', 'sheep'), 'V1')
  assert.equal(lessonOf('æ', 'cat'), 'V3a')
  assert.equal(lessonOf('ɑ', 'hot'), 'V3b')
  assert.equal(lessonOf('ɹ', 'red'), undefined, 'R1 llega en la 5.11.x: la ficha existe, la lección aún no')
  assert.equal(S.phonemeByAzure(phonemes, 'ɹ', 'red')?.id, 'r')
  // Cada símbolo de SOUND_TIPS de la 5.10.1 tiene ficha.
  for (const sym of ['ɪ', 'i', 'iː', 'v', 'b', 'θ', 'ð', 'ʃ', 'tʃ', 'z', 'ə', 'ɚ', 'æ', 'ʌ', 'ʊ', 'u', 'uː', 'h', 'dʒ', 'j', 'ɹ', 'ɝ', 'ŋ'])
    assert.ok(S.phonemeByAzure(phonemes, sym, 'x'), sym)
})
