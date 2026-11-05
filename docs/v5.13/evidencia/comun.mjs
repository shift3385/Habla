// Utilidades de los arneses de la 5.13: las de la 5.12 (Playwright + docs/v5.12/evidencia/arnes.html con IA falsa) y
// unas pocas más. NO es parte de la app.
// Uso: `npx vite --port 5173` en la raíz del repo y `node docs/v5.13/evidencia/arnes-<fase>.mjs`. Las capturas van a
// ARNES_OUT (por defecto, el scratchpad o /tmp) y se copian al repo al final: Vite vigila la carpeta y recargaría la página.
import { tmpdir } from 'node:os'
export * from '../../v5.12/evidencia/comun.mjs'
import { sleep, bodyText } from '../../v5.12/evidencia/comun.mjs'

export const OUT_ROOT = process.env.ARNES_OUT || `${tmpdir()}/habla-arnes-513`

/** Evalúa `fn(db, mods, arg)` en la página, con db.ts y los módulos que se pidan (rutas de /src/lib). */
export const dbEval = (page, fn, arg, mods = []) =>
  page.evaluate(
    async ({ fn, arg, mods }) => {
      const { db } = await import('/src/lib/db.ts')
      const m = {}
      for (const p of mods) Object.assign(m, await import(p))
      return new Function('db', 'm', 'arg', `return (${fn})(db, m, arg)`)(db, m, arg)
    },
    { fn: fn.toString(), arg, mods },
  )

/** Toca a la mascota del Inicio (pasa al siguiente globo) hasta que el globo diga `re`. */
export async function tapMascotUntil(page, re, tries = 14) {
  const seen = new Set()
  for (let i = 0; i < tries; i++) {
    const txt = await page.evaluate(() => [...document.querySelectorAll('.tip-bubble[role=status]')].filter((b) => b.getAttribute('aria-hidden') === 'false').map((b) => b.textContent).join(' '))
    if (re.test(txt)) return txt
    if (txt) seen.add(txt.slice(0, 50))
    const box = await page.evaluate(() => {
      const svg = [...document.querySelectorAll('svg[viewBox="-110 -125 220 220"]')].find((s) => s.getBoundingClientRect().width > 30)
      const r = svg?.getBoundingClientRect()
      return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    if (box) await page.mouse.click(box.x, box.y)
    await sleep(700)
  }
  throw new Error(`la mascota no dice ${re}; dijo: ${[...seen].join(' | ')}`)
}
