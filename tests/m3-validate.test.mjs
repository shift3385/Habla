// 5.11 · D3 · S-03 «Validador de Sonidos»: contenidos rotos a propósito → un error con su mensaje cada uno, y el
// contenido real de src/sounds/ pasa sin errores.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { test } from 'node:test'
import { validateSounds } from '../scripts/validate-sounds.mjs'

const json = (f) => JSON.parse(readFileSync(new URL(`../src/sounds/${f}`, import.meta.url), 'utf8'))
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const card = (id, ipa, azure, chartCol, pairsWith, pairs) => ({
  id,
  ipa,
  azure,
  kind: 'vowel',
  chart: { block: 'vowels', row: 1, col: chartCol },
  keyword: pairs[0][0],
  nameEs: id,
  level: 'A1',
  difficulty: 2,
  priority: 'P1',
  voiced: null,
  articulation: { lips: 'spread', jaw: 'close', place: 'front', lipsEs: 'Labios.', tongueEs: 'Lengua.', voiceEs: 'Voz.' },
  tipShortEs: 'consejo corto',
  explanationEs: ['Explicación.'],
  spanishEs: 'Comparación.',
  mistakeEs: 'Error típico.',
  spellings: [{ pattern: 'ee', examples: [pairs[0][0]] }],
  examples: { initial: ['eat'], medial: ['team', 'field'], final: ['tea'] },
  minimalPairs: [{ with: pairsWith, pairs }],
  sentences: [{ en: 'We need three sheep.', es: 'Necesitamos tres ovejas.' }],
  related: [pairsWith],
})

/** Contenido mínimo válido: dos fichas, una lección, un abecedario de 26 letras y un audio con su crédito. */
function base() {
  const iy = card('iy', 'iː', ['i'], 1, 'ih', [['sheep', 'ship'], ['seat', 'sit'], ['feel', 'fill']])
  const ih = card('ih', 'ɪ', ['ɪ'], 2, 'iy', [['ship', 'sheep'], ['sit', 'seat'], ['fill', 'feel']])
  iy.audio = 'iy'
  return {
    phonemes: { phonemes: [iy, ih] },
    lessons: {
      lessons: [
        {
          id: 'V1',
          order: 5,
          unit: 2,
          titleEs: 'Ship o sheep',
          level: 'A1',
          minutes: 7,
          phonemes: ['ih', 'iy'],
          introEs: 'Dos «i».',
          exercises: [
            { id: 'V1-1', type: 'listen-choose', pairs: [['ship', 'sheep'], ['sit', 'seat']], rounds: 4 },
            { id: 'V1-2', type: 'sort', columns: ['ih', 'iy'], words: [['big', 'ih'], ['green', 'iy'], ['sit', 'ih'], ['team', 'iy']] },
            { id: 'V1-3', type: 'odd-one-out', words: ['E', 'B', 'I'], answer: 2, whyEs: 'La I se dice «ai».', letters: true },
          ],
        },
      ],
    },
    alphabet: {
      families: [
        { id: 'iy', ipa: 'iː', labelEs: '«i»', letters: LETTERS.slice(0, 13) },
        { id: 'ih', ipa: 'ɪ', labelEs: 'x', letters: LETTERS.slice(13) },
      ],
      letters: LETTERS.map((l, i) => ({ letter: l, ipa: 'x', family: i < 13 ? 'iy' : 'ih', soundsLikeEs: 'x', ttsText: `${l}.` })),
      spellingPhrases: [],
      symbols: [],
    },
    credits: {
      credits: [
        {
          id: 'iy',
          file: 'iy.ogg',
          phoneme: 'iy',
          title: 'Close front unrounded vowel.ogg',
          page: 'https://commons.wikimedia.org/wiki/File:Close_front_unrounded_vowel.ogg',
          author: 'Autor',
          license: 'CC BY-SA 3.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
          modified: false,
        },
      ],
    },
  }
}
const audio = () => new Map([['iy.ogg', 12_000]])
const run = (data, opts = {}) => validateSounds(data, { audio: audio(), ...opts })
const broken = (fn) => {
  const d = base()
  fn(d)
  return run(d).errors
}

test('El contenido mínimo válido pasa sin errores', () => {
  const r = run(base())
  assert.deepEqual(r.errors, [])
})

test('S-03: los 6 contenidos rotos del plan dan exactamente un error cada uno, con su mensaje', () => {
  const cases = {
    'par igual': [(d) => d.phonemes.phonemes[0].minimalPairs[0].pairs.push(['ship', 'Ship']), /par no válido/],
    homógrafo: [(d) => (d.phonemes.phonemes[1].examples.medial = ['sit', 'live']), /homógrafo «live»/],
    'id repetido': [(d) => (d.phonemes.phonemes[1].id = 'iy'), /id repetido/],
    'audio sin crédito': [(d) => (d.phonemes.phonemes[1].audio = 'ih'), /audio «ih» sin crédito/],
    'símbolo de Azure duplicado': [(d) => (d.phonemes.phonemes[1].azure = ['ɪ', 'i']), /símbolo de Azure «i» repetido: ya es de iy/],
    'lección con fonema inexistente': [(d) => d.lessons.lessons[0].phonemes.push('zz'), /fonema desconocido zz/],
  }
  for (const [name, [fn, re]] of Object.entries(cases)) {
    const errors = broken(fn)
    // «id repetido» además deja sin dueño las referencias a ih: se mira que el error esperado esté y sea el primero.
    if (name === 'id repetido') assert.match(errors[0], re, `${name}: ${errors.join(' | ')}`)
    else {
      assert.equal(errors.length, 1, `${name}: ${errors.join(' | ')}`)
      assert.match(errors[0], re, name)
    }
  }
})

test('S-03: audios — archivo que falta, audio que pesa de más, archivo sin crédito, total y crédito incompleto', () => {
  const d = base()
  assert.match(validateSounds(d, { audio: new Map() }).errors.join('\n'), /no existe public\/sounds\/iy\.ogg/)
  assert.match(validateSounds(d, { audio: new Map([['iy.ogg', 40_000]]) }).errors.join('\n'), /pesa 39\.1 KB/)
  assert.match(validateSounds(d, { audio: new Map([['iy.ogg', 1000], ['extra.ogg', 1000]]) }).errors.join('\n'), /extra\.ogg: audio sin crédito/)
  const many = base()
  for (let i = 0; i < 25; i++) many.credits.credits.push({ ...many.credits.credits[0], id: `x${i}`, file: `x${i}.ogg` })
  const sizes = new Map([['iy.ogg', 29_000], ...many.credits.credits.slice(1).map((c) => [c.file, 29_000])])
  assert.match(validateSounds(many, { audio: sizes }).errors.join('\n'), /los audios pesan .* \(máx\. 614\.4 KB\)/)
  const noAuthor = broken((x) => {
    x.credits.credits[0].author = ''
    x.credits.credits[0].modified = true
    x.credits.credits[0].page = 'https://example.com/a.ogg'
  })
  assert.equal(noAuthor.length, 3, noAuthor.join(' | '))
})

test('S-03: abecedario (26 letras, una familia cada una) y ejercicios de letras', () => {
  assert.match(broken((d) => d.alphabet.letters.pop()).join('\n'), /26 letras/)
  assert.match(broken((d) => d.alphabet.families[1].letters.push('A')).join('\n'), /está en dos familias/)
  assert.match(broken((d) => (d.lessons.lessons[0].exercises[2].words[0] = 'EE')).join('\n'), /«EE» no es una letra/)
  assert.match(broken((d) => (d.phonemes.phonemes[0].tipShortEs = 'como la «z» de España: think')).join('\n'), /España/)
  assert.match(broken((d) => (d.lessons.lessons[0].exercises[1].words = [['big', 'ih'], ['sit', 'ih'], ['fill', 'ih'], ['hit', 'ih']])).join('\n'), /columna iy se queda vacía/)
})

test('S-03: con CMUdict, un ejemplo sin el sonido es un error', () => {
  const dict = new Map([
    ['eat', ['iy1', 't']],
    ['team', ['t', 'iy1', 'm']],
    ['field', ['f', 'iy1', 'l', 'd']],
    ['tea', ['t', 'iy1']],
    ['sheep', ['sh', 'iy1', 'p']],
    ['ship', ['sh', 'ih1', 'p']],
  ])
  const d = base()
  d.phonemes.phonemes[0].examples.final = ['tea', 'ship']
  assert.match(run(d, { dict }).errors.join('\n'), /«ship» no contiene el sonido según CMUdict/)
})

test('El contenido real de src/sounds/ y public/sounds/ pasa el validador', () => {
  const data = { phonemes: json('phonemes.json'), lessons: json('lessons.json'), alphabet: json('alphabet.json'), credits: json('credits.json') }
  const dir = new URL('../public/sounds/', import.meta.url)
  let files = []
  try {
    files = readdirSync(dir).map((f) => [f, statSync(new URL(f, dir)).size])
  } catch {
    // Sin audios todavía.
  }
  // Mientras el contenido sea la muestra de S-02 (menos de 41 fichas), las referencias a fichas aún sin escribir son avisos.
  const sample = data.phonemes.phonemes.filter((p) => p.kind !== 'feature').length < 41
  const r = validateSounds(data, { audio: new Map(files), sample })
  assert.deepEqual(r.errors, [])
})

test('M-12: src/sounds/tips.json (lo que importa pronunciation.ts) está al día con los tipShortEs de las fichas', async () => {
  const { tipsFrom } = await import('../scripts/validate-sounds.mjs')
  const tips = json('tips.json')
  assert.deepEqual(tips, tipsFrom(json('phonemes.json').phonemes))
  for (const t of Object.values(tips.byId)) assert.ok(t.length <= 90 && !/españa/i.test(t), t)
})
