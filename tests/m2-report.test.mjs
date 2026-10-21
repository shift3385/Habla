// 5.11 (M-07): el informe te compara con tu media de las últimas 5 clases y «Hoy has sonado como…» (UX-09).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const metrics = (o = {}) => ({
  turns: 5,
  spokenTurns: 5,
  words: 100,
  speechSeconds: 60,
  wpm: 80,
  pauses: 3,
  pausesPerMin: 2,
  avgWords: 20,
  longestWords: 30,
  corrections: 2,
  score: 50,
  level: 'B1',
  ...o,
})
/** n clases anteriores (días 1…n) con la velocidad 70, 72, 74… */
const history = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, startedAt: (i + 1) * 86400000, metrics: metrics({ wpm: 70 + 2 * i, score: 40 + i }) }))
const NOW = { id: 999, startedAt: 100 * 86400000 }

test('M-07: media con 0, 1, 2, 5 y 8 clases previas (con menos de 2, «primera referencia»)', async () => {
  const { baselineFrom } = await loadFresh('/src/lib/fluency.ts')
  assert.equal(baselineFrom([], NOW), null)
  assert.equal(baselineFrom(history(1), NOW), null)
  const two = baselineFrom(history(2), NOW)
  assert.deepEqual(two, { classes: 2, wpm: 71, pausesPerMin: 2, avgWords: 20, score: 41 })
  const five = baselineFrom(history(5), NOW)
  assert.equal(five.classes, 5)
  assert.equal(five.wpm, 74) // (70+72+74+76+78)/5
  // Con 8 solo cuentan las 5 MÁS RECIENTES (días 4…8: 76…84).
  const eight = baselineFrom(history(8), NOW)
  assert.equal(eight.classes, 5)
  assert.equal(eight.wpm, 80)
  assert.equal(eight.score, 45) // (43+44+45+46+47)/5
  // El orden de entrada no importa.
  assert.deepEqual(baselineFrom(history(8).reverse(), NOW), eight)
})

test('M-07: la propia clase, las posteriores y las que no terminaron no cuentan', async () => {
  const { baselineFrom } = await loadFresh('/src/lib/fluency.ts')
  const all = [
    ...history(2),
    { id: 999, startedAt: NOW.startedAt, metrics: metrics({ wpm: 500 }) }, // la propia
    { id: 1000, startedAt: NOW.startedAt + 1, metrics: metrics({ wpm: 500 }) }, // posterior (informe de una clase antigua)
    { id: 50, startedAt: 50 * 86400000 }, // a medias: sin métricas
    { id: 51, startedAt: 51 * 86400000, metrics: metrics({ turns: 0, wpm: 500 }) },
  ]
  assert.equal(baselineFrom(all, NOW).wpm, 71)
  assert.equal(baselineFrom(all, NOW).classes, 2)
})

test('M-07: las clases escritas no cuentan para la velocidad ni las pausas (sí para palabras y nota)', async () => {
  const { baselineFrom, reportTrends } = await loadFresh('/src/lib/fluency.ts')
  const typed = (id, avgWords) => ({ id, startedAt: id * 1000, metrics: metrics({ spokenTurns: 0, wpm: 0, pausesPerMin: 0, avgWords }) })
  const spoken = (id, wpm) => ({ id, startedAt: id * 1000, metrics: metrics({ wpm }) })
  const b = baselineFrom([typed(1, 10), spoken(2, 90), typed(3, 30), spoken(4, 70)], NOW)
  assert.equal(b.wpm, 80, 'solo las 2 habladas')
  assert.equal(b.pausesPerMin, 2)
  assert.equal(b.avgWords, 20, 'las 4')
  // Solo escritas: sin media de velocidad.
  const onlyTyped = baselineFrom([typed(1, 10), typed(2, 20)], NOW)
  assert.equal(onlyTyped.wpm, null)
  assert.equal(reportTrends(metrics({ wpm: 100 }), onlyTyped).wpm, null)
  // Clase de hoy escrita: sin flecha de velocidad ni pausas aunque haya media.
  const t = reportTrends(metrics({ spokenTurns: 0, wpm: 0 }), b)
  assert.equal(t.wpm, null)
  assert.equal(t.pausesPerMin, null)
  assert.ok(t.avgWords)
  // Clases antiguas (antes de spokenTurns) se tratan como habladas.
  const old = { id: 7, startedAt: 7000, metrics: { ...metrics({ wpm: 60 }), spokenTurns: undefined } }
  assert.equal(baselineFrom([old, spoken(8, 80)], NOW).wpm, 70)
})

test('M-07: flechas y textos («+8 frente a tu media»; en pausas, bajar es mejor)', async () => {
  const { trend, reportTrends } = await loadFresh('/src/lib/fluency.ts')
  assert.deepEqual(trend(88, 80), { arrow: '▲', better: true, text: '+8 frente a tu media' })
  assert.deepEqual(trend(72, 80), { arrow: '▼', better: false, text: '−8 frente a tu media' })
  assert.deepEqual(trend(80, 80), { arrow: '=', better: false, text: 'igual que tu media' })
  assert.deepEqual(trend(1.5, 2, { lowerIsBetter: true, decimals: 1 }), { arrow: '▼', better: true, text: '−0,5 frente a tu media' })
  // REV-11-D2-05: en el informe, las pausas llevan la unidad («una pausa menos» se leía mal).
  assert.equal(trend(1.5, 2, { lowerIsBetter: true, decimals: 1, unit: '/min' }).text, '−0,5/min frente a tu media')
  assert.equal(trend(80, null), null)
  const r = reportTrends(metrics({ wpm: 88, score: 60, avgWords: 18, pausesPerMin: 3 }), { classes: 5, wpm: 80, pausesPerMin: 2, avgWords: 20, score: 50 })
  assert.equal(r.wpm.text, '+8 frente a tu media')
  assert.equal(r.score.text, '+10 frente a tu media')
  assert.equal(r.avgWords.better, false)
  assert.equal(r.pausesPerMin.better, false)
  assert.equal(r.pausesPerMin.text, '+1/min frente a tu media')
  // Sin media (primera referencia): ninguna flecha.
  assert.deepEqual(reportTrends(metrics(), null), { wpm: null, pausesPerMin: null, avgWords: null, score: null })
})

test('M-07 (UX-09): «Hoy has sonado como un B1+», oculto para A1–A2 y sin nivel', async () => {
  const { soundedLike } = await loadFresh('/src/lib/fluency.ts')
  assert.equal(soundedLike('B1+', 'B1'), 'Hoy has sonado como un B1+')
  assert.equal(soundedLike('B2', 'C1'), 'Hoy has sonado como un B2')
  assert.equal(soundedLike('B2', 'A2'), null)
  assert.equal(soundedLike('A2', 'a1'), null)
  assert.equal(soundedLike('B1', undefined), null)
  assert.equal(soundedLike('B1', ''), null)
})

test('M-07: ReportView ya no dice «Nivel al hablar hoy» ni pone «meta B2» fija', async () => {
  const fs = await import('node:fs/promises')
  // Sin comentarios (el de la 5.10.1 cita la «meta B2» antigua).
  const src = (await fs.readFile(new URL('../src/components/ReportView.tsx', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  assert.doesNotMatch(src, /Nivel al hablar hoy/)
  assert.doesNotMatch(src, /meta B2/)
  assert.match(src, /\(tu nivel lo fija el test\)/)
  assert.match(src, /Esta es tu primera referencia/)
  // Con perfil A2 la meta es la de A2 (la cadena del render sale de speakingGoal).
  const { speakingGoal } = await loadFresh('/src/lib/fluency.ts')
  assert.equal(speakingGoal('A2').level, 'A2')
})
