// 5.13 · Fases 7 y 8 · «Mi familia» y «Practicar lo mismo» en el navegador, con DOS teléfonos simulados (Ana 390×844 y
// Luis 320×640, cada uno con su IndexedDB). Los mensajes pasan por el portapapeles como por WhatsApp. NO es parte de la app.
// Uso: node docs/v5.13/evidencia/arnes-familia.mjs [7|8]   (con `npx vite --port 5173` en la raíz; sin número, las dos)
import assert from 'node:assert/strict'
import { boot, bodyText, chromium, clickLabel, clickText, dbEval, hScroll, ORIGIN, OUT_ROOT, seed, shot, sleep, waitText } from './comun.mjs'

const ONLY = process.argv[2]
const OUT = `${OUT_ROOT}/FAMILIA`
const log = (...a) => console.log('✔', ...a)
const QUIET = `await db.milestones.bulkPut(['_since','first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })));`
const classToday = (minutes) => `
  const now = Date.now()
  await db.sessions.add({ scenario: 'free', startedAt: now - 40 * 60e3, endedAt: now - 30 * 60e3,
    metrics: { turns: 4, spokenTurns: 4, words: 80, speechSeconds: ${minutes * 60}, wpm: 90, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 16, corrections: 0, score: 60, level: 'B1' } });`
const browser = await chromium.launch()

async function phone(viewport, who, extra) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${who}] pageerror`, e.message))
  await seed(page, { settings: { geminiKey: '', mascotNotices: false }, extra: QUIET + extra })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  return page
}
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
async function openFamily(page) {
  if (await page.locator('[data-family-view]').count()) return
  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-family-open]')
  await sleep(500)
  await page.click('[data-family-open]')
  await page.waitForSelector('[data-family-view]')
}
async function paste(page, text, accept) {
  await page.locator('[data-family-view] [data-paste-open]').click()
  await page.waitForSelector('[data-paste-code] textarea')
  await page.fill('[data-paste-code] textarea', text)
  await clickText(page, /^Revisar el código$/)
  await sleep(400)
  const said = await page.evaluate(() => (document.querySelector('[role=alert]') ?? document.querySelector('[data-paste-say]')).innerText.replace(/\s+/g, ' '))
  if (accept) {
    await clickText(page, accept)
    await waitText(page, /Guardado|Hecho/)
    await clickText(page, /^Hecho$/)
    await sleep(400)
  }
  return said
}

const ana = await phone({ width: 390, height: 844 }, 'Ana', classToday(12))
const luis = await phone({ width: 320, height: 640 }, 'Luis', `await db.profile.update('me', { name: 'Luis' });` + classToday(7))

if (!ONLY || ONLY === '7') {
  // 1) Ana manda su semana; Luis la pega y Ana aparece en su tablero.
  await openFamily(ana)
  await waitText(ana, /Aún no te ha mandado nadie su semana/)
  await ana.click('[data-send-week]')
  await waitText(ana, /Mensaje copiado/)
  const semanaAna = await clipboard(ana)
  assert.match(semanaAna, /^Mi semana en Habla: 12 min hablando inglés, racha de 1 día; reto «.+»: \d+ de \d+\.\n/)
  await openFamily(luis)
  let said = await paste(luis, semanaAna)
  assert.match(said, /La semana de Ana/)
  assert.match(said, /Ana \(esta semana\): 12 min/)
  await clickText(luis, /^Guardar en Mi familia$/)
  await waitText(luis, /Ana ya está en Mi familia/)
  await clickText(luis, /^Hecho$/)
  await luis.waitForSelector('[data-family-row="Ana"]')
  // 2) Luis manda la suya; Ana la pega.
  await luis.click('[data-send-week]')
  await sleep(400)
  const semanaLuis = await clipboard(luis)
  said = await paste(ana, semanaLuis, /^Guardar en Mi familia$/)
  await ana.waitForSelector('[data-family-row="Luis"]')
  assert.match(await bodyText(ana), /Luis 7 min · racha de 1/)
  assert.equal(await hScroll(ana), false)
  await shot(ana, OUT, '01-ana-mi-familia-390x844')
  assert.equal(await hScroll(luis), false)
  await shot(luis, OUT, '02-luis-mi-familia-320x640')
  log('Ana y Luis se mandan la semana y se ven en Mi familia')

  // 3) Un código de una semana anterior no pisa el más reciente; uno de otra persona añade otra fila.
  const old = await dbEval(ana, async (db, m) => m.weekMessage(m.weekToCode({ from: 'Luis', week: '2026-10-26', minutes: 99, streak: 9, days: 7 })), null, ['/src/lib/shareCode.ts'])
  said = await paste(ana, old)
  assert.match(said, /Luis \(una semana anterior\)/)
  await clickText(ana, /^Guardar en Mi familia$/)
  await waitText(ana, /Ya tenías una semana más reciente de Luis/)
  await clickText(ana, /^Hecho$/)
  const mama = await dbEval(ana, async (db, m) => m.weekMessage(m.weekToCode({ from: 'Mamá', week: '2026-10-26', minutes: 30, streak: 3, days: 3 })), null, ['/src/lib/shareCode.ts'])
  await paste(ana, mama, /^Guardar en Mi familia$/)
  await ana.waitForSelector('[data-family-row="Mamá"]')
  assert.match(await bodyText(ana), /Luis 7 min/)
  assert.match(await bodyText(ana), /Semana anterior · 30 min/)
  log('un código más antiguo no pisa el nuevo; otra persona = otra fila (semana anterior en gris)')
  // 4) Borrar a alguien.
  await ana.click('[aria-label="Quitar a Mamá"]')
  await clickText(ana, /^Borrar$/)
  await sleep(400)
  assert.equal(await ana.locator('[data-family-row="Mamá"]').count(), 0)
  assert.equal(await dbEval(ana, (db) => db.family.count()), 1)
  log('borrar una fila')
  // 5) Sin nombre no se puede mandar.
  await dbEval(luis, (db) => db.profile.update('me', { name: '' }))
  await clickLabel(luis, 'Ajustes') // el nombre se cambia en Ajustes: al volver, Progreso lo lee otra vez
  await sleep(300)
  await openFamily(luis)
  await luis.click('[data-send-week]')
  await waitText(luis, /Pon tu nombre en Ajustes/)
  await dbEval(luis, (db) => db.profile.update('me', { name: 'Luis' }))
  await clickLabel(luis, 'Ajustes')
  await sleep(300)
  log('sin nombre, la app pide ponerlo antes de mandar')
  // Horizontal (pantalla nueva).
  await ana.setViewportSize({ width: 844, height: 390 })
  await sleep(500)
  assert.equal(await hScroll(ana), false)
  await shot(ana, OUT, '03-ana-mi-familia-horizontal-844x390')
  await ana.setViewportSize({ width: 390, height: 844 })
}

if (!ONLY || ONLY === '8') {
  const fase8 = await import('./arnes-practica.mjs')
  await fase8.run({ ana, luis, openFamily, paste, clipboard, log, OUT })
}
await browser.close()
console.log('\nMi familia: todo bien. Capturas en', OUT)
