// v5.10 (punto 3): pila de consultas de sinónimos/antónimos (src/lib/lookupStack.ts). Lógica pura, sin React.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const result = (headword, extra = {}) => ({
  headword,
  ipa: '',
  partOfSpeech: 'adjetivo',
  translation: 'grande',
  meaningEs: 'de gran tamaño',
  whyEs: '',
  otherMeanings: [],
  register: '',
  collocations: [],
  falseFriendEs: '',
  exampleEn: '',
  exampleEs: '',
  ...extra,
})
const lookup = (headword, context = 'It was a big house.') => ({ id: 1, query: headword, context, result: result(headword), saved: false, createdAt: 1 })

test('Palabra → sinónimo → antónimo → atrás → atrás; con uno solo no se quita nada (la hoja se cierra)', async () => {
  const m = await loadFresh('/src/lib/lookupStack.ts')
  let s = [m.rootEntry(lookup('big'))]
  assert.equal(m.canPop(s), false)
  assert.equal(m.backLabel(s), null)

  s = m.pushRelated(s, 'large', 'synonym')
  assert.equal(s.length, 2)
  assert.equal(s[1].query, 'large')
  assert.equal(s[1].context, 'It was a big house.', 'hereda el contexto de la palabra original')
  assert.deepEqual(s[1].relation, { kind: 'synonym', of: 'big', meaningEs: 'de gran tamaño' })
  assert.equal(s[1].lookup, null, 'carga en la misma vista')
  assert.equal(m.backLabel(s), 'big')

  // Llega la respuesta del sinónimo; luego su antónimo.
  s = m.patchEntry(s, s[1].key, { lookup: { ...lookup('large', 'It was a big house.'), id: 2 } })
  s = m.pushRelated(s, ' small ', 'antonym')
  assert.equal(s.length, 3)
  assert.equal(s[2].query, 'small')
  assert.equal(s[2].context, 'It was a big house.', 'el contexto sigue siendo el de la original')
  assert.equal(s[2].relation.of, 'large')
  assert.equal(m.backLabel(s), 'large')

  s = m.popEntry(s)
  assert.equal(m.entryLabel(s.at(-1)), 'large')
  s = m.popEntry(s)
  assert.equal(m.entryLabel(s.at(-1)), 'big')
  assert.equal(m.canPop(s), false)
  assert.equal(m.popEntry(s), s, 'con la palabra original arriba, Atrás cierra (la pila no cambia)')
})

test('Raíz por hacer (palabra tocada en la clase) y casos que no apilan', async () => {
  const m = await loadFresh('/src/lib/lookupStack.ts')
  let s = [m.rootEntry({ query: ' run into ', context: ' I ran into Ana. ' })]
  assert.equal(s[0].query, 'run into')
  assert.equal(s[0].context, 'I ran into Ana.')
  assert.equal(s[0].lookup, null)
  assert.equal(m.entryLabel(s[0]), 'run into')
  // Mientras carga, la relación no tiene significado aún y el contexto sale del propio elemento.
  const s2 = m.pushRelated(s, 'meet', 'synonym')
  assert.equal(s2[1].context, 'I ran into Ana.')
  assert.equal(s2[1].relation.meaningEs, '')
  // La misma palabra de arriba o un texto vacío no apilan.
  assert.equal(m.pushRelated(s, 'RUN INTO', 'synonym'), s)
  assert.equal(m.pushRelated(s, '  ', 'antonym'), s)
  // Una respuesta tardía de un elemento ya quitado no cambia la pila.
  const popped = m.popEntry(s2)
  assert.equal(m.patchEntry(popped, s2[1].key, { error: 'x' }), popped)
  assert.notEqual(s2[0].key, s2[1].key)
})

test('relatedWords: limpia, sin repetidos ni la propia palabra, máximo 6; acepta consultas antiguas sin el campo', async () => {
  const m = await loadFresh('/src/lib/lookupStack.ts')
  assert.deepEqual(m.relatedWords(undefined, 'big'), [])
  assert.deepEqual(m.relatedWords(null, 'big'), [])
  assert.deepEqual(m.relatedWords('large', 'big'), [])
  assert.deepEqual(m.relatedWords([' large ', 'Large', 'BIG', '', 3, 'huge'], 'big'), ['large', 'huge'])
  assert.equal(m.relatedWords(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'x').length, m.MAX_RELATED)
})
