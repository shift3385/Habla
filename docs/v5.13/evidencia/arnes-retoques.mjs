// 5.13 · Fase 11 · Retoques en el navegador (IA falsa, docs/v5.12/evidencia/arnes.html). NO es parte de la app.
// 1) Lección del plan de principio a fin: el informe dice «Misión cumplida ✓» (o «¡casi!») con la misión de la lección;
//    la misma tarjeta sale al abrir la clase en Progreso. 2) Ajustes → Modelos: el consumo del mes y Azure Monitor bajo
//    «Avanzado», plegado (y abierto si ya está configurado). Uso: node docs/v5.13/evidencia/arnes-retoques.mjs
import assert from 'node:assert/strict'
import { boot, bodyText, calls, clickLabel, clickText, hScroll, open, OUT_ROOT, seed, setFix, shot, sleep, typeAnswer, waitText } from './comun.mjs'

const OUT = `${OUT_ROOT}/RETOQUES`
const log = (...a) => console.log('✔', ...a)
const MISSION = "Cuenta 3 experiencias usando 'I've never…'"
const lesson = (n) => ({
  id: `w1l${n}`, week: 1, n, titleEs: n === 1 ? 'Cosas que nunca he hecho' : `Lección ${n}`, kind: 'conversation',
  situationEn: 'A friendly chat about life experiences.', targetEn: "Present perfect with 'never' and 'ever'.",
  phrases: [{ en: "I've never…", es: 'Nunca he…' }], missionEs: MISSION, openerEn: 'Have you ever been abroad?',
})
const PLAN = `
  const MISSION = ${JSON.stringify(MISSION)}
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const weeks = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, titleEs: 'Semana ' + (i + 1), focusEn: 'Present perfect', focusEs: 'Presente perfecto',
    canDoEs: 'Podrás contar experiencias.', themeEn: 'Life experiences', review: [4, 8, 12].includes(i + 1), ...(i === 0 ? { lessons: [1, 2, 3, 4, 5].map(${lesson.toString()}) } : {}) }))
  await db.profile.update('me', { plan: { createdAt: Date.now(), start: start.getTime(), levelAtStart: 'B1', weeks, done: {} } })
  await db.milestones.bulkPut(['_since','first-class','class-5min','streak-3'].map((id) => ({ id, at: Date.now() - 864e5, celebratedAt: Date.now() - 864e5 })))`

// 1) Lección del plan → informe con la misión.
{
  const { browser, page } = await open({ width: 390, height: 844 })
  await seed(page, { settings: { mascotNotices: false }, extra: PLAN })
  await setFix(page, { mission_met: 'yes', mission_note_es: 'Contaste tres experiencias con «I have never».' })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await waitText(page, /Cosas que nunca he hecho/)
  await clickText(page, /^Empezar$/)
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(800)
  for (const a of ["I've never been to London.", "I've never eaten sushi, but I've tried Thai food.", "I've never driven a truck."]) await typeAnswer(page, a)
  await clickText(page, /^Terminar$/)
  await waitText(page, /Misión cumplida ✓/)
  const report = (await calls(page)).find((c) => c.keys.includes('summary_es'))
  assert.ok(report.keys.includes('mission_met'), 'el informe de una lección pide el veredicto')
  assert.match(report.last, /«Cuenta 3 experiencias usando 'I've never…'»/)
  const t = await bodyText(page)
  assert.match(t, /Cuenta 3 experiencias usando 'I've never…'/)
  assert.match(t, /Contaste tres experiencias/)
  await page.evaluate(() => document.querySelector('[data-lesson-mission]')?.scrollIntoView({ block: 'center' }))
  await sleep(400)
  assert.equal(await hScroll(page), false)
  await shot(page, OUT, '01-informe-mision-cumplida-390x844')
  log('lección del plan: el informe dice «Misión cumplida ✓» con su misión')

  // La misma tarjeta en Progreso → Sesiones.
  await clickText(page, /^Volver al inicio$/)
  await sleep(600)
  await clickLabel(page, 'Progreso')
  await sleep(600)
  await clickText(page, /^Sesiones/)
  await sleep(400)
  await clickText(page, /Cosas que nunca he hecho|Charla|Lección/)
  await page.waitForSelector('[data-lesson-mission="yes"]')
  log('Progreso → Sesiones: la misma tarjeta')

  // Una clase que no es lección del plan: ni se pide ni sale.
  await clickLabel(page, 'Atrás')
  await clickLabel(page, 'Hablar')
  await sleep(500)
  await clickLabel(page, 'Sorpréndeme')
  await page.waitForSelector('.cv-root', { timeout: 20000 })
  await sleep(700)
  const before = (await calls(page)).length
  await typeAnswer(page, 'I like walking on the beach with my dog every morning.')
  await clickText(page, /^Terminar$/)
  await waitText(page, /Cómo te fue/)
  const plain = (await calls(page)).slice(before).find((c) => c.keys.includes('summary_es'))
  assert.ok(!plain.keys.includes('mission_met'), 'fuera del plan no se pide')
  assert.equal(await page.locator('[data-lesson-mission]').count(), 0)
  log('fuera del plan: el informe es el de siempre')
  await browser.close()
}

// 2) «Avanzado» de Azure: plegado sin Azure Monitor; abierto si ya está configurado.
for (const [name, extra] of [
  ['sin-monitor', {}],
  ['con-monitor', { azureTenantId: '11111111-1111-1111-1111-111111111111', azureClientId: '22222222-2222-2222-2222-222222222222', azureClientSecret: 'x', azureResourceId: '/subscriptions/0/resourceGroups/g/providers/Microsoft.CognitiveServices/accounts/a' }],
]) {
  const { browser, page } = await open({ width: 320, height: 640 })
  await seed(page, { settings: { mascotNotices: false, azureKey: 'k', azureRegion: 'westeurope', ...extra } })
  await boot(page)
  await page.waitForSelector('button[aria-label="Ajustes"]')
  await clickLabel(page, 'Ajustes')
  await sleep(400)
  await clickText(page, /Gemini .*Modelos/)
  await page.waitForSelector('[data-azure-advanced]')
  const st = await page.evaluate(() => ({
    open: document.querySelector('[data-azure-advanced]').getAttribute('aria-expanded'),
    consumo: /Consumo de este mes/.test(document.body.innerText),
  }))
  if (name === 'sin-monitor') {
    assert.deepEqual(st, { open: 'false', consumo: false })
    await page.evaluate(() => document.querySelector('[data-azure-advanced]').scrollIntoView({ block: 'center' }))
    await sleep(300)
    await shot(page, OUT, '02-azure-avanzado-plegado-320x640')
    await page.click('[data-azure-advanced]')
    await waitText(page, /Consumo de este mes/)
    await waitText(page, /Acceso a Azure Monitor/)
    log('Azure: «Avanzado» plegado; al abrirlo, el consumo y el acceso a Azure Monitor')
  } else {
    assert.deepEqual(st, { open: 'true', consumo: true })
    log('Azure con Azure Monitor configurado: «Avanzado» abierto (el consumo a la vista)')
  }
  assert.equal(await hScroll(page), false)
  await browser.close()
}
