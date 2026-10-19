// Validación de las copias de seguridad ANTES de tocar los datos (v5.8.2, AUD-SEG-501 / AUD-SEG-510).
// Antes solo se miraba la cabecera: `{"format":"habla-backup","tables":{}}` borraba todo el progreso con
// «Importado ✓», y un perfil con tipos raros dejaba la app en negro al arrancar. Ahora una copia que no pasa
// esta comprobación se rechaza con un mensaje en español y no se cambia nada.
// Módulo puro (sin Dexie ni Capacitor) para poder probarlo en Node (`tests/backupCheck.test.mjs`).

export const BACKUP_FORMAT = 'habla-backup'
export const BACKUP_VERSION = 1
/** Tamaño máximo del archivo: una copia real de un año de uso ocupa unos pocos MB. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export const BACKUP_TABLES = ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards', 'grammar'] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]
// REV-U3-1: tablas que no existían en copias antiguas y son legítimas sin ellas (si faltan, se importan vacías):
// `lookups` llegó en la v4.2 y `cards` en la v4.7; hasta la v4.1 las copias tenían 4 tablas. `grammar` (progreso de
// Gramática) llegó en la v5.10: las copias anteriores no la traen y se aceptan.
const OPTIONAL_TABLES: readonly BackupTable[] = ['lookups', 'cards', 'grammar']

export interface CheckedBackup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt?: string
  tables: Record<BackupTable, Record<string, unknown>[]>
}

const NAMES: Record<BackupTable, string> = {
  sessions: 'sesiones',
  turns: 'mensajes',
  mistakes: 'errores',
  profile: 'perfil',
  lookups: 'consultas de palabras',
  cards: 'tarjetas de repaso',
  grammar: 'progreso de Gramática',
}

type Row = Record<string, unknown>
type Rule = (v: unknown) => boolean

const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const str: Rule = (v) => typeof v === 'string'
const num: Rule = (v) => typeof v === 'number' && Number.isFinite(v)
const id: Rule = (v) => typeof v === 'number' && Number.isInteger(v) && v > 0
const bool: Rule = (v) => typeof v === 'boolean'
const textId: Rule = (v) => typeof v === 'string' && v.length > 0
const obj: Rule = isObj
const arr: Rule = Array.isArray
const strArr: Rule = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')
const numArr: Rule = (v) => Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x))
const oneOf =
  (...xs: string[]): Rule =>
  (v) =>
    typeof v === 'string' && xs.includes(v)
const opt =
  (r: Rule): Rule =>
  (v) =>
    v === undefined || v === null || r(v)
const shape =
  (fields: Record<string, Rule>): Rule =>
  (v) =>
    isObj(v) && Object.entries(fields).every(([k, r]) => r(v[k]))

const LEVELS = shape({ overall: str, grammar: str, reading: str, listening: str, speaking: str })
const CORRECTION = shape({ original: str, corrected: str, explanationEs: opt(str), category: opt(str), spanish: opt(str), grammarTopic: opt(str) })

// Campo → regla. Solo lo que la app lee sin comprobar (lo que rompería una pantalla o el arranque).
const SCHEMA: Record<BackupTable, Record<string, Rule>> = {
  sessions: {
    id,
    scenario: str,
    startedAt: num,
    endedAt: opt(num),
    topic: opt(shape({ title: str, titleEs: opt(str), summary: opt(str), question: opt(str), vocab: opt(arr) })),
    metrics: opt(obj),
    report: opt(shape({ summaryEs: opt(str), strengthsEs: opt(strArr), improveEs: opt(strArr), homeworkEs: opt(str) })),
    planLesson: opt(str),
    grammarTopic: opt(str), // v5.10
  },
  turns: {
    id,
    sessionId: num,
    role: oneOf('user', 'teacher'),
    text: str,
    translation: opt(str),
    createdAt: num,
    audioSeconds: opt(num),
    speechSeconds: opt(num),
    pauses: opt(numArr),
    typed: opt(bool),
    correction: opt(CORRECTION),
    corrections: opt((v) => Array.isArray(v) && v.every(CORRECTION)),
    pronunciation: opt(obj),
  },
  mistakes: {
    id,
    sessionId: num,
    turnId: num,
    createdAt: num,
    original: str,
    corrected: str,
    explanationEs: opt(str),
    category: opt(str),
    spanish: opt(str),
    grammarTopic: opt(str), // v5.10
  },
  profile: {
    id: oneOf('me'),
    levels: LEVELS,
    about: opt(str),
    weaknesses: opt(strArr),
    goal: opt(str),
    startedAt: opt(num),
    name: opt(str),
    purposes: opt(strArr),
    interests: opt(strArr),
    calibratedAt: opt(num),
    tests: opt(arr),
    levelEvents: opt(arr),
    plan: opt(obj),
    trajectory: opt(obj),
    bankUsage: opt(shape({ seen: strArr, uses: obj })),
  },
  lookups: {
    id,
    query: str,
    context: opt(str),
    result: shape({
      headword: str,
      translation: str,
      meaningEs: opt(str),
      whyEs: opt(str),
      ipa: opt(str),
      partOfSpeech: opt(str),
      register: opt(str),
      otherMeanings: opt(arr),
      collocations: opt(strArr),
      falseFriendEs: opt(str),
      exampleEn: opt(str),
      exampleEs: opt(str),
      synonyms: opt(strArr), // v5.10: faltan en las consultas anteriores
      antonyms: opt(strArr),
    }),
    saved: bool,
    createdAt: num,
  },
  cards: {
    id,
    source: oneOf('mistake', 'lookup', 'grammar'), // v5.10: ejercicios de Gramática fallados
    sourceId: num,
    promptEs: str,
    answerEn: str,
    hintEs: opt(str),
    createdAt: num,
    due: num,
    fsrs: shape({ due: num, stability: num, difficulty: num, reps: num, lapses: num, state: num }),
    archivedAt: opt(num), // v5.9: «Ya me la sé»
  },
  grammar: {
    id: textId, // id del tema
    seenAt: opt(num),
    lastAt: num,
    correct: num,
    attempts: num,
    rounds: opt(num),
    spoken: opt(num),
    spokenOk: opt(num),
    lastRound: opt(shape({ correct: num, total: num, at: num })),
    mastered: bool,
    masteredAt: opt(num),
  },
}

const DAMAGED = 'El archivo de copia está dañado o no es de Habla; no se cambió nada.'

export type BackupCheck = { ok: true; backup: CheckedBackup } | { ok: false; error: string }

/** Comprueba la copia entera. Si falla, explica en español qué falla (y nunca se toca ningún dato). */
export function checkBackup(data: unknown): BackupCheck {
  const fail = (why: string): BackupCheck => ({ ok: false, error: `${DAMAGED} (${why})` })
  if (!isObj(data) || data.format !== BACKUP_FORMAT) return { ok: false, error: 'Este archivo no es una copia de seguridad de Habla; no se cambió nada.' }
  const version = data.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail('versión de la copia desconocida')
  if (version > BACKUP_VERSION) return { ok: false, error: 'La copia es de una versión más nueva de Habla. Actualiza la app primero; no se cambió nada.' }
  if (!isObj(data.tables)) return fail('no tiene tablas')
  const tables = {} as CheckedBackup['tables']
  for (const t of BACKUP_TABLES) {
    const rows = data.tables[t] === undefined && OPTIONAL_TABLES.includes(t) ? [] : data.tables[t]
    if (!Array.isArray(rows)) return fail(`falta la tabla de ${NAMES[t]}`)
    const ids = new Set<unknown>()
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!isObj(row)) return fail(`${NAMES[t]}, fila ${i + 1}: no es un registro`)
      for (const [field, rule] of Object.entries(SCHEMA[t])) {
        if (!rule(row[field])) return fail(`${NAMES[t]}, fila ${i + 1}: el campo «${field}» falta o tiene un tipo incorrecto`)
      }
      if (ids.has(row.id)) return fail(`${NAMES[t]}: el registro ${String(row.id)} está repetido`)
      ids.add(row.id)
    }
    tables[t] = rows as Row[]
  }
  // Como mucho un perfil («me», comprobado arriba). Sin perfil (copias muy antiguas) la app crea uno neutro al abrir;
  // desde la bienvenida se exige además que tenga nombre (App.tsx).
  if (tables.profile.length > 1) return fail('tiene más de un perfil')
  // Índice único de las tarjetas (source + sourceId): repetido, la base de datos lo rechazaría a medias.
  const keys = new Set(tables.cards.map((c) => `${String(c.source)}:${String(c.sourceId)}`))
  if (keys.size !== tables.cards.length) return fail('hay tarjetas de repaso repetidas')
  return { ok: true, backup: { format: BACKUP_FORMAT, version, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined, tables } }
}

/** Interpreta el texto de la copia y la comprueba entera. */
export function parseBackup(text: string): BackupCheck {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido; no se cambió nada.' }
  }
  return checkBackup(data)
}
