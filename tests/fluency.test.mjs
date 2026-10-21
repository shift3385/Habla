// AUD-ARQ-113 (regresión 5.10, A1): métricas de fluidez y nota 0–100 de una clase (fluency.ts).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let F
before(async () => {
  F = await loadFresh('/src/lib/fluency.ts')
})

const words = (n) => Array(n).fill('word').join(' ')
const said = (n, speechSeconds, extra = {}) => ({ sessionId: 1, role: 'user', text: words(n), speechSeconds, createdAt: 0, ...extra })
const teacher = { sessionId: 1, role: 'teacher', text: 'Great, tell me more about it.', createdAt: 0 }
const fix = { original: 'a', corrected: 'b', explanationEs: '', category: 'grammar', spanish: '' }

test('countWords: sin muletillas ni puntuación', () => {
  assert.equal(F.countWords('Um, I think... uh, it is good!'), 5) // I think it is good
  assert.equal(F.countWords("I don't know"), 3)
  assert.equal(F.countWords('   '), 0)
})

test('turnMetrics: velocidad solo con ≥ 1,5 s y ≥ 3 palabras; lo escrito no tiene velocidad', () => {
  assert.deepEqual(F.turnMetrics(said(20, 10, { pauses: [{}, {}] })), { words: 20, wpm: 120, pauses: 2 })
  assert.equal(F.turnMetrics(said(2, 10)).wpm, null)
  assert.equal(F.turnMetrics(said(10, 1)).wpm, null)
  assert.equal(F.turnMetrics(said(10, 10, { typed: true })).wpm, null)
  assert.equal(F.turnMetrics(said(10, undefined, { audioSeconds: 6 })).wpm, 100, 'sin speechSeconds usa audioSeconds')
})

test('sessionMetrics: sin respuestas tuyas no hay métricas', () => {
  assert.equal(F.sessionMetrics([]), null)
  assert.equal(F.sessionMetrics([teacher]), null)
})

test('sessionMetrics: una clase hablada con buena fluidez', () => {
  // 3 respuestas de 40 palabras en 20 s cada una → 120 ppm; sin pausas ni errores.
  const m = F.sessionMetrics([teacher, said(40, 20), teacher, said(40, 20), teacher, said(40, 20)])
  assert.equal(m.turns, 3)
  assert.equal(m.spokenTurns, 3)
  assert.equal(m.words, 120)
  assert.equal(m.wpm, 120)
  assert.equal(m.avgWords, 40)
  assert.equal(m.longestWords, 40)
  assert.equal(m.pausesPerMin, 0)
  assert.equal(m.corrections, 0)
  // speed (120-45)/80 = 0,9375 · 0,3 + length 1 · 0,3 + smooth 1 · 0,2 + accuracy 1 · 0,2 = 0,98125 → 98
  assert.equal(m.score, 98)
  assert.equal(m.level, 'B2+')
})

test('sessionMetrics: errores y pausas bajan la nota; las correcciones antiguas (correction) también cuentan', () => {
  const clean = F.sessionMetrics([said(20, 12), said(20, 12)])
  const bad = F.sessionMetrics([said(20, 12, { corrections: [fix, fix], pauses: [{}, {}, {}] }), said(20, 12, { correction: fix })])
  assert.equal(bad.corrections, 3)
  assert.ok(bad.score < clean.score, `${bad.score} < ${clean.score}`)
})

test('sessionMetrics: solo escrito → nota por longitud y precisión, sin velocidad', () => {
  const m = F.sessionMetrics([said(40, 0, { typed: true }), said(40, 0, { typed: true })])
  assert.equal(m.spokenTurns, 0)
  assert.equal(m.wpm, 0)
  assert.equal(m.score, 100, 'longitud y precisión al máximo')
})

test('scoreLevel: umbrales de la nota', () => {
  assert.deepEqual([0, 29, 30, 49, 50, 64, 65, 79, 80, 100].map(F.scoreLevel), ['A2', 'A2', 'B1', 'B1', 'B1+', 'B1+', 'B2', 'B2', 'B2+', 'B2+'])
})
