// 5.13 · Fase 1 · P-14 «Reto de la semana» en el navegador (IA falsa, docs/v5.12/evidencia/arnes.html). NO es parte de la app.
// Uso: node docs/v5.13/evidencia/arnes-p14.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, calls, clickLabel, clickText, dbEval, hScroll, open, ORIGIN, OUT_ROOT, seed, setFix, shot, sleep, tapMascotUntil, waitText } from './comun.mjs'

const OUT = `${OUT_ROOT}/P14`
const log = (...a) => console.log('✔', ...a)
const CH = ['/src/lib/challenge.ts', '/src/lib/stats.ts']
const LONG = 'Yesterday I went to the market with my sister and we bought fresh bread and cheese.'

/** Sin celebraciones de logros pendientes (para que no tapen lo que se prueba). */
const QUIET = `await db.milestones.bulkPut(['_since','first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))`

/** Una clase de hoy con respuestas habladas largas (`clean`) y errores de `category` (para el reto y el prompt). */
const classToday = (category, cleanAnswers) => `
  const now = Date.now()
  const sid = await db.sessions.add({ scenario: 'free', startedAt: now - 40 * 60e3, endedAt: now - 30 * 60e3,
    metrics: { turns: ${cleanAnswers + 1}, spokenTurns: ${cleanAnswers + 1}, words: 80, speechSeconds: 120, wpm: 90, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 16, corrections: 3, score: 60, level: 'B1' } })
  const turns = []
  for (let i = 0; i < ${cleanAnswers}; i++) turns.push({ sessionId: sid, role: 'user', text: ${JSON.stringify(LONG)}, createdAt: now - (35 - i) * 60e3, speechSeconds: 6 })
  const bad = { original: 'I go', corrected: 'I went', explanationEs: 'Pasado.', category: '${category}', spanish: 'Fui' }
  turns.push({ sessionId: sid, role: 'user', text: 'Yesterday I go to the market with my sister and we buy fresh bread.', createdAt: now - 31 * 60e3, speechSeconds: 6, corrections: [bad] })
  await db.turns.bulkAdd(turns)
  for (let i = 0; i < 3; i++) await db.mistakes.add({ ...bad, sessionId: sid, turnId: 1, createdAt: now - i * 1000 })
`

const current = (page) => dbEval(page, async (db, m) => db.challenges.get(m.weekKey(new Date())), null, CH)
async function waitChallenge(page) {
  for (let i = 0; i < 60; i++) {
    const c = await current(page)
    if (c && typeof c.progress === 'number') return c
    await sleep(250)
  }
  throw new Error('no se creó el reto de la semana')
}

// 1) Migración con datos reales: base de la 5.12 (Dexie v6) → la 5.13 la abre como v7 sin tocar nada.
{
  const { browser, page } = await open()
  await page.goto(`${ORIGIN}/version.json`)
  const r = await page.evaluate(async () => {
    localStorage.clear()
    await new Promise((res) => {
      const q = indexedDB.deleteDatabase('habla')
      q.onsuccess = q.onerror = q.onblocked = () => res()
    })
    const { seedV6 } = await import('/docs/v5.13/evidencia/db-v6.ts')
    const before = await seedV6()
    const { db, TABLES } = await import('/src/lib/db.ts')
    await db.open()
    const counts = {}
    for (const t of TABLES) counts[t] = await db.table(t).count()
    return { before, after: db.verno, counts, fact: (await db.facts.toArray())[0].text, turnText: (await db.turns.toArray())[1].text }
  })
  assert.equal(r.before, 6)
  assert.equal(r.after, 7)
  assert.deepEqual(r.counts, { sessions: 1, turns: 2, mistakes: 1, profile: 1, lookups: 0, cards: 0, grammar: 1, sounds: 1, milestones: 3, facts: 1, challenges: 0, family: 0 })
  assert.equal(r.fact, 'Su nieta se llama Ana y vive en Londres.')
  assert.equal(r.turnText, 'I go to the beach yesterday.')
  log('migración v6 → v7 con datos: todo intacto y `challenges` vacía', JSON.stringify(r.counts))
  await browser.close()
}

// 2) 390×844, con clave: el Inicio crea el reto con el modelo rápido (una llamada), lo mide (3 de 4) y la mascota lo cuenta.
{
  const { browser, page } = await open()
  await seed(page, { extra: QUIET + classToday('tense', 3) })
  await setFix(page, { kind: 'clean', target: 4, category: 'tense', practice: 'any', title_es: 'El pasado, sin fallos', goal_es: 'Di 4 respuestas largas sin fallar el pasado.' })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  const c = await waitChallenge(page)
  assert.deepEqual([c.kind, c.target, c.category, c.source, c.progress, c.titleEs], ['clean', 4, 'tense', 'ai', 3, 'El pasado, sin fallos'])
  const asks = (await calls(page)).filter((x) => x.keys.includes('kind'))
  assert.equal(asks.length, 1, 'una sola llamada para el reto')
  assert.match(asks[0].last, /verb tenses/, 'el prompt lleva tus errores frecuentes')
  assert.doesNotMatch(asks[0].last, /Ana|enfermera/, 'sin datos personales')
  log('reto creado con IA y medido en el teléfono:', `${c.progress} de ${c.target}`)

  const said = await tapMascotUntil(page, /reto de la semana: 3 de 4 respuestas/i) // 3 redacciones al azar
  assert.match(said, /El pasado, sin fallos/)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '01-globo-reto-390x844')
  log('globo de la mascota:', said.replace(/\s+/g, ' ').trim())

  // Tocar el globo abre el detalle en Progreso.
  await page.evaluate(() => [...document.querySelectorAll('.tip-bubble[role=status]')].find((b) => /reto de la semana/i.test(b.textContent))?.click())
  await page.waitForSelector('[data-challenge-view]')
  await waitText(page, /3 de 4 respuestas/)
  assert.match(await bodyText(page), /Di 4 respuestas largas sin fallar el pasado\./)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '02-detalle-reto-390x844')
  log('el globo abre el detalle del reto')

  await clickLabel(page, 'Atrás')
  await page.waitForSelector('[data-challenge-card]')
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '03-progreso-tarjeta-390x844')
  log('tarjeta del reto en Progreso')

  // 3) Una respuesta larga más → al volver al Inicio, «¡Reto cumplido!»; «Seguir» lo marca y no sale otra vez.
  await dbEval(page, (db, m, LONG) => db.turns.add({ sessionId: 1, role: 'user', text: LONG, createdAt: Date.now(), speechSeconds: 6 }), LONG)
  await clickLabel(page, 'Hablar')
  await page.waitForSelector('[data-challenge-done]', { timeout: 15000 })
  await sleep(1400)
  assert.match(await bodyText(page), /¡Reto cumplido!.*El pasado, sin fallos/i)
  await shot(page, OUT, '04-reto-cumplido-390x844')
  await clickText(page, /^Seguir$/)
  await sleep(500)
  const done = await current(page)
  assert.ok(done.doneAt && done.celebratedAt, 'cumplido y celebrado')
  assert.equal(done.progress, 4)
  await clickLabel(page, 'Progreso')
  await sleep(600)
  await waitText(page, /¡Cumplido!/)
  await clickLabel(page, 'Hablar')
  await sleep(2500)
  assert.equal(await page.locator('[data-challenge-done]').count(), 0, 'no se celebra dos veces')
  log('«¡Reto cumplido!» una sola vez')

  // 4) Recargar en la misma semana no vuelve a llamar a la IA.
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await sleep(2000)
  assert.equal((await calls(page)).filter((x) => x.keys.includes('kind')).length, 0, 'sin llamada nueva tras recargar')
  log('misma semana: sin llamada nueva a la IA')

  // 5) Horizontal: el detalle (pantalla nueva).
  await page.setViewportSize({ width: 844, height: 390 })
  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-challenge-card]')
  await page.click('[data-challenge-card]')
  await page.waitForSelector('[data-challenge-view]')
  await sleep(500)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '05-detalle-horizontal-844x390')
  log('detalle en horizontal')
  await browser.close()
}

// 6) 320×640, sin clave: reto de respaldo local (tu error más frecuente), sin IA; semanas anteriores cerradas en el historial.
{
  const { browser, page } = await open({ width: 320, height: 640 })
  const past = `
    const { weekKey } = await import('/src/lib/stats.ts')
    const d = new Date(); const w1 = weekKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)); const w2 = weekKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 14))
    await db.challenges.bulkPut([
      { id: w1, kind: 'minutes', target: 25, titleEs: 'Semana de charla', goalEs: 'Habla 25 minutos en inglés esta semana.', createdAt: Date.now() - 7 * 864e5, source: 'local', progress: 12 },
      { id: w2, kind: 'review', target: 10, titleEs: 'Semana de repaso', goalEs: 'Repasa 10 frases en el Repaso.', createdAt: Date.now() - 14 * 864e5, source: 'ai', progress: 10, final: true, doneAt: Date.now() - 10 * 864e5, celebratedAt: Date.now() - 10 * 864e5 },
    ])`
  await seed(page, { settings: { geminiKey: '' }, extra: QUIET + classToday('preposition', 2) + past })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  const c = await waitChallenge(page)
  assert.deepEqual([c.kind, c.target, c.category, c.source, c.progress], ['clean', 8, 'preposition', 'local', 2])
  assert.equal((await calls(page)).length, 0, 'sin clave no se llama a la IA')
  const hist = await dbEval(page, async (db, m) => (await m.challengeHistory()).map((x) => [x.id === m.weekKey(new Date()), !!x.final, x.progress ?? null]), null, CH)
  assert.deepEqual(hist, [[true, false, 2], [false, true, 0], [false, true, 10]], 'la semana pasada queda cerrada con su resultado medido')
  log('sin clave: reto de respaldo local', c.titleEs, '—', c.goalEs)

  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-challenge-card]')
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '06-progreso-sin-clave-320x640')
  await page.click('[data-challenge-card]')
  await page.waitForSelector('[data-challenge-view]')
  await waitText(page, /Semanas anteriores · 1 de 2 cumplidos/)
  assert.match(await bodyText(page), /0 de 25 min/)
  assert.equal(await hScroll(page), false)
  await page.evaluate(() => document.querySelector('[data-challenge-row]')?.scrollIntoView({ block: 'center' }))
  await sleep(300)
  await shot(page, OUT, '07-detalle-historial-320x640')
  log('historial: semanas anteriores con su resultado')

  // 7) Semana nueva = reto nuevo (el lunes siguiente), y la de ahora se cierra.
  const r = await dbEval(
    page,
    async (db, m) => {
      const d = new Date()
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 - ((d.getDay() + 6) % 7), 9)
      const n = await m.ensureWeekChallenge({ apiKey: '', models: { primary: 'x' }, dailyGoal: 5, level: 'A2', frequent: async () => [] }, next)
      const now = await db.challenges.get(m.weekKey(d))
      return { nextId: n.id, sameAsNow: n.id === m.weekKey(d), count: await db.challenges.count(), nowFinal: !!now.final }
    },
    null,
    CH,
  )
  assert.equal(r.sameAsNow, false)
  assert.equal(r.count, 4)
  assert.equal(r.nowFinal, true)
  log('semana nueva → reto nuevo', r.nextId, '; la anterior queda cerrada')
  await browser.close()
}
console.log('\nP-14: todo bien. Capturas en', OUT)
