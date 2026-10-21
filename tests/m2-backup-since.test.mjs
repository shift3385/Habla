// REV-11-D2-06 (D2): la marca `_since` de los logros (milestones.ts) no cuenta como contenido de la copia: una copia de la
// 5.11 sin logros ni Sonidos sigue siendo legible por la 5.10.1 (madre y amistades), y con logros reales es versión 3.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

/**
 * Reglas de la comprobación de copias de la 5.10.1 (git 307ecd7, src/lib/backupCheck.ts: `BACKUP_MAX_VERSION = 2`,
 * `BACKUP_TABLES` sin `sounds` ni `milestones`, y «tabla desconocida» → «versión más nueva»).
 */
const V5101_MAX = 2
const V5101_TABLES = ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards', 'grammar']
const readableBy5101 = (b) => b.version <= V5101_MAX && Object.keys(b.tables).every((k) => V5101_TABLES.includes(k))

const PROFILE = {
  id: 'me',
  levels: { overall: 'A2', grammar: 'A2', reading: 'A2', listening: 'A2', speaking: 'A2' },
  about: '',
  weaknesses: [],
  goal: '',
  startedAt: 1,
}
/** Lo que lee buildBackup de Dexie en una instalación de la 5.11 (todas las tablas de TABLES). */
const dump = (milestones, extra = {}) => ({
  sessions: [],
  turns: [],
  mistakes: [],
  profile: [PROFILE],
  lookups: [],
  cards: [],
  grammar: [],
  sounds: [],
  milestones,
  ...extra,
})
const build = (b, all) => {
  const tables = b.exportTables(all)
  return { format: b.BACKUP_FORMAT, version: b.backupVersionFor(tables), exportedAt: new Date(0).toISOString(), tables }
}

test('REV-11-D2-06: copia de la 5.11 sin logros (solo la marca `_since`) → sin tabla milestones y versión de la 5.10.1', async () => {
  const b = await loadFresh('/src/lib/backupCheck.ts')
  const m = await loadFresh('/src/lib/milestones.ts')
  assert.equal(b.MILESTONES_SINCE_ID, m.SINCE_ID, 'mismo id en los dos sitios')
  const copy = build(b, dump([{ id: m.SINCE_ID, at: 1000, celebratedAt: 1000 }]))
  assert.ok(!('milestones' in copy.tables), 'la marca sola no escribe la tabla')
  assert.ok(!('sounds' in copy.tables))
  assert.equal(copy.version, b.BACKUP_VERSION)
  assert.ok(readableBy5101(copy), 'la 5.10.1 la acepta')
  // Con Gramática, 2 (como en la 5.10.1), y también legible.
  const g = build(b, dump([{ id: m.SINCE_ID, at: 1000 }], { grammar: [{ id: 'x', lastAt: 1, correct: 0, attempts: 0, rounds: 0, mastered: false }] }))
  assert.equal(g.version, 2)
  assert.ok(readableBy5101(g))
  // backupVersionFor tampoco sube por la marca aunque le llegue la tabla tal cual.
  assert.equal(b.backupVersionFor(dump([{ id: m.SINCE_ID, at: 1 }])), b.BACKUP_VERSION)
  // Y la 5.11 la vuelve a leer.
  assert.equal(b.checkBackup(copy).ok, true)
})

test('REV-11-D2-06: con logros reales → versión 3, la tabla sin la marca, y la 5.11 la lee', async () => {
  const b = await loadFresh('/src/lib/backupCheck.ts')
  const copy = build(
    b,
    dump([
      { id: '_since', at: 1000, celebratedAt: 1000 },
      { id: 'streak-3', at: 2000, celebratedAt: 2000 },
    ]),
  )
  assert.equal(copy.version, 3)
  assert.deepEqual(copy.tables.milestones, [{ id: 'streak-3', at: 2000, celebratedAt: 2000 }])
  assert.equal(readableBy5101(copy), false, 'la 5.10.1 dice «versión más nueva», no «dañada»')
  const r = b.checkBackup(copy)
  assert.equal(r.ok, true)
})

test('REV-11-D2-06: restaurar una copia sin la marca sigue el caso «copia antigua»: lo ya conseguido, en silencio', async () => {
  const m = await loadFresh('/src/lib/milestones.ts')
  const DAY = 864e5
  const NOW = Date.UTC(2026, 9, 21)
  const map = new Map()
  const store = {
    all: async () => [...map.values()],
    addIfMissing: async (x) => void (map.has(x.id) || map.set(x.id, { ...x })),
    markCelebrated: async (id, at) => void (map.get(id).celebratedAt = at),
  }
  // Tabla vacía tras restaurar (la copia no traía logros), historial de hace un mes.
  const saved = await m.syncWith(store, { streak: 5, reviews: 0, grammarMastered: 0, soundsMastered: 0, longClasses: 0, bestPlanWeek: 0 }, NOW, NOW - 30 * DAY)
  assert.deepEqual(saved.map((x) => x.id), ['streak-3'])
  assert.equal(m.nextToCelebrate(saved), undefined)
  assert.ok(map.has(m.SINCE_ID), 'marca nueva')
})
