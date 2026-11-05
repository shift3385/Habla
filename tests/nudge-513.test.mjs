// 5.13 · Fase 6 · Aviso del reto a mitad de semana: cuándo (jueves o, si ya pasó, sábado, a la hora del recordatorio;
// nunca la semana siguiente) y qué dice; nada si está cumplido. Ajuste activado por defecto. Que la notificación llegue de
// verdad solo se puede ver en el teléfono (docs/pruebas/PENDIENTES.md).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const c = { title: 'El pasado, sin fallos', progress: 5, target: 8, unit: 'respuestas', done: false }

test('Aviso del reto: jueves, si no sábado, a la hora del recordatorio; nunca la semana siguiente', async () => {
  const { challengeNudgePlan } = await loadFresh('/src/lib/reminders.ts')
  const at = (d, h, m = 0) => new Date(2026, 10, d, h, m) // lunes 2 de noviembre de 2026
  const p = challengeNudgePlan(at(2, 10), '19:30', c)
  assert.deepEqual(p.at, at(5, 19, 30))
  assert.equal(p.body, 'Te faltan 3 respuestas para tu reto «El pasado, sin fallos». ¡Tú puedes!')
  // El jueves ya pasado (o a menos de 10 min): el sábado.
  assert.deepEqual(challengeNudgePlan(at(5, 20), '19:30', c).at, at(7, 19, 30))
  assert.deepEqual(challengeNudgePlan(at(5, 19, 25), '19:30', c).at, at(7, 19, 30))
  // Sábado por la noche o domingo: nada (el lunes hay reto nuevo).
  assert.equal(challengeNudgePlan(at(7, 21), '19:30', c), null)
  assert.equal(challengeNudgePlan(at(8, 9), '19:30', c), null)
  // Cumplido, sin reto o progreso ya en la meta: nada.
  assert.equal(challengeNudgePlan(at(2, 10), '19:30', { ...c, done: true }), null)
  assert.equal(challengeNudgePlan(at(2, 10), '19:30', { ...c, progress: 8 }), null)
  assert.equal(challengeNudgePlan(at(2, 10), '19:30', null), null)
  // Hora rara: las 19:00. Singular.
  assert.deepEqual(challengeNudgePlan(at(2, 10), 'tarde', c).at, at(5, 19, 0))
  assert.match(challengeNudgePlan(at(2, 10), '19:00', { ...c, progress: 7 }).body, /^Te falta 1 respuesta para/)
  assert.match(challengeNudgePlan(at(2, 10), '19:00', { ...c, unit: 'min', progress: 7 }).body, /^Te falta 1 min para/)
})

test('Aviso del reto: activado por defecto y con su propio aviso (no pisa el diario ni el del re-test)', () => {
  const settings = readFileSync(new URL('../src/lib/settings.ts', import.meta.url), 'utf8')
  assert.match(settings, /challengeNudge: boolean/)
  assert.match(settings.slice(settings.indexOf('const DEFAULTS')), /challengeNudge: true,/)
  const rem = readFileSync(new URL('../src/lib/reminders.ts', import.meta.url), 'utf8')
  assert.match(rem, /const CHALLENGE_ID = 3/)
  assert.match(rem, /const RETEST_ID = 2/)
  assert.match(rem, /DAILY_IDS = Array\.from\(\{ length: 30 \}, \(_, i\) => 10 \+ i\)/)
})
