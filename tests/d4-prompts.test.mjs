// 5.10.1 · D4 «Prompts»: REG-A1-04 (echoesIdea), REG-A3-03/04 (clase de Gramática), REG-A3-15 (coherencia del profe),
// REG-A3-16 («Dilo tú»), REG-A3-17 (has_error), 5.8c («Remember:at») y REG-A2-05 (tipos defensivos del profe).
// Red simulada con un `fetch` falso, como tests/promptInjection.test.mjs: ninguna llamada real; la clave es ficticia.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const FAKE_KEY = 'clave-ficticia-de-prueba'
const MODELS = { primary: 'modelo-falso', timeoutMs: 5000 }

/** Gemini falso: responde `payload` y guarda el cuerpo de cada petición (para leer el prompt). */
function fakeGemini(payload) {
  const bodies = []
  globalThis.fetch = async (_url, init) => {
    bodies.push(String(init?.body ?? ''))
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  return bodies
}

const PROFILE = {
  id: 'me',
  levels: { overall: 'B1', grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'A2' },
  about: 'ingeniero',
  weaknesses: [],
  goal: '',
  startedAt: 0,
}
const SCENARIO = { id: 'free', title: 't', subtitle: '', emoji: '', icon: 'book', brief: 'Talk about anything.' }

const ideas = [{ en: 'I think the best part of my weekend was' }, { en: 'My favourite moment was when we' }, { en: 'So, honestly, I prefer' }]

test('REG-A1-04: solo la idea exacta (con muletillas) cuenta como «leíste la idea»; idea + algo tuyo, no', async () => {
  const { echoesIdea } = await loadFresh('/src/lib/teacher.ts')
  // Los falsos positivos del informe A1: la idea + 1–2 palabras propias es una respuesta real.
  assert.equal(echoesIdea('My favourite moment was when we ate pizza', ideas), false)
  assert.equal(echoesIdea('I think the best part of my weekend was the party', ideas), false)
  // La voz del teléfono leyendo la idea: idéntica, sin mayúsculas, puntuación ni «…».
  assert.equal(echoesIdea('My favourite moment was when we...', ideas), true)
  assert.equal(echoesIdea('MY FAVOURITE MOMENT, WAS WHEN WE', ideas), true)
  // Con titubeos o muletillas alrededor sigue siendo solo la idea.
  assert.equal(echoesIdea('Um, so my favourite moment was, uh, when we, yeah', ideas), true)
  // REV-D4-01: la idea se compara ENTERA; «so», «well», «like»… de la idea son contenido.
  assert.equal(echoesIdea('So, honestly, I prefer', ideas), true)
  assert.equal(echoesIdea('Um, so, honestly I prefer, yeah', ideas), true, 'la «so» de la idea sí está en lo dicho')
  assert.equal(echoesIdea('honestly I prefer', ideas), false, 'sin la «so» de la idea ya no es la idea entera')
  const well = [{ en: "I don't sleep well" }]
  assert.equal(echoesIdea("I don't sleep", well), false, 'idea «…sleep well» + alumno «…sleep»: es una respuesta')
  assert.equal(echoesIdea("I don't sleep well.", well), true)
  assert.equal(echoesIdea("Well, I don't sleep well, like", well), true, 'muletillas de los extremos de lo dicho')
  // Más corta que la idea, o con otra palabra en medio: no es la idea.
  assert.equal(echoesIdea('My favourite moment was', ideas), false)
  assert.equal(echoesIdea('My favourite moment really was when we', ideas), false)
  // Entradas raras no rompen.
  assert.equal(echoesIdea('um uh', ideas), false)
  assert.equal(echoesIdea('My favourite moment was when we', [{ en: '' }, null]), false)
})

test('REG-A3-15 y REG-A3-17: el profe no felicita con correcciones y no queda la instrucción huérfana has_error', async () => {
  const { buildSystemPrompt } = await loadFresh('/src/lib/teacher.ts')
  const p = buildSystemPrompt(PROFILE, SCENARIO, [], undefined, '')
  assert.match(p, /"reply" must agree with "corrections"/)
  assert.match(p, /never call the answer correct, perfect, great English or spot on/)
  assert.doesNotMatch(p, /has_error/)
  // La regla va en la sección de corregir (antes de los temas frecuentes).
  assert.ok(p.indexOf('must agree with') > p.indexOf('# Correcting'))
  assert.ok(p.indexOf('must agree with') < p.indexOf('# Structures this student'))
})

test('REG-A3-03 y REG-A3-04: la clase de Gramática anula las 3 reglas del profe y marca el español con « »', async () => {
  const g = await loadFresh('/src/lib/grammar.ts')
  const t = g.findTopic(g.allTopicIds()[0])
  const b = g.grammarBrief(t)
  assert.match(b, /Rules replaced in this lesson/)
  assert.match(b, /Do NOT end with an open question/)
  assert.match(b, /Do NOT ask for more details when a task answer is short/)
  assert.match(b, /You MAY explain the correction inside "reply"/)
  assert.match(b, /Put every Spanish word or sentence inside « »/)
  assert.match(b, /never use « » for English/)
  // La tarea (c) cita inglés: ya no con « » (se leería con la voz española).
  assert.match(b, /Is this correct\? "…"/)
  assert.doesNotMatch(b, /Is this correct\? «/)
  // Lo que ya estaba (P3/P3b) sigue.
  assert.match(b, /EVERY real error/)
  assert.match(b, /Never call an answer "correct"/)
})

test('REG-A3-04: replySegments lee lo de « » en español y el resto en inglés, sin las comillas', async () => {
  const { replySegments } = await loadFresh('/src/lib/teacher.ts')
  assert.deepEqual(replySegments('Almost! We say "on Monday". How would you say in English: «Mi cumpleaños es en julio»?'), [
    { lang: 'en', text: 'Almost! We say "on Monday". How would you say in English:' },
    { lang: 'es', text: 'Mi cumpleaños es en julio?' },
  ])
  assert.deepEqual(replySegments('Great job. Next one.'), [{ lang: 'en', text: 'Great job. Next one.' }])
  assert.deepEqual(replySegments('«Ayer» is «yesterday» in English'), [
    { lang: 'es', text: 'Ayer' },
    { lang: 'en', text: 'is' },
    { lang: 'es', text: 'yesterday' },
    { lang: 'en', text: 'in English' },
  ])
  assert.deepEqual(replySegments(''), [])
})

test('REG-A3-16: en «Dilo tú» cualquier error impide «correct» y hay que nombrarlo', async () => {
  const bodies = fakeGemini({ transcript: 'She have a car', verdict: 'almost', feedback_es: 'Casi: «has».' })
  const g = await loadFresh('/src/lib/grammar.ts')
  const topic = g.findTopic(g.allTopicIds()[0])
  const { evaluateSpeaking } = await loadFresh('/src/lib/grammarAi.ts')
  const r = await evaluateSpeaking(FAKE_KEY, MODELS, topic, { promptEs: 'p', checkEs: 'c', modelEn: 'm' }, { base64: 'AAAA', mimeType: 'audio/webm' })
  assert.equal(r.verdict, 'almost')
  const prompt = bodies[0]
  assert.match(prompt, /\\"correct\\" only if the WHOLE answer is correct/)
  assert.match(prompt, /one small error ANYWHERE in the sentence/)
  assert.match(prompt, /Any error at all, even outside the target structure, means it is NOT \\"correct\\"/)
  assert.match(prompt, /Name EVERY error you found/)
  assert.match(prompt, /Never say it is correct if you mention an error/)
})

test('5.8c: «Remember:\\nat» se pinta y se lee «Remember: at» (y las horas no cambian)', async () => {
  const { tidyReply } = await loadFresh('/src/lib/teacher.ts')
  assert.equal(tidyReply('Remember:\nat is for times.'), 'Remember: at is for times.')
  assert.equal(tidyReply('Remember:at is for times.'), 'Remember: at is for times.')
  assert.equal(tidyReply('Good!\r\n\r\nNow say it   as a question.'), 'Good! Now say it as a question.')
  assert.equal(tidyReply('The class starts at 10:30.'), 'The class starts at 10:30.')
})

test('REG-A2-05: el profe no se rompe con tipos inesperados (modelo sin esquema) y limpia la respuesta', async () => {
  fakeGemini({
    heard_speech: true,
    transcript: 42,
    reply: 'Remember:\nat is for times.',
    reply_es: { x: 1 },
    corrections: [
      { original: 7, corrected: 'x', explanation_es: null, category: 'tense', spanish: 1, grammar_topics: 'x' },
      { original: 'I go', corrected: 'I went', explanation_es: ['raro'], category: 'tense', spanish: 'Fui', grammar_topics: [] },
      null,
    ],
  })
  const { teacherTurn } = await loadFresh('/src/lib/teacher.ts')
  const r = await teacherTurn(FAKE_KEY, MODELS, 'system', [], { text: 'I go' })
  assert.equal(r.transcript, '')
  assert.equal(r.reply, 'Remember: at is for times.')
  assert.equal(r.replyEs, '')
  assert.equal(r.corrections.length, 1)
  assert.deepEqual(
    { o: r.corrections[0].original, c: r.corrections[0].corrected, e: r.corrections[0].explanationEs },
    { o: 'I go', c: 'I went', e: '' },
  )
})

test('REG-A2-05: correcciones que no son una lista no rompen el turno', async () => {
  fakeGemini({ heard_speech: true, transcript: 'hi', reply: 'Hi!', reply_es: '¡Hola!', corrections: 'ninguna' })
  const { teacherTurn } = await loadFresh('/src/lib/teacher.ts')
  const r = await teacherTurn(FAKE_KEY, MODELS, 'system', [], { text: 'hi' })
  assert.deepEqual(r.corrections, [])
})
