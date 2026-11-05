// Arnés 5.12 (NO es parte de la app): crea la base `habla` tal como la dejaba la 5.11 (Dexie v5), con datos, para
// comprobar en el navegador que la v6 de la 5.12 (tabla `facts`) la migra sin tocar nada. Esquemas copiados de
// src/lib/db.ts de la 5.11 (tests/m3-migration.test.mjs › OLD_STORES).
import Dexie from 'dexie'

export async function seedV5(now = Date.now()): Promise<number> {
  const old = new Dexie('habla')
  old.version(1).stores({ sessions: '++id, startedAt, scenario', turns: '++id, sessionId, createdAt', mistakes: '++id, sessionId, createdAt, category', profile: 'id' })
  old.version(2).stores({ lookups: '++id, createdAt' })
  old.version(3).stores({ cards: '++id, due, &[source+sourceId]' })
  old.version(4).stores({ grammar: 'id, lastAt' })
  old.version(5).stores({ sounds: 'id, lastAt', milestones: 'id, at' })
  await old.open()
  const L = 'B1'
  await old.table('profile').put({
    id: 'me', name: 'Ana', about: 'enfermera jubilada', weaknesses: ['past simple'], goal: 'viajar', startedAt: now - 30 * 864e5,
    levels: { overall: L, grammar: L, reading: L, listening: L, speaking: 'A2' }, calibratedAt: now - 3600e3, purposes: [], interests: ['news', 'ai', 'tech'],
  })
  const sid = await old.table('sessions').add({
    scenario: 'free', startedAt: now - 2 * 864e5, endedAt: now - 2 * 864e5 + 600e3,
    metrics: { turns: 3, spokenTurns: 3, words: 40, speechSeconds: 30, wpm: 80, pauses: 1, pausesPerMin: 1, avgWords: 13, longestWords: 15, corrections: 1, score: 50, level: 'B1' },
  })
  await old.table('turns').bulkAdd([
    { sessionId: sid, role: 'teacher', text: 'Hi!', createdAt: now - 2 * 864e5 },
    { sessionId: sid, role: 'user', text: 'I go to the beach yesterday.', createdAt: now - 2 * 864e5 + 1000 },
  ])
  await old.table('mistakes').add({ sessionId: sid, turnId: 2, createdAt: now - 2 * 864e5, original: 'I go', corrected: 'I went', explanationEs: 'Pasado.', category: 'tense', spanish: 'Fui' })
  await old.table('grammar').put({ id: 'past-simple', lastAt: now, correct: 3, attempts: 4, rounds: 1, mastered: false })
  await old.table('sounds').put({ id: 'ih', lastAt: now, state: 'seen', mastered: false })
  await old.table('milestones').bulkPut(['first-class', 'class-5min', 'streak-3'].map((id) => ({ id, at: now, celebratedAt: now })))
  const v = old.verno
  old.close()
  return v
}
