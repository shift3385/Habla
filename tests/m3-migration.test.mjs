// 5.11 · D3 · S-01 «Contrato del día 0»: Dexie v5 solo añade tablas (`sounds`, `milestones`), las copias antiguas se
// siguen aceptando, las nuevas solo suben de versión si llevan Sonidos o logros, y nunca llevan claves.
// La migración con datos reales (base v4 con datos → v5) se comprueba además en el navegador (docs/v5.11/dev/D3.md):
// Node no tiene IndexedDB y no se añaden dependencias (fake-indexeddb).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const now = 1_790_000_000_000
const fsrs = { due: now, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 1, last_review: null }

// Esquema de las versiones 1–4 tal como salió en la 5.10.1: no puede cambiar (Dexie compararía y rompería la base).
const OLD_STORES = {
  1: { sessions: '++id, startedAt, scenario', turns: '++id, sessionId, createdAt', mistakes: '++id, sessionId, createdAt, category', profile: 'id' },
  2: { lookups: '++id, createdAt' },
  3: { cards: '++id, due, &[source+sourceId]' },
  4: { grammar: 'id, lastAt' },
}

test('S-01: Dexie v5 solo añade `sounds` y `milestones`; las versiones 1–4 quedan idénticas y ninguna borra tablas', async () => {
  const { db, TABLES } = await loadFresh('/src/lib/db.ts')
  const versions = db._versions.map((v) => [v._cfg.version, v._cfg.storesSource])
  assert.deepEqual(
    versions.map(([n]) => n),
    [1, 2, 3, 4, 5],
  )
  for (const [n, stores] of versions) {
    if (n <= 4) assert.deepEqual(stores, OLD_STORES[n], `versión ${n} sin cambios`)
    for (const [t, def] of Object.entries(stores)) assert.notEqual(def, null, `la versión ${n} no borra la tabla ${t}`)
  }
  assert.deepEqual(versions.at(-1)[1], { sounds: 'id, lastAt', milestones: 'id, at' })
  assert.equal(db.verno, 5)
  assert.deepEqual([...TABLES], ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards', 'grammar', 'sounds', 'milestones'])
  // Las copias exportan y comprueban exactamente las mismas tablas que hay en la base.
  const { BACKUP_TABLES } = await loadFresh('/src/lib/backupCheck.ts')
  assert.deepEqual([...BACKUP_TABLES], [...TABLES])
})

/** Copia exportada por la 5.10.1 (versión 2: lleva Gramática), sin las tablas de la 5.11. */
const copy5101 = () => ({
  format: 'habla-backup',
  version: 2,
  exportedAt: '2026-10-20T10:00:00.000Z',
  tables: {
    sessions: [{ id: 1, scenario: 'daily', startedAt: now, endedAt: now + 60_000 }],
    turns: [{ id: 1, sessionId: 1, role: 'teacher', text: 'Hi!', createdAt: now }],
    mistakes: [],
    profile: [{ id: 'me', levels: { overall: 'B1', grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'A2' }, about: '', weaknesses: [], goal: '', startedAt: now, name: 'Ana' }],
    lookups: [],
    cards: [{ id: 1, source: 'grammar', sourceId: 99, promptEs: 'p', answerEn: 'a', hintEs: '', createdAt: now, due: now, fsrs }],
    grammar: [{ id: 'past-simple', lastAt: now, correct: 3, attempts: 4, rounds: 1, mastered: false }],
  },
})

const sound = (extra = {}) => ({
  id: 'ih',
  seenAt: now,
  lastAt: now,
  state: 'practiced',
  listen: { '2026-10-21': { ok: 7, total: 8 } },
  azure: { '2026-10-21': { ok: 4, total: 5 } },
  bestScore: 88,
  days: ['2026-10-21'],
  mastered: false,
  ...extra,
})

test('S-01: una copia de la 5.10.1 (v2, sin Sonidos ni logros) se importa con esas tablas vacías', async () => {
  const { checkBackup, BACKUP_MAX_VERSION } = await loadFresh('/src/lib/backupCheck.ts')
  assert.equal(BACKUP_MAX_VERSION, 3)
  const r = checkBackup(copy5101())
  assert.equal(r.ok, true, r.error)
  assert.deepEqual(r.backup.tables.sounds, [])
  assert.deepEqual(r.backup.tables.milestones, [])
  assert.equal(r.backup.tables.grammar.length, 1)
  // Y una muy antigua (v1, 4 tablas) también.
  const v41 = copy5101()
  v41.version = 1
  for (const t of ['lookups', 'cards', 'grammar']) delete v41.tables[t]
  assert.equal(checkBackup(v41).ok, true)
})

test('S-01: copia nueva — sin Sonidos ni logros no cambia (la lee la 5.10.1); con ellos es versión 3 y se vuelve a leer', async () => {
  const { checkBackup, backupVersionFor, exportTables } = await loadFresh('/src/lib/backupCheck.ts')
  const known5101 = ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards', 'grammar']
  // Base sin nada de la 5.11: las tablas nuevas vacías NO se escriben (la 5.10.1 rechaza cualquier tabla que no conoce).
  const plain = exportTables({ ...copy5101().tables, sounds: [], milestones: [] })
  assert.deepEqual(Object.keys(plain), known5101)
  assert.equal(backupVersionFor(plain), 2, 'con Gramática, 2 como en la 5.10.1')
  const noGrammar = exportTables({ ...copy5101().tables, cards: [], grammar: [], sounds: [], milestones: [] })
  assert.equal(backupVersionFor(noGrammar), 1, 'sin nada nuevo, 1: la lee hasta la 5.8')
  // Con progreso de Sonidos o con un logro: versión 3 (la 5.10.1, máx. 2, dice «versión más nueva»).
  for (const extra of [{ sounds: [sound()], milestones: [] }, { sounds: [], milestones: [{ id: 'streak-3', at: now }] }]) {
    const tables = exportTables({ ...copy5101().tables, ...extra })
    const version = backupVersionFor(tables)
    assert.equal(version, 3)
    const back = checkBackup(JSON.parse(JSON.stringify({ format: 'habla-backup', version, exportedAt: new Date(now).toISOString(), tables })))
    assert.equal(back.ok, true, back.error)
    assert.equal(back.backup.tables.sounds.length + back.backup.tables.milestones.length, 1)
  }
  // Fila de lección y sonido dominado «solo de oído».
  const rows = [sound({ id: 'lesson:V1', kind: 'lesson', state: 'practiced', completedAt: now, seconds: 300 }), sound({ mastered: true, masteredAt: now, earOnly: true, state: 'mastered' })]
  const r = checkBackup({ format: 'habla-backup', version: 3, tables: { ...copy5101().tables, sounds: rows } })
  assert.equal(r.ok, true, r.error)
})

test('S-01: filas de Sonidos o logros dañadas se rechazan; un estado desconocido es de una versión más nueva', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  const withRows = (sounds, milestones = []) => ({ format: 'habla-backup', version: 3, tables: { ...copy5101().tables, sounds, milestones } })
  const damaged = {
    'sin id': [[sound({ id: undefined })]],
    'id vacío': [[sound({ id: '' })]],
    'listen raro': [[sound({ listen: { '2026-10-21': { ok: 'siete', total: 8 } } })]],
    'azure no es mapa': [[sound({ azure: [1, 2] })]],
    'mastered no booleano': [[sound({ mastered: 'sí' })]],
    'estado numérico': [[sound({ state: 3 })]],
    'días con números': [[sound({ days: [20261021] })]],
    'id repetido': [[sound(), sound()]],
    'logro sin fecha': [[], [{ id: 'streak-3' }]],
    'logro repetido': [[], [{ id: 'streak-3', at: now }, { id: 'streak-3', at: now + 1 }]],
  }
  for (const [name, [s, m]] of Object.entries(damaged)) {
    const r = checkBackup(withRows(s, m))
    assert.equal(r.ok, false, name)
    assert.match(r.error, /dañado/, `${name}: ${r.error}`)
  }
  assert.match(checkBackup(withRows([sound({ state: 'legendary' })])).error, /más nueva/)
  assert.match(checkBackup(withRows([sound({ kind: 'drill' })])).error, /más nueva/)
})

test('S-01: la copia nunca lleva claves (no lee los ajustes) y los ajustes nuevos están en DEFAULTS', () => {
  const backup = src('src/lib/backup.ts')
  assert.doesNotMatch(backup, /from '\.\/settings'|@capacitor\/preferences|geminiKey|azureKey|azureClientSecret/)
  assert.match(backup, /exportTables\(all\)/, 'buildBackup() pasa por exportTables')
  const settings = src('src/lib/settings.ts')
  const defaults = settings.slice(settings.indexOf('const DEFAULTS'))
  assert.match(settings, /soundsIntroSeen: boolean/)
  assert.match(settings, /reviewAutoGrade: boolean/)
  assert.match(defaults, /soundsIntroSeen: false,/)
  assert.match(defaults, /reviewAutoGrade: false,/)
})
