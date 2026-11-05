// 5.12 · Fase 3 · P-11 «Lo que recuerda tu profe» en el navegador (IA falsa, arnes.html). NO es parte de la app.
// Uso: node docs/v5.12/evidencia/arnes-p11.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, calls, clickLabel, clickText, hScroll, open, ORIGIN, seed, setFix, shot, sleep, typeAnswer, waitText } from './comun.mjs'

const OUT = 'docs/v5.12/evidencia/P11'
const log = (...a) => console.log('✔', ...a)
const FACTS = ['El viernes tiene una entrevista de trabajo en un hotel.', 'Tiene la tensión alta y toma pastillas.', 'Su nieta se llama Ana y vive en Londres.']
const dbEval = (page, fn, arg) =>
  page.evaluate(
    async ({ fn, arg }) => {
      const { db } = await import('/src/lib/db.ts')
      const m = await import('/src/lib/memory.ts')
      return new Function('db', 'm', 'arg', `return (${fn})(db, m, arg)`)(db, m, arg)
    },
    { fn: fn.toString(), arg },
  )

/** Hace una clase corta escribiendo y la termina (con la IA falsa). */
async function quickClass(page, answer) {
  await clickText(page, /^Temas/)
  await sleep(300)
  await clickLabel(page, 'Sorpréndeme')
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(700)
  await typeAnswer(page, answer)
  await clickText(page, /^Terminar$/)
  await waitText(page, /Cómo te fue/)
  await sleep(900)
}

const { browser, page } = await open({ width: 390, height: 844 })

// 1) Migración con datos reales: base de la 5.11 (Dexie v5) → la 5.12 la abre como v6 sin tocar nada.
{
  await page.goto(`${ORIGIN}/version.json`)
  const r = await page.evaluate(async () => {
    localStorage.clear()
    await new Promise((res) => {
      const q = indexedDB.deleteDatabase('habla')
      q.onsuccess = q.onerror = q.onblocked = () => res()
    })
    const { seedV5 } = await import('/docs/v5.12/evidencia/db-v5.ts')
    const before = await seedV5()
    const { db, TABLES } = await import('/src/lib/db.ts')
    await db.open()
    const counts = {}
    for (const t of TABLES) counts[t] = await db.table(t).count()
    const s = (await db.sessions.toArray())[0]
    return { before, after: db.verno, counts, turnText: (await db.turns.toArray())[1].text, sessionScore: s.metrics.score }
  })
  assert.equal(r.before, 5)
  assert.equal(r.after, 7) // 5.13: la v7 añade `challenges` (docs/v5.13/evidencia/arnes-p14.mjs prueba v6 → v7)
  assert.deepEqual(r.counts, { sessions: 1, turns: 2, mistakes: 1, profile: 1, lookups: 0, cards: 0, grammar: 1, sounds: 1, milestones: 3, facts: 0, challenges: 0, family: 0 })
  assert.equal(r.turnText, 'I go to the beach yesterday.')
  assert.equal(r.sessionScore, 50)
  log('migración v5 → v7 con datos: todo intacto y `facts` vacía', JSON.stringify(r.counts))
}

// 2) Clase → el informe apunta 2 datos (el de salud no) y los enseña; la siguiente clase los recibe en el prompt.
await seed(page, { settings: { mascotNotices: false }, extra: `await db.milestones.bulkPut(['first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now(), celebratedAt: Date.now() })))` })
await setFix(page, { facts_es: FACTS })
await boot(page)
await page.waitForSelector('button[aria-label="Ajustes"]')
await quickClass(page, 'On Friday I have a job interview at a hotel, and my granddaughter Ana lives in London.')
const reportCall = (await calls(page)).find((c) => c.keys.includes('summary_es'))
assert.ok(reportCall.keys.includes('facts_es'), 'el informe pide facts_es')
assert.match(reportCall.last, /NEVER anything about health, money, politics, religion or sex/)
await waitText(page, /Tu profe se acordará de/)
const t = await bodyText(page)
assert.match(t, /El viernes tiene una entrevista de trabajo en un hotel\./)
assert.match(t, /Su nieta se llama Ana y vive en Londres\./)
assert.doesNotMatch(t, /tensión/)
await page.evaluate(() => [...document.querySelectorAll('h3')].find((x) => /se acordará/.test(x.textContent))?.scrollIntoView({ block: 'center' }))
await sleep(400)
await shot(page, OUT, '01-informe-se-acordara-390x844')
assert.equal(await dbEval(page, (db) => db.facts.count()), 2)
log('el informe apunta 2 datos (el de salud no) y los enseña')

await clickText(page, /^Volver al inicio$/)
await page.waitForSelector('button[aria-label="Ajustes"]')
await setFix(page, { facts_es: [] })
const before = (await calls(page)).length
await clickText(page, /^Temas/)
await clickLabel(page, 'Sorpréndeme')
await page.waitForSelector('.cv-root', { timeout: 20000 })
await sleep(600)
const sys = (await calls(page)).slice(before).find((c) => /You are a fun/.test(c.system)).system
assert.match(sys, /# What you remember about the student/)
assert.match(sys, /- El viernes tiene una entrevista de trabajo en un hotel\./)
assert.match(sys, /- Su nieta se llama Ana y vive en Londres\./)
assert.match(sys, /except for the notes under "What you remember about the student"/)
log('la clase siguiente recibe lo que recuerda el profe')
await clickLabel(page, 'Salir y guardar la clase')
await page.waitForSelector('button[aria-label="Ajustes"]', { timeout: 10000 })

// 3) Ajustes → «Lo que recuerda tu profe»: lista, cambiar, borrar uno, borrar todo; apagado no se usa.
await clickLabel(page, 'Ajustes')
await sleep(600)
assert.match(await bodyText(page), /2 recuerdos/)
await shot(page, OUT, '02-ajustes-panel-390x844')
await clickText(page, /Lo que recuerda tu profe/)
await waitText(page, /Lo que recuerdo \(2\)/)
await shot(page, OUT, '03-ajustes-lista-390x844')
await clickLabel(page, 'Cambiar: Su nieta se llama Ana y vive en Londres.')
await page.locator('textarea').fill('Su nieta se llama Ana y vive en Manchester.')
await shot(page, OUT, '04-ajustes-cambiar-390x844')
await clickText(page, /^Guardar$/)
await waitText(page, /vive en Manchester/)
// Un texto sensible no se guarda al cambiarlo.
await clickLabel(page, 'Cambiar: Su nieta se llama Ana y vive en Manchester.')
await page.locator('textarea').fill('Tiene una deuda con el banco.')
await clickText(page, /^Guardar$/)
await waitText(page, /prefiero no guardarlo/)
await clickText(page, /^Cancelar$/)
assert.deepEqual((await dbEval(page, (db) => db.facts.toArray())).map((f) => f.text).sort(), ['El viernes tiene una entrevista de trabajo en un hotel.', 'Su nieta se llama Ana y vive en Manchester.'])
log('cambiar un dato (y uno sensible no se guarda)')
await clickLabel(page, 'Borrar: El viernes tiene una entrevista de trabajo en un hotel.')
await waitText(page, /Lo que recuerdo \(1\)/)
assert.equal(await dbEval(page, (db) => db.facts.count()), 1)
log('borrar uno')
await clickText(page, /^Borrar todo$/)
await waitText(page, /¿Borro todo lo que recuerdo de ti\?/)
await shot(page, OUT, '05-ajustes-borrar-todo-390x844')
await clickText(page, /^Sí, borrar todo$/)
await waitText(page, /Aún no recuerdo nada/)
assert.equal(await dbEval(page, (db) => db.facts.count()), 0)
await shot(page, OUT, '06-ajustes-vacio-390x844')
log('borrar todo')

// Apagado: no se usa lo guardado ni se pide nada nuevo.
await dbEval(page, (db) => db.facts.add({ text: 'Tiene un huerto en el pueblo.', createdAt: Date.now() }))
await clickText(page, /^Que .* recuerde/)
await sleep(300)
await clickLabel(page, 'Atrás')
await sleep(400)
assert.match(await bodyText(page), /Apagado/)
await clickLabel(page, 'Hablar')
await page.waitForSelector('button[aria-label="Ajustes"]')
await setFix(page, { facts_es: ['Tiene dos gatos.'] })
const before2 = (await calls(page)).length
await quickClass(page, 'I have a small garden in my village.')
const off = (await calls(page)).slice(before2)
assert.doesNotMatch(off.find((c) => /You are a fun/.test(c.system)).system, /What you remember/)
assert.ok(!off.find((c) => c.keys.includes('summary_es')).keys.includes('facts_es'))
assert.equal(await dbEval(page, (db) => db.facts.count()), 1)
assert.doesNotMatch(await bodyText(page), /se acordará/)
log('apagado: ni lo usa ni apunta nada nuevo')

// 4) Límite de 20 en la base (salen los más antiguos) y copia de seguridad con la tabla (versión 4).
const lim = await dbEval(page, async (db, m) => {
  await db.facts.clear()
  for (let i = 0; i < 25; i++) await m.rememberFacts([`Dato número ${i} de prueba`], undefined, 1_790_000_000_000 + i * 1000)
  const all = await m.listFacts()
  return { n: all.length, newest: all[0].text, oldest: all.at(-1).text }
})
assert.deepEqual(lim, { n: 20, newest: 'Dato número 24 de prueba', oldest: 'Dato número 5 de prueba' })
const bk = await page.evaluate(async () => {
  const { buildBackup } = await import('/src/lib/backup.ts')
  const b = await buildBackup()
  return { version: b.version, facts: b.tables.facts?.length, keys: JSON.stringify(b).includes('AIzaARNES') }
})
// 5.13: el Inicio ya creó el reto de la semana, que también viaja en la copia: versión 5 (sin retos sería 4, p14-challenge.test).
assert.deepEqual(bk, { version: 5, facts: 20, keys: false })
log('límite de 20 y copia con la tabla (sin claves)', JSON.stringify(bk))
await browser.close()

// 5) 320×640 y horizontal: la página de Ajustes cabe sin desplazar en horizontal la página.
for (const vp of [{ width: 320, height: 640 }, { width: 780, height: 360 }]) {
  const { browser: b2, page: p2 } = await open(vp)
  await seed(p2, {
    settings: { mascotNotices: false },
    extra: `for (const [i, text] of ['El viernes tiene una entrevista de trabajo en un hotel.', 'Su nieta se llama Ana y vive en Londres.', 'Tiene un huerto con tomates en el pueblo.'].entries()) await db.facts.add({ text, createdAt: Date.now() - i * 864e5 })`,
  })
  await boot(p2)
  await p2.waitForSelector('button[aria-label="Ajustes"]')
  await clickLabel(p2, 'Ajustes')
  await sleep(500)
  await clickText(p2, /Lo que recuerda tu profe/)
  await waitText(p2, /Lo que recuerdo \(3\)/)
  assert.equal(await hScroll(p2), false)
  await shot(p2, OUT, `07-ajustes-lista-${vp.width}x${vp.height}`)
  await b2.close()
}
log('Ajustes en 320×640 y 780×360')
console.log('P-11: todo bien')
