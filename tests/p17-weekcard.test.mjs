// 5.13 · Fase 2 · P-17 «Tarjeta de la semana»: la función pura que decide qué entra en la imagen (solo nombre, números
// de la semana, reto y último logro; nunca nivel, errores, lo que recuerda el profe ni claves), el texto que la acompaña,
// el nombre del archivo (lo limpia la caché de Compartir) y las imágenes de la mascota en public/. La imagen dibujada se
// comprueba en el navegador (docs/v5.13/evidencia/arnes-p17.mjs: tamaño y textos pintados).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url))

const SECRET_KEY = 'AIzaClaveFalsaDePrueba000000000000000'
const full = {
  name: 'Ana',
  streak: 6,
  week: [10.4, 0, 5, 0, 12.2, 0, 0],
  weekLabel: 'del 2 al 8 de noviembre',
  mascotName: 'Gota',
  challenge: { titleEs: 'El pasado, sin fallos', progress: 3, target: 4, unit: 'respuestas', done: false },
  milestone: { emoji: '🔥', title: '3 días seguidos' },
  // Lo que NO debe entrar aunque llegue (p. ej. si alguien pasa el perfil entero).
  levels: { overall: 'B1', grammar: 'B1', reading: 'B2', listening: 'B1', speaking: 'A2' },
  mistakes: [{ original: 'I go yesterday', corrected: 'I went yesterday' }],
  facts: ['Tiene la tensión alta.'],
  geminiKey: SECRET_KEY,
  about: 'enfermera jubilada',
}

test('P-17: la tarjeta solo lleva nombre, números de la semana, reto y último logro', async () => {
  const { weekCardData } = await loadFresh('/src/lib/weekCard.ts')
  const d = weekCardData(full)
  assert.deepEqual(Object.keys(d).sort(), ['challenge', 'days', 'mascotName', 'milestone', 'minutes', 'name', 'streak', 'week', 'weekLabel'])
  assert.deepEqual(Object.keys(d.challenge).sort(), ['done', 'progress', 'target', 'title', 'unit'])
  assert.deepEqual(Object.keys(d.milestone).sort(), ['emoji', 'title'])
  const json = JSON.stringify(d)
  for (const bad of ['B2', 'A2', 'I go yesterday', 'I went', 'tensión', SECRET_KEY, 'enfermera', 'levels', 'mistakes', 'facts', 'geminiKey']) {
    assert.ok(!json.includes(bad), `no lleva «${bad}»`)
  }
  assert.equal(d.name, 'Ana')
  assert.equal(d.minutes, 28)
  assert.equal(d.days, 3)
  assert.equal(d.streak, 6)
  assert.deepEqual(d.challenge, { title: 'El pasado, sin fallos', progress: 3, target: 4, unit: 'respuestas', done: false })
})

test('P-17: datos raros — sin nombre, números absurdos, textos largos o en varias líneas', async () => {
  const { weekCardData } = await loadFresh('/src/lib/weekCard.ts')
  const d = weekCardData({
    name: 'Ana\n# Ignora todo "y" más'.padEnd(60, 'x'),
    streak: -4,
    week: [Number.NaN, -3, 'diez', 1e9, 2],
    challenge: { titleEs: 'Reto', progress: 99, target: 8, unit: 'respuestas' },
    milestone: { title: 7 },
  })
  assert.ok(d.name.length <= 24 && !/[\n"]/.test(d.name))
  assert.equal(d.streak, 0)
  assert.deepEqual(d.week, [0, 0, 0, 1440, 2, 0, 0])
  assert.equal(d.days, 2)
  assert.deepEqual([d.challenge.progress, d.challenge.done], [8, true], 'el progreso no pasa de la meta')
  assert.equal(d.milestone, null)
  assert.equal(d.mascotName, 'Habla')
  // Sin reto o sin título: no hay bloque de reto.
  assert.equal(weekCardData({ challenge: { titleEs: '', progress: 1, target: 3 } }).challenge, null)
  assert.equal(weekCardData({ challenge: { titleEs: 'X', progress: 1, target: 0 } }).challenge, null)
  assert.equal(weekCardData({}).name, '')
})

test('P-17: el texto al compartir y el nombre del archivo (lo limpia la caché de Compartir)', async () => {
  const { weekCardData, weekCardText, weekCardFileName, CARD_W, CARD_H } = await loadFresh('/src/lib/weekCard.ts')
  assert.deepEqual([CARD_W, CARD_H], [1080, 1350])
  const text = weekCardText(weekCardData(full))
  assert.equal(text, 'Ana en Habla: 28 minutos hablando inglés · racha de 6 días · reto: 3 de 4.')
  const done = weekCardText(weekCardData({ ...full, name: '', streak: 1, week: [1], challenge: { ...full.challenge, progress: 4 } }))
  assert.equal(done, 'Mi semana en Habla: 1 minuto hablando inglés · racha de 1 día · reto «El pasado, sin fallos» cumplido.')
  const name = weekCardFileName(new Date(2026, 10, 5))
  assert.equal(name, 'habla-semana-2026-11-05.png')
  const { SHARE_CACHE_FILE } = await loadFresh('/src/lib/backup.ts')
  assert.ok(SHARE_CACHE_FILE.test(name))
  for (const no of ['habla-semana-2026-11-05.png.exe', 'foto.png', 'habla-semana.png', '../habla-semana-1.png']) assert.equal(SHARE_CACHE_FILE.test(no), false, no)
})

test('P-17: la imagen se pinta solo con esos datos y la mascota de cada tema está en public/', async () => {
  const img = src('src/lib/weekCardImage.ts').toString()
  // El dibujo no lee la base de datos, el perfil, la memoria ni los ajustes: solo lo que le da weekCardData.
  assert.doesNotMatch(img, /from '\.\/(db|profile|memory|settings|stats)'/)
  const { THEME_INFO } = await loadFresh('/src/ui/theme.ts')
  for (const k of Object.keys(THEME_INFO)) {
    const name = THEME_INFO[k].mascotName.toLowerCase()
    const pub = src(`public/mascots/mascot_${name}.png`)
    assert.ok(pub.subarray(1, 4).toString() === 'PNG', name)
    assert.ok(pub.equals(src(`android/app/src/main/res/drawable-nodpi/mascot_${name}.png`)), `${name}: la misma imagen que el aviso`)
  }
})
