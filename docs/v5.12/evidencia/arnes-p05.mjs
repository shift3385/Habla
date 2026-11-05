// 5.12 · Fase 1 · P-05 «Hacerla ahora» en el navegador (IA falsa, arnes.html). NO es parte de la app.
// Uso: node docs/v5.12/evidencia/arnes-p05.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, calls, clickLabel, clickText, DAY, hScroll, open, seed, shot, sleep, typeAnswer, waitText } from './comun.mjs'

const OUT = 'docs/v5.12/evidencia/P05'
const TASK = 'Graba 1 minuto contando tu fin de semana usando 3 veces el pasado simple (went, ate, saw).'
const METRICS = { turns: 4, spokenTurns: 4, words: 80, speechSeconds: 60, wpm: 80, pauses: 2, pausesPerMin: 2, avgWords: 20, longestWords: 30, corrections: 1, score: 55, level: 'B1+' }
const REPORT = { summaryEs: 'Buena charla sobre tu semana.', strengthsEs: ['Frases largas.'], improveEs: ['Pasado simple.'], homeworkEs: TASK, phrase: { en: 'It was fun.', es: 'Fue divertido.' } }
const origin = `await db.sessions.add({ scenario: 'free', startedAt: Date.now() - ${DAY}, endedAt: Date.now() - ${DAY - 600e3}, metrics: ${JSON.stringify(METRICS)}, report: ${JSON.stringify(REPORT)} })`
const log = (...a) => console.log('✔', ...a)

// 1) Aviso a pantalla completa → «Hacerla ahora» → clase corta → 2 respuestas → Terminar → «¡Tarea hecha!».
{
  const { browser, page } = await open({ width: 390, height: 844 })
  await seed(page, { extra: origin })
  await boot(page)
  await waitText(page, /Tu tarea de hoy/)
  assert.match(await bodyText(page), /Graba 1 minuto/)
  await shot(page, OUT, '01-aviso-hacerla-ahora-390x844')
  log('aviso con «Hacerla ahora»')

  await clickText(page, /^Hacerla ahora$/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(800)
  const first = (await calls(page)).find((c) => /Short homework practice/.test(c.system))
  assert.ok(first, 'el profe recibe el brief de la tarea')
  assert.ok(first.system.includes(`"${TASK}"`), 'con la tarea tal cual')
  log('el prompt del profe lleva la tarea')
  await clickText(page, /Tu tarea de hoy/)
  await sleep(500)
  assert.match(await bodyText(page), /Tarea · clase corta/i)
  await shot(page, OUT, '02-clase-tarjeta-tarea-390x844')

  await typeAnswer(page, 'Last weekend I went to the beach and I ate fish.')
  await typeAnswer(page, 'Then I saw a movie with my sister and we laughed a lot.')
  await clickText(page, /^Terminar$/)
  await waitText(page, /¡Tarea hecha!/)
  await sleep(1200)
  const t = await bodyText(page)
  assert.doesNotMatch(t, /Tarea para mañana/, 'la clase de tarea no propone otra')
  await shot(page, OUT, '03-informe-tarea-hecha-390x844')
  const done = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.ts')
    const all = await db.sessions.toArray()
    return all.map((s) => ({ id: s.id, scenario: s.scenario, homeworkFor: s.homeworkFor, homeworkDoneAt: !!s.homeworkDoneAt }))
  })
  assert.deepEqual(done, [
    { id: 1, scenario: 'free', homeworkFor: undefined, homeworkDoneAt: true },
    { id: 2, scenario: 'homework', homeworkFor: 1, homeworkDoneAt: false },
  ])
  log('la clase de origen queda ✓ hecha', JSON.stringify(done))

  // En Progreso, el informe de la clase de origen dice «✓ Hecha» (sin botón).
  await clickText(page, /^Volver al inicio$/)
  await clickLabel(page, 'Progreso')
  await sleep(800)
  await clickText(page, /^Sesiones/)
  await sleep(500)
  await clickText(page, /Charla libre/)
  await waitText(page, /✓ Hecha/)
  assert.doesNotMatch(await bodyText(page), /Hacerla ahora/)
  await page.evaluate(() => [...document.querySelectorAll('*')].find((x) => x.textContent === 'Tarea para mañana')?.scrollIntoView({ block: 'center' }))
  await sleep(400)
  await shot(page, OUT, '04-progreso-hecha-390x844')
  log('Progreso: «✓ Hecha»')
  await browser.close()
}

// 2) 320×640: sin aviso (ya visto), el informe de Progreso ofrece «Hacerla ahora» y la mascota lo propone en un globo.
{
  const { browser, page } = await open({ width: 320, height: 640 })
  await seed(page, { settings: { homeworkSeen: Date.now() - DAY }, extra: origin })
  // homeworkSeen debe ser la fecha exacta: se corrige tras sembrar.
  await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.ts')
    const s = await db.sessions.get(1)
    const k = 'CapacitorStorage.habla.settings'
    localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k)), homeworkSeen: s.startedAt }))
  })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  assert.doesNotMatch(await bodyText(page), /Tu tarea de hoy/)
  assert.equal(await hScroll(page), false)
  // Globo de la mascota (el primero sale entre 5 y 9 s).
  await waitText(page, /Tienes una tarea de tu última clase/, 16000)
  await shot(page, OUT, '05-globo-mascota-320x640')
  log('globo de la mascota con «Hacerla ahora»')

  await clickLabel(page, 'Progreso')
  await sleep(800)
  await clickText(page, /^Sesiones/)
  await sleep(500)
  await clickText(page, /Charla libre/)
  await waitText(page, /Hacerla ahora/)
  await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Hacerla ahora/.test(x.textContent))?.scrollIntoView({ block: 'center' }))
  await sleep(400)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '06-progreso-boton-320x640')
  await clickText(page, /^Hacerla ahora$/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  log('desde Progreso abre la clase de la tarea')
  await browser.close()
}

// 3) Horizontal 780×360: el aviso cabe y se ven los dos botones.
{
  const { browser, page } = await open({ width: 780, height: 360 })
  await seed(page, { extra: origin })
  await boot(page)
  await waitText(page, /Tu tarea de hoy/)
  await sleep(600)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '07-aviso-780x360')
  log('aviso en horizontal')
  await browser.close()
}
console.log('P-05: todo bien')
