// 5.13 · Fase 3 · Códigos para compartir en el navegador, con DOS teléfonos simulados (dos contextos de Playwright, cada
// uno con su IndexedDB): Ana (390×844) y Luis (320×640). Los mensajes pasan por el portapapeles como por WhatsApp.
// NO es parte de la app. Uso: node docs/v5.13/evidencia/arnes-codes.mjs   (con `npx vite --port 5173` en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, chromium, clickLabel, clickText, dbEval, hScroll, ORIGIN, OUT_ROOT, seed, shot, sleep, waitText } from './comun.mjs'

const OUT = `${OUT_ROOT}/CODES`
const log = (...a) => console.log('✔', ...a)
const LONG = 'Yesterday I went to the market with my sister and we bought fresh bread and cheese.'
const QUIET = `await db.milestones.bulkPut(['_since','first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))`
const classToday = (category, clean) => `
  const now = Date.now()
  const sid = await db.sessions.add({ scenario: 'free', startedAt: now - 40 * 60e3, endedAt: now - 30 * 60e3,
    metrics: { turns: ${clean + 1}, spokenTurns: ${clean + 1}, words: 80, speechSeconds: 120, wpm: 90, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 16, corrections: 3, score: 60, level: 'B1' } })
  const turns = []
  for (let i = 0; i < ${clean}; i++) turns.push({ sessionId: sid, role: 'user', text: ${JSON.stringify(LONG)}, createdAt: now - (35 - i) * 60e3, speechSeconds: 6 })
  const bad = { original: 'x', corrected: 'y', explanationEs: 'z', category: '${category}', spanish: 'w' }
  turns.push({ sessionId: sid, role: 'user', text: 'Yesterday I go to the market with my sister and we buy fresh bread.', createdAt: now - 31 * 60e3, speechSeconds: 6, corrections: [bad] })
  await db.turns.bulkAdd(turns)
  for (let i = 0; i < 3; i++) await db.mistakes.add({ ...bad, sessionId: sid, turnId: 1, createdAt: now - i * 1000 })
`
const WORD = {
  headword: 'nevertheless', ipa: '/ˌnevəðəˈles/', partOfSpeech: 'adverb', translation: 'sin embargo', meaningEs: 'Introduce algo que contrasta con lo anterior.',
  whyEs: 'Aquí contrasta la lluvia con salir.', otherMeanings: [], register: 'formal', collocations: [], falseFriendEs: '',
  exampleEn: 'It was raining; nevertheless, we went out.', exampleEs: 'Llovía; sin embargo, salimos.',
}
const CH = ['/src/lib/challenge.ts', '/src/lib/stats.ts']
const browser = await chromium.launch()

async function phone(viewport, who, extra) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${who}] pageerror`, e.message))
  await seed(page, { settings: { geminiKey: '' }, extra: QUIET + ';\n' + extra })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  return page
}
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const current = (page) => dbEval(page, async (db, m) => db.challenges.get(m.weekKey(new Date())), null, CH)
async function waitChallenge(page) {
  for (let i = 0; i < 60; i++) {
    const c = await current(page)
    if (c && typeof c.progress === 'number') return c
    await sleep(250)
  }
  throw new Error('no hay reto')
}
async function openChallenge(page) {
  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-challenge-card]')
  await page.click('[data-challenge-card]')
  await page.waitForSelector('[data-challenge-view]')
}
/** Pega el texto en «Pegar un código» (desde Progreso) y lo revisa. Devuelve lo que dice la mascota o el error. */
async function paste(page, text) {
  if (!(await page.locator('[data-paste-code]').count())) {
    await page.locator('[data-paste-open]').first().click()
    await page.waitForSelector('[data-paste-code] textarea')
  }
  await page.fill('[data-paste-code] textarea', text)
  await clickText(page, /^Revisar el código$/)
  await sleep(400)
  return page.evaluate(() => (document.querySelector('[role=alert]') ?? document.querySelector('[data-paste-say]')).innerText.replace(/\s+/g, ' '))
}

const ana = await phone({ width: 390, height: 844 }, 'Ana', classToday('tense', 3) + `;await db.lookups.add({ query: 'nevertheless', context: 'It was raining; nevertheless, we went out.', result: ${JSON.stringify(WORD)}, saved: true, createdAt: Date.now() })`)
const luis = await phone({ width: 320, height: 640 }, 'Luis', `await db.profile.update('me', { name: 'Luis' });` + classToday('preposition', 2))
const a0 = await waitChallenge(ana)
const l0 = await waitChallenge(luis)
assert.deepEqual([a0.kind, a0.category, a0.target, a0.progress], ['clean', 'tense', 8, 3])
assert.deepEqual([l0.kind, l0.category, l0.target], ['clean', 'preposition', 8])
log('cada teléfono con su reto: Ana «', a0.titleEs, '» 3 de 8; Luis «', l0.titleEs, '»')

// 1) Ana reta a Luis: «Retar a alguien» → mensaje con el código (copiado: el navegador no tiene Web Share).
await openChallenge(ana)
await ana.click('[data-send-challenge]')
await waitText(ana, /Mensaje copiado/)
const reto = await clipboard(ana)
assert.match(reto, /^¡Te reto en Habla! «Sin fallar los tiempos verbales»/)
assert.match(reto, /\nHABLA:1:[A-Za-z0-9_-]+$/)
await shot(ana, OUT, '01-ana-retar-390x844')
log('Ana: «Retar a alguien» da el mensaje con el código', `(${reto.length} caracteres)`)

// 2) Luis lo pega: la mascota explica qué va a pasar; al aceptar, «Reto con Ana», medido con los datos de Luis.
await clickLabel(luis, 'Progreso')
await luis.waitForSelector('[data-paste-open]')
await luis.locator('[data-paste-open]').first().click()
await luis.waitForSelector('[data-paste-code] textarea')
assert.equal(await hScroll(luis), false)
await shot(luis, OUT, '02-luis-pegar-explicacion-320x640')
let said = await paste(luis, `[10:42] Ana: ${reto}`)
assert.match(said, /Ana te reta/)
assert.match(said, /en lugar de «Sin fallar las preposiciones»/)
await shot(luis, OUT, '03-luis-vista-previa-reto-320x640')
await clickText(luis, /^Aceptar el reto$/)
await waitText(luis, /¡Reto aceptado!/)
await clickText(luis, /^Hecho$/)
await luis.waitForSelector('[data-challenge-card]')
await waitText(luis, /Reto con Ana/)
const l1 = await waitChallenge(luis)
// Los datos de Luis: 2 respuestas largas limpias + 1 larga con un error de preposición (sin fallar el pasado: cuenta).
assert.deepEqual([l1.source, l1.fromName, l1.kind, l1.category, l1.target, l1.progress], ['shared', 'Ana', 'clean', 'tense', 8, 3])
assert.equal(await hScroll(luis), false)
await shot(luis, OUT, '04-luis-reto-con-ana-320x640')
log('Luis acepta: «Reto con Ana», medido con sus datos:', `${l1.progress} de ${l1.target}`)

// Pegar el mismo reto otra vez: «Ya es tu reto de esta semana», sin cambiar nada.
said = await paste(luis, reto)
assert.match(said, /Ya es tu reto de esta semana/)
assert.equal(await luis.locator('text=Aceptar el reto').count(), 0)
await clickLabel(luis, 'Atrás')
log('el mismo reto otra vez: no se duplica')

// 3) Progreso: Ana manda el suyo; Luis lo pega y ve «Ana: 3 de 8 · Tú: 3 de 8».
await ana.click('[data-send-progress]')
await sleep(400)
const prog = await clipboard(ana)
assert.match(prog, /^Llevo 3 de 8 en nuestro reto de Habla/)
said = await paste(luis, prog)
assert.match(said, /Progreso de Ana/)
await clickText(luis, /^Guardar para compararnos$/)
await waitText(luis, /Guardado: Ana va 3 de 8/)
await clickText(luis, /^Hecho$/)
await luis.click('[data-challenge-card]')
await luis.waitForSelector('[data-rival]')
assert.match(await bodyText(luis), /Ana: 3 de 8 · Tú: 3 de 8/)
assert.match(await bodyText(luis), /Este reto te lo mandó Ana/)
assert.equal(await hScroll(luis), false)
await luis.evaluate(() => document.querySelector('[data-rival]')?.scrollIntoView({ block: 'center' }))
await sleep(300)
await shot(luis, OUT, '05-luis-comparar-320x640')
log('comparar: «Ana: 3 de 8 · Tú: 3 de 8»')

// Un progreso de OTRO reto no se guarda (explica que hay que hacer el mismo reto).
const other = await dbEval(ana, async (db, m) => {
  const c = await db.challenges.get(m.weekKey(new Date()))
  return m.progressMessage(m.progressToCode({ ...c, target: 9 }, 2, 'Ana'))
}, null, [...CH, '/src/lib/shareCode.ts'])
said = await paste(luis, other)
assert.match(said, /tu reto de esta semana es otro/)
await clickLabel(luis, 'Atrás')
await clickLabel(luis, 'Atrás')
log('un progreso de otro reto: se explica y no se guarda')

// 4) Palabra: Ana la comparte desde Palabras; Luis la pega y entra en sus Palabras («compartida por Ana») y en su Repaso.
await clickLabel(ana, 'Palabras')
await waitText(ana, /nevertheless/)
await sleep(300)
await clickText(ana, /nevertheless/)
await ana.waitForSelector('[data-share-word]')
await shot(ana, OUT, '06-ana-compartir-palabra-390x844')
await ana.click('[data-share-word]')
await sleep(400)
const word = await clipboard(ana)
assert.match(word, /^Te paso una palabra de Habla: «nevertheless» = sin embargo\./)
await clickLabel(luis, 'Progreso')
said = await paste(luis, word)
assert.match(said, /Ana te pasa una palabra/)
await shot(luis, OUT, '07-luis-vista-previa-palabra-320x640')
await clickText(luis, /^Guardar en mis palabras$/)
await waitText(luis, /ya está en tus Palabras y en tu Repaso/)
await clickText(luis, /^Hecho$/)
const w = await dbEval(luis, async (db) => {
  const l = (await db.lookups.toArray()).filter((x) => x.result.headword === 'nevertheless')
  const cards = (await db.cards.toArray()).filter((c) => c.source === 'lookup')
  return { n: l.length, saved: l[0]?.saved, context: l[0]?.context, cards: cards.map((c) => c.answerEn) }
})
assert.deepEqual(w, { n: 1, saved: true, context: 'compartida por Ana', cards: ['It was raining; nevertheless, we went out.'] })
// Pegarla otra vez: no se duplica.
said = await paste(luis, word)
assert.match(said, /Ya tienes «nevertheless» guardada/)
assert.equal(await dbEval(luis, async (db) => (await db.lookups.toArray()).filter((x) => x.result.headword === 'nevertheless').length), 1)
await clickLabel(luis, 'Atrás')
await clickLabel(luis, 'Palabras')
await waitText(luis, /compartida por Ana/)
await shot(luis, OUT, '08-luis-palabras-320x640')
log('palabra compartida: en Palabras («compartida por Ana») y en el Repaso; repetida, no se duplica')

// 5) Códigos dañados: mensaje claro y nada cambia.
await clickLabel(luis, 'Progreso')
const before = await dbEval(luis, async (db) => ({ l: await db.lookups.count(), c: JSON.stringify(await db.challenges.toArray()) }))
said = await paste(luis, reto.slice(0, reto.length - 25))
assert.match(said, /incompleto o dañado/)
assert.equal(await hScroll(luis), false)
await shot(luis, OUT, '09-luis-codigo-danado-320x640')
said = await paste(luis, reto.replace('HABLA:1:', 'HABLA:2:'))
assert.match(said, /versión más nueva/)
said = await paste(luis, 'hola, ¿quedamos mañana?')
assert.match(said, /No encuentro ningún código/)
const afterAll = await dbEval(luis, async (db) => ({ l: await db.lookups.count(), c: JSON.stringify(await db.challenges.toArray()) }))
assert.deepEqual(afterAll, before)
log('dañado, de otra versión o sin código: mensaje claro y nada cambia')

// 6) Horizontal: la hoja «Pegar un código» (pantalla nueva).
await luis.setViewportSize({ width: 640, height: 320 })
await sleep(500)
assert.equal(await hScroll(luis), false)
await shot(luis, OUT, '10-luis-pegar-horizontal-640x320')
log('«Pegar un código» en horizontal')

await browser.close()
console.log('\nCódigos: todo bien. Capturas en', OUT)
