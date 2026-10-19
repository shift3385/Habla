// v5.10 (punto 4): evaluación al terminar el Repaso. Lógica pura de src/lib/reviewSummary.ts.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const a = (cardId, outcome, extra = {}) => ({ cardId, source: 'mistake', promptEs: `es ${cardId}`, answerEn: `en ${cardId}`, outcome, ...extra })

test('Precisión: correcto = 1, casi = 0,5, aún no y no lo sé = 0; sin intentos, 0', async () => {
  const { reviewScore } = await loadFresh('/src/lib/reviewSummary.ts')
  assert.equal(reviewScore([]), 0)
  assert.equal(reviewScore([a(1, 'correct'), a(2, 'almost'), a(3, 'wrong'), a(4, 'unknown')]), 38) // 1,5 / 4
  assert.equal(reviewScore([a(1, 'correct'), a(2, 'correct')]), 100)
  assert.equal(reviewScore([a(1, 'almost')]), 50)
})

test('Recuento, media de pronunciación (solo las que llegaron) y segundos', async () => {
  const { summarizeReview } = await loadFresh('/src/lib/reviewSummary.ts')
  const s = summarizeReview([a(1, 'correct', { pron: 90 }), a(2, 'almost', { pron: 70 }), a(3, 'wrong', { pron: null }), a(4, 'unknown')], 42.4)
  assert.deepEqual([s.total, s.correct, s.almost, s.wrong, s.unknown], [4, 1, 1, 1, 1])
  assert.equal(s.pronAvg, 80)
  assert.equal(s.pronCount, 2)
  assert.equal(s.spokenSeconds, 42)
  assert.equal(summarizeReview([a(1, 'correct')]).pronAvg, null)
})

test('Lo que más costó: agrupa por tarjeta («Otra vez»), primero «No lo sé», sin las correctas, máx. 5', async () => {
  const { hardestCards } = await loadFresh('/src/lib/reviewSummary.ts')
  const h = hardestCards([a(1, 'almost'), a(2, 'correct'), a(3, 'wrong'), a(4, 'unknown'), a(3, 'correct')])
  assert.deepEqual(h.map((c) => c.cardId), [4, 3, 1])
  assert.equal(h[1].misses, 1)
  const many = hardestCards([1, 2, 3, 4, 5, 6, 7].map((n) => a(n, 'wrong')))
  assert.equal(many.length, 5)
})

test('Feedback: el título y el consejo cambian con la precisión y con lo que falló', async () => {
  const { summarizeReview } = await loadFresh('/src/lib/reviewSummary.ts')
  const top = summarizeReview([a(1, 'correct'), a(2, 'correct'), a(3, 'correct')])
  assert.equal(top.title, '¡Repaso redondo!')
  assert.equal(top.mood, 'happy')
  assert.equal(top.feedback.length, 1)

  const low = summarizeReview([a(1, 'unknown'), a(2, 'unknown'), a(3, 'wrong')])
  assert.match(low.title, /costó/)
  assert.ok(low.feedback.some((f) => /intenta decir algo/.test(f)))

  const almost = summarizeReview([a(1, 'almost'), a(2, 'almost'), a(3, 'correct')])
  assert.ok(almost.feedback.some((f) => /Casi/.test(f)))

  const grammar = summarizeReview([a(1, 'wrong', { source: 'grammar' }), a(2, 'wrong', { source: 'grammar' }), a(3, 'correct')])
  assert.ok(grammar.feedback.some((f) => /Gramática/.test(f)))

  const pron = summarizeReview([a(1, 'correct', { pron: 50 }), a(2, 'wrong', { pron: 40 })])
  assert.ok(pron.feedback.some((f) => /pronunciación \(45/.test(f)))
})

test('Saliste a mitad: el feedback dice cuántas quedaron', async () => {
  const { summarizeReview } = await loadFresh('/src/lib/reviewSummary.ts')
  assert.ok(summarizeReview([a(1, 'correct')], 0, 3).feedback.some((f) => /quedaron 3 frases/.test(f)))
  assert.ok(summarizeReview([a(1, 'correct')], 0, 1).feedback.some((f) => /quedó 1 frase/.test(f)))
})
