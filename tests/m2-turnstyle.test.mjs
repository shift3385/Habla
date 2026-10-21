// 5.11 (M-06): variedad en el turno del profe. El estilo (pregunta o reacción + mini-reto) se decide en código.
// Red simulada con un `fetch` falso: ninguna llamada real; la clave es ficticia.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const FAKE_KEY = 'clave-ficticia-de-prueba'
const MODELS = { primary: 'modelo-falso', timeoutMs: 5000 }

function fakeGemini(payload) {
  const bodies = []
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')))
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  return bodies
}
const systemText = (body) => (body.systemInstruction?.parts ?? body.system_instruction?.parts ?? []).map((p) => p.text).join('')

test('M-06: 1000 turnos → 65–75 % pregunta, 0 retos seguidos, el primero siempre pregunta', async () => {
  const { planTurns } = await loadFresh('/src/lib/turnStyle.ts')
  for (const seed of [1, 7, 42, 1234, 99999]) {
    const p = planTurns(1000, seed)
    const q = p.filter((t) => t.style === 'question').length
    assert.ok(q >= 650 && q <= 750, `semilla ${seed}: ${q} preguntas de 1000`)
    assert.equal(p[0].style, 'question')
    for (let i = 1; i < p.length; i++) {
      assert.ok(!(p[i].style === 'react-challenge' && p[i - 1].style === 'react-challenge'), `semilla ${seed}: retos seguidos en ${i}`)
    }
  }
  // Muchas sesiones cortas (10 turnos), como las clases reales: el primero siempre es pregunta.
  let q = 0
  for (let seed = 1; seed <= 300; seed++) {
    const p = planTurns(10, seed)
    assert.equal(p[0].style, 'question')
    q += p.filter((t) => t.style === 'question').length
  }
  assert.ok(q / 3000 >= 0.65 && q / 3000 <= 0.78, `sesiones de 10: ${q / 30} % preguntas`)
})

test('M-06: determinista (clase retomada igual), cada reto con su texto y nunca el mismo dos veces seguidas', async () => {
  const { planTurns, turnStyle, turnPlan, CHALLENGES } = await loadFresh('/src/lib/turnStyle.ts')
  assert.ok(CHALLENGES.length >= 6)
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, CHALLENGES.length)
  const p = planTurns(200, 5)
  for (let i = 0; i < 200; i++) {
    assert.equal(turnStyle(i, 5), p[i].style)
    assert.deepEqual(turnPlan(i, 5), p[i])
  }
  const used = p.filter((t) => t.challenge).map((t) => t.challenge.id)
  for (let i = 1; i < used.length; i++) assert.notEqual(used[i], used[i - 1], 'el mismo reto dos veces seguidas')
  assert.ok(new Set(used).size >= 6, 'se usan casi todos los retos')
  // Entradas raras no rompen.
  assert.equal(turnStyle(-3, 5), 'question')
  assert.equal(turnStyle(NaN, 0), 'question')
})

test('M-06: la instrucción solo existe en los retos y nunca en la clase de Gramática', async () => {
  const { planTurns, turnInstruction, turnNoteFor } = await loadFresh('/src/lib/turnStyle.ts')
  const p = planTurns(60, 3)
  for (let i = 0; i < p.length; i++) {
    const note = turnNoteFor({ grammarClass: false, turnIndex: i, seed: 3 })
    if (p[i].style === 'question') assert.equal(note, '')
    else {
      assert.match(note, /Do NOT ask a question/)
      assert.ok(note.includes(p[i].challenge.en))
      assert.match(note, /heard_speech is false/)
    }
    assert.equal(turnNoteFor({ grammarClass: true, turnIndex: i, seed: 3 }), '', 'Gramática: GRAMMAR_OVERRIDES manda')
  }
  assert.equal(turnInstruction({ style: 'question' }), '')
})

test('M-06: teacherTurn sin nota manda el prompt idéntico; con nota, la añade al final solo en esa petición', async () => {
  const bodies = fakeGemini({ heard_speech: true, transcript: '', corrections: [], reply: 'Nice!', reply_es: '¡Bien!' })
  const { teacherTurn, buildSystemPrompt } = await loadFresh('/src/lib/teacher.ts')
  const { turnNoteFor, planTurns } = await loadFresh('/src/lib/turnStyle.ts')
  const PROFILE = {
    id: 'me',
    levels: { overall: 'B1', grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'A2' },
    about: '',
    weaknesses: [],
    goal: '',
    startedAt: 0,
  }
  const system = buildSystemPrompt(PROFILE, { id: 'free', title: 't', subtitle: '', emoji: '', icon: 'book', brief: 'Talk.' }, [], undefined, '')
  // El prompt base sigue pidiendo la pregunta (los turnos de pregunta no cambian).
  assert.match(system, /ALWAYS end your reply with exactly one open question/)
  await teacherTurn(FAKE_KEY, MODELS, system, [], { text: 'hi' })
  assert.equal(systemText(bodies[0]), system)
  const i = planTurns(30, 11).findIndex((t) => t.style === 'react-challenge')
  const note = turnNoteFor({ grammarClass: false, turnIndex: i, seed: 11 })
  const history = [{ role: 'user', content: 'start' }]
  await teacherTurn(FAKE_KEY, MODELS, system, history, { text: 'I like cats' }, undefined, note)
  assert.equal(systemText(bodies[1]), `${system}\n\n${note}`)
  // La nota no se cuela en lo que dijo el alumno ni en el historial.
  assert.ok(!JSON.stringify(bodies[1].contents).includes('mini-challenge'))
  assert.deepEqual(history, [{ role: 'user', content: 'start' }])
})

test('REV-11-D2-03: la clase PASA la nota del turno a teacherTurn (con el nº de turno y la sesión)', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../src/screens/Conversation.tsx', import.meta.url), 'utf8')
  const call =
    /const turnIndex = history\.current\.filter\(\(m\) => m\.role === 'assistant'\)\.length\s+const note = turnNoteFor\(\{ grammarClass: grammarClass\.current, turnIndex, seed: sessionId\.current \?\? 0 \}\)\s+const res = await teacherTurn\(([\s\S]*?)\)\s+giveReference/.exec(
      src,
    )
  assert.ok(call, 'askTeacher calcula la nota justo antes de llamar al profe')
  const args = call[1]
    .split(/,\s*(?![^{]*\})/)
    .map((a) => a.trim())
    .filter(Boolean)
  assert.equal(args.at(-1), 'note', 'la nota es el último argumento (turnNote)')
  assert.equal(args.length, 7)
})

test('M-06: el prompt de la clase de Gramática, el test y «Dilo tú» no dependen de turnStyle', async () => {
  const fs = await import('node:fs/promises')
  for (const f of ['src/lib/grammar.ts', 'src/lib/grammarAi.ts', 'src/lib/placement.ts', 'src/lib/calibration.ts']) {
    const src = await fs.readFile(new URL(`../${f}`, import.meta.url), 'utf8')
    assert.doesNotMatch(src, /turnStyle|turnInstruction|turnNote/, `${f} no usa M-06`)
  }
  // Las 3 reglas de la clase dirigida siguen ahí, tal cual.
  const g = await loadFresh('/src/lib/grammar.ts')
  const b = g.grammarBrief(g.findTopic(g.allTopicIds()[0]))
  assert.match(b, /Do NOT end with an open question that invites a long answer: end with the NEXT TASK/)
})
