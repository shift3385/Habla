// Utilidades de los arneses de la 5.12 (Playwright + arnes.html con IA falsa). NO es parte de la app.
// Uso: con `npx vite --port 5173` corriendo en la raíz del repo; Playwright del contenedor (PLAYWRIGHT_MODULE).
import { mkdirSync } from 'node:fs'

const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs'
export const { chromium } = await import(PW)
export const PORT = process.env.ARNES_PORT || 5173
export const ORIGIN = `http://arnes.localhost:${PORT}`
export const URL = `${ORIGIN}/docs/v5.12/evidencia/arnes.html`
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const DAY = 864e5

export async function open(viewport = { width: 390, height: 844 }) {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio'] })
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  return { browser, ctx, page }
}

/**
 * Base limpia: borra IndexedDB y localStorage y siembra ajustes, perfil calibrado y lo que devuelva `extra(db)`.
 * Se hace desde version.json (sin la app): si la app arrancara a la vez, crearía su perfil neutro encima.
 */
export async function seed(page, { settings = {}, extra = '' } = {}) {
  await page.goto(`${ORIGIN}/version.json`)
  return page.evaluate(
    async ({ settings, extra }) => {
      localStorage.clear()
      await new Promise((r) => {
        const q = indexedDB.deleteDatabase('habla')
        q.onsuccess = q.onerror = q.onblocked = () => r()
      })
      const v = await (await fetch('/version.json')).json()
      localStorage.setItem(
        'CapacitorStorage.habla.settings',
        JSON.stringify({
          geminiKey: 'AIzaARNES-NO-REAL-00000000000000000000',
          onboarded: true,
          keysIntroSeen: true,
          lastSeenVersion: v.version,
          mascotTapped: true,
          mascotNudgeSeen: true,
          mascotNotices: true,
          mascotAdvice: false,
          homeworkSeen: 0,
          soundsIntroSeen: true,
          grammarIntroSeen: true,
          reviewHelpSeen: true,
          theme: 'marea',
          mode: 'light',
          ...settings,
        }),
      )
      const { db } = await import('/src/lib/db.ts')
      const L = 'B1'
      await db.profile.put({
        id: 'me', name: 'Ana', about: 'enfermera jubilada', weaknesses: ['past simple'], goal: 'viajar', startedAt: Date.now() - 30 * 864e5,
        levels: { overall: L, grammar: L, reading: L, listening: L, speaking: 'A2' }, calibratedAt: Date.now() - 3600e3, purposes: [],
        interests: ['news', 'ai', 'tech'],
      })
      // eslint-disable-next-line no-new-func
      if (extra) await new Function('db', `return (async () => { ${extra} })()`)(db)
      return 'datos listos'
    },
    { settings, extra },
  )
}

/** Pone las respuestas de la IA falsa para lo que venga (se lee en cada petición). */
export const setFix = (page, fix) => page.evaluate((f) => localStorage.setItem('arnes.fix', JSON.stringify(f)), fix)

/** Abre la app y pasa la bienvenida («Continuar donde lo dejé»). Devuelve el texto de la primera pantalla tras ella. */
export async function boot(page) {
  await page.goto(URL)
  for (let i = 0; i < 80; i++) {
    const done = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /^Continuar donde lo dej/.test(x.textContent.trim()))
      if (b) {
        b.click()
        return false
      }
      return !!document.querySelector('button[aria-label="Ajustes"]') || /Tu tarea de hoy|¡Hola de nuevo!/.test(document.body.innerText)
    })
    if (done) return
    await sleep(250)
  }
  throw new Error('no se pasó la bienvenida: ' + (await bodyText(page)).slice(0, 200))
}

export const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))

/** Toca el botón (o [role=button]) cuyo texto encaja con la expresión. */
export async function clickText(page, re, { last = false } = {}) {
  const ok = await page.evaluate(
    ({ s, last }) => {
      const all = [...document.querySelectorAll('button,[role=button]')].filter((x) => new RegExp(s).test(x.textContent.replace(/\s+/g, ' ').trim()))
      const b = last ? all.at(-1) : all[0]
      b?.click()
      return !!b
    },
    { s: re.source ?? re, last },
  )
  if (!ok) throw new Error(`no hay botón ${re}: ${(await bodyText(page)).slice(0, 300)}`)
}
/** Toca el botón con ese aria-label (clic en el DOM: el micro se vuelve a pintar con su animación y Playwright no lo
 * da por «quieto»). Reintenta unos segundos si aún no está. */
export async function clickLabel(page, l) {
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate((l) => {
      const b = document.querySelector(`button[aria-label="${l}"]`)
      b?.click()
      return !!b
    }, l)
    if (ok) return
    await sleep(150)
  }
  await page.screenshot({ path: 'arnes-fallo.png' })
  throw new Error(`no hay botón «${l}»: ${(await bodyText(page)).slice(0, 300)}`)
}

/** Espera a que el texto de la página encaje con la expresión. */
export async function waitText(page, re, ms = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (re.test(await bodyText(page))) return
    await sleep(200)
  }
  throw new Error(`no aparece ${re}: ${(await bodyText(page)).slice(0, 400)}`)
}

/** En la clase: responde escribiendo (teclado) y espera la respuesta del profe. */
export async function typeAnswer(page, text) {
  for (let i = 0; i < 5 && !(await page.locator('textarea').count()); i++) {
    await clickLabel(page, 'Escribir la respuesta')
    await sleep(400)
  }
  if (!(await page.locator('textarea').count())) {
    await page.screenshot({ path: 'arnes-fallo.png' })
    throw new Error('no se abrió el teclado: ' + (await bodyText(page)).slice(0, 300))
  }
  await page.locator('textarea').fill(text)
  const before = await page.evaluate(() => window.__AI.calls.length)
  await clickLabel(page, 'Enviar')
  for (let i = 0; i < 60 && (await page.evaluate(() => window.__AI.calls.length)) === before; i++) await sleep(150)
  await sleep(900)
}

export const calls = (page) => page.evaluate(() => window.__AI.calls)
export const shot = (page, dir, name) => {
  mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: `${dir}/${name}.jpg`, type: 'jpeg', quality: 72 })
}
/** ¿La página desplaza en horizontal? (no debe en ninguna pantalla) */
export const hScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
