// 5.11 · D1 · M-09 «Avisos y consejos con variantes» (P-09 de A5) y el globo del comodín de racha (M-04).
// Lógica pura de mascotTips.ts y de los textos del recordatorio (reminders.ts), con un localStorage en memoria.
import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let store
beforeEach(() => {
  store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
})

const base = { minutesToday: 0, goal: 5, streak: 0, dueCards: 0, lessonDone: false, liveTopics: false, retestDays: null }
const textOf = (tips, id) => tips.find((t) => t.id === id)?.text

for (const [name, input, id] of [
  ['goal (sin hablar)', { ...base }, 'goal'],
  ['goal (a medias)', { ...base, minutesToday: 2 }, 'goal'],
  ['goal (cumplida)', { ...base, minutesToday: 6 }, 'goal'],
  ['streak', { ...base, streak: 4 }, 'streak'],
  ['review', { ...base, dueCards: 3 }, 'review'],
]) {
  test(`M-09: ${name}: ≥ 3 redacciones distintas en 10 rondas y nunca la misma dos veces seguidas`, async () => {
    const { buildTips, newTipRound, noteTipShown } = await loadFresh('/src/lib/mascotTips.ts')
    const seen = []
    for (let k = 0; k < 10; k++) {
      newTipRound() // otra vuelta al Inicio (semilla al azar)
      const tip = buildTips(input).find((t) => t.id === id)
      seen.push(tip.text)
      noteTipShown(tip) // el globo se ve
    }
    assert.ok(seen.every(Boolean))
    assert.ok(new Set(seen).size >= 3, `distintas: ${new Set(seen).size}`)
    for (let k = 1; k < seen.length; k++) assert.notEqual(seen[k], seen[k - 1], `repetida en la ronda ${k}`)
  })
}

test('REV-11-D1-05: en una misma ronda el texto es estable aunque Home recalcule y aunque el globo ya se haya mostrado', async () => {
  const { buildTips, newTipRound, noteTipShown } = await loadFresh('/src/lib/mascotTips.ts')
  for (const seed of [0, 0.3, 0.6, 0.99]) {
    newTipRound(seed)
    const first = buildTips({ ...base, streak: 4, dueCards: 2 })
    noteTipShown(first.find((t) => t.id === 'goal'))
    for (let k = 0; k < 5; k++) {
      const again = buildTips({ ...base, streak: 4, dueCards: 2, liveTopics: k % 2 === 0 })
      for (const id of ['goal', 'review', 'streak']) assert.equal(textOf(again, id), textOf(first, id), `${id} cambió a la vista`)
    }
  }
})

test('REV-11-D1-05: calcular sin mostrar no gasta redacciones (solo cuenta lo mostrado)', async () => {
  const { buildTips, newTipRound } = await loadFresh('/src/lib/mascotTips.ts')
  newTipRound(0.5)
  for (let k = 0; k < 20; k++) buildTips({ ...base })
  assert.equal(store.get('habla.tipVariants'), undefined)
})

test('M-09: sin localStorage (lanza) sigue dando avisos', async () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('bloqueado')
    },
    setItem: () => {
      throw new Error('bloqueado')
    },
    removeItem: () => {},
  }
  const { buildTips, buildAdvice, noteTipShown } = await loadFresh('/src/lib/mascotTips.ts')
  assert.ok(textOf(buildTips({ ...base, dueCards: 2 }), 'review'))
  noteTipShown({ id: 'a-ideas' })
  assert.ok(buildAdvice({ hasPurpose: true, hasAzure: true }).some((t) => t.id === 'a-ideas'), 'sin almacenamiento no se jubila')
})

test('M-09: las cifras de cada variante son las correctas (minutos, frases, días)', async () => {
  const { NOTICE_VARIANTS } = await loadFresh('/src/lib/mascotTips.ts')
  for (const f of NOTICE_VARIANTS.goalSome) {
    assert.match(f(2, 5), /3 minutos/)
    assert.match(f(4, 5), /1 minuto\b/)
  }
  for (const f of NOTICE_VARIANTS.review) assert.match(f(3, 0), /3 frases/)
  for (const f of NOTICE_VARIANTS.review) assert.match(f(1, 0), /\bfrase\b/)
  for (const f of NOTICE_VARIANTS.streak) assert.match(f(7, true), /7 días/)
})

test('M-09: un consejo de temporada se jubila tras verse 2 veces; los permanentes siguen en rueda', async () => {
  const { buildAdvice, noteTipShown, SEASONAL_ADVICE } = await loadFresh('/src/lib/mascotTips.ts')
  const ids = () => buildAdvice({ hasPurpose: false, hasAzure: false }).map((t) => t.id)
  assert.ok(ids().includes('a-ideas'))
  noteTipShown({ id: 'a-ideas' })
  assert.ok(ids().includes('a-ideas'), 'visto 1 vez: sigue')
  noteTipShown({ id: 'a-ideas' })
  assert.equal(ids().includes('a-ideas'), false, 'visto 2 veces: jubilado')
  assert.deepEqual(JSON.parse(store.get('habla.adviceSeen')), { 'a-ideas': 2 })
  // Los permanentes no cuentan ni se jubilan, por muchas veces que salgan.
  for (const id of ['a-score', 'a-ppm', 'a-backup', 'a-reminder', 'a-purpose', 'a-azure']) {
    assert.equal(SEASONAL_ADVICE.has(id), false)
    for (let k = 0; k < 5; k++) noteTipShown({ id })
    assert.ok(ids().includes(id), id)
  }
  // Jubilados todos los de temporada, la rueda sigue con los permanentes.
  for (const id of SEASONAL_ADVICE) [0, 1].forEach(() => noteTipShown({ id }))
  assert.deepEqual(ids().sort(), ['a-azure', 'a-backup', 'a-ppm', 'a-purpose', 'a-reminder', 'a-score'])
  // Los avisos (sin «a-») tampoco cuentan.
  noteTipShown({ id: 'goal' })
  assert.equal(JSON.parse(store.get('habla.adviceSeen')).goal, undefined)
})

test('M-09: ningún aviso, consejo ni recordatorio habla del candado ni de mantener/deslizar (consejo de la 5.10.1)', async () => {
  const { buildAdvice, buildTips, NOTICE_VARIANTS } = await loadFresh('/src/lib/mascotTips.ts')
  const { DAILY_BODIES, dailyBody } = await loadFresh('/src/lib/reminders.ts')
  const texts = [
    ...Object.values(NOTICE_VARIANTS).flatMap((list) => list.flatMap((f) => [f(2, 5), f(0, false), f(3, true)])),
    ...buildAdvice({ hasPurpose: false, hasAzure: false, wpmGoal: { level: 'A2', wpm: 90 } }).map((t) => t.text),
    ...buildTips({ ...base, remindersBlocked: true, savedTitle: 'X', lessonTitle: 'Y', retestDays: 0, liveTopics: true }).map((t) => t.text),
    ...DAILY_BODIES,
    dailyBody(new Date(2026, 9, 21, 20), true, 'Lección'),
  ]
  assert.ok(texts.length > 40)
  for (const t of texts) assert.doesNotMatch(t, /mant[eé]n|candado|desliza/i, t)
})

test('M-04: con el comodín de ayer, la mascota dice «Ayer descansaste; tu racha sigue a salvo»', async () => {
  const { buildTips } = await loadFresh('/src/lib/mascotTips.ts')
  for (let k = 0; k < 6; k++) {
    const t = textOf(buildTips({ ...base, streak: 5, restedYesterday: true }), 'streak')
    assert.match(t, /^Ayer (descansaste|fue tu día de descanso)/)
    assert.match(t, /tu racha sigue a salvo/)
  }
  // Sin el campo (Home de la 5.10.1), igual que antes.
  assert.doesNotMatch(textOf(buildTips({ ...base, streak: 5 }), 'streak'), /descans/)
  // Sin racha no tiene sentido decirlo.
  assert.doesNotMatch(textOf(buildTips({ ...base, streak: 0, restedYesterday: true }), 'streak'), /Ayer/)
})

test('M-09: el recordatorio diario cambia de texto cada día y el primero lleva la lección', async () => {
  const { dailyBody } = await loadFresh('/src/lib/reminders.ts')
  assert.match(dailyBody(new Date(2026, 9, 21, 20), true, 'Pedir en un café'), /Pedir en un café/)
  assert.doesNotMatch(dailyBody(new Date(2026, 9, 22, 20), false, 'Pedir en un café'), /Pedir en un café/, 'la lección, solo en el primero')
  const bodies = Array.from({ length: 30 }, (_, i) => dailyBody(new Date(2026, 9, 21 + i, 20), i === 0))
  for (let i = 1; i < bodies.length; i++) assert.notEqual(bodies[i], bodies[i - 1])
  assert.ok(new Set(bodies).size >= 3)
})

test('REV-11-D1-01: quien abre la app a diario (se reprograma cada día) recibe textos distintos en el primer aviso', async () => {
  const { dailyBody } = await loadFresh('/src/lib/reminders.ts')
  // Cada arranque reprograma: el primer aviso (i = 0) es el de mañana a las 20:00, sin lección (sin plan o plan terminado).
  const firsts = [21, 22, 23, 24, 25].map((d) => dailyBody(new Date(2026, 9, d + 1, 20), true))
  for (let k = 1; k < firsts.length; k++) assert.notEqual(firsts[k], firsts[k - 1], `día ${k}`)
  // Y el mismo día da el mismo texto aunque se reprograme varias veces (a cualquier hora, también con cambio de hora).
  assert.equal(dailyBody(new Date(2026, 9, 25, 0, 30), true), dailyBody(new Date(2026, 9, 25, 23, 30), true))
  assert.equal(dailyBody(new Date(2026, 2, 29, 0, 30), false), dailyBody(new Date(2026, 2, 29, 23, 30), false))
})
