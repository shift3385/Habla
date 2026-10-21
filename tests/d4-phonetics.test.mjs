// 5.10.1 · D4 «Fonética»: REG-A3-19 (consejo en español por sonido y palabras de función detrás) y REG-M-09
// («ten:zero» en la lista: horas y cifras de la referencia en palabras antes de Azure). Lógica pura de pronunciation.ts.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

let P
before(async () => {
  P = await loadFresh('/src/lib/pronunciation.ts')
})

const w = (word, accuracy, error = 'None', phonemes = []) => ({ word, accuracy, error, phonemes: phonemes.map(([phoneme, a]) => ({ phoneme, accuracy: a })) })
const result = (words, pron = 70) => ({ pron, accuracy: pron, fluency: 80, completeness: 100, text: '', words })

test('REG-M-09: horas, ordinales, miles, decimales y % se pasan a palabras (nada de «ten:zero»)', () => {
  assert.equal(P.spellNumbers('I start at 10:00'), "I start at ten o'clock")
  assert.equal(P.spellNumbers('at 7:30 and 9:05'), 'at seven thirty and nine oh five')
  assert.equal(P.spellNumbers('at 10:15 pm'), 'at ten fifteen p.m.')
  assert.equal(P.spellNumbers('on May 5th, the 21st and the 2nd'), 'on May fifth, the twenty-first and the second')
  assert.equal(P.spellNumbers('the 20th'), 'the twentieth')
  assert.equal(P.spellNumbers('1,000 people'), 'one thousand people')
  assert.equal(P.spellNumbers('2.5 hours'), 'two point five hours')
  assert.equal(P.spellNumbers('50% off'), 'fifty percent off')
  assert.equal(P.spellNumbers('I have 3 cats'), 'I have three cats')
  assert.doesNotMatch(P.spellNumbers('Meet me at 10:00 on the 3rd'), /[\d:]/)
  // Y si Azure devolviera un token raro, no se enseña como palabra a cuidar.
  const weak = P.weakWords(result([w('ten:zero', 20, 'Mispronunciation'), w('10', 20, 'Mispronunciation'), w('think', 50, 'Mispronunciation', [['θ', 30]])]))
  assert.deepEqual(weak.map((x) => x.word), ['think'])
})

test('REG-M-09: Gemini con cifras y Azure con palabras cuentan como lo mismo', () => {
  assert.equal(P.sameWords('I wake up at 10:00', "I wake up at ten o'clock"), true)
  assert.equal(P.sameWords('on May 5th', 'on May fifth'), true)
})

test('REG-A3-19: las palabras de función van detrás de las de contenido (salvo si te las comiste)', () => {
  const r = result([
    w('the', 30, 'Mispronunciation', [['ə', 20]]),
    w('of', 35, 'None', [['ə', 25]]),
    w('very', 60, 'Mispronunciation', [['v', 40]]),
    w('ship', 65, 'Mispronunciation', [['ɪ', 50]]),
    w('and', 0, 'Omission'),
  ])
  const weak = P.weakWords(r, 4)
  assert.deepEqual(weak.map((x) => x.word), ['and', 'very', 'ship', 'the'], 'omitida primero, luego contenido, luego función')
  assert.equal(P.weakWords(r, 2).some((x) => x.word === 'the' || x.word === 'of'), false)
})

test('REG-A3-19: consejo en español por sonido típico del hispanohablante', () => {
  assert.match(P.soundTipEs('think', 'θ'), /lengua entre los dientes/)
  assert.match(P.soundTipEs('this', 'ð'), /lengua entre los dientes/)
  assert.match(P.soundTipEs('very', 'v'), /no es «b»/)
  assert.match(P.soundTipEs('ship', 'ɪ'), /corta/)
  assert.match(P.soundTipEs('sheep', 'i'), /larga/)
  assert.match(P.soundTipEs('she', 'ʃ'), /sh/)
  assert.match(P.soundTipEs('about', 'ə'), /débil/)
  assert.match(P.soundTipEs('zoo', 'z'), /zumbido/)
  // Casos que se deducen de la palabra.
  assert.match(P.soundTipEs('Spain', 's'), /no digas «es-»/)
  assert.match(P.soundTipEs('school', 's'), /no digas «es-»/)
  // 5.11 (M-12b): la /s/ ya tiene ficha (su propio consejo); lo que importa es que no salga el de la «e».
  assert.doesNotMatch(P.soundTipEs('sun', 's') ?? '', /es-/, '«s» sola: sin consejo de la «e»')
  assert.match(P.soundTipEs('worked', 't'), /-ed/)
  assert.match(P.soundTipEs('played', 'd'), /-ed/)
  // 5.11 (M-12b): la /d/ ya tiene ficha (su propio consejo); lo que importa es que no salga el de la -ed.
  assert.doesNotMatch(P.soundTipEs('needed', 'd') ?? '', /-ed/, '-ded sí lleva sílaba')
  assert.match(P.soundTipEs('last', undefined, 'Omission'), /te la comiste/)
  assert.equal(P.soundTipEs('cat', undefined), undefined)
})

test('REG-A3-19: la frase del coach da el consejo en español (sin IPA si hay consejo) y no lo repite', () => {
  const line = P.pronunciationLine(result([w('think', 40, 'Mispronunciation', [['θ', 20]]), w('three', 45, 'Mispronunciation', [['θ', 25]]), w('cat', 50, 'Mispronunciation', [['ʔ', 30]])], 55))
  assert.match(line, /^Vamos a pulir unos sonidos\./)
  // 5.11 (M-12): el consejo de /θ/ ya no habla de España.
  assert.match(line, /«think» \(punta de la lengua entre los dientes/)
  assert.equal(line.match(/lengua entre los dientes/g).length, 1, 'el consejo repetido sale una vez')
  assert.match(line, /«three»/)
  // 5.11 (M-12b): con las 41 fichas casi todo sonido tendrá consejo; un símbolo sin ficha (ʔ) sigue saliendo como antes.
  assert.match(line, /«cat» \(el sonido \/ʔ\/\)/, 'sin consejo, el sonido como antes')
  assert.doesNotMatch(line, /\/θ\//)
  assert.equal(P.pronunciationLine(result([], 92)), '¡Muy buena pronunciación! No encontré palabras con problemas.')
  // Cada palabra floja lleva su consejo para el chip.
  assert.match(P.weakWords(result([w('very', 50, 'Mispronunciation', [['v', 30]])]))[0].tip, /no es «b»/)
})
