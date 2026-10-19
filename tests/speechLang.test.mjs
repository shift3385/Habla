// v5.10 (P4b): las explicaciones de Gramática se leen con el inglés en voz inglesa (src/lib/speechLang.ts).
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { closeServer, loadFresh } from './helpers/vite.mjs'

const { splitByLanguage } = await loadFresh('/src/lib/speechLang.ts')
after(closeServer)

const en = (text) => splitByLanguage(text).filter((s) => s.lang === 'en').map((s) => s.text)

test('presente simple: el inglés sin comillas va con voz inglesa', () => {
  const t = 'Con he, she e it el verbo lleva -s o -es: works, watches, goes, has. Para negar necesitas el auxiliar do/does.'
  assert.deepEqual(en(t), ['he, she', 'it', 's', 'es: works, watches, goes, has.', 'do, does.'])
  assert.equal(splitByLanguage(t)[0].text, 'Con')
})

test('citas: «…» en inglés con voz inglesa; las citas en español siguen en español', () => {
  const t = '«Can» sirve para la habilidad («I can swim»: sé nadar). Ojo: el «saber» de «sé nadar» es «can».'
  assert.deepEqual(en(t), ['Can', 'I can swim:', 'can.'])
  assert.ok(splitByLanguage(t).some((s) => s.lang === 'es' && s.text.includes('el saber de sé nadar')))
})

test('la «a» española delante de inglés sigue en español; la fonética /…/ no se lee', () => {
  assert.deepEqual(en('Equivale a «have». Suena débil (/kən/).'), ['have.'])
  assert.ok(!splitByLanguage('Suena débil (/kən/).').some((s) => s.text.includes('kən')))
})

test('texto solo en español: un tramo', () => {
  assert.deepEqual(splitByLanguage('Rutinas, hábitos y horarios.'), [{ lang: 'es', text: 'Rutinas, hábitos y horarios.' }])
})
