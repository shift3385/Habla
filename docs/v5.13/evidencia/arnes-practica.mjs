// 5.13 · Fase 8 · «Practicar lo mismo» (lo ejecuta arnes-familia.mjs con los dos teléfonos ya abiertos). NO es parte de la app.
import assert from 'node:assert/strict'
import { bodyText, clickLabel, clickText, dbEval, hScroll, shot, sleep, waitText } from './comun.mjs'

/** Una clase de «En la farmacia» ya terminada (nota y objetivos), como si la hubiera hecho con voz. */
const pharmacy = (db, _m, score) =>
  db.sessions.add({
    scenario: 'mission',
    startedAt: Date.now() - 20 * 60e3,
    endedAt: Date.now() - 10 * 60e3,
    mission: { situationId: 'pharmacy', titleEs: 'Algo para el dolor de cabeza', contextEs: 'x', roleEs: 'farmacéutica', roleEn: 'a pharmacist', sceneEn: 'x', goals: [{ es: 'a', en: 'a' }, { es: 'b', en: 'b' }, { es: 'c', en: 'c' }], done: [0, 1, 2] },
    metrics: { turns: 5, spokenTurns: 5, words: 70, speechSeconds: 90, wpm: 95, pauses: 1, pausesPerMin: 1, avgWords: 14, longestWords: 18, corrections: 1, score, level: 'B1' },
  })

export async function run({ ana, luis, openFamily, paste, clipboard, log, OUT }) {
  // 1) Ana propone «En la farmacia».
  await openFamily(ana)
  await ana.click('[data-propose] [aria-expanded]')
  await ana.waitForSelector('[data-propose-item="pharmacy"]')
  assert.equal(await hScroll(ana), false)
  await ana.evaluate(() => document.querySelector('[data-propose]').scrollIntoView({ block: 'center' }))
  await sleep(300)
  await shot(ana, OUT, '04-ana-proponer-practica-390x844')
  await ana.click('[data-propose-item="pharmacy"]')
  await waitText(ana, /Mensaje copiado/)
  const propuesta = await clipboard(ana)
  assert.match(propuesta, /^¿Practicamos lo mismo en Habla\? «En la farmacia»/)
  log('Ana propone «En la farmacia»')

  // 2) Luis la pega: se guarda en Mi familia y «Practicar ahora» (sin clave lleva a Ajustes, como el resto de clases).
  await openFamily(luis)
  const said = await paste(luis, propuesta)
  assert.match(said, /Ana te propone practicar lo mismo/)
  await clickText(luis, /^Guardar y practicar$/)
  await waitText(luis, /¡A practicar «En la farmacia»!/)
  await luis.waitForSelector('[data-practice-now]')
  await shot(luis, OUT, '05-luis-practicar-ahora-320x640')
  await luis.click('[data-practice-now]')
  await sleep(600)
  assert.match(await bodyText(luis), /Ajustes/, 'sin clave de Gemini, la clase lleva a Ajustes')
  const row = await dbEval(luis, (db) => db.family.get('ana'))
  assert.equal(row.practice.situationId, 'pharmacy')
  log('Luis la pega: queda en Mi familia y «Practicar ahora» abre la clase (sin clave, Ajustes)')

  // 3) Luis ya la hizo (65, 3/3): en la fila de Ana, «Mandar mi nota»; Ana la pega y lo ve junto al suyo.
  await dbEval(luis, pharmacy, 65)
  await clickLabel(luis, 'Progreso')
  await sleep(300)
  await openFamily(luis)
  await luis.waitForSelector('[data-practice-row="pharmacy"]')
  await waitText(luis, /Ana: aún sin nota · Tú: 65 \(3\/3\)/)
  await luis.click('[data-send-score]')
  await waitText(luis, /Mensaje copiado/)
  const nota = await clipboard(luis)
  assert.match(nota, /^Hice «En la farmacia» en Habla: 65 puntos \(3 de 3 objetivos\)\./)
  let s2 = await paste(ana, nota)
  assert.match(s2, /La nota de Luis/)
  assert.match(s2, /Luis sacó 65 en «En la farmacia» \(3 de 3 objetivos\)\. Tú aún no la has hecho\./)
  await clickText(ana, /^Guardar en Mi familia$/)
  await waitText(ana, /la nota de Luis está en Mi familia/)
  await clickText(ana, /^Hecho$/)
  await ana.waitForSelector('[data-practice-row="pharmacy"]')
  // Ana la hace después (58) y lo ve junto al de Luis.
  await dbEval(ana, pharmacy, 58)
  await clickLabel(ana, 'Hablar')
  await sleep(300)
  await openFamily(ana)
  await waitText(ana, /Luis: 65 \(3\/3\) · Tú: 58 \(3\/3\)/)
  await ana.evaluate(() => document.querySelector('[data-practice-row]').scrollIntoView({ block: 'center' }))
  await sleep(300)
  assert.equal(await hScroll(ana), false)
  await shot(ana, OUT, '06-ana-comparar-practica-390x844')
  await openFamily(luis)
  await luis.evaluate(() => document.querySelector('[data-practice-row]').scrollIntoView({ block: 'center' }))
  await sleep(300)
  assert.equal(await hScroll(luis), false)
  await shot(luis, OUT, '07-luis-practica-320x640')
  log('notas comparadas: «Luis: 65 (3/3) · Tú: 58 (3/3)»')
}
