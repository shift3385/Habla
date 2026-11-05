// Medida: cuánto desplaza el Inicio en Prácticas (px), con letra Normal y Muy grande. Uso: node medir-practicas.mjs <etiqueta>
import { boot, clickText, open, seed, sleep } from './comun.mjs'
const out = []
for (const fs of [1, 1.3]) for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 780, height: 360 }]) {
  const { browser, page } = await open(vp)
  await seed(page, { settings: { mascotNotices: false, fontScale: fs } })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickText(page, /^Prácticas/)
  await sleep(700)
  const m = await page.evaluate(() => { const el = document.querySelector('.tab-content'); return el.scrollHeight - el.clientHeight })
  out.push(`${process.argv[2]} fs=${fs} ${vp.width}x${vp.height}: ${m}`)
  await browser.close()
}
console.log(out.join('\n'))
