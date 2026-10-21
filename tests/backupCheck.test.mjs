// Validación de las copias antes de importar (v5.8.2: AUD-SEG-501, AUD-SEG-510, AUD-RES-704, AUD-E2E-601).
// Casos de B5/B6/B7 de la auditoría. Lógica pura de src/lib/backupCheck.ts y src/lib/profile.ts (repairProfile).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const now = 1_790_000_000_000
const fsrs = { due: now, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 1, last_review: null }
const corr = { original: 'I go yesterday', corrected: 'I went yesterday', explanationEs: 'Pasado', category: 'tense', spanish: 'Fui ayer' }

/** Copia con la forma real de `buildBackup()` (datos ficticios). */
function goodBackup() {
  return {
    format: 'habla-backup',
    version: 1,
    exportedAt: '2026-10-06T10:00:00.000Z',
    tables: {
      sessions: [
        { id: 1, scenario: 'daily', startedAt: now, endedAt: now + 60_000, topic: { category: 'tech', title: 'AI', titleEs: 'IA', summary: 's', question: 'q?', vocab: [{ en: 'a', es: 'b' }] }, metrics: { turns: 2, score: 70 } },
        { id: 2, scenario: 'free', startedAt: now + 1, planLesson: 'w1l1' },
      ],
      turns: [
        { id: 1, sessionId: 1, role: 'teacher', text: 'Hi!', translation: '¡Hola!', createdAt: now },
        { id: 2, sessionId: 1, role: 'user', text: 'I go yesterday', createdAt: now + 1, audioSeconds: 3, pauses: [1.2], correction: corr, corrections: [corr] },
      ],
      mistakes: [{ id: 1, sessionId: 1, turnId: 2, createdAt: now, ...corr }],
      profile: [
        {
          id: 'me',
          levels: { overall: 'B1', grammar: 'B1', reading: 'B2', listening: 'B1', speaking: 'A2' },
          about: 'ingeniero',
          weaknesses: [],
          goal: '',
          startedAt: now,
          name: 'Ana',
          purposes: ['work'],
          interests: ['Tecnología'],
          calibratedAt: now,
          tests: [],
          bankUsage: { seen: ['g1'], uses: { g1: 1 } },
        },
      ],
      lookups: [
        {
          id: 1,
          query: 'run',
          context: 'run a test',
          saved: true,
          createdAt: now,
          result: { headword: 'run', ipa: 'rʌn', partOfSpeech: 'verb', translation: 'ejecutar', meaningEs: 'm', whyEs: 'w', otherMeanings: [], register: 'neutral', collocations: ['run a test'], falseFriendEs: '', exampleEn: 'e', exampleEs: 'e' },
        },
      ],
      cards: [{ id: 1, source: 'mistake', sourceId: 1, promptEs: 'Fui ayer', answerEn: 'I went yesterday', hintEs: '', createdAt: now, due: now, fsrs }],
    },
  }
}

const mutate = (fn) => {
  const b = goodBackup()
  fn(b)
  return b
}

test('Una copia correcta (forma de buildBackup) se acepta con sus recuentos', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  const r = checkBackup(goodBackup())
  assert.equal(r.ok, true, r.error)
  assert.equal(r.backup.tables.sessions.length, 2)
  assert.equal(r.backup.tables.mistakes.length, 1)
})

test('REV-U3-1: copias antiguas legítimas se aceptan (v4.1 sin consultas ni tarjetas, v4.6 sin tarjetas, sin perfil)', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  // v4.1: 4 tablas; los mensajes antiguos traían `words` (Whisper) y una sola corrección.
  const v41 = mutate((b) => {
    delete b.tables.lookups
    delete b.tables.cards
    b.tables.turns[1] = { id: 2, sessionId: 1, role: 'user', text: 'I go', createdAt: now, words: [{ word: 'I', start: 0, end: 0.2 }], correction: corr }
    b.tables.profile[0] = { id: 'me', levels: b.tables.profile[0].levels, about: '', weaknesses: [], goal: '', startedAt: now }
  })
  const r41 = checkBackup(v41)
  assert.equal(r41.ok, true, r41.error)
  assert.deepEqual(r41.backup.tables.lookups, [])
  assert.deepEqual(r41.backup.tables.cards, [])
  const r46 = checkBackup(mutate((b) => delete b.tables.cards))
  assert.equal(r46.ok, true, r46.error)
  assert.equal(r46.backup.tables.lookups.length, 1)
  assert.deepEqual(r46.backup.tables.cards, [])
  assert.equal(checkBackup(mutate((b) => (b.tables.profile = []))).ok, true)
})

// v5.10 (punto 3): consultas con sinónimos/antónimos y consultas antiguas sin ellos; ambas se aceptan.
test('Consultas con y sin synonyms/antonyms se aceptan; con un tipo erróneo se rechazan', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  const nuevas = mutate((b) => {
    b.tables.lookups[0].result.synonyms = ['execute', 'operate']
    b.tables.lookups[0].result.antonyms = []
    b.tables.lookups.push({ ...b.tables.lookups[0], id: 2, result: { ...b.tables.lookups[0].result, synonyms: undefined, antonyms: undefined } })
  })
  const r = checkBackup(nuevas)
  assert.equal(r.ok, true, r.error)
  assert.deepEqual(r.backup.tables.lookups[0].result.synonyms, ['execute', 'operate'])
  assert.equal(checkBackup(goodBackup()).ok, true, 'copia anterior a la 5.10 (sin los campos)')
  for (const bad of [{ a: 1 }, 'execute', [1, 2]]) {
    const x = checkBackup(mutate((b) => (b.tables.lookups[0].result.synonyms = bad)))
    assert.equal(x.ok, false, JSON.stringify(bad))
    const y = checkBackup(mutate((b) => (b.tables.lookups[0].result.antonyms = bad)))
    assert.equal(y.ok, false, JSON.stringify(bad))
  }
})

// v5.10: progreso de Gramática (tabla `grammar`, clave = id del tema) y tarjetas de ejercicios fallados (source 'grammar').
const gram = { id: 'past-simple', seenAt: now, lastAt: now, correct: 5, attempts: 6, rounds: 1, lastRound: { correct: 5, total: 6, at: now }, mastered: true, masteredAt: now }
const withGrammar = (fn = () => {}) =>
  mutate((b) => {
    b.tables.grammar = [gram, { id: 'should', lastAt: now, correct: 0, attempts: 0, rounds: 0, mastered: false }]
    b.tables.cards.push({ ...b.tables.cards[0], id: 2, source: 'grammar', sourceId: 3_123_456_789, promptEs: 'She ____ the keys.', answerEn: 'She lost the keys.' })
    fn(b)
  })

test('v5.10: la tabla de Gramática es opcional (copias antiguas sin ella) y se comprueba si viene', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  // Copia de la 5.9 (sin `grammar`): se acepta y se importa vacía.
  const old = checkBackup(goodBackup())
  assert.equal(old.ok, true, old.error)
  assert.deepEqual(old.backup.tables.grammar, [])
  // Copia de la 5.10 con progreso y una tarjeta de Gramática.
  const r = checkBackup(withGrammar())
  assert.equal(r.ok, true, r.error)
  assert.equal(r.backup.tables.grammar.length, 2)
  assert.equal(r.backup.tables.cards[1].source, 'grammar')
  // D2/D3: «Dilo tú» (spoken/spokenOk) y el tema de Gramática en correcciones, errores y sesiones.
  const d23 = checkBackup(
    withGrammar((b) => {
      b.tables.grammar[0].spoken = 3
      b.tables.grammar[0].spokenOk = 2
      b.tables.turns[1].corrections = [{ ...b.tables.turns[1].corrections[0], grammarTopic: 'past-simple' }] // copia: `corr` es compartido
      b.tables.mistakes[0].grammarTopic = 'past-simple'
      b.tables.sessions[1].grammarTopic = 'should'
    }),
  )
  assert.equal(d23.ok, true, d23.error)
  assert.equal(d23.backup.tables.grammar[0].spoken, 3)
  // Dañadas: se rechazan sin tocar nada.
  for (const [name, bad] of Object.entries({
    'grammar no es una lista': withGrammar((b) => (b.tables.grammar = { a: 1 })),
    'tema sin id': withGrammar((b) => delete b.tables.grammar[0].id),
    'id numérico': withGrammar((b) => (b.tables.grammar[0].id = 7)),
    'mastered como texto': withGrammar((b) => (b.tables.grammar[0].mastered = 'sí')),
    'lastRound sin total': withGrammar((b) => delete b.tables.grammar[0].lastRound.total),
    'tema repetido': withGrammar((b) => b.tables.grammar.push({ ...gram })),
    'tarjeta de Gramática repetida (índice único)': withGrammar((b) => b.tables.cards.push({ ...b.tables.cards[1], id: 3 })),
    'origen de tarjeta desconocido': withGrammar((b) => (b.tables.cards[1].source = 'otro')),
    'spoken como texto': withGrammar((b) => (b.tables.grammar[0].spoken = 'tres')),
    'tema de la corrección como número': withGrammar((b) => (b.tables.turns[1].corrections = [{ ...b.tables.turns[1].corrections[0], grammarTopic: 5 }])),
  })) {
    const x = checkBackup(bad)
    assert.equal(x.ok, false, name)
    assert.match(x.error, /no se cambió nada/i, name)
  }
})

const BAD = {
  'tables vacío (antes borraba todo con «Importado ✓»)': { format: 'habla-backup', version: 1, tables: {} },
  'tables null': { format: 'habla-backup', version: 1, tables: null },
  'sin versión': mutate((b) => delete b.version),
  'versión como texto «9»': mutate((b) => (b.version = '9')),
  'falta la tabla de sesiones': mutate((b) => delete b.tables.sessions),
  'perfil con name como objeto (antes: pantalla negra)': mutate((b) => (b.tables.profile[0].name = { x: 1 })),
  'perfil sin levels (antes: pantalla negra)': mutate((b) => delete b.tables.profile[0].levels),
  'dos perfiles': mutate((b) => b.tables.profile.push({ ...b.tables.profile[0] })),
  'consultas que no son una lista': mutate((b) => (b.tables.lookups = { a: 1 })),
  'consulta sin result (antes: Palabras en blanco)': mutate((b) => delete b.tables.lookups[0].result),
  'consulta con collocations como objeto': mutate((b) => (b.tables.lookups[0].result.collocations = { a: 1 })),
  'sesión con topic.title como objeto': mutate((b) => (b.tables.sessions[0].topic.title = { x: 1 })),
  'mensaje con role desconocido': mutate((b) => (b.tables.turns[0].role = 'admin')),
  'fila que no es un objeto': mutate((b) => b.tables.turns.push('hola')),
  'id repetido': mutate((b) => (b.tables.sessions[1].id = 1)),
  'tarjetas con el mismo origen (índice único)': mutate((b) => b.tables.cards.push({ ...b.tables.cards[0], id: 2 })),
  'otro formato': { format: 'otra-app', version: 1, tables: {} },
}

test('SEG-501 / RES-704 / E2E-601: copias dañadas se rechazan con un mensaje en español', async () => {
  const { checkBackup } = await loadFresh('/src/lib/backupCheck.ts')
  for (const [name, data] of Object.entries(BAD)) {
    const r = checkBackup(data)
    assert.equal(r.ok, false, name)
    assert.match(r.error, /no se cambió nada/i, `${name}: ${r.error}`)
    assert.doesNotMatch(r.error, /Cannot|undefined|null|TypeError/, `${name}: sin textos internos en inglés`)
  }
})

test('Versión más nueva: pide actualizar la app; JSON roto: lo dice', async () => {
  const { checkBackup, parseBackup } = await loadFresh('/src/lib/backupCheck.ts')
  // 5.10.1 (REG-A1-07): la 2 (copias con Gramática) ya se lee. 5.11 (S-01): la 3 (Sonidos, logros) también; la 4 es de
  // una versión más nueva.
  assert.equal(checkBackup(mutate((b) => (b.version = 2))).ok, true)
  assert.equal(checkBackup(mutate((b) => (b.version = 3))).ok, true)
  assert.match(checkBackup(mutate((b) => (b.version = 4))).error, /más nueva/)
  assert.match(parseBackup('{"format":').error, /JSON válido/)
  assert.equal(parseBackup(JSON.stringify(goodBackup())).ok, true)
})

test('__proto__ en una fila no contamina objetos', async () => {
  const { parseBackup } = await loadFresh('/src/lib/backupCheck.ts')
  const text = JSON.stringify(goodBackup()).replace('"scenario":"daily"', '"scenario":"daily","__proto__":{"polluted":true}')
  const r = parseBackup(text)
  assert.equal(r.ok, true)
  assert.equal({}.polluted, undefined)
})

test('RES-704: repairProfile completa un perfil roto para que el arranque no falle', async () => {
  globalThis.indexedDB ??= undefined
  const { repairProfile } = await loadFresh('/src/lib/profile.ts')
  const p = repairProfile({ id: 'me', name: { x: 1 }, weaknesses: 'no', startedAt: 1 })
  assert.equal(p.levels.overall, 'B1')
  assert.equal(p.name, undefined)
  assert.deepEqual(p.weaknesses, [])
  assert.equal(p.about, '')
})
