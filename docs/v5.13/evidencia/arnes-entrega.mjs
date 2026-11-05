// 5.13 · Fase 4 · Entrega: aviso «Novedades de la v5.13» al abrir la app (IA falsa, docs/v5.12/evidencia/arnes.html).
// NO es parte de la app. Uso: node docs/v5.13/evidencia/arnes-entrega.mjs   (con `npx vite --port 5173` en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, hScroll, open, OUT_ROOT, seed, shot, sleep, waitText } from './comun.mjs'

for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const { browser, page } = await open(vp)
  await seed(page, { settings: { lastSeenVersion: '5.12', mascotNotices: false } })
  await boot(page)
  await waitText(page, /Novedades de la v5\.13/)
  await sleep(600)
  const t = await bodyText(page)
  assert.match(t, /Retos en familia: tu reto de la semana, tu tarjeta para WhatsApp y códigos para compartir/)
  assert.match(t, /Reto de la semana/)
  assert.match(t, /Compartir mi semana/)
  assert.match(t, /Pegar un código/)
  assert.match(t, /Mi familia/)
  assert.equal(await hScroll(page), false)
  await shot(page, `${OUT_ROOT}/entrega`, `01-novedades-${vp.width}x${vp.height}`)
  console.log('✔ Novedades de la v5.13', `${vp.width}×${vp.height}`)
  await browser.close()
}
