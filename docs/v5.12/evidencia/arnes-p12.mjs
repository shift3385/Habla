// 5.12 · Fase 2 · P-12 «Situaciones» en el navegador (IA falsa, arnes.html). NO es parte de la app.
// Uso: node docs/v5.12/evidencia/arnes-p12.mjs   (con `npx vite --port 5173` corriendo en la raíz)
import assert from 'node:assert/strict'
import { boot, bodyText, calls, clickLabel, clickText, hScroll, open, seed, setFix, shot, sleep, typeAnswer, waitText } from './comun.mjs'

const OUT = 'docs/v5.12/evidencia/P12'
const log = (...a) => console.log('✔', ...a)
const MISSION = {
  title_es: 'Algo para el dolor de cabeza',
  context_es: 'Estás de viaje en Dublín y te duele mucho la cabeza. Entras en una farmacia.',
  role_es: 'farmacéutica',
  role_en: 'a pharmacist',
  scene_en: 'A pharmacy in Dublin. The customer (the student) has a bad headache.',
  goals: [
    { es: 'Explica qué te pasa', en: 'Explain the problem' },
    { es: 'Pregunta cómo tomar la medicina', en: 'Ask how to take the medicine' },
    { es: 'Pregunta el precio y paga', en: 'Ask the price and pay' },
  ],
  goals_met: [],
  reply: 'Of course. How long have you had the headache?',
  reply_es: 'Claro. ¿Desde cuándo te duele la cabeza?',
}
const ticked = (page) => page.locator('.cv-goals li .line-through').count()
/** ¿El Inicio desplaza? (el contenedor de la pestaña) */
const homeScrolls = (page) => page.evaluate(() => {
  const el = document.querySelector('.tab-content')
  return { scroll: el.scrollHeight - el.clientHeight }
})
const silenceMilestones = `await db.milestones.bulkPut(['first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now(), celebratedAt: Date.now() })))`

// 1) Prácticas sin desplazar en 320×640, 390×844 y 780×360.
for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 780, height: 360 }]) {
  const { browser, page } = await open(vp)
  await seed(page, { settings: { mascotNotices: false }, extra: silenceMilestones })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickText(page, /^Prácticas/)
  await sleep(700)
  const m = await homeScrolls(page)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, `01-practicas-${vp.width}x${vp.height}`)
  console.log(`  Inicio · Prácticas ${vp.width}×${vp.height}: desplaza ${m.scroll} px`)
  if (vp.height > vp.width) assert.ok(m.scroll <= 0, `el Inicio no debe desplazar en ${vp.width}×${vp.height} (${m.scroll} px)`)
  await browser.close()
}
log('Prácticas con «Situaciones» sin desplazar en vertical')

// 2) Elegir «En la farmacia» → misión → tachar 1, 2, 3 → «¡Lo conseguiste!» → informe «¡Misión cumplida!».
{
  const { browser, page } = await open({ width: 390, height: 844 })
  await seed(page, { settings: { mascotNotices: false }, extra: silenceMilestones })
  await setFix(page, MISSION)
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickText(page, /^Prácticas/)
  await sleep(500)
  await clickText(page, /^Situaciones/)
  await waitText(page, /¿Qué situación practicamos\?/)
  await sleep(400)
  await shot(page, OUT, '02-elegir-situacion-390x844')
  await clickText(page, /En la farmacia/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(900)
  const cs = await calls(page)
  const prep = cs.find((c) => c.keys.includes('context_es')) // 5.13: el reto de la semana también pide title_es
  assert.ok(prep && /buying something at a pharmacy/.test(prep.last), 'Gemini prepara la misión de la farmacia')
  const teacher = cs.find((c) => /Role-play mission/.test(c.system))
  assert.ok(teacher, 'el profe recibe la misión')
  assert.ok(teacher.keys.includes('goals_met'), 'y el esquema pide goals_met')
  assert.match(teacher.system, /You play a pharmacist/)
  assert.equal(await ticked(page), 0)
  assert.match(await bodyText(page), /Situación · farmacéutica/i)
  await shot(page, OUT, '03-clase-objetivos-390x844')
  log('misión preparada y objetivos a la vista')

  await setFix(page, { ...MISSION, goals_met: [1] })
  await typeAnswer(page, 'Hello, I have a very bad headache since this morning.')
  assert.equal(await ticked(page), 1)
  await shot(page, OUT, '04-clase-objetivo-tachado-390x844')
  log('objetivo 1 tachado')
  await setFix(page, { ...MISSION, goals_met: [1, 2] })
  await typeAnswer(page, 'How many pills can I take every day?')
  assert.equal(await ticked(page), 2)
  await setFix(page, { ...MISSION, goals_met: [2, 3], reply: 'That is 6 euros. Here you are, get well soon!' })
  await typeAnswer(page, 'How much is it? Can I pay by card?')
  await waitText(page, /¡Lo conseguiste!/)
  await sleep(500)
  await shot(page, OUT, '05-lo-conseguiste-390x844')
  log('«¡Lo conseguiste!» con los 3 (el 1 sigue tachado aunque el profe no lo repita)')
  await clickText(page, /^Terminar y ver mi informe$/)
  await waitText(page, /¡Misión cumplida!/)
  await sleep(900)
  await shot(page, OUT, '06-informe-mision-cumplida-390x844')
  const saved = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.ts')
    const s = (await db.sessions.toArray()).at(-1)
    return { scenario: s.scenario, title: s.mission?.titleEs, done: s.mission?.done }
  })
  assert.deepEqual(saved, { scenario: 'mission', title: MISSION.title_es, done: [0, 1, 2] })
  log('informe y sesión guardada', JSON.stringify(saved))
  await browser.close()
}

// 3) Horizontal 780×360: «Describir la mía» → tu frase entra en la preparación → 1 objetivo → salir y continuar.
{
  const { browser, page } = await open({ width: 780, height: 360 })
  await seed(page, { settings: { mascotNotices: false }, extra: silenceMilestones })
  const MINE = 'Devolver un abrigo que me queda pequeño'
  await setFix(page, {
    ...MISSION,
    title_es: 'Devolver un abrigo',
    context_es: 'Compraste un abrigo ayer y te queda pequeño. Vuelves a la tienda.',
    role_es: 'dependiente',
    role_en: 'a shop assistant',
    scene_en: 'A clothes shop. The customer wants to return a coat that is too small.',
    goals: [
      { es: 'Explica el problema', en: 'Explain the problem' },
      { es: 'Pide otra talla o el dinero', en: 'Ask for another size or a refund' },
      { es: 'Da las gracias y despídete', en: 'Say thank you and goodbye' },
    ],
  })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickText(page, /^Prácticas/)
  await sleep(400)
  await clickText(page, /^Situaciones/)
  await clickText(page, /^Describir la mía$/)
  await page.locator('textarea').fill(MINE)
  await sleep(300)
  await shot(page, OUT, '07-la-mia-780x360')
  await clickText(page, /^Preparar mi misión$/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(900)
  const prep = (await calls(page)).find((c) => c.keys.includes('context_es')) // 5.13: el reto de la semana también pide title_es
  assert.ok(prep.last.includes(`"${MINE}"`), 'tu frase va en la preparación')
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '08a-clase-horizontal-voz-780x360')
  await setFix(page, { goals_met: [1], reply: 'Oh no! Do you have the receipt?', reply_es: '¡Vaya! ¿Tienes el tique?' })
  await typeAnswer(page, 'Hi, I bought this coat yesterday but it is too small for me.')
  assert.equal(await ticked(page), 1)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '08-clase-horizontal-780x360')
  log('tu situación propia y clase en horizontal')
  // Salir guarda la clase; al continuarla, la misión y lo tachado siguen ahí.
  await clickLabel(page, 'Salir y guardar la clase')
  await page.waitForSelector('button[aria-label="Ajustes"]', { timeout: 10000 })
  await clickText(page, /^Continuar$/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(700)
  assert.equal(await ticked(page), 1)
  assert.match(await bodyText(page), /Devolver un abrigo/)
  log('al continuar la clase guardada, la misión sigue con su objetivo tachado')
  await browser.close()
}
// 4) 320×640 y modo ligero (todos los efectos apagados): clase recién empezada (modo voz), objetivos y micro a la vista.
{
  const { browser, page } = await open({ width: 320, height: 640 })
  const effects = { blur: false, background: false, glow: false, motion: false, mascot: false }
  await seed(page, { settings: { mascotNotices: false, effects }, extra: silenceMilestones })
  await setFix(page, MISSION)
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickText(page, /^Prácticas/)
  await sleep(400)
  await clickText(page, /^Situaciones/)
  await sleep(400)
  await shot(page, OUT, '09-elegir-situacion-320x640-ligero')
  await clickText(page, /En el hotel/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(900)
  const mic = await page.locator('button[aria-label="Tocar para hablar"]').boundingBox()
  assert.ok(mic && mic.y + mic.height <= 640, 'el micro se ve entero')
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '10-clase-voz-320x640-ligero')
  log('320×640 en modo ligero: objetivos y micro a la vista')
  await browser.close()
}
console.log('P-12: todo bien')
