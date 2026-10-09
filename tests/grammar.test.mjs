// v5.10 «Gramática»: catálogo, buscador, ejercicios, «Para ti», criterio de dominado y validador del contenido.
// Usa la muestra de tests/fixtures/grammar/ (no se carga en la app): los JSON reales los escriben los autores.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'
import { bankMatcher, exerciseCardId as validatorCardId, validateSections } from '../scripts/validate-grammar.mjs'

after(closeServer)

const dir = new URL('./fixtures/grammar/', import.meta.url)
const sample = () =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: JSON.parse(readFileSync(new URL(f, dir), 'utf8')) }))
    .sort((a, b) => a.data.order - b.data.order) // [tiempos, modales]

let g
before(async () => {
  g = await loadFresh('/src/lib/grammar.ts')
  g.setCatalog(sample().map((x) => x.data))
})

test('catálogo: secciones ordenadas por "order" e índices por id', () => {
  const secs = g.grammarSections()
  assert.deepEqual(secs.map((s) => s.id), ['sample-tenses', 'sample-modals'])
  assert.equal(g.findTopic('sample-should').nameEs, 'Should / ought to (debería)')
  assert.equal(g.sectionOf('sample-present-perfect').id, 'sample-tenses')
  assert.equal(g.findSection('sample-modals').topics.length, 1)
  assert.equal(g.findTopic('no-existe'), undefined)
  assert.deepEqual(g.allTopicIds(), ['sample-past-simple', 'sample-present-perfect', 'sample-should'])
})

test('catálogo: el orden de los archivos no importa y un id repetido no duplica el tema', () => {
  const [a, b] = sample().map((x) => x.data)
  const dup = { ...b, id: 'otra', order: 3, topics: [a.topics[0]] }
  const c = g.buildCatalog([dup, b, a])
  assert.deepEqual(c.sections.map((s) => s.id), ['sample-tenses', 'sample-modals', 'otra'])
  assert.equal(c.topics.length, 3)
  assert.equal(c.sectionOfTopic.get('sample-past-simple').id, 'sample-tenses')
})

test('buscador: por nombre en inglés o español, sin tildes ni mayúsculas', () => {
  assert.equal(g.searchTopics('PASADO')[0].id, 'sample-past-simple')
  assert.equal(g.searchTopics('deberia')[0].id, 'sample-should') // «debería» en nameEs y keywords
  assert.equal(g.searchTopics('present perfect')[0].id, 'sample-present-perfect')
  assert.equal(g.searchTopics('should')[0].id, 'sample-should')
})

test('buscador: palabras clave y resumen; prioriza el nombre', () => {
  // «yesterday» solo está en las keywords del pasado simple.
  assert.deepEqual(g.searchTopics('yesterday').map((t) => t.id), ['sample-past-simple'])
  // «consejos» solo está en el resumen de should.
  assert.deepEqual(g.searchTopics('consejos').map((t) => t.id), ['sample-should'])
  // «perfecto»: en el nombre del presente perfecto → primero.
  assert.equal(g.searchTopics('perfecto')[0].id, 'sample-present-perfect')
  // Todas las palabras tienen que estar.
  assert.deepEqual(g.searchTopics('pasado xyzzy'), [])
  assert.deepEqual(g.searchTopics('   '), [])
})

test('ejercicios: comprobación de choice, gap (uno y dos huecos) y order', () => {
  const t = g.findTopic('sample-present-perfect')
  const [choice, gap, order, , gap2] = t.exercises
  assert.equal(g.checkExercise(choice, 0), true)
  assert.equal(g.checkExercise(choice, 3), false)
  assert.equal(g.checkExercise(gap, ['Haven’t finished ']), true) // mayúsculas, apóstrofo curvo y espacios
  assert.equal(g.checkExercise(gap, ['have not finished']), true) // respuesta alternativa
  assert.equal(g.checkExercise(gap, ['didn\'t finish']), false)
  assert.equal(g.checkExercise(gap2, ['have', 'known']), true)
  assert.equal(g.checkExercise(gap2, ['known', 'have']), false)
  assert.equal(g.checkExercise(order, ['She', 'has', 'already', 'left']), true)
  assert.equal(g.checkExercise(order, ['She', 'already', 'has', 'left']), false)
})

test('ejercicios: frase completa para la voz y la tarjeta del Repaso', () => {
  const pp = g.findTopic('sample-present-perfect').exercises
  assert.equal(g.fullSentence(pp[0]), 'Have you ever run a marathon?') // choice con dos huecos «Have / run»
  assert.equal(g.fullSentence(pp[4]), 'How long have you known Ana?') // dos huecos y la pista (know) fuera
  assert.equal(g.fullSentence(pp[2]), 'She has already left.')
  const ps = g.findTopic('sample-past-simple').exercises
  assert.equal(g.fullSentence(ps[1]), 'My phone stopped working two days ago.')
  assert.equal(g.fullSentence(ps[2]), 'Did you read the email?') // order que empieza como pregunta
  assert.equal(g.cardPrompt(ps[2]), 'you · the · Did · email · read')
})

test('id numérico de la tarjeta: estable, positivo e igual en la app y en el validador', () => {
  const ids = g.allTopicIds().flatMap((id) => g.findTopic(id).exercises.map((x) => x.id))
  const nums = ids.map(g.exerciseCardId)
  assert.equal(new Set(nums).size, ids.length)
  for (const [i, id] of ids.entries()) {
    assert.ok(Number.isInteger(nums[i]) && nums[i] > 0)
    assert.equal(nums[i], validatorCardId(id))
  }
  // Valor fijo: si alguien cambia la función, las tarjetas ya creadas quedarían huérfanas.
  assert.equal(g.exerciseCardId('present-perfect-continuous-1'), validatorCardId('present-perfect-continuous-1'))
  assert.equal(g.exerciseCardId('a'), 0xe40c292c)
})

test('dominado: ≥ 80 % de la última ronda', () => {
  assert.equal(g.isMasteryRound(5, 6), true) // 83 %
  assert.equal(g.isMasteryRound(4, 6), false)
  assert.equal(g.isMasteryRound(7, 8), true)
  assert.equal(g.isMasteryRound(6, 8), false) // 75 %
  assert.equal(g.isMasteryRound(4, 5), true) // 80 % exacto
  assert.equal(g.isMasteryRound(0, 0), false)
  assert.equal(g.topicStatus(undefined), 'new')
  assert.equal(g.topicStatus({ seenAt: 1 }), 'seen')
  assert.equal(g.topicStatus({ seenAt: 1, mastered: true }), 'mastered')
})

test('«Para ti»: tu nivel y el siguiente, sin los dominados, primero los empezados', () => {
  // A2: past-simple (A2) y should (A2) son de tu nivel; present-perfect (B1) es el siguiente.
  assert.deepEqual(g.forYouTopics('A2', {}).map((t) => t.id), ['sample-past-simple', 'sample-should', 'sample-present-perfect'])
  assert.deepEqual(g.forYouTopics('A2', { 'sample-should': { seenAt: 1 } }).map((t) => t.id), ['sample-should', 'sample-past-simple', 'sample-present-perfect'])
  assert.deepEqual(g.forYouTopics('A2', { 'sample-past-simple': { seenAt: 1, mastered: true } }).map((t) => t.id), ['sample-should', 'sample-present-perfect'])
  // B1: solo B1 y B2; «B1+» también vale.
  assert.deepEqual(g.forYouTopics('B1+', {}).map((t) => t.id), ['sample-present-perfect'])
  assert.deepEqual(g.forYouTopics('C1', {}), [])
})

test('validador: la muestra pasa (solo avisos de related hacia secciones que no existen)', () => {
  const r = validateSections(sample(), { icons: new Set(['clock', 'key']) })
  assert.deepEqual(r.errors, [])
  assert.equal(r.stats.topics, 3)
  assert.ok(r.warnings.every((w) => w.includes('related')))
})

test('validador: detecta los errores del FORMATO', () => {
  const s = sample()
  const bad = structuredClone(s[0].data)
  const t = bad.topics[0]
  t.level = 'B3'
  t.categories = ['tense', 'gramatica']
  t.exercises[0].answer = 7
  t.exercises[0].trapsEs = ['', 'x']
  t.exercises[1].id = 'otro-tema-2'
  t.exercises[2].answer = 'Did you read the mail'
  t.exercises[3].trapsEs[1] = 'no debería tener texto'
  t.exercises.length = 5
  bad.topics[1].id = 'sample-should' // repetido con la otra sección
  const r = validateSections([{ file: 'sample-tenses.json', data: bad }, s[1]], { bank: ['You should drink more water.'] })
  const all = r.errors.join('\n')
  for (const frag of ['nivel inválido', 'categoría inválida: gramatica', '"answer" fuera de rango', '"trapsEs" debe tener una entrada por opción',
    'id de ejercicio debe ser', 'no usa exactamente las palabras', '(la correcta) debe ser ""', '6–8 ejercicios', 'id de tema repetido',
    'coincide con un enunciado del banco']) {
    assert.ok(all.includes(frag), `falta el error «${frag}» en:\n${all}`)
  }
})

test('validador: huecos y partes de la respuesta deben cuadrar', () => {
  const s = sample()
  const bad = structuredClone(s[1].data)
  bad.topics[0].exercises[1].answers = ['should / not']
  bad.topics[0].exercises[4].prompt = 'Where we park the car?'
  const r = validateSections([{ file: 'sample-modals.json', data: bad }])
  assert.ok(r.errors.some((e) => e.includes('2 parte(s) y el enunciado 1 hueco')))
  assert.ok(r.errors.some((e) => e.includes('no tiene hueco')))
})

test('validador: comparación con el banco (huecos, pistas entre paréntesis, subcadenas)', () => {
  const m = bankMatcher(['Have you ever ____ sushi?', 'What do you do?', 'She ____ (go) to work by bus every day.', 'I am fine.'])
  // Casos del autor B: misma frase con el hueco relleno → error ('same').
  assert.equal(m('Have you ever tried sushi?')?.kind, 'same')
  assert.equal(m('What do you do?')?.kind, 'same')
  // Pistas entre paréntesis, mayúsculas y puntuación no cuentan.
  assert.equal(m('SHE ____ (travel) to work by bus every day!')?.kind, 'same')
  assert.equal(m('She goes to work by bus every day.')?.kind, 'same')
  // Una dentro de otra → aviso ('inside').
  assert.equal(m('So, what do you do? I work in IT.')?.kind, 'inside')
  // Frases cortas del banco («I am fine») no cuentan; frases distintas, tampoco.
  assert.equal(m('I am fine, thanks.'), null)
  assert.equal(m('Have you ever been to Japan?'), null)
  assert.equal(m('What did you do yesterday?'), null)
})

test('validador: ejemplos, order, modelEn y errores típicos también se comparan con el banco', () => {
  const s = sample()
  const r = validateSections(s, { bank: ['Did you read the email?', 'On Saturday I went to the ____ with my friends.', 'I saw him yesterday.'] })
  const all = [...r.errors, ...r.warnings].join(' | ')
  assert.ok(r.errors.some((e) => e.includes('la frase ordenada') && e.includes('Did you read the email')), all)
  assert.ok(r.errors.some((e) => e.includes('la respuesta modelo')), all)
  assert.ok(r.errors.some((e) => e.includes('la frase correcta') && e.includes('I saw him yesterday')), all)
})
