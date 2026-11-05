// 5.13 · Fase 2 · P-17 «Tarjeta de la semana» en el navegador (IA falsa, docs/v5.12/evidencia/arnes.html). NO es parte de la app.
// Uso: node docs/v5.13/evidencia/arnes-p17.mjs   (con `npx vite --port 5173` corriendo en la raíz)
// Comprueba la vista previa (vertical, 320×640 y horizontal), el tamaño de la imagen (1080×1350) y que en el canvas solo se
// pinta lo permitido: se registran todos los textos dibujados (fillText) y se buscan el nivel, los errores, lo que recuerda
// el profe y la clave. Guarda también las dos imágenes generadas (tema claro con efectos y tema oscuro en modo ligero).
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { boot, clickLabel, clickText, hScroll, open, OUT_ROOT, seed, shot, sleep } from './comun.mjs'

const OUT = `${OUT_ROOT}/P17`
mkdirSync(OUT, { recursive: true })
const log = (...a) => console.log('✔', ...a)
const KEY = 'AIzaARNES-NO-REAL-00000000000000000000'
const LONG = 'Yesterday I went to the market with my sister and we bought fresh bread and cheese.'

const DATA = `
  await db.milestones.bulkPut(['_since','first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))
  await db.facts.add({ text: 'Tiene un huerto en el pueblo.', createdAt: Date.now() })
  const now = Date.now()
  const sid = await db.sessions.add({ scenario: 'free', startedAt: now - 40 * 60e3, endedAt: now - 30 * 60e3,
    metrics: { turns: 3, spokenTurns: 3, words: 60, speechSeconds: 420, wpm: 90, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 16, corrections: 1, score: 61, level: 'B1' } })
  const bad = { original: 'I go to the beach', corrected: 'I went to the beach', explanationEs: 'Pasado.', category: 'tense', spanish: 'Fui a la playa' }
  await db.turns.bulkAdd([
    { sessionId: sid, role: 'user', text: ${JSON.stringify(LONG)}, createdAt: now - 35 * 60e3, speechSeconds: 6 },
    { sessionId: sid, role: 'user', text: 'Yesterday I go to the beach with my sister and we swim a lot.', createdAt: now - 33 * 60e3, speechSeconds: 6, corrections: [bad] },
  ])
  await db.mistakes.add({ ...bad, sessionId: sid, turnId: 2, createdAt: now })
`

/** Registra los textos que se pintan en cualquier canvas (antes de que cargue la app). */
const spyCanvas = (page) =>
  page.addInitScript(() => {
    window.__drawn = []
    const o = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (t, ...r) {
      window.__drawn.push(String(t))
      return o.call(this, t, ...r)
    }
  })

async function openCard(page) {
  await clickLabel(page, 'Progreso')
  await page.waitForSelector('[data-share-week]')
  await sleep(400)
  await page.click('[data-share-week]')
  await page.waitForSelector('[data-week-card-img]', { timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('[data-week-card-img]')?.complete)
  await sleep(300)
}

async function cardInfo(page) {
  return page.evaluate(() => {
    const img = document.querySelector('[data-week-card-img]')
    return { w: img.naturalWidth, h: img.naturalHeight, src: img.src, drawn: window.__drawn }
  })
}

const savePng = (src, name) => writeFileSync(`${OUT}/${name}`, Buffer.from(src.slice(src.indexOf(',') + 1), 'base64'))

// 1) 390×844, tema claro con todos los efectos: vista previa, imagen 1080×1350 y nada sensible en el canvas.
{
  const { browser, page } = await open()
  await spyCanvas(page)
  await seed(page, { settings: { geminiKey: KEY }, extra: DATA })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await openCard(page)
  const c = await cardInfo(page)
  assert.deepEqual([c.w, c.h], [1080, 1350])
  const drawn = c.drawn.join(' | ')
  for (const ok of [/^Ana$/m, /Mi semana · del /, /hablando inglés con Gota/, /RETO DE LA SEMANA/, /de racha/, /Último logro/, /días seguidos/]) {
    assert.match(c.drawn.join('\n'), ok, `se pinta ${ok}`)
  }
  for (const bad of ['B1', 'B2', 'A2', 'enfermera', 'huerto', 'I go', 'I went', 'beach', 'Pasado', KEY, 'viajar']) assert.ok(!drawn.includes(bad), `no se pinta «${bad}»`)
  log('imagen 1080×1350; textos pintados:', c.drawn.length, '— sin nivel, errores, memoria ni clave')
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '01-vista-previa-390x844')
  savePng(c.src, '02-tarjeta-claro-1080x1350.png')

  // «Compartir»: en el navegador, Web Share si lo hay o descarga del PNG con su nombre.
  const dl = page.waitForEvent('download', { timeout: 4000 }).catch(() => null)
  await clickText(page, /^Compartir$/)
  const file = await dl
  if (file) {
    assert.match(file.suggestedFilename(), /^habla-semana-\d{4}-\d{2}-\d{2}\.png$/)
    log('Compartir (navegador sin Web Share): descarga', file.suggestedFilename())
  } else log('Compartir: el navegador usó Web Share')
  await sleep(500)
  await clickText(page, /^Cerrar$/)
  await sleep(300)
  assert.equal(await page.locator('[data-week-card]').count(), 0)
  log('Cerrar vuelve a Progreso')

  // Horizontal (pantalla nueva).
  await page.setViewportSize({ width: 844, height: 390 })
  await sleep(300)
  await page.click('[data-share-week]')
  await page.waitForSelector('[data-week-card-img]')
  await sleep(600)
  assert.equal(await hScroll(page), false)
  const box = await page.evaluate(() => {
    const r = document.querySelector('[data-week-card-img]').getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, h: innerHeight }
  })
  assert.ok(box.top >= 0 && box.bottom <= box.h + 1, 'la imagen cabe entera en horizontal')
  await shot(page, OUT, '03-vista-previa-horizontal-844x390')
  log('vista previa en horizontal: la imagen cabe entera')
  await browser.close()
}

// 2) 320×640, tema oscuro (Ember) en modo ligero: la tarjeta se pinta sin manchas y la vista previa cabe.
{
  const { browser, page } = await open({ width: 320, height: 640 })
  await spyCanvas(page)
  const off = { blur: false, background: false, glow: false, motion: false, mascot: false }
  await seed(page, { settings: { geminiKey: KEY, theme: 'ember', mode: 'dark', effects: off }, extra: DATA })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await openCard(page)
  const c = await cardInfo(page)
  assert.deepEqual([c.w, c.h], [1080, 1350])
  assert.match(c.drawn.join('\n'), /hablando inglés con Chispa/)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '04-vista-previa-ligero-oscuro-320x640')
  savePng(c.src, '05-tarjeta-oscuro-ligero-1080x1350.png')
  log('320×640, oscuro y modo ligero: bien')
  await browser.close()
}
console.log('\nP-17: todo bien. Capturas en', OUT)
