// 5.13 · Fase 1 · P-14 «Reto de la semana»: tipos cerrados y cifra recortada, progreso de cada tipo medido con datos
// de ejemplo (funciones puras, sin IA), reto de respaldo sin IA, semana nueva = reto nuevo, Dexie v7 solo aditiva y
// copias con y sin la tabla. Crear el reto al abrir el Inicio, la barra y la celebración se prueban en el navegador
// (docs/v5.13/evidencia/arnes-p14.mjs): Node no tiene IndexedDB y no se añaden dependencias.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const FAKE_KEY = 'clave-ficticia-de-prueba'
const MODELS = { primary: 'modelo-falso', timeoutMs: 5000 }

function fakeGemini(payload, { fail = false } = {}) {
  const bodies = []
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')))
    if (fail) return new Response('{"error":{"code":400,"message":"Bad"}}', { status: 400, headers: { 'content-type': 'application/json' } })
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  return bodies
}
const schemaOf = (body) => body.generationConfig?.responseJsonSchema ?? body.generationConfig?.responseSchema
const promptOf = (body) => body.contents.map((c) => c.parts.map((p) => p.text ?? '').join(' ')).join('\n')

// Semana del lunes 2 al domingo 8 de noviembre de 2026 (hora local).
const MON = new Date(2026, 10, 2).getTime()
const H = 3600e3
const D = 24 * H
const WEEK = { start: MON, end: MON + 7 * D }
const LONG = 'Yesterday I went to the market with my sister and we bought fresh bread' // 14 palabras
const corr = (category) => ({ original: 'a', corrected: 'b', explanationEs: '', category, spanish: '' })

test('P-14: tipos cerrados y cifra recortada al rango de cada tipo', async () => {
  const { clampTarget, TARGET_RANGE, CHALLENGE_KINDS } = await loadFresh('/src/lib/challenge.ts')
  assert.deepEqual([...CHALLENGE_KINDS], ['minutes', 'classes', 'clean', 'review'])
  for (const k of CHALLENGE_KINDS) {
    const [lo, hi] = TARGET_RANGE[k]
    assert.ok(lo >= 1 && hi > lo, k)
    assert.equal(clampTarget(k, 0), lo)
    assert.equal(clampTarget(k, -50), lo)
    assert.equal(clampTarget(k, 1e9), hi)
    assert.equal(clampTarget(k, 'ocho'), lo)
    assert.equal(clampTarget(k, Number.NaN), lo)
    assert.equal(clampTarget(k, lo + 1.4), lo + 1)
  }
  assert.equal(clampTarget('clean', 8), 8)
})

test('P-14: progreso de cada tipo con datos de ejemplo (sin IA)', async () => {
  const { challengeProgress } = await loadFresh('/src/lib/challenge.ts')
  // minutes: minutos enteros.
  assert.equal(challengeProgress({ kind: 'minutes' }, { ...WEEK, minutes: 23.9 }), 23)
  assert.equal(challengeProgress({ kind: 'minutes' }, { ...WEEK }), 0)

  // classes: terminadas en la semana con ≥ 3 respuestas; con práctica, solo esa.
  const s = (id, scenario, endedAt, turns) => ({ id, scenario, startedAt: endedAt - 600e3, endedAt, metrics: { turns } })
  const sessions = [
    s(1, 'free', MON + 10 * H, 5),
    s(2, 'mission', MON + 2 * D, 3),
    s(3, 'mission', MON + 3 * D, 2), // pocas respuestas
    s(4, 'story', MON - 2 * H, 6), // la semana anterior
    s(5, 'story', MON + 7 * D + H, 6), // la siguiente
    { id: 6, scenario: 'free', startedAt: MON + D }, // sin terminar (sin métricas)
    { id: 7, scenario: 'debate', startedAt: MON - 5 * 60e3, endedAt: MON + 20 * 60e3, metrics: { turns: 4 } }, // empezó el domingo, acabó el lunes
  ]
  assert.equal(challengeProgress({ kind: 'classes' }, { ...WEEK, sessions }), 3)
  assert.equal(challengeProgress({ kind: 'classes', scenario: 'mission' }, { ...WEEK, sessions }), 1)

  // clean: respuestas habladas de ≥ 10 palabras sin errores DE ESA categoría.
  const t = (id, text, extra = {}) => ({ id, sessionId: 1, role: 'user', text, createdAt: MON + id * H, ...extra })
  const turns = [
    t(1, LONG), // ✓
    t(2, LONG, { corrections: [corr('article')] }), // ✓ (otra categoría)
    t(3, LONG, { corrections: [corr('article'), corr('tense')] }), // ✗ falló el pasado
    t(4, LONG, { correction: corr('tense') }), // ✗ clase antigua (una sola corrección)
    t(5, 'I went to the market', {}), // ✗ corta
    t(6, LONG, { typed: true }), // ✗ escrita
    { id: 7, sessionId: 1, role: 'teacher', text: LONG, createdAt: MON + 7 * H }, // ✗ del profe
    t(8, LONG, { createdAt: MON - H }), // ✗ semana anterior
    t(9, 'Um uh er I I went to the to the market with my my sister', {}), // las muletillas no cuentan: 11 palabras ✓
  ]
  assert.equal(challengeProgress({ kind: 'clean', category: 'tense' }, { ...WEEK, turns }), 3)
  assert.equal(challengeProgress({ kind: 'clean', category: 'article' }, { ...WEEK, turns }), 3)

  // review: frases distintas repasadas en la semana.
  const card = (id, last) => ({ id, fsrs: { last_review: last } })
  const cards = [card(1, MON + H), card(2, MON + 6 * D), card(3, MON - H), card(4, null), card(5, MON + 7 * D), { id: 6 }]
  assert.equal(challengeProgress({ kind: 'review' }, { ...WEEK, cards }), 2)
})

test('P-14: reto de respaldo sin IA — tu error más frecuente, o minutos con tu meta × 5', async () => {
  const { fallbackChallenge, localGoal } = await loadFresh('/src/lib/challenge.ts')
  const a = fallbackChallenge('2026-11-2', { dailyGoal: 5, topCategories: ['tense', 'article'] }, MON)
  assert.equal(a.kind, 'clean')
  assert.equal(a.category, 'tense')
  assert.equal(a.target, 8)
  assert.equal(a.source, 'local')
  assert.equal(a.id, '2026-11-2')
  assert.match(a.goalEs, /^Di 8 respuestas largas .* sin fallar los tiempos verbales\.$/)
  assert.match(a.titleEs, /Sin fallar los tiempos verbales/)
  // 'other' no se puede medir: se salta.
  assert.equal(fallbackChallenge('x', { dailyGoal: 5, topCategories: ['other', 'preposition'] }).category, 'preposition')
  const b = fallbackChallenge('2026-11-2', { dailyGoal: 5, topCategories: [] })
  assert.deepEqual([b.kind, b.target], ['minutes', 25])
  assert.equal(b.goalEs, 'Habla 25 minutos en inglés esta semana.')
  // La meta diaria enorme también se recorta.
  assert.equal(fallbackChallenge('x', { dailyGoal: 500, topCategories: [] }).target, 300)
  assert.equal(localGoal({ kind: 'classes', target: 1, scenario: 'mission' }), 'Termina 1 clase de «Situaciones» de al menos 3 respuestas.')
  assert.equal(localGoal({ kind: 'review', target: 20 }), 'Repasa 20 frases en el Repaso.')
})

test('P-14: el reto de la IA se comprueba — tipo, cifra, categoría, práctica y meta', async () => {
  const { parseChallenge, fallbackChallenge } = await loadFresh('/src/lib/challenge.ts')
  const base = fallbackChallenge('2026-11-2', { dailyGoal: 5, topCategories: ['article'] }, MON)
  // Tipo desconocido o sin tipo: el de respaldo.
  assert.equal(parseChallenge({ kind: 'jump', target: 5 }, base), base)
  assert.equal(parseChallenge({}, base), base)
  // Cifra recortada; la meta de la IA con otra cifra se cambia por la de la app.
  const r = parseChallenge({ kind: 'review', target: 9999, title_es: 'Repasa a tope', goal_es: 'Repasa 9999 frases.' }, base)
  assert.equal(r.target, 120)
  assert.equal(r.goalEs, 'Repasa 120 frases en el Repaso.')
  assert.equal(r.titleEs, 'Repasa a tope')
  assert.equal(r.source, 'ai')
  assert.equal(r.category, undefined)
  // Con la misma cifra se queda la de la IA (en una línea y con tope).
  const ok = parseChallenge({ kind: 'clean', target: 8, category: 'tense', title_es: 'Pasado\nsin fallos', goal_es: 'Di 8 respuestas largas sin fallar el pasado.' }, base)
  assert.deepEqual([ok.kind, ok.target, ok.category, ok.titleEs, ok.goalEs], ['clean', 8, 'tense', 'Pasado sin fallos', 'Di 8 respuestas largas sin fallar el pasado.'])
  // «18» no vale por «8».
  assert.notEqual(parseChallenge({ kind: 'clean', target: 8, category: 'tense', goal_es: 'Di 18 respuestas.' }, base).goalEs, 'Di 18 respuestas.')
  // clean con categoría inválida: tu más frecuente; sin ninguna, el de respaldo.
  assert.equal(parseChallenge({ kind: 'clean', target: 6, category: 'none' }, base, ['preposition']).category, 'preposition')
  assert.equal(parseChallenge({ kind: 'clean', target: 6, category: 'other' }, base, []), base)
  // La categoría solo va en clean; la práctica solo en classes y si es una conocida.
  assert.equal(parseChallenge({ kind: 'minutes', target: 40, category: 'tense', practice: 'mission' }, base).category, undefined)
  assert.equal(parseChallenge({ kind: 'minutes', target: 40, practice: 'mission' }, base).scenario, undefined)
  assert.equal(parseChallenge({ kind: 'classes', target: 3, practice: 'mission' }, base).scenario, 'mission')
  assert.equal(parseChallenge({ kind: 'classes', target: 3, practice: 'hackeo' }, base).scenario, undefined)
  // Título vacío o no texto: el de la app.
  assert.equal(parseChallenge({ kind: 'minutes', target: 30, title_es: 42 }, base).titleEs, 'Semana de charla')
})

test('P-14: generación con el modelo rápido — esquema cerrado, contexto sin datos personales y respaldo si falla', async () => {
  const { generateChallenge, fallbackChallenge, CHALLENGE_SCHEMA } = await loadFresh('/src/lib/challenge.ts')
  const ctx = { level: 'A2', dailyGoal: 5, topCategories: ['tense'], frequent: ['verb tenses (past simple, present perfect, future)'], last: { kind: 'minutes', target: 25, progress: 12 } }
  const base = fallbackChallenge('2026-11-2', ctx, MON)
  const bodies = fakeGemini({ title_es: 'El pasado, sin fallos', goal_es: 'Di 10 respuestas largas sin fallar el pasado.', kind: 'clean', target: 10, category: 'tense', practice: 'any' })
  const c = await generateChallenge(FAKE_KEY, MODELS, ctx, base)
  assert.deepEqual([c.kind, c.target, c.category, c.source], ['clean', 10, 'tense', 'ai'])
  assert.equal(bodies.length, 1)
  const schema = schemaOf(bodies[0])
  assert.deepEqual(schema.properties.kind.enum, ['minutes', 'classes', 'clean', 'review'])
  assert.ok(!schema.properties.category.enum.includes('other'))
  assert.deepEqual(CHALLENGE_SCHEMA.required.sort(), ['category', 'goal_es', 'kind', 'practice', 'target', 'title_es'])
  const prompt = promptOf(bodies[0])
  assert.match(prompt, /speaking level A2/)
  assert.match(prompt, /verb tenses/)
  assert.match(prompt, /reached 12 of 25/)
  assert.match(prompt, /DIFFERENT kind/)
  // Sin conexión o con error: el de respaldo, sin lanzar.
  fakeGemini({}, { fail: true })
  assert.equal(await generateChallenge(FAKE_KEY, MODELS, ctx, base), base)
})

test('P-14: semanas — lunes a domingo; semana nueva = reto nuevo; historial por fecha, no por texto', async () => {
  const { weekBounds, boundsOfKey, sortWeeks, weekLabel, nextChallengeToCelebrate } = await loadFresh('/src/lib/challenge.ts')
  const { weekKey } = await loadFresh('/src/lib/stats.ts')
  const sunday = new Date(2026, 10, 8, 23, 59)
  const monday = new Date(2026, 10, 9, 0, 0)
  assert.equal(weekKey(new Date(2026, 10, 2, 0, 0)), '2026-11-2')
  assert.equal(weekKey(sunday), '2026-11-2')
  assert.equal(weekKey(monday), '2026-11-9')
  assert.notEqual(weekKey(sunday), weekKey(monday))
  assert.deepEqual(weekBounds(sunday), { start: MON, end: monday.getTime() })
  assert.deepEqual(boundsOfKey('2026-11-2'), { start: MON, end: monday.getTime() })
  // Cambio de mes.
  assert.equal(weekKey(new Date(2026, 10, 1)), '2026-10-26')
  assert.equal(weekLabel('2026-10-26'), 'del 26 de octubre al 1 de noviembre')
  assert.equal(weekLabel('2026-11-2'), 'del 2 al 8 de noviembre')
  // «2026-11-16» es más reciente que «2026-11-2» aunque como texto vaya antes.
  assert.deepEqual(
    sortWeeks([{ id: '2026-11-2' }, { id: '2026-11-16' }, { id: '2026-10-26' }, { id: '2026-11-9' }]).map((x) => x.id),
    ['2026-11-16', '2026-11-9', '2026-11-2', '2026-10-26'],
  )
  // Se celebra el cumplido sin celebrar más reciente; los celebrados, no.
  const all = [
    { id: 'a', doneAt: 5, celebratedAt: 6 },
    { id: 'b', doneAt: 9 },
    { id: 'c', doneAt: 7 },
    { id: 'd' },
  ]
  assert.equal(nextChallengeToCelebrate(all).id, 'b')
  assert.equal(nextChallengeToCelebrate([{ id: 'd' }, { id: 'a', doneAt: 1, celebratedAt: 2 }]), undefined)
})

test('P-14: el globo de la mascota — «Reto de la semana: 4 de 8» y, cumplido, otro texto', async () => {
  const { buildTips, newTipRound } = await loadFresh('/src/lib/mascotTips.ts')
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  const base = { minutesToday: 0, goal: 5, streak: 0, dueCards: 0, lessonDone: false, liveTopics: false, retestDays: null }
  assert.equal(buildTips(base).find((t) => t.id === 'challenge'), undefined)
  for (let seed = 0; seed < 1; seed += 0.2) {
    newTipRound(seed)
    const tip = buildTips({ ...base, challenge: { title: 'El pasado, sin fallos', progress: 4, target: 8, unit: 'respuestas' } }).find((t) => t.id === 'challenge')
    assert.match(tip.text, /4 de 8 respuestas/)
    assert.match(tip.text, /El pasado, sin fallos/)
    assert.equal(tip.action, 'challenge')
    const done = buildTips({ ...base, challenge: { title: 'El pasado, sin fallos', progress: 9, target: 8, unit: 'respuestas' } }).find((t) => t.id === 'challenge')
    assert.match(done.text, /cumpl/i)
    assert.doesNotMatch(done.text, /9 de 8/)
  }
})

test('P-14: Dexie v7 solo añade `challenges` (y `family`, Fase 7); las copias la llevan si hay retos (versión 5) y valen sin ella', async () => {
  const { db, TABLES } = await loadFresh('/src/lib/db.ts')
  const versions = db._versions.map((v) => [v._cfg.version, v._cfg.storesSource])
  assert.deepEqual(versions.at(-1), [7, { challenges: 'id, createdAt', family: 'id, at' }])
  assert.equal(db.verno, 7)
  for (const [n, stores] of versions) for (const [t, def] of Object.entries(stores)) assert.notEqual(def, null, `la versión ${n} no borra ${t}`)
  assert.deepEqual(TABLES.slice(-2), ['challenges', 'family'])

  const { checkBackup, backupVersionFor, exportTables, BACKUP_TABLES, BACKUP_MAX_VERSION } = await loadFresh('/src/lib/backupCheck.ts')
  assert.equal(BACKUP_MAX_VERSION, 5)
  assert.deepEqual([...BACKUP_TABLES], [...TABLES])
  const profile = { id: 'me', levels: { overall: 'B1', grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'A2' }, startedAt: MON, name: 'Ana' }
  const base = { sessions: [], turns: [], mistakes: [], profile: [profile], lookups: [], cards: [], grammar: [], sounds: [], milestones: [], facts: [] }
  // Sin retos: la tabla no se escribe (la 5.12 rechaza tablas que no conoce) y la versión es la de antes.
  const empty = exportTables({ ...base, challenges: [], family: [] })
  assert.ok(!('challenges' in empty) && !('family' in empty))
  assert.equal(backupVersionFor(empty), 1)
  // Con retos: versión 5, y se vuelve a leer entera.
  const challenges = [
    { id: '2026-11-2', kind: 'clean', target: 8, category: 'tense', titleEs: 'El pasado', goalEs: 'Di 8…', createdAt: MON, source: 'ai', progress: 8, final: true, doneAt: MON + D, celebratedAt: MON + D },
    { id: '2026-11-9', kind: 'minutes', target: 25, titleEs: 'Semana de charla', goalEs: 'Habla 25 minutos…', createdAt: MON + 7 * D, source: 'local' },
  ]
  const full = exportTables({ ...base, challenges })
  assert.equal(backupVersionFor(full), 5)
  const back = checkBackup(JSON.parse(JSON.stringify({ format: 'habla-backup', version: 5, tables: full })))
  assert.equal(back.ok, true, back.error)
  assert.deepEqual(back.backup.tables.challenges, challenges)
  // Una copia de la 5.12 (v4, sin la tabla) vale: la tabla queda vacía.
  const old = checkBackup({ format: 'habla-backup', version: 4, tables: { ...base, facts: [{ id: 1, text: 'Tiene un huerto.', createdAt: MON }] } })
  assert.equal(old.ok, true, old.error)
  assert.deepEqual(old.backup.tables.challenges, [])
  // Un tipo de reto desconocido es de una app más nueva, no un archivo dañado.
  assert.match(checkBackup({ format: 'habla-backup', version: 5, tables: { ...base, challenges: [{ ...challenges[1], kind: 'steps' }] } }).error, /más nueva/)
  // Filas dañadas: se rechaza sin tocar nada.
  for (const bad of [[{ ...challenges[1], target: 'ocho' }], [{ ...challenges[1], titleEs: 5 }], [{ ...challenges[1], id: '' }], [challenges[1], challenges[1]]]) {
    const r = checkBackup({ format: 'habla-backup', version: 5, tables: { ...base, challenges: bad } })
    assert.equal(r.ok, false)
    assert.match(r.error, /dañado/)
  }
})
