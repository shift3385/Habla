// 5.13 · Fase 10 · Línea de la semana del Inicio (UX-11): el próximo logro es el que menos te falta de los que no tienes
// (a igualdad, las rachas primero) y se dice en corto. Que la línea solo salga si cabe sin desplazar se comprueba en el
// navegador (docs/v5.13/evidencia/arnes-semana.mjs) en 390×844, 320×640, horizontal y con letra grande.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

test('Línea de la semana: el próximo logro y su texto', async () => {
  const { nextMilestone, nextMilestoneText, EMPTY_STATE, MILESTONES } = await loadFresh('/src/lib/milestones.ts')
  const s = (x) => ({ ...EMPTY_STATE, ...x })
  // Racha 4 sin logros: «3 días para tu racha de 7»? No: la de 3 ya se cumple (sin guardar aún) y se salta; la de 7 queda a 3,
  // pero la primera clase de 5 minutos queda a 1: gana la que menos falta.
  let n = nextMilestone(s({ streak: 4 }), ['streak-3'])
  assert.equal(n.def.id, 'class-5min')
  assert.equal(nextMilestoneText(n), 'Te falta 1 clase de más de 5 minutos para un logro')
  // Con esos ya conseguidos, la racha.
  const done = ['streak-3', 'class-5min', 'grammar-first', 'sound-first']
  n = nextMilestone(s({ streak: 4, reviews: 2 }), done)
  assert.deepEqual([n.def.id, n.left], ['streak-7', 3])
  assert.equal(nextMilestoneText(n), '3 días para tu racha de 7')
  assert.equal(nextMilestoneText(nextMilestone(s({ streak: 6 }), done)), '1 día para tu racha de 7')
  // A igualdad, la racha va primero (orden de la lista).
  n = nextMilestone(s({ streak: 6, reviews: 9 }), done)
  assert.equal(n.def.id, 'streak-7')
  // Los cumplidos sin guardar no cuentan como «te falta 0».
  n = nextMilestone(s({ streak: 9 }), done)
  assert.ok(n.left > 0)
  // Con todos: nada.
  assert.equal(nextMilestone(s({}), MILESTONES.map((m) => m.id)), null)
})
