// 5.13 · Fase 7 · «Mi familia»: el código `week` (tu semana) — ida y vuelta, sin nombre no vale, cifras en su rango, reto
// bien formado — y la tabla `family` en las copias. Guardar, el código más antiguo que no pisa al nuevo y el tablero se
// prueban en el navegador con dos teléfonos (docs/v5.13/evidencia/arnes-familia.mjs).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const raw = (obj) => `HABLA:1:${Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')}`

test('Mi familia: el código de tu semana', async () => {
  const { encodeCode, parseCode, weekToCode, weekMessage } = await loadFresh('/src/lib/shareCode.ts')
  const w = weekToCode({ from: 'Ana', week: '2026-11-2', minutes: 25.6, streak: 6, days: 4, challenge: { title: 'El pasado, sin fallos', progress: 9, target: 8, done: true } })
  assert.deepEqual(w, { type: 'week', from: 'Ana', week: '2026-11-2', minutes: 26, streak: 6, days: 4, challenge: { title: 'El pasado, sin fallos', progress: 8, target: 8, done: true } })
  assert.deepEqual(parseCode(encodeCode(w)).code, w)
  const sin = weekToCode({ from: 'Luis', week: '2026-11-2', minutes: 0, streak: 0, days: 0, challenge: null })
  assert.deepEqual(parseCode(encodeCode(sin)).code, sin)
  assert.match(weekMessage(w), /^Mi semana en Habla: 26 min hablando inglés, racha de 6 días y cumplí mi reto «El pasado, sin fallos»\.\n/)
  assert.match(weekMessage(sin), /racha de 0 días\.\n/)
  // Sin nombre no se puede ni crear ni leer (el tablero no sabría de quién es).
  assert.throws(() => encodeCode({ ...w, from: '' }))
  const base = { t: 'week', v: 1, from: 'Ana', week: '2026-11-2', minutes: 25, streak: 6, days: 4 }
  assert.equal(parseCode(raw(base)).ok, true)
  for (const [name, bad] of Object.entries({
    'sin nombre': { ...base, from: '' },
    'minutos de más': { ...base, minutes: 99999 },
    'días de más': { ...base, days: 8 },
    'racha negativa': { ...base, streak: -1 },
    'semana rara': { ...base, week: 'ayer' },
    'reto sin título': { ...base, challenge: { progress: 1, target: 8, done: false } },
    'reto sin done': { ...base, challenge: { title: 'x', progress: 1, target: 8 } },
    'reto con texto': { ...base, challenge: 'mucho' },
  })) {
    const r = parseCode(raw(bad))
    assert.equal(r.ok, false, name)
    assert.match(r.error, /no se cambió nada/, name)
  }
})

test('Mi familia: viaja en la copia (versión 5) y se valida', async () => {
  const { checkBackup, backupVersionFor, exportTables } = await loadFresh('/src/lib/backupCheck.ts')
  const profile = { id: 'me', levels: { overall: 'B1', grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'A2' }, startedAt: 1, name: 'Luis' }
  const base = { sessions: [], turns: [], mistakes: [], profile: [profile], lookups: [], cards: [], grammar: [], sounds: [], milestones: [], facts: [], challenges: [] }
  const family = [
    { id: 'ana', name: 'Ana', at: 5, week: { id: '2026-11-2', minutes: 25, streak: 6, days: 4, challenge: { title: 'Reto', progress: 4, target: 8, done: false } } },
    { id: 'mamá', name: 'Mamá', at: 6, practice: { situationId: 'pharmacy', at: 6, score: 70, goals: 3, total: 3 } },
  ]
  const tables = exportTables({ ...base, family })
  assert.equal(backupVersionFor(tables), 5)
  const back = checkBackup(JSON.parse(JSON.stringify({ format: 'habla-backup', version: 5, tables })))
  assert.equal(back.ok, true, back.error)
  assert.deepEqual(back.backup.tables.family, family)
  for (const bad of [{ ...family[0], name: 3 }, { ...family[0], week: { id: 'x', minutes: 'mucho' } }, { ...family[1], practice: { situationId: 'pharmacy' } }]) {
    assert.equal(checkBackup({ format: 'habla-backup', version: 5, tables: { ...base, family: [bad] } }).ok, false)
  }
})
