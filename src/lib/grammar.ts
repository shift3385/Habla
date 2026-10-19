// v5.10 «Gramática»: catálogo de temas (src/grammar/<seccion>.json), buscador, comprobación de ejercicios y «Para ti».
// Módulo puro (sin Dexie ni Capacitor) para probarlo en Node (tests/grammar.test.mjs). El progreso está en
// grammarProgress.ts. Formato del contenido: docs/v5.10/FORMATO-contenido.md (lo valida scripts/validate-grammar.mjs).
import type { MistakeCategory } from './db'
import { IC, type IconName } from '../ui/icon-paths'

export type GrammarLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export const GRAMMAR_LEVELS: readonly GrammarLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export interface GrammarExample {
  en: string
  es: string
  noteEs?: string
}

export interface GrammarForm {
  pattern: string
  examples: GrammarExample[]
}

export interface GrammarMistake {
  wrong: string
  right: string
  whyEs: string
}

interface ExerciseBase {
  id: string // <id-del-tema>-<n>
  whyEs: string
}
export interface ChoiceExercise extends ExerciseBase {
  type: 'choice'
  prompt: string
  options: string[]
  answer: number
  trapsEs: string[] // una por opción; "" en la correcta
}
export interface GapExercise extends ExerciseBase {
  type: 'gap'
  prompt: string // con ____ (uno o dos huecos)
  answers: string[] // respuestas válidas; con dos huecos, «a / b»
}
export interface OrderExercise extends ExerciseBase {
  type: 'order'
  words: string[]
  answer: string // frase sin punto final
}
export type GrammarExercise = ChoiceExercise | GapExercise | OrderExercise

export interface SpeakingPrompt {
  promptEs: string
  modelEn: string
  checkEs: string
}

export interface GrammarTopic {
  id: string
  name: string // nombre técnico en inglés (título de la clase)
  nameEs: string
  level: GrammarLevel
  summaryEs: string
  keywords: string[]
  categories: MistakeCategory[]
  explanationEs: string[]
  forms: { affirmative: GrammarForm | null; negative: GrammarForm | null; question: GrammarForm | null }
  examples: GrammarExample[]
  commonMistakes: GrammarMistake[]
  related: string[]
  exercises: GrammarExercise[]
  speaking: SpeakingPrompt[]
  classFocusEn: string
}

export interface GrammarSection {
  id: string
  order: number
  titleEn: string
  titleEs: string
  icon: string
  descriptionEs: string
  topics: GrammarTopic[]
}

export interface Catalog {
  sections: GrammarSection[]
  topics: GrammarTopic[] // en el orden del catálogo (sección, luego tema)
  topicById: Map<string, GrammarTopic>
  sectionById: Map<string, GrammarSection>
  sectionOfTopic: Map<string, GrammarSection>
}

/** Construye el catálogo a partir de las secciones (ordenadas por `order`). Un id repetido se queda con el primero. */
export function buildCatalog(list: GrammarSection[]): Catalog {
  const sections = [...list].filter((s) => s && Array.isArray(s.topics)).sort((a, b) => a.order - b.order)
  const topicById = new Map<string, GrammarTopic>()
  const sectionById = new Map<string, GrammarSection>()
  const sectionOfTopic = new Map<string, GrammarSection>()
  const topics: GrammarTopic[] = []
  for (const s of sections) {
    sectionById.set(s.id, s)
    for (const t of s.topics) {
      if (topicById.has(t.id)) continue
      topicById.set(t.id, t)
      sectionOfTopic.set(t.id, s)
      topics.push(t)
    }
  }
  return { sections, topics, topicById, sectionById, sectionOfTopic }
}

// Una sección nueva = un archivo nuevo en src/grammar/ (sin tocar las pantallas). Se empaquetan con la app: sin red.
const files = import.meta.glob<{ default: GrammarSection }>('../grammar/*.json', { eager: true })
let catalog = buildCatalog(Object.values(files).map((m) => m.default))

/** Solo para pruebas (Node y navegador con datos ficticios): sustituye el catálogo. */
export function setCatalog(list: GrammarSection[]) {
  catalog = buildCatalog(list)
}

export const grammarCatalog = () => catalog
export const grammarSections = () => catalog.sections
export const findTopic = (id: string | null | undefined) => (id ? catalog.topicById.get(id) : undefined)
export const findSection = (id: string | null | undefined) => (id ? catalog.sectionById.get(id) : undefined)
export const sectionOf = (topicId: string) => catalog.sectionOfTopic.get(topicId)
/** Ids de todos los temas (D3: se le pasan al profe para que marque el tema de cada corrección). */
export const allTopicIds = () => catalog.topics.map((t) => t.id)

/** Icono de una sección (el JSON trae un nombre; si no existe en icon-paths.ts, un libro). */
export const sectionIcon = (name: string): IconName => (name in IC ? (name as IconName) : 'book')

/** Temas dominados de una sección. */
export const masteredIn = (s: GrammarSection, progress: Record<string, TopicProgressLike>) => s.topics.filter((t) => progress[t.id]?.mastered).length

// ---------------------------------------------------------------------------
// Buscador

/** Minúsculas, sin tildes ni signos (para buscar «debería» escribiendo «deberia»). */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca temas por nombre (inglés y español), palabras clave y resumen. Cada palabra de la búsqueda tiene que
 * aparecer en algún sitio; se ordenan primero los que coinciden en el nombre, luego en las palabras clave y al final
 * en el resumen (a igualdad, el orden del catálogo).
 */
export function searchTopics(q: string, limit = 30): GrammarTopic[] {
  const words = fold(q).split(' ').filter(Boolean)
  if (!words.length) return []
  const scored: { t: GrammarTopic; score: number; i: number }[] = []
  catalog.topics.forEach((t, i) => {
    const name = fold(`${t.name} ${t.nameEs}`)
    const keys = t.keywords.map(fold)
    const summary = fold(t.summaryEs)
    let score = 0
    for (const w of words) {
      const inName = name.split(' ').some((x) => x.startsWith(w)) ? 100 : name.includes(w) ? 70 : 0
      const inKeys = keys.some((k) => k === w || k.split(' ').some((x) => x.startsWith(w))) ? 40 : keys.some((k) => k.includes(w)) ? 30 : 0
      const inSummary = summary.includes(w) ? 10 : 0
      const best = Math.max(inName, inKeys, inSummary)
      if (!best) return
      score += best
    }
    // Toda la búsqueda seguida dentro del nombre: aún más arriba («present perfect» antes que «present simple»).
    if (words.length > 1 && name.includes(words.join(' '))) score += 50
    scored.push({ t, score, i })
  })
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t)
}

// ---------------------------------------------------------------------------
// Ejercicios

/**
 * Id numérico estable de un ejercicio para su tarjeta del Repaso (`cards.sourceId`; el índice único es
 * `[source+sourceId]` y `sourceId` es numérico). FNV-1a de 32 bits del id de texto: no depende del orden de archivos ni
 * temas, así que añadir contenido nunca cambia el número de una tarjeta ya creada. Es la MISMA función que
 * scripts/validate-grammar.mjs (que comprueba que no hay colisiones en el catálogo); tests/grammar.test.mjs lo vigila.
 */
export function exerciseCardId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1
}

const GAP = /_{3,}/g
const QUESTION_START = /^(do|does|did|is|are|was|were|have|has|had|can|could|should|will|would|may|might|must|what|where|when|who|whose|why|how|which)\b/i

/** Número de huecos (____) de un enunciado. */
export const gapCount = (prompt: string) => (prompt.match(GAP) ?? []).length

/** Texto comparable de una respuesta escrita: minúsculas, apóstrofos rectos, sin espacios dobles ni punto final. */
export function normAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/, '')
    .trim()
}

/** ¿Es correcta la respuesta? choice: índice; gap: un texto por hueco; order: las palabras en el orden elegido. */
export function checkExercise(ex: GrammarExercise, value: number | string[]): boolean {
  if (ex.type === 'choice') return value === ex.answer
  if (!Array.isArray(value)) return false
  if (ex.type === 'gap') {
    const given = value.map(normAnswer).join(' / ')
    return ex.answers.some((a) => a.split(' / ').map(normAnswer).join(' / ') === given)
  }
  return normAnswer(value.join(' ')) === normAnswer(ex.answer)
}

/** Primera respuesta válida de un hueco, por partes (para enseñarla al fallar). */
export const gapParts = (ex: GapExercise) => ex.answers[0].split(' / ')

/**
 * Frase completa y correcta del ejercicio (para leerla en voz alta y para la tarjeta del Repaso): el enunciado con
 * los huecos rellenos y sin las pistas entre paréntesis («How long ____ you ____ (learn) English?» → «How long have you
 * been learning English?»). Un «choice» sin hueco (p. ej. «¿Cuál es correcta?») da la opción correcta.
 */
export function fullSentence(ex: GrammarExercise): string {
  // «order» va sin punto final (FORMATO): se le pone «?» si empieza como una pregunta, para que la voz entone bien.
  if (ex.type === 'order') return /[.!?]$/.test(ex.answer) ? ex.answer : ex.answer + (QUESTION_START.test(ex.answer) ? '?' : '.')
  const parts = ex.type === 'choice' ? [ex.options[ex.answer]] : gapParts(ex)
  if (!gapCount(ex.prompt)) return ex.type === 'choice' ? ex.options[ex.answer] : ex.prompt
  // Con un solo texto y dos huecos (opción «Have / run»), se reparte por « / ».
  const fill = parts.length === 1 && gapCount(ex.prompt) > 1 ? parts[0].split(' / ') : parts
  let k = 0
  return ex.prompt
    .replace(/_{3,}(\s*\([^)]*\))?/g, () => fill[Math.min(k++, fill.length - 1)] ?? '')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/** Enunciado que se enseña en la tarjeta del Repaso (se dice la frase completa en inglés). */
export function cardPrompt(ex: GrammarExercise): string {
  if (ex.type === 'order') return ex.words.join(' · ')
  return ex.prompt
}

// ---------------------------------------------------------------------------
// Progreso: criterio de «dominado» y «Para ti»

/**
 * Criterio de «dominado» (v5.10, decisión de dev documentada en NC-v5.10): una ronda es hacer TODOS los ejercicios
 * del tema una vez; cuenta el primer intento de cada uno. Dominado = al menos el 80 % bien en la última ronda completa
 * (con 6 ejercicios, 5 de 6; con 8, 7 de 8). Una ronda peor lo quita: así «dominado» dice cómo estás ahora.
 */
export const MASTERY_RATIO = 0.8
export const isMasteryRound = (correct: number, total: number) => total > 0 && correct / total >= MASTERY_RATIO - 1e-9

export type TopicStatus = 'new' | 'seen' | 'mastered'

/** Progreso mínimo que necesitan las funciones puras (la fila de Dexie tiene más campos). */
export interface TopicProgressLike {
  mastered?: boolean
  seenAt?: number
}

export function topicStatus(p: TopicProgressLike | undefined): TopicStatus {
  return p?.mastered ? 'mastered' : p?.seenAt ? 'seen' : 'new'
}

const levelIdx = (l: string) => Math.max(0, GRAMMAR_LEVELS.indexOf(l.slice(0, 2).toUpperCase() as GrammarLevel))

/** Señales para «Para ti» (D3): tus errores recientes de clase y el tema de la lección del plan de hoy. */
export interface ForYouSignals {
  mistakes?: { grammarTopic?: string; grammarTopics?: string[]; category?: string }[]
  planTopic?: string | null
}

// Categorías demasiado generales para recomendar un tema por sí solas.
const VAGUE: readonly string[] = ['grammar', 'vocabulary', 'other']

/**
 * «Para ti»: temas que aún no dominas, ordenados por lo que más te conviene repasar.
 * - Cada error de clase con ese tema exacto (`grammarTopic`, lo marca el profe desde la 5.10) suma 3.
 * - Errores sin tema (clases antiguas): su categoría (`tense`, `article`…) suma 0,5 a los temas de esa categoría de tu
 *   nivel o inferiores, hasta 2 (respaldo, menos preciso).
 * - El tema de la lección del plan de hoy suma 5.
 * - Tu nivel suma 1 y el siguiente 0,5 (así, sin errores ni plan, quedan los de tu nivel; es lo de la D1).
 * A igualdad, los empezados antes que los nuevos y el orden del catálogo.
 */
export function forYouTopics(level: string, progress: Record<string, TopicProgressLike>, limit = 6, signals: ForYouSignals = {}): GrammarTopic[] {
  const mine = levelIdx(level || 'A2')
  const exact = new Map<string, number>()
  const cats = new Map<string, number>()
  for (const m of signals.mistakes ?? []) {
    const ids = topicIdsOf(m).filter((id) => catalog.topicById.has(id))
    if (ids.length) for (const id of ids) exact.set(id, (exact.get(id) ?? 0) + 1)
    else if (m.category && !VAGUE.includes(m.category)) cats.set(m.category, (cats.get(m.category) ?? 0) + 1)
  }
  return catalog.topics
    .map((t, i) => {
      const d = levelIdx(t.level) - mine
      const byCat = d <= 0 ? Math.min(2, 0.5 * t.categories.reduce((n, c) => n + (cats.get(c) ?? 0), 0)) : 0
      const score = 3 * (exact.get(t.id) ?? 0) + byCat + (signals.planTopic === t.id ? 5 : 0) + (d === 0 ? 1 : d === 1 ? 0.5 : 0)
      return { t, i, score, p: progress[t.id] }
    })
    .filter((x) => x.score > 0 && !x.p?.mastered)
    .sort((a, b) => b.score - a.score || Number(!!b.p?.seenAt) - Number(!!a.p?.seenAt) || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t)
}

// ---------------------------------------------------------------------------
// Barajar las opciones (v5.10, punto 0 de D2)

/** Generador pseudoaleatorio con semilla (mulberry32): la misma semilla da siempre el mismo orden. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Opciones de un «choice» barajadas: en el JSON la correcta suele ir en la misma posición (la 0). El orden depende del
 * ejercicio y de la semilla de la ronda: estable mientras dura la ronda (al volver a pintar no cambia) y distinto en
 * la siguiente. Devuelve las opciones, sus trampas y el nuevo índice de la correcta.
 */
export function shuffleChoice(ex: ChoiceExercise, seed: number): { options: string[]; trapsEs: string[]; answer: number } {
  const rnd = seeded(exerciseCardId(ex.id) ^ Math.imul(seed | 0, 0x9e3779b1))
  const order = ex.options.map((_, k) => k)
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1))
    ;[order[k], order[j]] = [order[j], order[k]]
  }
  return { options: order.map((k) => ex.options[k]), trapsEs: order.map((k) => ex.trapsEs[k] ?? ''), answer: order.indexOf(ex.answer) }
}

// ---------------------------------------------------------------------------
// Enlaces con la clase, el plan y el profe (D3)

/** Frases con las que un texto (foco de una lección, título…) puede nombrar un tema. */
function topicPhrases(t: GrammarTopic): string[] {
  const base = [t.name, t.name.split(':')[0], t.name.replace(/\([^)]*\)/g, ''), t.nameEs, t.nameEs.split(':')[0], t.nameEs.replace(/\([^)]*\)/g, '')]
  const keys = t.keywords.filter((k) => k.trim().includes(' '))
  return [...new Set([...base, ...keys].map(fold).filter((p) => p.length >= 8))]
}

/**
 * Tema que nombra un texto (lección del plan: foco de la semana, objetivo y título). Gana la frase más larga que
 * aparezca entera; si dos temas empatan, no hay coincidencia clara y no se enlaza nada.
 */
export function topicForText(text: string): GrammarTopic | undefined {
  const hay = ` ${fold(text)} `
  let best: GrammarTopic | undefined
  let bestLen = 0
  let tie = false
  for (const t of catalog.topics) {
    const len = Math.max(0, ...topicPhrases(t).filter((p) => hay.includes(` ${p} `)).map((p) => p.length))
    if (!len) continue
    if (len > bestLen) {
      best = t
      bestLen = len
      tie = false
    } else if (len === bestLen) tie = true
  }
  return tie ? undefined : best
}

/** Lista compacta de ids para el profe (corrección → tema): solo los ids, separados por comas. */
export const topicIdsForPrompt = () => allTopicIds().join(',')

/** Tema válido devuelto por Gemini (o undefined): nunca se guarda un id inventado. */
export const validTopicId = (id: unknown): string | undefined => (typeof id === 'string' && catalog.topicById.has(id.trim()) ? id.trim() : undefined)

/**
 * Instrucciones para el profe en una clase centrada en un tema («Practicar en una clase»).
 * v5.10 (P3, uso real): antes pedía «una conversación real, no un ejercicio» y la clase acababa en preguntas libres.
 * Ahora es una clase DIRIGIDA a la regla: explica brevemente, pide traducir («¿cómo dirías…?»), completar o corregir
 * frases, transformar (afirmativa → negativa → pregunta) y solo después preguntas abiertas que obliguen a usarla.
 */
export function grammarBrief(t: GrammarTopic): string {
  const forms = (['affirmative', 'negative', 'question'] as const)
    .map((k) => (t.forms[k] ? `${k}: ${t.forms[k]!.pattern} (e.g. "${t.forms[k]!.examples[0]?.en ?? ''}")` : ''))
    .filter(Boolean)
    .join('; ')
  const traps = t.commonMistakes
    .slice(0, 4)
    .map((m) => `"${m.wrong}" → "${m.right}"`)
    .join('; ')
  const examples = t.examples
    .slice(0, 4)
    .map((e) => `"${e.en}" (${e.es})`)
    .join('; ')
  return `GRAMMAR LESSON on "${t.name}" (level ${t.level}). This session is a focused grammar class: it OVERRIDES the "chatting with a friend" style. Every turn must practise THIS rule; never drift to free conversation about other things.
Goal: ${t.classFocusEn}
Rule summary for you (the student already read the explanation in Spanish): ${t.summaryEs}
Forms (patterns written in Spanish for the student): ${forms}.
Model sentences: ${examples}.
Typical mistakes of Spanish speakers to target: ${traps || '(none listed)'}.

How to teach (vary the activity every 1–2 turns, one task per turn, short and clear):
1. Start: in 1–2 short sentences, remind the key rule with one example, then give the FIRST task.
2. Tasks to rotate: (a) "How would you say in English: «…»?" (give a short Spanish sentence that needs the rule); (b) "What's missing in this sentence? …" or "Complete: …" (a sentence with a gap); (c) "Is this correct? «…»" (one of the typical mistakes); (d) "Now say it in the negative / as a question"; (e) only after several correct answers, a short personal question that forces the structure (e.g. "Tell me two things you … yesterday").
3. After each answer: say clearly if the structure was right or wrong; if wrong, explain WHY with the rule in one short sentence (you may add a few Spanish words for the key point) and give the correct sentence, then a similar new task. If right, praise briefly and make the next task a bit harder.
4. Corrections: the "corrections" list must still contain EVERY real error in the answer (word order, extra or missing words, wrong verb, mixed-up sentences…), exactly as in a normal class, not only the ones about THIS rule; put the errors about this rule first. The lesson thread stays on THIS rule: do not switch the next task to the other mistakes.
5. Never call an answer "correct", "perfect" or "spot on" if it has any error. If the student gives two versions (e.g. "Maybe can I swim or I can swim"), say which one is right and why the other is wrong, and correct the wrong one too. If the answer is confused or mixed up, say so kindly and give the clean sentence before the next task.
Keep each reply short (it is read aloud). Always end with the next task or question.`
}

/**
 * Tema de una lección del plan (D3): primero por su objetivo, luego por el foco de la semana y por último por el
 * título. Si nada lo nombra con claridad, ninguno (mejor sin enlace que con uno equivocado).
 */
export function topicForLesson(week: { focusEn: string }, lesson: { targetEn: string; titleEs: string }): GrammarTopic | undefined {
  for (const text of [lesson.targetEn, week.focusEn, lesson.titleEs]) {
    const t = text ? topicForText(text) : undefined
    if (t) return t
  }
  return undefined
}

/**
 * Ids de tema de una corrección o error. v5.10 (P5, uso real): una corrección puede tocar varios temas
 * (`grammarTopics`, p. ej. «in my breakfast» → «for breakfast»: preposiciones de tiempo y for/since/during/ago);
 * las guardadas antes solo tienen `grammarTopic`.
 */
export function topicIdsOf(c: { grammarTopic?: string; grammarTopics?: string[] }): string[] {
  const ids = c.grammarTopics?.length ? c.grammarTopics : c.grammarTopic ? [c.grammarTopic] : []
  return [...new Set(ids)]
}

/** Temas de Gramática de unas correcciones (informe de la clase, una corrección), en orden de aparición y sin repetir. */
export function topicsOfCorrections(cs: { grammarTopic?: string; grammarTopics?: string[] }[]): GrammarTopic[] {
  const out: GrammarTopic[] = []
  for (const c of cs) {
    for (const id of topicIdsOf(c)) {
      const t = findTopic(id)
      if (t && !out.includes(t)) out.push(t)
    }
  }
  return out
}
