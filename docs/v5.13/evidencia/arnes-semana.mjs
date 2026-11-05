// 5.13 · Fase 10 · Línea de la semana del Inicio (UX-11) en el navegador. NO es parte de la app.
// Comprueba que sale en el hueco de abajo donde cabe y que nunca hace desplazar el Inicio (390×844, 320×640, horizontal y
// letra muy grande, en Temas y Prácticas). Uso: node docs/v5.13/evidencia/arnes-semana.mjs (con `npx vite --port 5173`).
import assert from 'node:assert/strict'
import { boot, clickText, open, OUT_ROOT, seed, shot, sleep } from './comun.mjs'

const OUT = `${OUT_ROOT}/SEMANA`
const log = (...a) => console.log('✔', ...a)
// Hablaste el lunes de esta semana y hoy; logros: ya tienes la racha de 3 y la primera clase de 5 minutos.
const DATA = `
  await db.milestones.bulkPut(['_since','streak-3','class-5min','first-class'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))
  const d = new Date(); const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 10).getTime()
  const m = { turns: 4, spokenTurns: 4, words: 80, speechSeconds: 300, wpm: 90, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 16, corrections: 0, score: 60, level: 'B1' }
  await db.sessions.add({ scenario: 'free', startedAt: monday, endedAt: monday + 600e3, metrics: m })
  await db.sessions.add({ scenario: 'free', startedAt: Date.now() - 3600e3, endedAt: Date.now() - 3000e3, metrics: m })`
const state = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('.tab-content')
    const strip = document.querySelector('[data-week-strip]')
    return { scrolls: box.scrollHeight > box.clientHeight + 1, strip: !!strip, text: strip?.innerText.replace(/\s+/g, ' ') ?? '' }
  })

const cases = [
  { vp: { width: 390, height: 844 }, name: '390x844', expect: true },
  { vp: { width: 320, height: 640 }, name: '320x640' },
  { vp: { width: 844, height: 390 }, name: '844x390' },
  { vp: { width: 390, height: 844 }, name: '390x844-letra-xl', settings: { fontScale: 1.3 } },
]
for (const c of cases) {
  const { browser, page } = await open(c.vp)
  await seed(page, { settings: { mascotNotices: false, ...(c.settings ?? {}) }, extra: DATA })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await sleep(2500) // que lleguen la tarjeta del plan, el repaso y la línea, y se mida
  for (const tab of ['Temas', 'Prácticas']) {
    await clickText(page, new RegExp(`^${tab}`))
    await sleep(1200)
    const s = await state(page)
    // La línea nunca hace desplazar: si la pestaña ya desplaza sin ella (en horizontal pasa desde antes, medido en la 5.12:
    // «780×360: desplaza 320 px»), la línea no sale.
    if (s.scrolls) assert.equal(s.strip, false, `${c.name} · ${tab}: con la pestaña desplazando, la línea no sale`)
    else if (!c.vp.width || c.vp.width < c.vp.height) assert.equal(s.scrolls, false)
    if (c.expect && tab === 'Temas') {
      assert.equal(s.strip, true, `${c.name}: la línea cabe y sale`)
      assert.match(s.text, /2 días hablando esta semana/)
    }
    if (s.strip) assert.match(s.text, /días? hablando esta semana|aún no has hablado/)
    await shot(page, OUT, `${c.name}-${tab === 'Temas' ? 'temas' : 'practicas'}`)
    log(`${c.name} · ${tab}: ${s.scrolls ? 'ya desplazaba (horizontal)' : 'sin desplazar'}; línea ${s.strip ? `visible («${s.text}»)` : 'oculta (no cabe)'}`)
  }
  await browser.close()
}
