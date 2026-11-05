// 5.13 · Fase 5 · «Escribir en inglés» en el navegador (IA falsa, docs/v5.12/evidencia/arnes.html). NO es parte de la app.
// Uso: node docs/v5.13/evidencia/arnes-mensaje.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, calls, chromium, clickText, hScroll, ORIGIN, OUT_ROOT, seed, setFix, shot, sleep, waitText, clickLabel } from './comun.mjs'

const OUT = `${OUT_ROOT}/MENSAJE`
const log = (...a) => console.log('✔', ...a)
const browser = await chromium.launch()
const QUIET = `await db.milestones.bulkPut(['_since','first-class'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))`

for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await seed(page, { extra: QUIET })
  await setFix(page, {
    was_spanish: false,
    corrected_en: 'Hi Ana! Yesterday I went to the beach with my sister. It was amazing.',
    natural_en: 'Hi Ana! I went to the beach with my sister yesterday. It was amazing!',
    notes_es: ['«I go» → «I went»: el pasado de «go».', '«It were» → «It was»: con «it», «was».'],
  })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-message-open]')
  await page.click('[data-message-open]')
  await page.waitForSelector('[data-message-sheet] textarea')
  await page.fill('[data-message-sheet] textarea', 'Hi Ana! Yesterday I go to the beach with my sister. It were amazing.')
  if (vp.width === 390) await shot(page, OUT, '01-escribir-390x844')
  const before = (await calls(page)).length
  await clickText(page, /^Corregir mi mensaje$/)
  await page.waitForSelector('[data-message-notes]')
  const call = (await calls(page)).slice(before).find((c) => c.keys.includes('corrected_en'))
  assert.ok(call, 'una llamada para corregir')
  assert.match(call.last, /<<<MESSAGE\nHi Ana! Yesterday I go to the beach/)
  assert.match(await bodyText(page), /Te lo he corregido/)
  await page.click('[data-pick="natural"]')
  await clickText(page, /Añadir también lo que escribí yo/)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, `02-corregido-${vp.width}x${vp.height}`)
  await page.click('[data-send-message]')
  await waitText(page, /Mensaje copiado/)
  const sent = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(sent, 'Hi Ana! I went to the beach with my sister yesterday. It was amazing!\n\n(Lo que escribí yo: Hi Ana! Yesterday I go to the beach with my sister. It were amazing.)')
  log(`${vp.width}×${vp.height}: corregido, versión natural elegida y mandado con lo que escribí yo`)
  // Atrás cierra la hoja.
  await clickLabel(page, 'Atrás')
  await sleep(300)
  assert.equal(await page.locator('[data-message-sheet]').count(), 0)
  await ctx.close()
}
await browser.close()
console.log('\nMensaje revisado: todo bien. Capturas en', OUT)
