// 5.10.1 (D2): tramos por idioma de las explicaciones de Gramática (src/lib/speechLang.ts).
// REG-M-10 (ordinales, horas, años) y los 13 casos del catálogo de REG-A3-13/14 (A3-contenido.md §5.3), con los textos
// tal cual están en src/grammar/*.json.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { closeServer, loadFresh } from './helpers/vite.mjs'

const { splitByLanguage, ordinalWord } = await loadFresh('/src/lib/speechLang.ts')
after(closeServer)

const seg = (text) => splitByLanguage(text)
const en = (text) => seg(text).filter((s) => s.lang === 'en').map((s) => s.text)
/** El idioma del tramo que contiene `piece`. */
const langOf = (text, piece) => {
  const s = seg(text).find((x) => x.text.includes(piece))
  assert.ok(s, `ningún tramo contiene «${piece}»: ${JSON.stringify(seg(text))}`)
  return s.lang
}

// --- REG-M-10 ---

test('REG-M-10: «on May 5th» es un solo tramo inglés y se lee «fifth» (nada de «th» en español)', () => {
  const t =
    '«At»: horas y momentos concretos (at 7:30, at noon, at midnight, at night) y fiestas como periodo (at Christmas). «On»: días y fechas (on Monday, on May 5th, on my birthday, on Friday night). «In»: meses, años, estaciones, siglos y partes del día (in July, in 2024, in summer).'
  const s = seg(t)
  assert.ok(!s.some((x) => x.lang === 'es' && /^th\b/.test(x.text)), JSON.stringify(s))
  assert.ok(en(t).some((x) => x.includes('on Monday, on May fifth, on my birthday, on Friday night')), JSON.stringify(s))
  // La hora y el año no se separan del inglés de al lado.
  assert.ok(en(t).some((x) => x.includes('at 7:30, at noon')), JSON.stringify(s))
  assert.ok(en(t).some((x) => x.includes('in July, in 2024, in summer')), JSON.stringify(s))
})

test('REG-M-10: ordinales en palabras', () => {
  assert.equal(ordinalWord(1), 'first')
  assert.equal(ordinalWord(2), 'second')
  assert.equal(ordinalWord(3), 'third')
  assert.equal(ordinalWord(5), 'fifth')
  assert.equal(ordinalWord(12), 'twelfth')
  assert.equal(ordinalWord(20), 'twentieth')
  assert.equal(ordinalWord(21), 'twenty-first')
  assert.equal(ordinalWord(30), 'thirtieth')
  assert.equal(ordinalWord(31), 'thirty-first')
  assert.equal(ordinalWord(100), null)
  assert.deepEqual(en('Las fechas: on the 1st, the 2nd, the 3rd, the 12th.'), ['on the first, the second, the third, the twelfth.'])
  // Dentro de una cita inglesa también.
  assert.deepEqual(en('Se dice «May 22nd».'), ['May twenty-second.'])
  // Más de 99: se queda en cifras, pero en el tramo inglés.
  assert.deepEqual(en('Ejemplo: the 100th time.'), ['the 100th time.'])
})

test('REG-M-10: horas, años y números sueltos', () => {
  assert.equal(langOf('Para las horas: at 10:00 o at 7:30.', '10:00'), 'en')
  assert.equal(langOf('Para las horas: at 10:00 o at 7:30.', '7:30'), 'en')
  assert.equal(langOf('Con años: in 1990 y in the 1990s.', '1990s'), 'en')
  assert.equal(langOf('Con años: in 1990 y in the 1990s.', 'in 1990'), 'en')
  // Detrás de español o pegado a español, español.
  assert.equal(langOf('Llegó el 5 de mayo.', '5 de mayo'), 'es')
  assert.equal(langOf('Repite works 3 veces.', '3 veces'), 'es')
  // Al final, tras inglés y antes de un paréntesis: inglés.
  assert.equal(langOf('A las diez (at 10) y luego.', 'at 10'), 'en')
})

// --- REG-A3-13: citas españolas que se leían en inglés ---

test('REG-A3-13 · 1: «actualmente» y «embarazada» (Falsos amigos) en español', () => {
  const t = 'Actually no es «actualmente», embarrassed no es «embarazada», library no es «librería»…'
  assert.equal(langOf(t, 'actualmente'), 'es')
  assert.equal(langOf(t, 'embarazada'), 'es')
  assert.equal(langOf(t, 'embarrassed'), 'en')
})

test('REG-A3-13 · 2: «Soy ingeniero» en español; «I\'m an engineer» en inglés', () => {
  const t = 'Diferencia importante con el español: las profesiones llevan artículo. «Soy ingeniero» = «I\'m an engineer».'
  assert.equal(langOf(t, 'Soy ingeniero'), 'es')
  assert.equal(langOf(t, "I'm an engineer"), 'en')
})

test('REG-A3-13 · 3: «If + presente simple, will + verbo»: la metalengua en español', () => {
  const t = 'Estructura: «If + presente simple, will + verbo». Como en español, la condición va en presente.'
  assert.equal(langOf(t, 'presente simple'), 'es')
  assert.equal(langOf(t, 'verbo'), 'es')
  assert.equal(langOf(t, 'If'), 'en')
})

test('REG-A3-13 · 4: «me levanto» en español', () => {
  const t = 'Myself, yourself, themselves…: cuando haces algo a ti mismo. Y por qué «me levanto» no lleva «myself».'
  assert.equal(langOf(t, 'me levanto'), 'es')
})

test('REG-A3-13 · 5: «no vi nada» y «no vino nadie» en español', () => {
  const t = 'En español decimos «no vi nada» o «no vino nadie», con dos negaciones.'
  assert.deepEqual(en(t), [])
})

test('REG-A3-13 · 6: «cualquier», «aunque», «sin embargo», «porque» en español', () => {
  assert.equal(langOf('Y «any» en afirmativa significa «cualquier»: «Call me any time».', 'cualquier'), 'es')
  const t = 'Although, however, despite, because (of) y so: unir ideas para decir «aunque», «sin embargo», «a pesar de», «porque» y «así que».'
  for (const w of ['aunque', 'sin embargo', 'porque']) assert.equal(langOf(t, w), 'es', w)
})

// --- REG-A3-14: palabras inglesas que se leían en español ---

test('REG-A3-14 · 7: «Although, however, despite…» en inglés', () => {
  const t = 'Although, however, despite, because (of) y so: unir ideas para decir «aunque».'
  assert.equal(en(t)[0], 'Although, however, despite, because (of)')
})

test('REG-A3-14 · 8: «already = ya» → already en inglés', () => {
  const t = 'Just = acabo de; already = ya (antes de lo esperado); yet = ya / todavía.'
  assert.ok(en(t).includes('already ='), JSON.stringify(seg(t)))
})

test('REG-A3-14 · 9: «nobody, no one / not … anybody» en un tramo inglés', () => {
  const t = 'Parejas: nothing / not … anything (nada); nobody, no one / not … anybody, anyone (nadie).'
  assert.ok(en(t).some((x) => x.startsWith('nobody, no one, not … anybody, anyone')), JSON.stringify(seg(t)))
})

test('REG-A3-14 · 10: «edad (old, new)» → old en inglés', () => {
  const t = 'Orden habitual: opinión (nice, beautiful) → tamaño (big, small) → edad (old, new) → forma (round, square).'
  assert.equal(langOf(t, 'old'), 'en')
})

test('REG-A3-14 · 11: «Con «to»: want, need, decide, hope, plan, promise, agree, refuse» en un tramo', () => {
  const t = 'Con «to»: want, need, decide, hope, plan, promise, agree, refuse, learn, afford, offer, expect, would like.'
  // «to:» se une a la lista: un solo tramo inglés (antes, 7 cambios de voz y «refuse» en español).
  assert.deepEqual(en(t), ['to: want, need, decide, hope, plan, promise, agree, refuse, learn, afford, offer, expect, would like.'])
})

test('REG-A3-14 · 12: «at the bus stop» en un tramo; «and her husband» en inglés', () => {
  assert.ok(en('«at» es un punto o un sitio donde se hace algo (at the door, at the bus stop).').includes('at the door, at the bus stop).'))
  const t = 'El español «su» sirve para todo: «Juan and his sister», «María and her husband», «the company and its logo».'
  assert.equal(langOf(t, 'su'), 'es')
  // «María» es un nombre español (se queda con la voz española); «and her husband», ya no parte en «and» + «husband».
  assert.ok(en(t).some((x) => x.startsWith('and her husband,')), JSON.stringify(seg(t)))
})

test('REG-A3-14 · 13: «no uses «wish»» → «uses» en español', () => {
  const t = 'Si es un deseo posible para el futuro, no uses «wish», sino «hope» + presente.'
  assert.equal(langOf(t, 'no uses'), 'es')
  assert.equal(langOf(t, 'wish'), 'en')
})
