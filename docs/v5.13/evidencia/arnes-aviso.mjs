// 5.13 · Fase 6 · Interruptor «Aviso del reto de la semana» (Ajustes → Meta diaria). NO es parte de la app.
// Uso: node docs/v5.13/evidencia/arnes-aviso.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, clickLabel, clickText, hScroll, open, OUT_ROOT, seed, shot, sleep } from './comun.mjs'

const { browser, page } = await open({ width: 320, height: 640 })
await seed(page, { settings: { mascotNotices: false } })
await boot(page)
await page.waitForSelector('button[aria-label="Ajustes"]')
await clickLabel(page, 'Ajustes')
await sleep(500)
await clickText(page, /Meta diaria/)
await page.waitForSelector('[data-setting="challengeNudge"]')
await page.evaluate(() => document.querySelector('[data-setting="challengeNudge"]').scrollIntoView({ block: 'center' }))
await sleep(300)
assert.equal(await hScroll(page), false)
await shot(page, `${OUT_ROOT}/AVISO`, '01-ajuste-aviso-reto-320x640')
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.habla.settings')).challengeNudge)
assert.equal(await read(), undefined, 'instalación antigua: sin el ajuste guardado, vale el de por defecto (activado)')
await page.click('[data-setting="challengeNudge"]')
await sleep(400)
assert.equal(await read(), false)
console.log('✔ interruptor del aviso del reto: activado por defecto, se apaga y se guarda')
await browser.close()
