// 5.11 (S-09/S-10, D4): lógica sin interfaz de los ejercicios de Sonidos (correctores, rondas, deletreo, fases).
// Separada de SoundExercises.tsx para probarla con node:test (tests/m4-*.test.mjs).
import type { Alphabet, ChartBlock, Phoneme, SoundExercise, SoundLesson, SoundState } from './sounds'

/** Generador pseudoaleatorio con semilla (mulberry32): la misma ronda se baraja igual mientras dura. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(list: T[], seed: number): T[] {
  const r = rng(seed)
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---- listen-choose («¿cuál dijo?») ----

export interface ListenRound {
  /** La palabra que suena. */
  word: string
  /** Las opciones en el orden en que se enseñan (las dos del par, o las tres de un trío). */
  options: string[]
}

/**
 * Rondas de «Escucha»: `rounds` (8 por defecto) sacadas de los pares (o tríos), cada una con una palabra que suena y
 * las opciones barajadas. Si hay menos pares que rondas, se repiten (con otra palabra del grupo cuando se puede).
 */
export function listenRounds(groups: string[][], rounds = 8, seed = 1): ListenRound[] {
  const pairs = groups.filter((g) => g.length >= 2)
  if (!pairs.length) return []
  const r = rng(seed)
  const order = shuffle(pairs, seed)
  const out: ListenRound[] = []
  for (let i = 0; i < rounds; i++) {
    const pair = order[i % order.length]
    // Primera vuelta al azar; en la siguiente vuelta del mismo par, la otra palabra (así se oyen las dos).
    const lap = Math.floor(i / order.length)
    const first = Math.floor(r() * pair.length)
    const pick = lap === 0 ? first : (pair.indexOf(out[i % order.length].word) + lap) % pair.length
    out.push({ word: pair[pick], options: shuffle(pair, Math.floor(r() * 2 ** 31)) })
  }
  return out
}

/** ¿Acertó? Sin distinguir mayúsculas ni espacios. */
export const checkListen = (round: ListenRound, chosen: string) => norm(chosen) === norm(round.word)

const norm = (s: string) => s.trim().toLowerCase()

// ---- odd-one-out («¿cuál es la intrusa?») ----

export const checkOdd = (ex: Extract<SoundExercise, { type: 'odd-one-out' }>, chosen: number) => chosen === ex.answer

// ---- sort (clasifica por toques) ----

/** Resultado de «Clasifica»: cuántas palabras van en su columna. `placed`: palabra → columna elegida. */
export function checkSort(ex: Extract<SoundExercise, { type: 'sort' }>, placed: Record<string, string>): { correct: number; total: number; ok: boolean; wrong: string[] } {
  const wrong = ex.words.filter(([w, col]) => placed[w] !== col).map(([w]) => w)
  const total = ex.words.length
  return { correct: total - wrong.length, total, ok: wrong.length === 0, wrong }
}

// ---- spell-listen (la voz deletrea, escribes) ----

/** Para comparar un deletreo: sin mayúsculas, espacios, guiones, puntos ni comas («g-a r.c» = «GARC»). */
export const normalizeSpelling = (s: string) => s.toUpperCase().replace(/[\s\-‐-―.,·_'’]/g, '')

export const checkSpelling = (expected: string, typed: string) => normalizeSpelling(expected).length > 0 && normalizeSpelling(expected) === normalizeSpelling(typed)

/** Lo que dice la voz letra a letra (con el `ttsText` de cada letra del abecedario: «A.», «zee»…). */
export function spellOut(word: string, alphabet?: Pick<Alphabet, 'letters'>): string[] {
  const byLetter = new Map((alphabet?.letters ?? []).map((l) => [l.letter, l.ttsText]))
  return normalizeSpelling(word)
    .split('')
    .filter((c) => /[A-Z]/.test(c))
    .map((c) => byLetter.get(c) ?? `${c}.`)
}

/** Lo que se le da a la voz para un elemento de un ejercicio: con `letters`, el nombre de la letra (`ttsText`). */
export const sayable = (item: string, letters: boolean | undefined, alphabet?: Pick<Alphabet, 'letters'>) => (letters ? (spellOut(item, alphabet)[0] ?? item) : item)

/** Pausa entre letras al deletrear (S-09: «pausas entre letras»). */
export const SPELL_GAP_MS = 450

// ---- Fases de la lección (DISENO §5.3) ----

export type Phase = 'explain' | 'listen' | 'sort' | 'say' | 'spell' | 'done'

export function phaseOf(type: SoundExercise['type']): Phase {
  if (type === 'listen-choose') return 'listen'
  if (type === 'sort' || type === 'odd-one-out') return 'sort'
  if (type === 'spell-listen') return 'spell'
  return 'say'
}

export const PHASE_LABEL: Record<Phase, string> = {
  explain: 'Explícame',
  listen: 'Escucha',
  sort: 'Clasifica',
  say: 'Dilo tú',
  spell: 'Deletrea',
  done: 'Cierre',
}

/** Fases que tiene una lección, en orden y sin repetir (para la barra de pasos). */
export function lessonPhases(l: SoundLesson): Phase[] {
  const out: Phase[] = ['explain']
  for (const e of l.exercises) {
    const p = phaseOf(e.type)
    if (!out.includes(p)) out.push(p)
  }
  out.push('done')
  return out
}

// ---- Nota de Azure ----

/** Umbral provisional de «bien dicho» (DISENO §5.3: ≥ 80; se ajusta tras F0-4). */
export const SAY_OK = 80

// ---- Tabla fonémica (S-07) ----

export interface ChartGrid {
  rows: number
  cols: number
  /** cells[fila][columna] = fichas de esa celda (normalmente 1; /ɝ/ y /ɚ/ comparten). */
  cells: Phoneme[][][]
}

/**
 * Coloca las fichas en sus bloques (vocales, diptongos, consonantes) según `chart` (filas y columnas desde 1). Las
 * consonantes van en pares sorda | sonora: si el contenido numera los PARES (columnas 1–4), el lado lo decide `voiced`.
 * Las fichas sin `chart` (rasgos como `s-cluster`) no salen en la tabla.
 */
const MIN_SIZE: Record<ChartBlock, [number, number]> = { vowels: [3, 4], diphthongs: [1, 5], consonants: [3, 8] }

export function chartGrid(phonemes: Phoneme[]): Record<ChartBlock, ChartGrid> {
  const out = {} as Record<ChartBlock, ChartGrid>
  for (const block of ['vowels', 'diphthongs', 'consonants'] as ChartBlock[]) {
    const list = phonemes.filter((p) => p.chart?.block === block)
    const byPair = block === 'consonants' && list.length > 0 && Math.max(...list.map((p) => p.chart!.col)) <= 4
    const pos = (p: Phoneme) => ({ r: p.chart!.row - 1, c: byPair ? (p.chart!.col - 1) * 2 + (p.voiced ? 1 : 0) : p.chart!.col - 1 })
    // Tamaño fijo de la tabla (FORMATO-sonidos §2.1), aunque falten fichas: así no cambia de forma al ir llegando contenido.
    const rows = Math.max(list.length ? MIN_SIZE[block][0] : 0, ...list.map((p) => pos(p).r + 1))
    const cols = Math.max(MIN_SIZE[block][1], ...list.map((p) => pos(p).c + 1))
    const cells: Phoneme[][][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => []))
    for (const p of list) {
      const { r, c } = pos(p)
      if (r >= 0 && c >= 0) cells[r][c].push(p)
    }
    out[block] = { rows, cols, cells }
  }
  return out
}

/** Mínimos de la tabla en px REALES (lo que toca el dedo, decisión del orquestador): vocales 44 de alto, consonantes 36. */
export const CELL_MIN = { vowelH: 44, cons: 36 } as const

/**
 * 5.11 (S-07): cómo dibujar la tabla en un ancho `widthCss` (px CSS del bloque de consonantes) con el `zoom` que aplica
 * viewport.ts (0,8 en 320×640: 40 px CSS son 32 px reales). Da los altos mínimos en px CSS para llegar a los mínimos
 * reales y `compact`: si 8 consonantes por fila no llegan a 36 px reales de ancho, van en 2 bloques plegables de 2 pares
 * por fila (F0-3). `consReal`: ancho real de una consonante con 8 por fila. `vowelWidthCss`: ancho del bloque de vocales
 * (en horizontal es más estrecho que el de consonantes).
 */
export function chartSizing(widthCss: number, zoom = 1, vowelWidthCss = widthCss): { compact: boolean; stackShared: boolean; vowelMinH: number; consMinH: number; consReal: number } {
  const z = zoom > 0 && Number.isFinite(zoom) ? zoom : 1
  // 8 celdas: 4 pares con 1 px de borde a cada lado y 1 px entre las dos, y 4 px entre pares (gap-1).
  const consReal = Math.floor(((widthCss - 4 * 3 - 3 * 4) / 8) * z * 10) / 10
  return {
    compact: consReal < CELL_MIN.cons,
    // La celda compartida «ɝ ɚ» (4 vocales por fila, 2 fichas en una celda): si cada mitad no llega a 36 px reales de
    // ancho, las dos van una encima de otra.
    stackShared: ((vowelWidthCss - 3 * 4) / 4 / 2) * z < CELL_MIN.cons,
    vowelMinH: Math.max(46, Math.ceil(CELL_MIN.vowelH / z)),
    consMinH: Math.max(40, Math.ceil(CELL_MIN.cons / z)),
    consReal,
  }
}

/** Borde de cada estado en la tabla y en las fichas (nuevo · visto · practicado · dominado). */
export const STATE_STYLE: Record<SoundState, { label: string; color: string; width: number }> = {
  new: { label: 'Nuevo', color: 'var(--gb)', width: 1 },
  seen: { label: 'Visto', color: 'var(--acc2)', width: 1.5 },
  practiced: { label: 'Practicado', color: 'var(--acc)', width: 2 },
  mastered: { label: 'Dominado', color: 'var(--ok)', width: 2 },
}

// ---- Dilo tú (say-word, say-pair, say-sentence) ----

/** Lo que se dice en cada intento y el fonema que se puntúa. */
export interface Item {
  text: string
  /** Fonema objetivo (para la nota de Azure). */
  target?: Phoneme
}

/** Los intentos de un ejercicio de decir: cada palabra; cada par junto («ship, sheep»); la frase. */
export function sayItems(ex: Extract<SoundExercise, { type: 'say-word' | 'say-pair' | 'say-sentence' }>, phonemes: Phoneme[], main?: string): Item[] {
  const find = (id?: string) => phonemes.find((p) => p.id === id)
  if (ex.type === 'say-word') return ex.words.map((w) => ({ text: w, target: find(ex.target) }))
  if (ex.type === 'say-pair') return ex.pairs.map(([a, b]) => ({ text: `${a}, ${b}`, target: find(main) }))
  return [{ text: ex.en, target: find(ex.targets?.[0] ?? main) }]
}

/** En pantallas muy bajas (horizontal) el panel de la tabla no baja de aquí; la página hace el resto (como InfiniteList). */
export const PANEL_MIN_HEIGHT = 160

/** Alto del panel de la tabla: desde su borde de arriba (`top`) hasta el fondo útil (`bottom`), con 4 px de aire. */
export const panelHeight = (bottom: number, top: number) => Math.max(PANEL_MIN_HEIGHT, Math.floor(bottom - top - 4))
