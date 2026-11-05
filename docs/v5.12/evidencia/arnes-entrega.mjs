// 5.12 · Fase 4 · Entrega: aviso «Novedades de la v5.12» al abrir la app (IA falsa, arnes.html). NO es parte de la app.
// Uso: node docs/v5.12/evidencia/arnes-entrega.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, hScroll, open, seed, shot, sleep, waitText } from './comun.mjs'

for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const { browser, page } = await open(vp)
  await seed(page, { settings: { lastSeenVersion: '5.11', mascotNotices: false } })
  await boot(page)
  await waitText(page, /Novedades de la v5\.12/)
  await sleep(600)
  const t = await bodyText(page)
  assert.match(t, /Situaciones con misión, tareas al momento y un profe que se acuerda de ti/)
  assert.match(t, /Hacerla ahora/)
  assert.match(t, /Lo que recuerda tu profe/)
  assert.equal(await hScroll(page), false)
  await shot(page, 'docs/v5.12/evidencia/entrega', `01-novedades-${vp.width}x${vp.height}`)
  console.log('✔ Novedades de la v5.12', `${vp.width}×${vp.height}`)
  await browser.close()
}
