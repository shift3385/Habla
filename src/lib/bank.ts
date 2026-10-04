// Banco de ítems del test de nivel (marco "Marco del test de nivel de inglés", oct 2026).
// El contenido vive en src/bank/<sección>/<nivel>.json, viaja dentro de la APK (solo texto: el audio de
// audición lo genera la voz del teléfono a partir del guion) y se elige por metadatos, sin gastar tokens.
// Durante el test, Gemini solo corrige el habla. Validación: `node scripts/validate-bank.mjs`.

export const BANK_VERSION = 1
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]
export type Skill = 'grammar' | 'reading' | 'listening' | 'speaking'

/** Pregunta de opción múltiple: 4 opciones (la app añade "No sé"), una correcta. */
interface MC {
  format: 'mc'
  prompt: string
  options: [string, string, string, string]
  key: 0 | 1 | 2 | 3
  /** Qué error real representa cada opción incorrecta, en el orden en que aparecen. */
  traps?: string[]
}

/** Respuesta escrita corta: se corrige en código contra la lista de respuestas aceptadas. */
interface Short {
  format: 'short'
  prompt: string
  accepted: string[]
  /** Palabras máximas (1–3 en lectura y audición, 1–4 en los huecos de gramática). */
  maxWords: number
}

export type GrammarItem = {
  id: string // gram_b2_0007 / gap_c1_0003
  skill: 'grammar'
  level: Level
  /** Punto gramatical o de vocabulario que mide (para detectar debilidades). */
  point: string
  area: 'grammar' | 'vocabulary'
  topic: string
  /** Tarea de referencia, p. ej. "Cambridge B2 First – open cloze". */
  model: string
} & (MC | (Short & { hint: string }))

export type QuestionType = 'gist' | 'detail' | 'vocab' | 'summary' | 'inference' | 'attitude' | 'purpose'

export type BankQuestion = { type: QuestionType } & (MC | Short)

export interface ReadingItem {
  id: string // read_b2_0004
  skill: 'reading'
  level: Level
  topic: string
  genre: string // aviso, correo, artículo, reportaje, ensayo…
  title: string
  text: string
  /** Seis preguntas en orden fijo: idea general, dato (corto), dato (MC), vocabulario, resumen (corto), inferencia. */
  questions: BankQuestion[]
  model: string
  tags: string[]
}

export interface Speaker {
  id: string
  name: string
  gender: 'female' | 'male'
}

export interface ListeningItem {
  id: string // list_b1_0009
  skill: 'listening'
  level: Level
  topic: string
  genre: string // mensaje de voz, anuncio, diálogo, entrevista, charla…
  title: string
  speakers: Speaker[]
  /** Guion por turnos: la app lo lee con la voz del teléfono (una voz por hablante si hay varias). */
  script: { s: string; t: string }[]
  /** Seis preguntas en el orden en que se escucha la información. */
  questions: BankQuestion[]
  model: string
  tags: string[]
}

export interface SpeakingItem {
  id: string // speak_t2_0012
  skill: 'speaking'
  task: 1 | 2 | 3
  /** Tarea 3 sencilla para quien queda en A2 o menos en las dos primeras. */
  variant?: 'simple'
  /** Niveles que la tarea permite demostrar. */
  from: Level
  to: Level
  topic: string
  /** Lo que dice el profe (inglés). En la tarea 1 son dos preguntas. */
  prompts: string[]
  /** Tarjeta de la tarea 2: puntos que conviene mencionar. */
  cues?: string[]
  seconds: number
  model: string
}

export type BankItem = GrammarItem | ReadingItem | ListeningItem | SpeakingItem

// ---------------------------------------------------------------------------
// Carga (todo el banco va en la APK)

const files = import.meta.glob<{ default: BankItem[] }>('../bank/**/*.json', { eager: true })
export const BANK: BankItem[] = Object.values(files).flatMap((m) => m.default)

export const levelIdx = (l: Level) => LEVELS.indexOf(l)
export const levelAt = (i: number): Level => LEVELS[Math.max(0, Math.min(5, i))]

export function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Duración estimada de un guion leído a ritmo natural (≈ 150 palabras por minuto). */
export function scriptSeconds(item: ListeningItem) {
  return Math.round((item.script.reduce((a, x) => a + wordCount(x.t), 0) / 150) * 60)
}

// ---------------------------------------------------------------------------
// Selección: filtra por metadatos, excluye lo ya visto por este usuario y rota lo menos usado.

export interface BankUsage {
  seen: string[] // ids ya vistos en tests anteriores
  uses: Record<string, number> // veces que se ha servido cada ítem en este teléfono
}

export interface Pick<T extends BankItem> {
  filter: (i: BankItem) => i is T
  n: number
  usage: BankUsage
  /** Ids ya elegidos en este mismo test. */
  exclude?: Set<string>
  /** Temas a evitar (p. ej. los del bloque anterior). */
  avoidTopics?: string[]
}

export function pickItems<T extends BankItem>({ filter, n, usage, exclude, avoidTopics }: Pick<T>): T[] {
  const seen = new Set(usage.seen)
  const pool = BANK.filter(filter).filter((i) => !exclude?.has(i.id))
  // 1) no vistos y de otro tema; 2) no vistos; 3) cualquiera (si el banco se agota, se repite lo menos usado).
  const fresh = pool.filter((i) => !seen.has(i.id))
  const tiers = [fresh.filter((i) => !avoidTopics?.includes((i as { topic: string }).topic)), fresh, pool]
  const out: T[] = []
  for (const tier of tiers) {
    const left = tier.filter((i) => !out.includes(i))
    // Menos usado primero; empate al azar.
    left.sort((a, b) => (usage.uses[a.id] ?? 0) - (usage.uses[b.id] ?? 0) || Math.random() - 0.5)
    out.push(...left.slice(0, n - out.length))
    if (out.length >= n) break
  }
  return out
}

/** Registra los ítems servidos (para no repetirlos y para la rotación). */
export function recordUse(usage: BankUsage, items: BankItem[]): BankUsage {
  const uses = { ...usage.uses }
  for (const i of items) uses[i.id] = (uses[i.id] ?? 0) + 1
  return { seen: [...new Set([...usage.seen, ...items.map((i) => i.id)])], uses }
}

// Filtros tipados de uso habitual.
export const isGrammarMC = (level: Level) => (i: BankItem): i is GrammarItem => i.skill === 'grammar' && i.format === 'mc' && i.level === level
export const isGrammarGap = (level: Level) => (i: BankItem): i is GrammarItem => i.skill === 'grammar' && i.format === 'short' && i.level === level
export const isReading = (level: Level) => (i: BankItem): i is ReadingItem => i.skill === 'reading' && i.level === level
export const isListening = (level: Level) => (i: BankItem): i is ListeningItem => i.skill === 'listening' && i.level === level
export const isSpeaking = (task: 1 | 2 | 3, simple = false) => (i: BankItem): i is SpeakingItem =>
  i.skill === 'speaking' && i.task === task && (task !== 3 || !!i.variant === simple)

// ---------------------------------------------------------------------------
// Corrección en código de las respuestas escritas (sin Gemini).

/** Normaliza mayúsculas, espacios, puntuación y contracciones habituales. */
export function normalizeAnswer(s: string) {
  return s
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?;:"()]/g, ' ')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bcan not\b/g, 'cannot')
    .replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'d\b/g, ' would')
    .replace(/'m\b/g, ' am')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distancia de edición (para tolerar una letra en audición). */
function editDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// Validación flexible (NC-04): misma raíz = misma respuesta. "reversibility" ↔ "reversible", "exposure" ↔
// "exposed", "repairing" ↔ "repair", "biologically" ↔ "biology". Se quitan sufijos derivativos e inflexivos
// hasta dejar una raíz de al menos 4 letras; los artículos no cuentan. No acepta palabras distintas.
const SUFFIXES = [
  'abilities', 'ibilities', 'ability', 'ibility', 'ically', 'ations', 'ation', 'itions', 'ition', 'ments', 'ment',
  'nesses', 'ness', 'ities', 'ity', 'ively', 'ive', 'iv', 'ical', 'ally', 'ings', 'ing', 'able', 'ible', 'ures', 'ure',
  'encies', 'ency', 'ences', 'ence', 'ents', 'ent', 'ancies', 'ancy', 'ances', 'ance', 'ants', 'ant',
  'ies', 'ied', 'ers', 'er', 'est', 'ed', 'ly', 'es', 'al', 'ic', 'y', 's', 'e',
]
const ARTICLES = new Set(['a', 'an', 'the'])
// Los números no se recortan: "eighty" no es "eight" ni "sixty" es "six".
const NUMBERS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million', 'billion'])

export function stem(word: string): string {
  let w = word.toLowerCase()
  if (NUMBERS.has(w)) return w
  // Se repite: "biologically" → "biologic" → "biolog".
  for (let pass = 0; pass < 3; pass++) {
    const suf = SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length >= 4)
    if (!suf) break
    w = w.slice(0, -suf.length)
  }
  // "earlier" → "earli" y "early" → "earl": la i final (de una y) no cuenta.
  if (w.endsWith('i') && w.length > 4) w = w.slice(0, -1)
  return w
}

const stems = (s: string) =>
  normalizeAnswer(s)
    .split(' ')
    .filter((w) => w && !ARTICLES.has(w))
    .map(stem)

/**
 * ¿Es correcta la respuesta escrita? Acepta la respuesta exacta (normalizada), la misma con o sin artículo y
 * las formas de la misma raíz. En audición se tolera además un error de una letra en palabras de 4+ letras.
 */
export function checkShort(answer: string, accepted: string[], tolerateTypo = false) {
  const a = normalizeAnswer(answer)
  if (!a) return false
  const as = stems(answer)
  return accepted.some((x) => {
    const k = normalizeAnswer(x)
    if (a === k) return true
    if (tolerateTypo && k.length >= 4 && editDistance(a, k) <= 1) return true
    const ks = stems(x)
    if (!ks.length || ks.length !== as.length) return false
    return ks.every((w, i) => w === as[i] || (tolerateTypo && w.length >= 4 && editDistance(w, as[i]) <= 1))
  })
}
