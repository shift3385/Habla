// v5.10 (P6, uso real): la transcripción no debe ser la voz del teléfono leyendo una idea de «¿Qué digo?».
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const ideas = [{ en: 'I think the best part of my weekend was' }, { en: "Honestly, I didn't do much because" }, { en: 'My favourite moment was when we' }]

test('P6: la idea tal cual se detecta; una respuesta propia que la continúa, no', async () => {
  const { echoesIdea } = await loadFresh('/src/lib/teacher.ts')
  assert.equal(echoesIdea('I think the best part of my weekend was…', ideas), true)
  assert.equal(echoesIdea('i think the best part of my weekend was', ideas), true)
  assert.equal(echoesIdea("Honestly, I didn't do much because.", ideas), true)
  // 5.10.1 (REG-A1-04): una palabra tuya ya es una respuesta (antes se rechazaba con hasta 2 palabras más).
  assert.equal(echoesIdea('I think the best part of my weekend was the', ideas), false, '1 palabra más ya es tuya')
  assert.equal(echoesIdea('I think the best part of my weekend was, um', ideas), true, 'solo muletillas')
  assert.equal(echoesIdea('I think the best part of my weekend was going to the beach with my family', ideas), false)
  assert.equal(echoesIdea('Yesterday I go to the park', ideas), false)
  assert.equal(echoesIdea('', ideas), false)
  assert.equal(echoesIdea('I think the best part of my weekend was', []), false)
})

test('P5: una corrección puede enlazar varios temas (máx. 3, sin repetir, solo ids que existen)', async () => {
  const { grammarFields } = await loadFresh('/src/lib/teacher.ts')
  const g = await loadFresh('/src/lib/grammar.ts')
  const real = g.allTopicIds()
  const [a, b, c, d] = real
  assert.deepEqual(grammarFields({ grammar_topics: [a, 'inventado', b, a] }), { grammarTopic: a, grammarTopics: [a, b] })
  assert.deepEqual(grammarFields({ grammar_topics: [a, b, c, d] }).grammarTopics, [a, b, c])
  assert.deepEqual(grammarFields({ grammar_topics: [] }), {})
  assert.deepEqual(grammarFields({ grammar_topic: b }), { grammarTopic: b, grammarTopics: [b] }, 'respuesta antigua')
})
