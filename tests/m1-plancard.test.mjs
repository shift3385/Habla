// 5.11 · D1 · M-08 «Error del plan con la mascota» (P-08 de A5): lo que dice la mascota y el tema que propone.
// Lógica pura de mascotTips.ts (PlanCard la usa tal cual).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let T
before(async () => {
  T = await loadFresh('/src/lib/mascotTips.ts')
})

test('M-08: con alternativa, la mascota propone charlar del tema (o de lo que quieras con «Sorpréndeme»)', () => {
  assert.equal(T.planErrorMessage('week', { title: 'Comida' }, true), 'Hoy no he podido preparar tu lección; mientras, ¿charlamos de «Comida»?')
  assert.equal(T.planErrorMessage('week', null, true), 'Hoy no he podido preparar tu lección; mientras, ¿charlamos de lo que quieras?')
  assert.match(T.planErrorMessage('create', { title: 'Deportes' }, true), /^No he podido preparar tu plan de 12 semanas; mientras, ¿charlamos de «Deportes»\?$/)
})

test('M-08: sin alternativa (Home sin I-4) solo invita a reintentar, sin texto técnico', () => {
  const m = T.planErrorMessage('week', { title: 'Comida' }, false)
  assert.equal(m, 'Hoy no he podido preparar tu lección. ¿Lo intentamos otra vez?')
  for (const op of ['week', 'create']) {
    for (const alt of [null, { title: 'X' }]) {
      for (const has of [true, false]) assert.doesNotMatch(T.planErrorMessage(op, alt, has), /Gemini|error|HTTP|\d{3}|clave|API/i)
    }
  }
})

test('M-08: el tema propuesto es uno de tus favoritos, cambia de un día a otro y es el mismo durante el día', () => {
  const favs = ['a', 'b', 'c']
  const at = (d, h) => new Date(2026, 9, d, h)
  assert.equal(T.pickOfTheDay(favs, at(21, 1)), T.pickOfTheDay(favs, at(21, 23)), 'mismo día, mismo tema')
  const week = [21, 22, 23, 24, 25, 26].map((d) => T.pickOfTheDay(favs, at(d, 9)))
  for (let k = 1; k < week.length; k++) assert.notEqual(week[k], week[k - 1])
  assert.deepEqual(new Set(week), new Set(favs))
  assert.equal(T.pickOfTheDay([], at(21, 9)), undefined, 'sin favoritos → «Sorpréndeme»')
})
