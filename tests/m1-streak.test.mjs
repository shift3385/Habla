// 5.11 · D1 · M-04 «Comodín de racha»: un día sin práctica por semana natural (lunes–domingo) no rompe la racha.
// Lógica pura de stats.ts (`computeStreak`) con fechas fijas. Octubre de 2026: el lunes 19 empieza semana.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let S
before(async () => {
  S = await loadFresh('/src/lib/stats.ts')
})

/** Día de octubre de 2026 (a mediodía, como un `Date.now()` cualquiera). */
const oct = (d) => new Date(2026, 9, d, 12, 0, 0)
const key = (d) => S.dayKey(oct(d).getTime())
/** Conjunto de días practicados a partir de números de octubre (y negativos = septiembre: -30 es el 30 de sept.). */
const days = (...list) => new Set(list.map((d) => (d > 0 ? key(d) : S.dayKey(new Date(2026, 8, -d, 12).getTime()))))
const run = (now, ...list) => S.computeStreak(days(...list), oct(now))

/** La racha de la 5.10.1, tal cual, para la regresión. */
function legacy(set, now) {
  const cursor = new Date(now)
  if (!set.has(S.dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (set.has(S.dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

test('M-04: sin historial, racha 0 y sin descansos', () => {
  assert.deepEqual(S.computeStreak(new Set(), oct(21)), { streak: 0, restDays: [] })
})

test('M-04: descanso un lunes (19) entre el domingo y el martes: la racha sigue y el lunes no suma', () => {
  // Hoy miércoles 21; practicaste 16, 17, 18 (dom), 20 (mar) y 21. El lunes 19, descanso.
  const r = run(21, 16, 17, 18, 20, 21)
  assert.equal(r.streak, 5)
  assert.deepEqual(r.restDays, [key(19)])
})

test('M-04: descanso un domingo (18): cuenta en la semana del 12 al 18', () => {
  const r = run(20, 15, 16, 17, 19, 20)
  assert.equal(r.streak, 5)
  assert.deepEqual(r.restDays, [key(18)])
})

test('M-04: dos descansos en semanas distintas (14 y 21) no rompen la racha', () => {
  // Hoy jueves 22. Semana 12–18: descanso el miércoles 14. Semana 19–25: descanso el miércoles 21.
  const r = run(22, 12, 13, 15, 16, 17, 18, 19, 20, 22)
  assert.equal(r.streak, 9)
  assert.deepEqual(r.restDays, [key(21), key(14)])
})

test('M-04: dos descansos en la misma semana rompen la racha en el segundo (el más antiguo)', () => {
  // Semana 19–25: faltas el 20 y el 23. Hoy sábado 24.
  const r = run(24, 17, 18, 19, 21, 22, 24)
  assert.equal(r.streak, 3, '24, 22 y 21; el 20 ya no cabe: es el segundo descanso de la semana')
  assert.deepEqual(r.restDays, [key(23)])
})

test('M-04: dos días seguidos sin práctica a caballo entre semanas (dom 18 y lun 19) rompen la racha', () => {
  const r = run(21, 14, 15, 16, 17, 20, 21)
  assert.equal(r.streak, 2)
  assert.deepEqual(r.restDays, [])
})

test('M-04: dos días seguidos sin práctica dentro de la semana también la rompen', () => {
  const r = run(23, 19, 20, 23)
  assert.equal(r.streak, 1)
  assert.deepEqual(r.restDays, [])
})

test('M-04: hoy sin practicar se trata como hasta ahora (cuenta hasta ayer)', () => {
  const r = run(22, 19, 20, 21)
  assert.equal(r.streak, 3)
  assert.deepEqual(r.restDays, [])
})

test('M-04: hoy sin practicar y ayer de descanso: la racha sigue a salvo hasta mañana', () => {
  // Hoy jueves 22 (aún sin hablar); ayer 21, descanso; antes, 18 a 20.
  const r = run(22, 18, 19, 20)
  assert.equal(r.streak, 3)
  assert.deepEqual(r.restDays, [key(21)])
  // Si mañana tampoco hablas, son dos seguidos (21 y 22): se rompe.
  assert.equal(run(23, 18, 19, 20).streak, 0)
})

test('M-04: el comodín no se usa si antes del hueco no había práctica (no inventa racha)', () => {
  const r = run(21, 21)
  assert.equal(r.streak, 1)
  assert.deepEqual(r.restDays, [])
})

test('M-04: cruza el cambio de mes (descanso el 30 de septiembre)', () => {
  // Semana 28 sept – 4 oct: falta el miércoles 30 de septiembre.
  const r = run(2, -28, -29, 1, 2)
  assert.equal(r.streak, 4)
  assert.deepEqual(r.restDays, [S.dayKey(new Date(2026, 8, 30, 12).getTime())])
})

test('M-04 (regresión): sin descansos usados da exactamente lo mismo que la racha de la 5.10.1', () => {
  // 300 historiales al azar (semilla fija) en los 60 días anteriores al 21 de octubre.
  let seed = 7
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  let compared = 0
  for (let n = 0; n < 300; n++) {
    const set = new Set()
    const p = 0.5 + rnd() * 0.5
    for (let d = 0; d < 60; d++) if (rnd() < p) set.add(S.dayKey(new Date(2026, 9, 21 - d, 12).getTime()))
    const now = oct(21)
    const r = S.computeStreak(set, now)
    if (r.restDays.length === 0) {
      assert.equal(r.streak, legacy(set, now))
      compared++
    } else {
      assert.ok(r.streak >= legacy(set, now), 'con comodín nunca da menos que antes')
    }
  }
  assert.ok(compared > 30, `se compararon ${compared} historiales sin descanso`)
})

test('REV-11-D1-02: la semana va de lunes a domingo: descanso el domingo 18 y el martes 20 no la rompen', async () => {
  // Domingo 18 (semana 12–18) y martes 20 (semana 19–25). Con semana de domingo a sábado caerían en la misma (18–24).
  const r = run(22, 15, 16, 17, 19, 21, 22)
  assert.equal(r.streak, 6)
  assert.deepEqual(r.restDays, [key(20), key(18)])
  // Y el sábado 17 + el lunes 19 (separados por el domingo practicado) también caen en semanas distintas.
  const r2 = run(21, 14, 15, 16, 18, 20, 21)
  assert.equal(r2.streak, 6)
  assert.deepEqual(r2.restDays, [key(19), key(17)])
})

test('REV-11-D1-03: restInfo da el comodín de ESTA semana y si fue ayer', async () => {
  // Hoy jueves 22: descanso ayer (21) → de esta semana y ayer.
  assert.deepEqual(S.restInfo([key(21)], oct(22)), { restDay: key(21), restedYesterday: true })
  // Descanso el lunes 19 (esta semana), no ayer.
  assert.deepEqual(S.restInfo([key(19)], oct(22)), { restDay: key(19), restedYesterday: false })
  // Descanso de la semana pasada (miércoles 14): no es de esta semana ni de ayer.
  assert.deepEqual(S.restInfo([key(14)], oct(22)), { restedYesterday: false })
  // Lunes 19 con descanso el domingo 18: fue ayer, pero de la semana pasada (esta semana aún tiene su comodín).
  assert.deepEqual(S.restInfo([key(18)], oct(19)), { restedYesterday: true })
  // Dos comodines (esta semana y la anterior): el de esta semana.
  assert.deepEqual(S.restInfo([key(21), key(14)], oct(22)), { restDay: key(21), restedYesterday: true })
  assert.deepEqual(S.restInfo([], oct(22)), { restedYesterday: false })
  // Con la racha real: hoy 22 sin practicar, ayer descanso.
  const r = run(22, 18, 19, 20)
  assert.deepEqual(S.restInfo(r.restDays, oct(22)), { restDay: key(21), restedYesterday: true })
})
