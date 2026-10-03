// Motor del test de nivel con el banco de ítems (marco "Marco del test de nivel de inglés", oct 2026).
// Reglas puras, sin interfaz: gramática escalonada, lectura y audición adaptativas por bloques, tareas de habla,
// nivel general con tope por destreza débil, confianza por destreza y ponderación del re-test.

import {
  checkShort,
  isGrammarGap,
  isGrammarMC,
  isListening,
  isReading,
  isSpeaking,
  pickItems,
  type BankItem,
  type BankQuestion,
  type BankUsage,
  type GrammarItem,
  type ListeningItem,
  type ReadingItem,
  type SpeakingItem,
} from './bank'
import { LEVELS, levelAt, levelIdx, type Level } from './levels'

// ---------------------------------------------------------------------------
// Gramática: 20 preguntas (15 opción múltiple + 5 huecos), de A1 a C2, igual para todos.

const GRAMMAR_PLAN: Record<Level, { mc: number; gap: number }> = {
  A1: { mc: 2, gap: 0 },
  A2: { mc: 3, gap: 0 },
  B1: { mc: 3, gap: 1 },
  B2: { mc: 3, gap: 2 },
  C1: { mc: 2, gap: 1 },
  C2: { mc: 2, gap: 1 },
}
export const GRAMMAR_COUNT = 20
export const PASS_RATE = 0.6

export interface GrammarAnswer {
  item: GrammarItem
  /** Opción elegida (opción múltiple) o texto escrito (hueco). -1 / '' = "No lo sé". */
  value: number | string
  unknown: boolean
  correct: boolean
}

/** La escalera de 20 preguntas, de menor a mayor dificultad (en cada nivel, primero las de opción múltiple). */
export function buildGrammar(usage: BankUsage): GrammarItem[] {
  const out: GrammarItem[] = []
  const exclude = new Set<string>()
  for (const l of LEVELS) {
    const { mc, gap } = GRAMMAR_PLAN[l]
    const lv = [...pickItems({ filter: isGrammarMC(l), n: mc, usage, exclude }), ...pickItems({ filter: isGrammarGap(l), n: gap, usage, exclude })]
    lv.forEach((i) => exclude.add(i.id))
    out.push(...lv)
  }
  return out
}

export function checkGrammar(item: GrammarItem, value: number | string): boolean {
  if (item.format === 'mc') return value === item.key
  return typeof value === 'string' && checkShort(value, item.accepted)
}

const levelStats = (answers: GrammarAnswer[], l: Level) => {
  const at = answers.filter((a) => a.item.level === l)
  return { n: at.length, ok: at.filter((a) => a.correct).length, gapOk: at.some((a) => a.item.format === 'short' && a.correct) }
}

/** Fin anticipado: si falló todas las preguntas de dos niveles seguidos, la sección termina. */
export function grammarShouldStop(items: GrammarItem[], answers: GrammarAnswer[]): boolean {
  if (answers.length >= items.length) return true
  const done = LEVELS.filter((l) => {
    const total = items.filter((i) => i.level === l).length
    return total > 0 && answers.filter((a) => a.item.level === l).length === total
  })
  for (let k = 1; k < done.length; k++) {
    const a = levelStats(answers, done[k - 1])
    const b = levelStats(answers, done[k])
    if (levelIdx(done[k]) === levelIdx(done[k - 1]) + 1 && a.ok === 0 && b.ok === 0) return true
  }
  return false
}

/**
 * Nivel de gramática: el más alto aprobado (≥ 60 %) con todos los anteriores también aprobados.
 * C1 y C2 exigen además acertar un hueco escrito de ese nivel. Si no aprueba A1, se queda en A1.
 */
export function grammarLevel(answers: GrammarAnswer[]): Level {
  let best = -1
  for (let i = 0; i < LEVELS.length; i++) {
    const s = levelStats(answers, LEVELS[i])
    const pass = s.n > 0 && s.ok / s.n >= PASS_RATE && (i < 4 || s.gapOk)
    if (!pass) break
    best = i
  }
  return levelAt(Math.max(0, best))
}

// ---------------------------------------------------------------------------
// Lectura y audición: dos bloques de 6 preguntas; el segundo sube, se mantiene o baja según el primero.

export type BlockItem = ReadingItem | ListeningItem

export interface BlockResult {
  item: BlockItem
  level: Level
  /** Respuesta de cada pregunta: índice de opción, texto escrito, -1 / '' = "No sé", null = sin responder. */
  answers: (number | string | null)[]
  correct: boolean[]
  /** Audición: reproducciones usadas con efecto en la nota (1–3). */
  plays?: number
  /** Audición: preguntas respondidas después de cerrar la nota (cuentan como "No sé"). */
  late?: boolean[]
}

/** Lectura empieza en gramática − 1; audición en el menor de gramática y lectura, − 1. Mínimo A2. */
export const readingStart = (grammar: Level) => levelAt(Math.max(1, levelIdx(grammar) - 1))
export const listeningStart = (grammar: Level, reading: Level) => levelAt(Math.max(1, Math.min(levelIdx(grammar), levelIdx(reading)) - 1))

/** 6 → sube dos · 4–5 → sube uno · 3 → mismo nivel · 0–2 → baja uno. */
export function nextBlockLevel(level: Level, score: number): Level {
  const step = score >= 6 ? 2 : score >= 4 ? 1 : score === 3 ? 0 : -1
  return levelAt(levelIdx(level) + step)
}

export const PASS_BLOCK = 4

/** Corrige una pregunta de lectura o audición (en audición se tolera una letra en las respuestas escritas). */
export function checkQuestion(q: BankQuestion, value: number | string | null, tolerateTypo: boolean): boolean {
  if (value === null || value === -1 || value === '') return false
  if (q.format === 'mc') return value === q.key
  return typeof value === 'string' && checkShort(value, q.accepted, tolerateTypo)
}

export const blockScore = (b: BlockResult) => b.correct.filter(Boolean).length

export function pickBlock(kind: 'reading' | 'listening', level: Level, usage: BankUsage, exclude: Set<string>, avoidTopics: string[]): BlockItem | null {
  const filter = kind === 'reading' ? isReading(level) : isListening(level)
  return pickItems<BlockItem>({ filter: filter as (i: BankItem) => i is BlockItem, n: 1, usage, exclude, avoidTopics })[0] ?? null
}

export type Confidence = 'high' | 'medium' | 'low'

/**
 * Nivel final: el más alto con ≥ 4/6. Si no aprobó ningún bloque, uno por debajo del más bajo visto.
 * Confianza: alta con dos bloques aprobados en el nivel final o contiguos; media con uno; baja si el nivel
 * llega con un solo bloque tras saltar dos niveles (o sin ningún bloque aprobado).
 */
export function blocksLevel(blocks: BlockResult[]): { level: Level; confidence: Confidence } {
  const passed = blocks.filter((b) => blockScore(b) >= PASS_BLOCK)
  if (!passed.length) {
    const lowest = Math.min(...blocks.map((b) => levelIdx(b.level)))
    return { level: levelAt(lowest - 1), confidence: 'low' }
  }
  const top = Math.max(...passed.map((b) => levelIdx(b.level)))
  const level = levelAt(top)
  const nearTop = passed.filter((b) => top - levelIdx(b.level) <= 1)
  if (nearTop.length >= 2) return { level, confidence: 'high' }
  const [first, second] = blocks
  const jumped = !!second && levelIdx(second.level) - levelIdx(first.level) === 2 && levelIdx(second.level) === top
  return { level, confidence: jumped ? 'low' : 'medium' }
}

/** Audición: C1–C2 alcanzado usando las 3 reproducciones en ambos audios → la confianza baja a media. */
export function listeningConfidence(blocks: BlockResult[], r: { level: Level; confidence: Confidence }): Confidence {
  const allThree = blocks.length >= 2 && blocks.every((b) => (b.plays ?? 0) >= 3)
  if (levelIdx(r.level) >= 4 && allThree && r.confidence === 'high') return 'medium'
  return r.confidence
}

// ---------------------------------------------------------------------------
// Habla: tarea 1 (preguntas personales), 2 (tarjeta) y 3 (opinión; sencilla si las dos primeras ≤ A2).

export function pickSpeaking(task: 1 | 2 | 3, usage: BankUsage, simple = false): SpeakingItem | null {
  return pickItems({ filter: isSpeaking(task, simple), n: 1, usage })[0] ?? null
}

/** ¿La tarea 3 debe ser la sencilla? Sí si las dos primeras quedaron en A2 o menos. */
export const simpleTask3 = (t1: Level | null, t2: Level | null, fallback: Level) => {
  const known = [t1, t2].filter((x): x is Level => !!x)
  const lv = known.length ? Math.max(...known.map(levelIdx)) : levelIdx(fallback)
  return lv <= 1
}

export const SPEAK_CRITERIA = ['fluency', 'vocabulary', 'grammar', 'pronunciation'] as const
export type SpeakCriterion = (typeof SPEAK_CRITERIA)[number]

/** Nivel de habla: la mediana de los cuatro criterios (con dos centrales distintos, el más bajo, para no sobrevalorar). */
export function medianLevel(levels: Level[]): Level {
  const s = levels.map(levelIdx).sort((a, b) => a - b)
  if (!s.length) return 'A2'
  const m = s.length / 2
  return levelAt(s.length % 2 ? s[Math.floor(m)] : Math.floor((s[m - 1] + s[m]) / 2))
}
