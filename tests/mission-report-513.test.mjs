// 5.13 · Fase 11 · «Misión cumplida ✓ / casi» al terminar una lección del plan: el informe solo pide el veredicto en las
// lecciones (sin lección, el esquema y el prompt son idénticos a los de antes), solo acepta yes/almost/no y guarda la misión.
// La tarjeta del informe y «Avanzado» de Azure se prueban en el navegador (docs/v5.13/evidencia/arnes-retoques.mjs).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

function fakeGemini(payload) {
  const bodies = []
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')))
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  return bodies
}
const schemaOf = (b) => b.generationConfig?.responseJsonSchema ?? b.generationConfig?.responseSchema
const promptOf = (b) => b.contents.map((c) => c.parts.map((p) => p.text ?? '').join(' ')).join('\n')
const BASE = { summary_es: 'Bien.', strengths_es: ['a'], improve_es: ['b'], homework_es: 'Graba 1 minuto.', phrase_en: 'Hi', phrase_es: 'Hola' }
const turns = [
  { role: 'teacher', text: 'Tell me about your experiences.', createdAt: 1 },
  { role: 'user', text: "I've never been to London but I've visited Paris twice.", createdAt: 2 },
]
const metrics = { turns: 1, spokenTurns: 1, words: 11, speechSeconds: 6, wpm: 110, pauses: 0, pausesPerMin: 0, avgWords: 11, longestWords: 11, corrections: 0, score: 70, level: 'B1' }
const levels = { overall: 'B1', speaking: 'A2' }
const MISSION = "Cuenta 3 experiencias usando 'I've never…'"

test('Misión de la lección: solo en lecciones del plan; sin ellas el informe es el de siempre', async () => {
  const { generateReport, reportSchema, REPORT_SCHEMA } = await loadFresh('/src/lib/fluency.ts')
  assert.equal(reportSchema(false), REPORT_SCHEMA)
  assert.equal(reportSchema(false, false), REPORT_SCHEMA)
  // Sin lección: ni el esquema ni el prompt cambian, y el informe no trae misión.
  let bodies = fakeGemini(BASE)
  const plain = await generateReport('k', { primary: 'm', timeoutMs: 5000 }, turns, metrics, undefined, undefined, { facts: false, levels })
  assert.deepEqual(schemaOf(bodies[0]).required, REPORT_SCHEMA.required)
  assert.doesNotMatch(promptOf(bodies[0]), /mission_met/)
  assert.equal(plain.missionEs, undefined)
  assert.equal(plain.missionMet, undefined)
  // Lección: se pide el veredicto y se guarda la misión.
  bodies = fakeGemini({ ...BASE, mission_met: 'almost', mission_note_es: 'Contaste 2 experiencias.\n¡Casi!' })
  const r = await generateReport('k', { primary: 'm', timeoutMs: 5000 }, turns, metrics, undefined, undefined, { facts: false, levels, mission: MISSION })
  const sch = schemaOf(bodies[0])
  assert.ok(sch.required.includes('mission_met') && sch.required.includes('mission_note_es'))
  assert.deepEqual(sch.properties.mission_met.enum, ['yes', 'almost', 'no'])
  assert.match(promptOf(bodies[0]), /with this mission \(shown to the student\): «Cuenta 3 experiencias usando 'I've never…'»/)
  assert.deepEqual([r.missionEs, r.missionMet, r.missionNoteEs], [MISSION, 'almost', 'Contaste 2 experiencias. ¡Casi!'])
  // Un veredicto raro no se guarda (queda solo la misión).
  fakeGemini({ ...BASE, mission_met: 'sí claro', mission_note_es: 'x' })
  const odd = await generateReport('k', { primary: 'm', timeoutMs: 5000 }, turns, metrics, undefined, undefined, { facts: false, levels, mission: MISSION })
  assert.deepEqual([odd.missionEs, odd.missionMet, odd.missionNoteEs], [MISSION, undefined, undefined])
  // Con memoria y misión a la vez, los dos campos.
  bodies = fakeGemini({ ...BASE, facts_es: [], mission_met: 'yes', mission_note_es: 'Bien.' })
  await generateReport('k', { primary: 'm', timeoutMs: 5000 }, turns, metrics, undefined, undefined, { facts: true, known: [], levels, mission: MISSION })
  assert.ok(['facts_es', 'mission_met'].every((k) => schemaOf(bodies[0]).required.includes(k)))
})
