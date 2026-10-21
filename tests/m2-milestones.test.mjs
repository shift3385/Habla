// 5.11 (M-03): hitos con celebración. Lógica pura + guardado idempotente con un almacén en memoria (como la tabla
// `milestones` de Dexie): cada hito salta una sola vez, nunca dos tras recargar, y una copia restaurada no vuelve a
// celebrar los que ya traía.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const DAY = 864e5
const NOW = Date.UTC(2026, 9, 21, 12)

/** Tabla `milestones` en memoria (mismas reglas: `add` no pisa una fila existente). */
function memoryStore(rows = []) {
  const map = new Map(rows.map((r) => [r.id, { ...r }]))
  return {
    map,
    all: async () => [...map.values()].map((r) => ({ ...r })),
    addIfMissing: async (m) => {
      if (!map.has(m.id)) map.set(m.id, { ...m })
    },
    markCelebrated: async (id, at) => {
      if (map.has(id)) map.get(id).celebratedAt = at
    },
  }
}

const state = (o = {}) => ({ streak: 0, reviews: 0, grammarMastered: 0, soundsMastered: 0, longClasses: 0, bestPlanWeek: 0, ...o })

test('M-03: cada hito salta con su umbral exacto (racha 3/7/14/30, repasos 10/50/100, primeras veces, semana del plan)', async () => {
  const { reachedIds, MILESTONES } = await loadFresh('/src/lib/milestones.ts')
  assert.deepEqual(reachedIds(state()), [])
  assert.deepEqual(reachedIds(state({ streak: 2, reviews: 9, bestPlanWeek: 4 })), [])
  assert.deepEqual(reachedIds(state({ streak: 3 })), ['streak-3'])
  assert.deepEqual(reachedIds(state({ streak: 14 })), ['streak-3', 'streak-7', 'streak-14'])
  assert.deepEqual(reachedIds(state({ streak: 30 })), ['streak-3', 'streak-7', 'streak-14', 'streak-30'])
  assert.deepEqual(reachedIds(state({ reviews: 50 })), ['reviews-10', 'reviews-50'])
  assert.deepEqual(reachedIds(state({ reviews: 100 })), ['reviews-10', 'reviews-50', 'reviews-100'])
  assert.deepEqual(reachedIds(state({ grammarMastered: 1 })), ['grammar-first'])
  assert.deepEqual(reachedIds(state({ soundsMastered: 2 })), ['sound-first'])
  assert.deepEqual(reachedIds(state({ longClasses: 1 })), ['class-5min'])
  assert.deepEqual(reachedIds(state({ bestPlanWeek: 5 })), ['plan-week'])
  assert.equal(MILESTONES.length, 11)
  assert.equal(new Set(MILESTONES.map((m) => m.id)).size, 11)
})

test('M-03: cada hito se guarda y se celebra UNA sola vez, también tras «recargar»', async () => {
  const store = memoryStore()
  let m = await loadFresh('/src/lib/milestones.ts')
  // Día 1: racha 3 y primera clase larga.
  let saved = await m.syncWith(store, state({ streak: 3, longClasses: 1 }), NOW)
  assert.deepEqual(saved.map((x) => x.id).sort(), ['class-5min', 'streak-3'])
  const first = m.nextToCelebrate(saved)
  assert.ok(first)
  await store.markCelebrated(first.id, NOW)
  // Recarga (módulo nuevo, mismo almacén): no se vuelve a guardar ni a celebrar el ya celebrado.
  m = await loadFresh('/src/lib/milestones.ts')
  saved = await m.syncWith(store, state({ streak: 3, longClasses: 1 }), NOW + 1000)
  assert.equal(saved.length, 2)
  assert.equal(store.map.get('streak-3').at, NOW, 'la fecha no cambia')
  const second = m.nextToCelebrate(saved)
  assert.ok(second && second.id !== first.id, 'uno por vez: el otro sale después')
  await store.markCelebrated(second.id, NOW + 1000)
  // Otra recarga, y más sincronizaciones: nada por celebrar.
  for (let i = 0; i < 5; i++) {
    m = await loadFresh('/src/lib/milestones.ts')
    saved = await m.syncWith(store, state({ streak: 3, longClasses: 1 }), NOW + 2000 + i)
    assert.equal(m.nextToCelebrate(saved), undefined)
    assert.equal(saved.length, 2)
  }
  // La racha se rompe y vuelve a 3: el hito ya está, no se celebra de nuevo.
  saved = await m.syncWith(store, state({ streak: 0 }), NOW + 5 * DAY)
  saved = await m.syncWith(store, state({ streak: 3 }), NOW + 8 * DAY)
  assert.equal(m.nextToCelebrate(saved), undefined)
  // Llega la racha de 7: solo ese es nuevo.
  saved = await m.syncWith(store, state({ streak: 7, longClasses: 1 }), NOW + 12 * DAY)
  assert.equal(m.nextToCelebrate(saved).id, 'streak-7')
})

test('M-03: una copia restaurada no vuelve a celebrar los hitos que ya traía', async () => {
  const m = await loadFresh('/src/lib/milestones.ts')
  // La copia trae la tabla con dos hitos ya celebrados (como la exporta backup.ts, tabla `milestones`).
  const restored = memoryStore([
    { id: 'streak-3', at: NOW - 30 * DAY, celebratedAt: NOW - 30 * DAY },
    { id: 'reviews-10', at: NOW - 20 * DAY, celebratedAt: NOW - 20 * DAY },
  ])
  const saved = await m.syncWith(restored, state({ streak: 4, reviews: 12 }), NOW)
  assert.equal(m.nextToCelebrate(saved), undefined)
  assert.equal(saved.find((x) => x.id === 'streak-3').at, NOW - 30 * DAY, 'conserva la fecha original')
})

test('M-03: primera vez con historial antiguo (o copia antigua sin la tabla): se guardan sin celebración en cadena', async () => {
  const m = await loadFresh('/src/lib/milestones.ts')
  assert.equal(m.isBackfill([], NOW - 10 * DAY, NOW), true)
  assert.equal(m.isBackfill([], NOW - 3600_000, NOW), false, 'alumno nuevo de hoy: sí se celebra')
  assert.equal(m.isBackfill([], undefined, NOW), false)
  assert.equal(m.isBackfill([{ id: 'streak-3', at: 1 }], NOW - 10 * DAY, NOW), false)
  const store = memoryStore()
  const saved = await m.syncWith(store, state({ streak: 20, reviews: 120, grammarMastered: 1 }), NOW, NOW - 40 * DAY)
  assert.equal(saved.length, 7) // racha 3, 7 y 14; repasos 10, 50 y 100; Gramática
  assert.equal(m.nextToCelebrate(saved), undefined)
  // Lo siguiente que consigue sí se celebra.
  const after = await m.syncWith(store, state({ streak: 30, reviews: 120, grammarMastered: 1 }), NOW + DAY)
  assert.equal(m.nextToCelebrate(after).id, 'streak-30')
  // La marca de la primera mirada está en la tabla y no sale como hito.
  assert.ok(store.map.has(m.SINCE_ID))
  assert.ok(!after.some((x) => x.id === m.SINCE_ID))
})

test('REV-11-D2-01: alumno nuevo sin hitos en sus 2 primeros días SÍ celebra el primero; quien actualiza desde la 5.10.1, no', async () => {
  const m = await loadFresh('/src/lib/milestones.ts')
  // Alumno nuevo: empieza hoy (clases cortas, ningún hito) y la app mira los hitos cada vez que vuelve al Inicio.
  const store = memoryStore()
  const start = NOW
  let saved = await m.syncWith(store, state({ streak: 1 }), start, start - 600_000)
  assert.deepEqual(saved, [])
  saved = await m.syncWith(store, state({ streak: 2 }), start + DAY, start - 600_000)
  assert.deepEqual(saved, [])
  // Tercer día (actividad de hace > 2 días): «3 días seguidos» se celebra.
  saved = await m.syncWith(store, state({ streak: 3 }), start + 2 * DAY + 3600_000, start - 600_000)
  assert.equal(m.nextToCelebrate(saved)?.id, 'streak-3')
  // Y aunque pasen semanas sin hitos, el siguiente también.
  saved = await m.syncWith(store, state({ streak: 0, reviews: 10 }), start + 30 * DAY, start - 600_000)
  assert.equal(m.nextToCelebrate(saved)?.id, 'streak-3', 'el pendiente sigue el primero')
  await store.markCelebrated('streak-3', start + 30 * DAY)
  assert.equal(m.nextToCelebrate(await m.syncWith(store, state({ reviews: 10 }), start + 31 * DAY, start - 600_000))?.id, 'reviews-10')

  // Usuario de la 5.10.1 que actualiza: historial de hace un mes, primera mirada → todo lo ya conseguido, en silencio.
  const old = memoryStore()
  saved = await m.syncWith(old, state({ streak: 9, reviews: 60 }), NOW, NOW - 30 * DAY)
  assert.equal(saved.length, 4)
  assert.equal(m.nextToCelebrate(saved), undefined)
  // Copia antigua (sin la tabla) restaurada en un teléfono que ya usaba la 5.11: la tabla queda vacía (sin marca) → silencio.
  old.map.clear()
  saved = await m.syncWith(old, state({ streak: 9, reviews: 60 }), NOW + 5 * DAY, NOW - 30 * DAY)
  assert.equal(m.nextToCelebrate(saved), undefined)
  // isBackfill: con la marca nunca.
  assert.equal(m.isBackfill([{ id: m.SINCE_ID, at: NOW - 9 * DAY }], NOW - 10 * DAY, NOW), false)
})

test('REV-11-D2-02: stateFrom (lo que se lee de Dexie) cuenta bien sonidos, clases largas, repasos y plan', async () => {
  const { stateFrom } = await loadFresh('/src/lib/milestones.ts')
  const min = 60_000
  const r = stateFrom({
    streak: 4,
    cards: [
      { createdAt: NOW - 5 * DAY, fsrs: { reps: 3 } },
      { createdAt: NOW - 2 * DAY, fsrs: { reps: 4 } },
    ],
    grammar: [{ mastered: true }, { mastered: false }],
    // Las filas de lección no son sonidos dominados.
    sounds: [{ kind: 'lesson', mastered: true }, { mastered: false }],
    sessions: [
      { startedAt: NOW - 9 * DAY, endedAt: NOW - 9 * DAY + 10 * min, metrics: { turns: 1 } }, // 10 min con 1 respuesta: no
      { startedAt: NOW - 8 * DAY, endedAt: NOW - 8 * DAY + 4 * min, metrics: { turns: 8 } }, // 4 min: no
      { startedAt: NOW - 7 * DAY }, // a medias: no
    ],
    planWeeks: [3, 4, 0],
  })
  assert.deepEqual(r.state, { streak: 4, reviews: 7, grammarMastered: 1, soundsMastered: 0, longClasses: 0, bestPlanWeek: 4 })
  assert.equal(r.oldestActivity, NOW - 9 * DAY)
  const ok = stateFrom({
    streak: 0,
    cards: [],
    grammar: [],
    sounds: [{ mastered: true }],
    sessions: [{ startedAt: NOW, endedAt: NOW + 6 * min, metrics: { turns: 3 } }],
    planWeeks: [],
  })
  assert.equal(ok.state.soundsMastered, 1)
  assert.equal(ok.state.longClasses, 1)
  assert.equal(ok.state.bestPlanWeek, 0)
  assert.equal(stateFrom({ streak: 0, cards: [], grammar: [], sounds: [], sessions: [], planWeeks: [] }).oldestActivity, undefined)
})

test('M-03: «Tus logros»: conseguidos con fecha, los demás con «Te faltan N»', async () => {
  const { milestoneRows } = await loadFresh('/src/lib/milestones.ts')
  const rows = milestoneRows(state({ streak: 5, reviews: 13, bestPlanWeek: 3 }), [{ id: 'streak-3', at: NOW }])
  const by = Object.fromEntries(rows.map((r) => [r.def.id, r]))
  assert.equal(by['streak-3'].at, NOW)
  assert.equal(by['streak-7'].left, 'Te faltan 2 días seguidos')
  assert.equal(by['streak-30'].left, 'Te faltan 25 días seguidos')
  assert.equal(by['reviews-50'].left, 'Te faltan 37 repasos')
  assert.equal(by['grammar-first'].left, 'Te falta 1 tema de Gramática dominado')
  assert.equal(by['plan-week'].left, 'Te faltan 2 lecciones en una semana del plan')
  assert.equal(rows.length, 11)
  for (const r of rows) assert.ok(r.at || /^Te faltan? \d+ /.test(r.left), r.def.id)
})

test('M-03: cada una de las 4 mascotas tiene una frase propia por hito (sin «vosotros» ni España)', async () => {
  const { MILESTONES, MILESTONE_SAYS, milestoneSays } = await loadFresh('/src/lib/milestones.ts')
  const els = ['flame', 'terra', 'aqua', 'aero']
  for (const d of MILESTONES) {
    const phrases = els.map((e) => milestoneSays(d.id, e))
    assert.equal(new Set(phrases).size, 4, `${d.id}: 4 frases distintas`)
    for (const p of phrases) {
      assert.ok(p.length > 10 && p.length < 110, `${d.id}: «${p}»`)
      assert.doesNotMatch(p, /vosotros|habéis|España|guay/i)
    }
    assert.ok(MILESTONE_SAYS[d.id])
  }
  assert.equal(milestoneSays('inventado', 'aqua'), '¡Lo lograste!')
})

test('M-03: la celebración es corta (≤ 2 s) y no tapa la barra de pestañas', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../src/components/MilestoneGate.tsx', import.meta.url), 'utf8')
  const ms = Number(/CELEBRATION_MS = (\d+)/.exec(src)[1])
  assert.ok(ms > 0 && ms <= 2000)
  assert.doesNotMatch(src, /iterations:\s*Infinity|animate-(ping|pulse|bounce|spin)/, 'nada en bucle')
  assert.match(src, /document\.hidden/, 'no arranca en segundo plano')
  assert.match(src, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+96px\)\]/, 'deja libre la barra de abajo')
  assert.match(src, /\[html\[data-landscape\]_&\]:right-/, 'y la de la derecha en horizontal')
})
