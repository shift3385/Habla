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

// ---------------------------------------------------------------------------
// D2 · punto 0: barajar las opciones de los «choice»

test('barajar: estable con la misma semilla, la correcta sigue siendo la misma opción y las trampas la acompañan', () => {
  const ex = g.findTopic('sample-past-simple').exercises.find((e) => e.type === 'choice')
  const a = g.shuffleChoice(ex, 1)
  assert.deepEqual(g.shuffleChoice(ex, 1), a, 'misma semilla → mismo orden (al volver a pintar no cambia)')
  assert.equal(a.options[a.answer], ex.options[ex.answer])
  assert.deepEqual([...a.options].sort(), [...ex.options].sort())
  for (let k = 0; k < a.options.length; k++) assert.equal(a.trapsEs[k], ex.trapsEs[ex.options.indexOf(a.options[k])] ?? '')
  // Otra ronda (otra semilla) cambia el orden alguna vez, y la correcta acaba en cualquier posición.
  const orders = new Set()
  const positions = new Set()
  for (let seed = 0; seed < 60; seed++) {
    const s = g.shuffleChoice(ex, seed)
    orders.add(s.options.join('|'))
    positions.add(s.answer)
    assert.equal(s.options[s.answer], ex.options[ex.answer])
  }
  assert.ok(orders.size > 1)
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3])
})

// ---------------------------------------------------------------------------
// D3: plan, profe, clase centrada, informe y «Para ti» con señales

test('plan: el tema que nombra un texto; gana la frase más larga y un empate no enlaza nada', () => {
  assert.equal(g.topicForText('Tell a story about last weekend using the Past Simple.')?.id, 'sample-past-simple')
  assert.equal(g.topicForText('Experiencias con el presente perfecto')?.id, 'sample-present-perfect')
  // «present perfect» (15) gana a «past simple» (11) si aparecen los dos.
  assert.equal(g.topicForText('past simple vs present perfect')?.id, 'sample-present-perfect')
  // Empate de longitud (8 y 8): mejor sin enlace que con uno equivocado.
  assert.equal(g.topicForText('ought to or he hecho'), undefined)
  assert.equal(g.topicForText('Talk about your hobbies'), undefined)
  // La lección: primero su objetivo, luego el foco de la semana y por último el título.
  assert.equal(g.topicForLesson({ focusEn: 'present perfect' }, { targetEn: 'Use the past simple', titleEs: '' })?.id, 'sample-past-simple')
  assert.equal(g.topicForLesson({ focusEn: 'present perfect for experiences' }, { targetEn: 'Talk about trips', titleEs: 'Viajes' })?.id, 'sample-present-perfect')
  assert.equal(g.topicForLesson({ focusEn: 'travel' }, { targetEn: 'Talk about trips', titleEs: 'Viajes' }), undefined)
})

test('profe: solo se guardan ids que existen (nunca uno inventado por Gemini)', () => {
  assert.equal(g.validTopicId(' sample-should '), 'sample-should')
  assert.equal(g.validTopicId('inventado'), undefined)
  assert.equal(g.validTopicId(7), undefined)
  assert.equal(g.validTopicId(''), undefined)
  assert.equal(g.topicIdsForPrompt(), 'sample-past-simple,sample-present-perfect,sample-should')
})

test('clase centrada: el brief lleva el tema, el nivel, el foco y las formas', () => {
  const t = g.findTopic('sample-should')
  const b = g.grammarBrief(t)
  assert.match(b, /"Should and Ought To" \(level A2\)/)
  assert.ok(b.includes(t.classFocusEn))
  for (const k of ['affirmative', 'negative', 'question']) assert.ok(b.includes(`${k}: ${t.forms[k].pattern}`), k)
  // P3 (uso real): clase dirigida a la regla, no conversación libre.
  assert.match(b, /OVERRIDES the "chatting with a friend" style/)
  assert.match(b, /How would you say in English/)
  assert.match(b, /What's missing in this sentence/)
  // P3b (uso real, 2026-10-19): corrige TODOS los errores, no solo los de la regla, y no felicita una respuesta con fallos.
  assert.match(b, /EVERY real error/)
  assert.match(b, /Never call an answer "correct"/)
  assert.doesNotMatch(b, /only if they block understanding/)
  if (t.commonMistakes.length) assert.ok(b.includes(t.commonMistakes[0].wrong), 'incluye los errores típicos')
})

test('informe: temas de las correcciones en orden, sin repetir y sin ids desconocidos', () => {
  const ids = g.topicsOfCorrections([
    { grammarTopic: 'sample-should' },
    { grammarTopic: 'inventado' },
    {},
    { grammarTopic: 'sample-past-simple' },
    { grammarTopic: 'sample-should' },
  ]).map((t) => t.id)
  assert.deepEqual(ids, ['sample-should', 'sample-past-simple'])
  // P5: varios temas en una corrección; las antiguas solo traen grammarTopic.
  const many = g.topicsOfCorrections([{ grammarTopic: 'sample-should', grammarTopics: ['sample-should', 'sample-present-perfect'] }, { grammarTopic: 'sample-past-simple' }])
  assert.deepEqual(many.map((t) => t.id), ['sample-should', 'sample-present-perfect', 'sample-past-simple'])
  assert.equal(g.forYouTopics('A2', {}, 6, { mistakes: [{ grammarTopics: ['sample-should', 'sample-present-perfect'] }, { grammarTopics: ['sample-present-perfect'] }] })[0].id, 'sample-present-perfect')
})

test('«Para ti» con señales: errores con tema, tema del plan, categorías de respaldo y sin dominados', () => {
  const ids = (level, progress, signals) => g.forYouTopics(level, progress, 6, signals).map((t) => t.id)
  // Sin señales (A2): los de tu nivel y luego el siguiente.
  assert.deepEqual(ids('A2', {}, {}), ['sample-past-simple', 'sample-should', 'sample-present-perfect'])
  // Dos errores de present perfect (B1, 3·2 + 0,5) pasan delante de los de tu nivel; un id inventado no cuenta.
  const mistakes = [{ grammarTopic: 'sample-present-perfect' }, { grammarTopic: 'sample-present-perfect' }, { grammarTopic: 'inventado' }]
  assert.equal(ids('A2', {}, { mistakes })[0], 'sample-present-perfect')
  // El tema del plan de hoy (+5, con tu nivel 6) gana a un error suelto (3,5); dos errores (6,5) ya pesan más.
  assert.equal(ids('A2', {}, { mistakes: mistakes.slice(1), planTopic: 'sample-should' })[0], 'sample-should')
  assert.equal(ids('A2', {}, { mistakes, planTopic: 'sample-should' })[0], 'sample-present-perfect')
  // Errores sin tema (clases antiguas): la categoría «auxiliary» ayuda a los temas de tu nivel con ella; «grammar» es demasiado general.
  assert.equal(ids('A2', {}, { mistakes: [{ category: 'auxiliary' }, { category: 'auxiliary' }] })[0], 'sample-past-simple')
  // Un tema dominado no sale aunque tenga errores.
  assert.ok(!ids('A2', { 'sample-present-perfect': { mastered: true } }, { mistakes }).includes('sample-present-perfect'))
})

// ---------------------------------------------------------------------------
// 5.10.1 (D3): frase completa, órdenes alternativos y tarjetas antiguas, con el catálogo REAL (src/grammar/*.json).

const realGrammar = async () => {
  const real = await loadFresh('/src/lib/grammar.ts') // instancia nueva con el catálogo de la app (no la muestra)
  const ex = (id) => {
    const t = real.findTopic(id.replace(/-\d+$/, ''))
    const x = t?.exercises.find((e) => e.id === id)
    assert.ok(x, `no existe el ejercicio ${id}`)
    return x
  }
  return { real, ex }
}

test('frase completa (REG-A3-01): sin la pista, sin el prefijo en español y con «I\'ll» unido (casos reales)', async () => {
  const { real, ex } = await realGrammar()
  const fs = (id) => real.fullSentence(ex(id))
  assert.equal(fs('can-cant-2'), "Sorry, I can't come to the meeting tomorrow.") // antes: «… tomorrow. (can, negativa)»
  assert.equal(fs('subject-object-possessive-pronouns-3'), "This isn't my scarf. Mine is blue, so this one must be hers.") // «(de ella)»
  assert.equal(fs('should-could-would-2'), 'You should sleep more.') // antes: ««Deberías dormir más.» → You should…»
  assert.equal(fs('will-shall-offers-1'), "The phone's ringing. — Don't worry, I'll get it.") // antes: «I 'll get it»
  assert.equal(fs('had-better-7'), "It's important that you see a doctor soon.") // «… means: ____» → solo la opción
  assert.equal(fs('contractions-2'), 'She has finished her homework.') // REG-A3-05
  assert.equal(fs('passive-present-past-7'), 'Where were you born? — In Bogotá.') // pista «(be born)» pegada al hueco
  assert.equal(fs('some-any-2'), "We don't have any bread. Can you buy some?") // pista nueva al final (REG-A3-07)
})

test('REG-A3-02 y REG-M-08: in-case-vs-if-8 y prepositions-of-time-6 dan frases inglesas claras', async () => {
  const { real, ex } = await realGrammar()
  const inCase = ex('in-case-vs-if-8')
  assert.equal(real.fullSentence(inCase), "We're going on a long drive, so I'll buy some snacks now in case the kids get hungry.")
  assert.ok(!/[áéíóúñ¿]/.test(real.cardPrompt(inCase) + inCase.options.join(' ')), 'el enunciado y las opciones van en inglés')
  assert.equal(real.fullSentence(ex('prepositions-of-time-6')), 'Her train arrives in the afternoon, around four.')
  assert.equal(real.checkExercise(ex('prepositions-of-time-6'), ['in']), true)
})

test('todo el catálogo: ninguna frase completa lleva pista, español, flecha ni una palabra repetida («in in»)', async () => {
  const { real } = await realGrammar()
  const names = /Tomás|Ramón|Díaz|Bogotá|Cancún|café|México|Martínez|José|María|Sofía|Lucía|Andrés|Héctor|Raúl|Iván|Óscar|Inés|Mónica/g
  const bad = []
  for (const t of real.grammarCatalog().topics)
    for (const x of t.exercises) {
      const s = real.fullSentence(x)
      if (x.id === 'wh-questions-3') continue // «What does «awkward» mean?»: las comillas son parte de la frase
      if (/[«»→¿¡()]|\w\s'(ll|d|m|re|ve|s)\b|means:|Which sentence|Which verb|_{3,}/.test(s) || /[áéíóúñ]/.test(s.replace(names, ''))) bad.push(`${x.id}: ${s}`)
      const dup = s.match(/\b(\w+) \1\b/i)
      if (dup && !/^(had had|that that)$/i.test(dup[0])) bad.push(`${x.id} (palabra repetida «${dup[0]}»): ${s}`)
    }
  assert.deepEqual(bad, [])
})

test('órdenes alternativos (REG-A3-06): «alsoAccepted» cuenta como acierto y la frase que se enseña es la tuya', async () => {
  const { real, ex } = await realGrammar()
  const ps7 = ex('present-simple-7')
  assert.equal(real.checkExercise(ps7, 'My dad never works on Sundays'.split(' ')), true)
  assert.equal(real.checkExercise(ps7, 'On Sundays my dad never works'.split(' ')), true)
  assert.equal(real.checkExercise(ps7, 'My dad works never on Sundays'.split(' ')), false)
  assert.equal(real.orderMatch(ps7, 'On Sundays my dad never works'.split(' ')), 'On Sundays my dad never works')
  // Las fichas no llevan coma: «If you don't hurry you'll be late» vale por «If you don't hurry, you'll be late».
  const fc5 = ex('first-conditional-5')
  const tapped = ['If', 'you', "don't", 'hurry', "you'll", 'be', 'late']
  assert.equal(real.checkExercise(fc5, tapped), true)
  assert.equal(real.fullSentence(fc5, real.orderMatch(fc5, tapped)), "If you don't hurry, you'll be late.")
  assert.equal(real.fullSentence(fc5), "You'll be late if you don't hurry.") // sin colocación elegida: la de «answer»
  // Los 15 de la propuesta de A3 tienen su alternativa.
  const withAlt = real.grammarCatalog().topics.flatMap((t) => t.exercises).filter((x) => x.type === 'order' && x.alsoAccepted?.length)
  assert.equal(withAlt.length, 15)
})

test('huecos (REG-A3-07): otras respuestas válidas de must-vs-have-to-6', async () => {
  const { real, ex } = await realGrammar()
  const x = ex('must-vs-have-to-6')
  for (const a of ['must', 'have to', 'need to', 'have got to', "'ve got to"]) assert.equal(real.checkExercise(x, [a]), true, a)
  assert.equal(real.checkExercise(x, ['should']), false)
})

test('tarjetas ya creadas con la 5.10: se rehacen desde el ejercicio por su sourceId (idempotente)', async () => {
  const { real, ex } = await realGrammar()
  const old = (id, answerEn, promptEs, whyEs) => {
    const x = ex(id)
    const t = real.findTopic(id.replace(/-\d+$/, ''))
    return { source: 'grammar', sourceId: real.exerciseCardId(id), promptEs: promptEs ?? real.cardPrompt(x), answerEn, hintEs: `${t.nameEs}: ${whyEs ?? x.whyEs}` }
  }
  // REG-A3-01: la pista pegada a la respuesta.
  const c1 = old('can-cant-2', "Sorry, I can't come to the meeting tomorrow. (can, negativa)")
  assert.deepEqual(real.grammarCardPatch(c1), { answerEn: "Sorry, I can't come to the meeting tomorrow." })
  // REG-A3-02: respuesta en español y enunciado antiguo.
  const c2 = old('in-case-vs-if-8', 'Ahora, por precaución', "«I'll buy some snacks in case the kids get hungry.» ¿Cuándo compras los snacks?", "«In case» = por si acaso: la acción ocurre ya, pase lo que pase.")
  const p2 = real.grammarCardPatch(c2)
  assert.equal(p2.answerEn, "We're going on a long drive, so I'll buy some snacks now in case the kids get hungry.")
  assert.equal(p2.promptEs, "We're going on a long drive, so I'll buy some snacks now ____ the kids get hungry.")
  assert.ok(p2.hintEs.includes('Los compras ya, por precaución'))
  // REG-M-08: «gets in in».
  const c3 = old('prepositions-of-time-6', 'Her train gets in in the afternoon, around four.', 'Her train gets in ____ the afternoon, around four.')
  assert.deepEqual(real.grammarCardPatch(c3), { promptEs: 'Her train arrives ____ the afternoon, around four.', answerEn: 'Her train arrives in the afternoon, around four.' })
  // Idempotente: aplicado el parche, ya no hay nada que cambiar.
  for (const c of [c1, c2, c3]) assert.equal(real.grammarCardPatch({ ...c, ...real.grammarCardPatch(c) }), null)
  // Otras tarjetas no se tocan: errores de clase, palabras guardadas y ejercicios que ya no existen.
  assert.equal(real.grammarCardPatch({ ...c1, source: 'mistake' }), null)
  assert.equal(real.grammarCardPatch({ ...c1, sourceId: 12345 }), null)
})

test('validador: «alsoAccepted» con otras palabras, igual que «answer» o con punto final es un error', () => {
  const s = sample()
  const bad = structuredClone(s[0].data)
  const order = bad.topics[0].exercises.find((x) => x.type === 'order') // «Did you read the email»
  order.alsoAccepted = ['Did you read the mail', 'did you read the email', 'You did read the email.']
  const r = validateSections([{ file: 'sample-tenses.json', data: bad }, s[1]])
  const all = r.errors.join('\n')
  for (const frag of ['«Did you read the mail» no usa exactamente', '«did you read the email» es igual que "answer"', '«You did read the email.» sin punto final'])
    assert.ok(all.includes(frag), `falta «${frag}» en:\n${all}`)
  order.alsoAccepted = ['You did read the email']
  assert.deepEqual(validateSections([{ file: 'sample-tenses.json', data: bad }, s[1]]).errors, [])
})
