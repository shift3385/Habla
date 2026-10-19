import type { Lookup } from './db'

// v5.10 (punto 3 del dueño): navegación entre consultas sin modal sobre modal. Tocar un sinónimo o un antónimo abre
// su consulta DENTRO de la misma hoja/vista y se apila: palabra original → sinónimo → antónimo de ese…
// Atrás (botón «‹ palabra» o el de Android) quita un paso; solo con un único elemento se cierra la hoja.
// Lógica pura (sin React) para poder probarla con node:test.

/** Por qué se abrió esta consulta: sinónimo o antónimo de otra palabra (afina el prompt de Gemini). */
export interface LookupRelation {
  kind: 'synonym' | 'antonym'
  of: string // palabra de la que sale
  meaningEs: string // qué significaba aquella palabra en su contexto (para elegir el mismo sentido)
}

export interface StackEntry {
  key: number // único dentro de la hoja: la respuesta tardía de una consulta ya quitada no pisa a otra
  query: string
  context: string
  relation?: LookupRelation
  lookup: Lookup | null // null mientras carga o si falló
  error: string | null
  hint: string | null // «Gemini está saturado, reintentando…»
}

/** Máximo de sinónimos o antónimos que se enseñan (el prompt pide 0–6). */
export const MAX_RELATED = 6

let seq = 0
const nextKey = () => ++seq

/** Primer elemento de la pila: una consulta ya hecha (historial) o una por hacer (palabra tocada en la clase). */
export function rootEntry(from: Lookup | { query: string; context: string }): StackEntry {
  return 'result' in from
    ? { key: nextKey(), query: from.query, context: from.context, lookup: from, error: null, hint: null }
    : { key: nextKey(), query: from.query.trim(), context: from.context.trim(), lookup: null, error: null, hint: null }
}

/** Palabra que se muestra para un elemento (la del diccionario si ya llegó; si no, lo que se pidió). */
export function entryLabel(e: StackEntry): string {
  return e.lookup?.result.headword || e.query
}

/**
 * Apila la consulta de una palabra relacionada con la de arriba. El contexto es el de la palabra original (se hereda
 * por toda la cadena). Tocar la misma palabra que ya está arriba no apila nada.
 */
export function pushRelated(stack: StackEntry[], word: string, kind: LookupRelation['kind']): StackEntry[] {
  const top = stack[stack.length - 1]
  const w = word.trim()
  if (!top || !w || same(w, entryLabel(top))) return stack
  const relation: LookupRelation = { kind, of: entryLabel(top), meaningEs: top.lookup?.result.meaningEs ?? '' }
  return [...stack, { key: nextKey(), query: w, context: top.lookup?.context ?? top.context, relation, lookup: null, error: null, hint: null }]
}

/** Quita el de arriba. Con uno solo devuelve la misma pila: entonces el que llama cierra la hoja. */
export function popEntry(stack: StackEntry[]): StackEntry[] {
  return stack.length > 1 ? stack.slice(0, -1) : stack
}

export function canPop(stack: StackEntry[]): boolean {
  return stack.length > 1
}

/** Texto del botón atrás: la palabra anterior (null si no hay a dónde volver). */
export function backLabel(stack: StackEntry[]): string | null {
  return stack.length > 1 ? entryLabel(stack[stack.length - 2]) : null
}

/** Actualiza un elemento por su clave (si ya no está en la pila, no cambia nada). */
export function patchEntry(stack: StackEntry[], key: number, patch: Partial<StackEntry>): StackEntry[] {
  return stack.some((e) => e.key === key) ? stack.map((e) => (e.key === key ? { ...e, ...patch } : e)) : stack
}

/**
 * Sinónimos o antónimos limpios para pintar: solo textos, sin vacíos, sin repetidos (ignorando mayúsculas), sin la
 * propia palabra y como mucho MAX_RELATED. Acepta `undefined`: las consultas guardadas antes de la 5.10 no los tienen.
 */
export function relatedWords(list: unknown, headword: string): string[] {
  if (!Array.isArray(list)) return []
  const out: string[] = []
  for (const x of list) {
    if (typeof x !== 'string') continue
    const w = x.trim()
    if (!w || same(w, headword) || out.some((o) => same(o, w))) continue
    out.push(w)
    if (out.length === MAX_RELATED) break
  }
  return out
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
