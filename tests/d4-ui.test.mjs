// 5.10.1 · D4 «Interfaz y datos»: REG-A4-03 (contraste de --ok/--bad), UX-01 (consejo del candado), UX-03/04 (metas
// por nivel y una sola cifra de velocidad), REG-A1-07 (copia de una versión más nueva), REG-A2-05 («Pregúntale» con tipos
// raros) y REG-A2-07 (vocabulario del tema con Google Search).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

// --- Contraste WCAG (mismo cálculo que evidencia/A4/contraste.mjs) ---
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const parse = (c) => {
  if (c.startsWith('#')) return [...hex(c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c), 1]
  const m = c.match(/rgba?\(([^)]+)\)/)
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim())
  return [Number(r), Number(g), Number(b), Number(a)]
}
const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]))
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

test('REG-A4-03: verde y rojo con contraste ≥ 4,5:1 sobre el cristal en los 8 temas', async () => {
  const { THEMES, cssVars } = await loadFresh('/src/ui/theme.ts')
  for (const [name, modes] of Object.entries(THEMES)) {
    for (const [mode, t] of Object.entries(modes)) {
      const v = cssVars(t)
      const glass = over(parse(t.g), parse(t.bg).slice(0, 3))
      for (const k of ['--ok', '--bad']) {
        const r = ratio(parse(v[k]).slice(0, 3), glass)
        assert.ok(r >= 4.5, `${name} ${mode} ${k} = ${r.toFixed(2)}:1`)
      }
    }
  }
})

test('UX-01: ningún consejo enseña el gesto del candado (desde la 5.9 el micro es «toca y toca»)', async () => {
  const { buildAdvice } = await loadFresh('/src/lib/mascotTips.ts')
  for (const input of [{ hasPurpose: false, hasAzure: false }, { hasPurpose: true, hasAzure: true, wpmGoal: { level: 'A2', wpm: 75 } }]) {
    const all = buildAdvice(input).map((a) => a.text).join('\n')
    assert.doesNotMatch(all, /candado|desliza|mant[eé]n (el dedo|pulsado)|sin mantener/i)
    assert.match(all, /Toca el micro para hablar y tócalo otra vez para enviar/)
  }
})

test('UX-03/04: metas por nivel, una sola fuente para informe, consejo y nota', async () => {
  const F = await loadFresh('/src/lib/fluency.ts')
  assert.deepEqual(F.speakingGoal('A2'), { level: 'A2', wpm: 75, words: 12 })
  assert.deepEqual(F.speakingGoal('b1+'), { level: 'B1', wpm: 95, words: 20 })
  assert.equal(F.speakingGoal(undefined).level, 'B1')
  assert.equal(F.speakingGoal('Z9').level, 'B1')
  // Cuanto más nivel, más meta.
  const order = ['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => F.SPEAKING_GOALS[l].wpm)
  assert.deepEqual([...order].sort((a, b) => a - b), order)
  // La nota llega al 100 % de velocidad justo en la meta de C1 (la misma tabla): a C1, velocidad completa.
  const said = (n, s) => ({ sessionId: 1, role: 'user', text: Array(n).fill('word').join(' '), speechSeconds: s, createdAt: 0 })
  const atC1 = F.sessionMetrics([said(F.SPEAKING_GOALS.C1.wpm, 60)])
  const above = F.sessionMetrics([said(F.SPEAKING_GOALS.C1.wpm + 30, 60)])
  assert.equal(atC1.score, above.score, 'por encima de la meta de C1 la velocidad ya no suma')
  // El consejo de la mascota usa la misma cifra (y sin meta conocida no da ninguna).
  const { buildAdvice } = await loadFresh('/src/lib/mascotTips.ts')
  const tip = (x) => buildAdvice({ hasPurpose: true, hasAzure: true, ...x }).find((a) => a.id === 'a-ppm').text
  assert.match(tip({ wpmGoal: { level: 'A2', wpm: F.speakingGoal('A2').wpm } }), /tu nivel \(A2\), la meta es unas 75/)
  assert.doesNotMatch(tip({}), /\d/)
})

test('REG-A1-07: una copia con algo que esta app no conoce dice «versión más nueva», no «dañado»', async () => {
  const { checkBackup, backupVersionFor, BACKUP_VERSION } = await loadFresh('/src/lib/backupCheck.ts')
  const base = () => ({
    format: 'habla-backup',
    version: 1,
    tables: {
      sessions: [],
      turns: [],
      mistakes: [],
      profile: [],
      cards: [{ id: 1, source: 'mistake', sourceId: 1, promptEs: 'p', answerEn: 'a', createdAt: 1, due: 1, fsrs: { due: 1, stability: 1, difficulty: 1, reps: 1, lapses: 0, state: 1 } }],
    },
  })
  assert.equal(checkBackup(base()).ok, true)
  const futureTable = base()
  futureTable.tables.badges = [{ id: 1 }]
  assert.match(checkBackup(futureTable).error, /versión más nueva/)
  const futureSource = base()
  futureSource.tables.cards[0].source = 'podcast'
  assert.match(checkBackup(futureSource).error, /versión más nueva/)
  // Un tipo roto sigue siendo «dañado».
  const broken = base()
  broken.tables.cards[0].source = 7
  assert.match(checkBackup(broken).error, /dañado/)
  // Versión con la que exportar: 1 si una 5.8/5.9 la puede leer entera; 2 si lleva Gramática.
  assert.equal(backupVersionFor(base().tables), BACKUP_VERSION)
  assert.equal(backupVersionFor({ ...base().tables, cards: [{ source: 'grammar' }] }), 2)
  assert.equal(backupVersionFor({ ...base().tables, grammar: [{ id: 'x' }] }), 2)
  const v2 = base()
  v2.version = 2
  assert.equal(checkBackup(v2).ok, true, 'esta app lee las copias 2')
})

test('REG-A2-05: «Pregúntale» con tipos raros no lanza y recorta párrafos', async () => {
  const { parseMascotAnswer } = await loadFresh('/src/lib/grammarAi.ts')
  assert.deepEqual(parseMascotAnswer(null), { answerEs: [], examples: [], topics: [] })
  assert.deepEqual(parseMascotAnswer({ answer_es: 'texto', examples: 'x', topics: 'y' }), { answerEs: [], examples: [], topics: [] })
  const r = parseMascotAnswer({
    answer_es: [' uno ', 2, null, 'x'.repeat(2000), 'tres', 'cuatro', 'cinco'],
    examples: [{ en: 42, es: 'x' }, { en: ' Hi ', es: null }, 'raro', { en: 'Bye', es: 'Adiós' }],
    topics: [{ id: 1 }, '__proto__'],
  })
  assert.deepEqual(r.answerEs.slice(0, 1), ['uno'])
  assert.equal(r.answerEs.length, 4)
  assert.ok(r.answerEs.every((p) => typeof p === 'string' && p.length <= 600))
  assert.deepEqual(r.examples, [{ en: 'Hi', es: '' }, { en: 'Bye', es: 'Adiós' }])
  assert.deepEqual(r.topics, [])
})

test('REG-A2-07: el vocabulario del tema solo admite textos (sin objetos que rompan el render)', async () => {
  const { cleanVocab } = await loadFresh('/src/lib/topics.ts')
  assert.deepEqual(cleanVocab([{ en: { x: 1 }, es: 'a' }, { en: 'rain', es: 'lluvia' }, null, 'raro', { en: ' sun ', es: ' sol ' }, { en: 'a', es: 'b' }, { en: 'c', es: 'd' }]), [
    { en: 'rain', es: 'lluvia' },
    { en: 'sun', es: 'sol' },
    { en: 'a', es: 'b' },
  ])
  assert.deepEqual(cleanVocab('nada'), [])
  assert.equal(cleanVocab([{ en: 'x'.repeat(200), es: 'y' }])[0].en.length, 60)
})

test('REG-A1-07 (ronda 2): la exportación usa backupVersionFor y la copia resultante se vuelve a leer', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/lib/backup.ts', import.meta.url), 'utf8')
  assert.match(src, /version: backupVersionFor\(tables/, 'buildBackup() exporta con la versión que toca')
  assert.doesNotMatch(src, /version: BACKUP_VERSION/)
  const { checkBackup, backupVersionFor } = await loadFresh('/src/lib/backupCheck.ts')
  const fsrs = { due: 1, stability: 1, difficulty: 1, reps: 1, lapses: 0, state: 1 }
  const tables = {
    sessions: [],
    turns: [],
    mistakes: [],
    profile: [],
    lookups: [],
    cards: [{ id: 1, source: 'grammar', sourceId: 9, promptEs: 'p', answerEn: 'a', createdAt: 1, due: 1, fsrs }],
    grammar: [{ id: 'x', lastAt: 1, correct: 1, attempts: 2, mastered: false }],
  }
  const backup = { format: 'habla-backup', version: backupVersionFor(tables), tables }
  assert.equal(backup.version, 2)
  assert.equal(checkBackup(backup).ok, true, 'esta versión lee su propia copia con Gramática')
})
