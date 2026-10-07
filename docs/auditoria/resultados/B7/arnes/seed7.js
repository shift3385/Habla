// B7 · Siembra en el NAVEGADOR (origen aislado b7.localhost) un año de uso FICTICIO usando los módulos de la app (Vite dev).
// window.__seedN = nº de sesiones (por defecto 365), __seedT = turnos por sesión (20). Clave ficticia; nunca en el teléfono.
const N = window.__seedN ?? 365, TPS = window.__seedT ?? 20
const { db } = await import('/src/lib/db.ts')
const { loadSettings, saveSettings } = await import('/src/lib/settings.ts')
const day = 86400000, now = Date.now(), t0 = performance.now()
const L = { grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'B1', overall: 'B1' }
const weeks = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, titleEs: 'Semana ' + (i + 1), focusEn: 'Focus', focusEs: 'Foco', canDoEs: 'x', themeEn: 'Travel', review: [4, 8, 12].includes(i + 1),
  ...(i === 0 ? { lessons: Array.from({ length: 5 }, (_, j) => ({ id: `w1l${j + 1}`, week: 1, n: j + 1, titleEs: 'Lección ' + (j + 1), kind: 'conversation', situationEn: 'Chat', targetEn: 'x', phrases: [], missionEs: 'x', openerEn: 'Hi?' })) } : {}) }))
await db.transaction('rw', db.tables, async () => {
  for (const t of db.tables) await t.clear()
  await db.profile.put({ id: 'me', name: 'Año B7', about: 'Ingeniero', interests: ['travel', 'food', 'tech'], levels: L, weaknesses: ['Tenses'], goal: '', startedAt: now - N * day,
    calibratedAt: now - 5 * day, tests: [{ date: now - 5 * day, levels: L, testLevels: L, confidence: {}, bankVersion: 1, strengthsEs: [], weaknessesEs: [], summaryEs: 'x', grammarAnswers: [] }],
    levelEvents: [], bankUsage: { seen: [], uses: {} }, plan: { createdAt: now - 5 * day, start: now - 2 * day, levelAtStart: 'B1', weeks, done: {} } })
  const corr = { original: 'I go yesterday', corrected: 'I went yesterday', explanationEs: 'Pasado simple', category: 'tenses', spanish: 'Fui ayer' }
  for (let s = 0; s < N; s++) {
    const st = now - (N - s) * day + 3600000
    const sid = await db.sessions.add({ scenario: 'free', startedAt: st, endedAt: st + 900000, topic: { category: 'tech', title: 'Topic ' + s, titleEs: 'Tema ' + s, summary: 'Lorem ipsum '.repeat(10), question: 'Why?', vocab: [{ en: 'word', es: 'palabra' }] },
      metrics: { turns: TPS / 2, spokenTurns: TPS / 2, words: 300, speechSeconds: 240, wpm: 90, pauses: 10, pausesPerMin: 2, avgWords: 12, longestWords: 30, corrections: 3, score: 70, level: 'B1' },
      report: { summaryEs: 'Resumen '.repeat(20), strengthsEs: ['a', 'b'], improveEs: ['c'], homeworkEs: 'Tarea', phrase: { en: 'x', es: 'y' } } })
    const turns = []
    for (let k = 0; k < TPS; k++) turns.push({ sessionId: sid, role: k % 2 ? 'user' : 'teacher', text: (k % 2 ? 'I think that the weather was very nice and we go to the beach with my family. ' : 'That sounds lovely! What did you do at the beach? Tell me more about it. ').repeat(2), translation: k % 2 ? undefined : 'Traducción '.repeat(10), createdAt: st + k * 30000, ...(k % 2 ? { audioSeconds: 12, speechSeconds: 10, pauses: [1.2], corrections: [corr] } : {}) })
    const ids = await db.turns.bulkAdd(turns, { allKeys: true })
    await db.mistakes.bulkAdd([0, 1, 2].map((m) => ({ ...corr, sessionId: sid, turnId: ids[1 + 2 * m], createdAt: st + m })))
  }
  const lk = []
  for (let i = 0; i < 300; i++) lk.push({ query: 'word' + i, context: 'some context sentence here', saved: i % 3 === 0, createdAt: now - i * 3600000, result: { headword: 'word' + i, ipa: 'wɜːd', partOfSpeech: 'noun', translation: 'palabra', meaningEs: 'significado '.repeat(5), whyEs: '', otherMeanings: [], register: 'neutral', collocations: [], falseFriendEs: '', exampleEn: 'An example.', exampleEs: 'Un ejemplo.' } })
  await db.lookups.bulkAdd(lk)
  const cards = []
  for (let i = 0; i < 500; i++) cards.push({ source: 'mistake', sourceId: i + 1, promptEs: 'Fui ayer', answerEn: 'I went yesterday', hintEs: 'pasado', createdAt: now - i * day / 2, due: now + (i % 30 - 10) * day, fsrs: { due: now + (i % 30 - 10) * day, stability: 3, difficulty: 5, elapsed_days: 1, scheduled_days: 3, reps: 2, lapses: 0, state: 2, last_review: now - day } })
  await db.cards.bulkAdd(cards)
})
const s = await loadSettings()
await saveSettings({ ...s, geminiKey: 'AIzaTEST-NO-REAL-0000000000000000000', onboarded: true, lastSeenVersion: '5.8', keysIntroSeen: true, mascotTapped: true, mascotNudgeSeen: true })
JSON.stringify({ ms: Math.round(performance.now() - t0), sessions: await db.sessions.count(), turns: await db.turns.count(), mistakes: await db.mistakes.count(), lookups: await db.lookups.count(), cards: await db.cards.count() })
