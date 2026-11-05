// 5.13 (P-14): el reto de la semana. Cada semana (lunes–domingo) un reto sacado de tus errores, con una barra
// «4 de 8» que se mide en el teléfono, sin IA. La IA (modelo rápido, una llamada a la semana) solo elige el tipo, la
// cifra y los textos; la app comprueba el tipo, recorta la cifra a un rango razonable y, si algo falla o no hay clave,
// pone un reto de respaldo local. Nada de esto cambia el nivel (CLAUDE.md, regla 6).
import { db, turnCorrections, type ChallengeKind, type MistakeCategory, type Session, type SrsCard, type Turn, type WeeklyChallenge } from './db'
import { countWords } from './fluency'
import { askGemini, withRetry, type JsonSchema, type Models } from './gemini'
import { oneLine } from './missions'
import { getScenario } from './scenarios'
import { minutesBetween, weekKey } from './stats'

export const CHALLENGE_KINDS: readonly ChallengeKind[] = ['minutes', 'classes', 'clean', 'review']

/** Rango de la cifra de cada tipo (la de la IA se recorta aquí). */
export const TARGET_RANGE: Record<ChallengeKind, readonly [number, number]> = {
  minutes: [10, 300],
  classes: [2, 12],
  clean: [3, 30],
  review: [5, 120],
}

/** `classes`: respuestas mínimas para que una clase cuente (como una lección del plan). */
export const CLASS_MIN_TURNS = 3
/** `clean`: palabras mínimas de una respuesta «larga». */
export const CLEAN_MIN_WORDS = 10
/** Prácticas que puede pedir un reto `classes` (las visibles del Inicio, menos «Sorpréndeme» y «Tema libre»). */
export const CHALLENGE_PRACTICES = ['mission', 'story', 'debate', 'interview', 'client', 'weak'] as const

/** Categorías que puede pedir un reto `clean`, con su nombre para el alumno («sin fallar …»). */
export const CATEGORY_ES: Partial<Record<MistakeCategory, string>> = {
  article: 'los artículos (a, an, the)',
  uncountable: 'los incontables (advice, information…)',
  auxiliary: 'los verbos auxiliares (am, is, was…)',
  false_friend: 'los falsos amigos',
  tense: 'los tiempos verbales',
  preposition: 'las preposiciones (in, on, at…)',
  word_order: 'el orden de las palabras',
  vocabulary: 'el vocabulario',
  grammar: 'la gramática básica (-s, concordancia)',
}
const CLEAN_CATEGORIES = Object.keys(CATEGORY_ES) as MistakeCategory[]

const isKind = (v: unknown): v is ChallengeKind => typeof v === 'string' && (CHALLENGE_KINDS as readonly string[]).includes(v)
export const isCleanCategory = (v: unknown): v is MistakeCategory => typeof v === 'string' && (CLEAN_CATEGORIES as string[]).includes(v)

/** La cifra, entera y dentro del rango del tipo (lo que no sea número, el mínimo). */
export function clampTarget(kind: ChallengeKind, n: unknown): number {
  const [lo, hi] = TARGET_RANGE[kind]
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : lo
  return Math.min(hi, Math.max(lo, v))
}

// ---------------------------------------------------------------------------
// Semanas

/** Lunes 00:00 y el lunes siguiente (ms) de la semana del día. */
export function weekBounds(now: Date): { start: number; end: number } {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return { start: monday.getTime(), end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7).getTime() }
}

/** Límites de la semana de una clave `weekKey` («2026-11-2»). */
export function boundsOfKey(key: string): { start: number; end: number } {
  const [y, m, d] = key.split('-').map(Number)
  return weekBounds(new Date(y, m - 1, d))
}

/** «del 2 al 8 de noviembre» (para el historial). */
export function weekLabel(key: string): string {
  const { start, end } = boundsOfKey(key)
  const last = new Date(end - 864e5 / 2)
  const first = new Date(start)
  const month = (d: Date) => d.toLocaleDateString('es', { month: 'long' })
  return first.getMonth() === last.getMonth()
    ? `del ${first.getDate()} al ${last.getDate()} de ${month(last)}`
    : `del ${first.getDate()} de ${month(first)} al ${last.getDate()} de ${month(last)}`
}

// ---------------------------------------------------------------------------
// Textos

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** La meta en español, hecha por la app (siempre coincide con lo que se mide). */
export function localGoal(c: Pick<WeeklyChallenge, 'kind' | 'target' | 'category' | 'scenario'>): string {
  const n = c.target
  switch (c.kind) {
    case 'minutes':
      return `Habla ${n} ${plural(n, 'minuto', 'minutos')} en inglés esta semana.`
    case 'classes': {
      const p = c.scenario ? ` de «${getScenario(c.scenario).title}»` : ''
      return `Termina ${n} ${plural(n, 'clase', 'clases')}${p} de al menos ${CLASS_MIN_TURNS} respuestas.`
    }
    case 'clean':
      return `Di ${n} ${plural(n, 'respuesta larga', 'respuestas largas')} (de ${CLEAN_MIN_WORDS} palabras o más) sin fallar ${CATEGORY_ES[c.category!] ?? 'ese punto'}.`
    case 'review':
      return `Repasa ${n} ${plural(n, 'frase', 'frases')} en el Repaso.`
  }
}

/** Título corto hecho por la app (si la IA no da uno). */
export function localTitle(c: Pick<WeeklyChallenge, 'kind' | 'category'>): string {
  switch (c.kind) {
    case 'minutes':
      return 'Semana de charla'
    case 'classes':
      return 'Semana de clases'
    case 'clean':
      return `Sin fallar ${(CATEGORY_ES[c.category!] ?? 'ese punto').replace(/ \(.*\)$/, '')}`
    case 'review':
      return 'Semana de repaso'
  }
}

/** Unidad de la barra («4 de 8 min», «4 de 8 respuestas»…). */
export function unitOf(c: Pick<WeeklyChallenge, 'kind' | 'target'>): string {
  const n = c.target
  return c.kind === 'minutes' ? 'min' : c.kind === 'classes' ? plural(n, 'clase', 'clases') : c.kind === 'clean' ? plural(n, 'respuesta', 'respuestas') : plural(n, 'frase', 'frases')
}

// ---------------------------------------------------------------------------
// Progreso (puro: se prueba sin Dexie)

export interface WeekData {
  start: number
  end: number
  /** Minutos hablando en la semana (stats.ts › minutesBetween). */
  minutes?: number
  sessions?: Session[]
  turns?: Turn[]
  cards?: SrsCard[]
}

const inWeek = (t: number | null | undefined, d: WeekData) => typeof t === 'number' && t >= d.start && t < d.end

/** Cuánto llevas del reto con tus datos de la semana. Sin IA. */
export function challengeProgress(c: Pick<WeeklyChallenge, 'kind' | 'category' | 'scenario'>, d: WeekData): number {
  switch (c.kind) {
    case 'minutes':
      return Math.floor(d.minutes ?? 0)
    case 'classes':
      // Clases terminadas (con métricas) en la semana, por cuándo acabaron.
      return (d.sessions ?? []).filter(
        (s) => (s.metrics?.turns ?? 0) >= CLASS_MIN_TURNS && inWeek(s.endedAt ?? s.startedAt, d) && (!c.scenario || s.scenario === c.scenario),
      ).length
    case 'clean':
      // Respuestas HABLADAS largas sin ninguna corrección de esa categoría (las de otras categorías no importan).
      return (d.turns ?? []).filter(
        (t) =>
          t.role === 'user' &&
          !t.typed &&
          inWeek(t.createdAt, d) &&
          countWords(t.text) >= CLEAN_MIN_WORDS &&
          !turnCorrections(t).some((x) => x.category === c.category),
      ).length
    case 'review':
      // Frases distintas repasadas en la semana (la misma dos veces cuenta una).
      return (d.cards ?? []).filter((k) => inWeek(k.fsrs?.last_review, d)).length
  }
}

/** Lee de la base de datos solo lo que necesita ese tipo de reto. */
export async function loadWeekData(c: Pick<WeeklyChallenge, 'kind' | 'id'>): Promise<WeekData> {
  const b = boundsOfKey(c.id)
  switch (c.kind) {
    case 'minutes':
      return { ...b, minutes: await minutesBetween(b.start, b.end) }
    case 'classes':
      // Una clase de la semana pudo empezar el domingo anterior: margen de un día.
      return { ...b, sessions: await db.sessions.where('startedAt').aboveOrEqual(b.start - 864e5).toArray() }
    case 'clean':
      return { ...b, turns: await db.turns.where('createdAt').between(b.start, b.end, true, false).toArray() }
    case 'review':
      return { ...b, cards: await db.cards.toArray() }
  }
}

// ---------------------------------------------------------------------------
// Reto de respaldo (sin IA)

export interface ChallengeContext {
  level: string
  dailyGoal: number
  /** Tus categorías de error más frecuentes últimamente (solo las que puede pedir `clean`), de más a menos. */
  topCategories: MistakeCategory[]
  /** Estructuras que más fallas (plan.ts › frequentStructures), para el prompt. */
  frequent: string[]
  /** El reto de la semana pasada, si lo hubo. */
  last?: Pick<WeeklyChallenge, 'kind' | 'target' | 'category' | 'progress' | 'doneAt'>
}

/**
 * Sin IA: el tipo `clean` con tu categoría de error más frecuente (8 respuestas), o `minutes` con tu meta diaria × 5 si
 * aún no tienes errores.
 */
export function fallbackChallenge(id: string, ctx: Pick<ChallengeContext, 'dailyGoal' | 'topCategories'>, now = Date.now()): WeeklyChallenge {
  const category = ctx.topCategories.find(isCleanCategory)
  const base = category
    ? { kind: 'clean' as const, target: clampTarget('clean', 8), category }
    : { kind: 'minutes' as const, target: clampTarget('minutes', ctx.dailyGoal * 5) }
  return { id, ...base, titleEs: localTitle(base), goalEs: localGoal(base), createdAt: now, source: 'local' }
}

// ---------------------------------------------------------------------------
// Reto con IA (modelo rápido)

export const CHALLENGE_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title_es', 'goal_es', 'kind', 'target', 'category', 'practice'],
  properties: {
    title_es: { type: 'string' },
    goal_es: { type: 'string' },
    kind: { type: 'string', enum: [...CHALLENGE_KINDS] },
    target: { type: 'integer' },
    category: { type: 'string', enum: [...CLEAN_CATEGORIES, 'none'] },
    practice: { type: 'string', enum: ['any', ...CHALLENGE_PRACTICES] },
  },
}

export interface RawChallenge {
  title_es?: unknown
  goal_es?: unknown
  kind?: unknown
  target?: unknown
  category?: unknown
  practice?: unknown
}

/**
 * El reto de la IA, comprobado: tipo conocido (si no, el de respaldo), cifra recortada, categoría válida para `clean`
 * (si no, tu más frecuente; sin ninguna, el de respaldo) y práctica conocida para `classes`. La meta de la IA solo se
 * queda si dice la misma cifra que se va a medir; si no, la escribe la app.
 */
export function parseChallenge(raw: RawChallenge, base: WeeklyChallenge, topCategories: readonly MistakeCategory[] = []): WeeklyChallenge {
  if (!isKind(raw.kind)) return base
  const kind = raw.kind
  const target = clampTarget(kind, raw.target)
  let category: MistakeCategory | undefined
  if (kind === 'clean') {
    category = isCleanCategory(raw.category) ? raw.category : topCategories.find(isCleanCategory)
    if (!category) return base
  }
  const scenario = kind === 'classes' && typeof raw.practice === 'string' && (CHALLENGE_PRACTICES as readonly string[]).includes(raw.practice) ? raw.practice : undefined
  const c = { kind, target, ...(category ? { category } : {}), ...(scenario ? { scenario } : {}) }
  const goal = oneLine(raw.goal_es, 140)
  const sameNumber = new RegExp(`(^|\\D)${target}(\\D|$)`).test(goal)
  return {
    id: base.id,
    ...c,
    titleEs: oneLine(raw.title_es, 48) || localTitle(c),
    goalEs: goal && sameNumber ? goal : localGoal(c),
    createdAt: base.createdAt,
    source: 'ai',
  }
}

/** Prepara el reto con el modelo rápido. Nunca falla: sin IA, el de respaldo. */
export async function generateChallenge(apiKey: string, models: Models, ctx: ChallengeContext, base: WeeklyChallenge): Promise<WeeklyChallenge> {
  const ranges = CHALLENGE_KINDS.map((k) => `${k} ${TARGET_RANGE[k][0]}-${TARGET_RANGE[k][1]}`).join(', ')
  const last = ctx.last
    ? `Last week's challenge: ${describeLast(ctx.last)}. Choose a DIFFERENT kind or category this week.`
    : 'This is their first weekly challenge: make it easy to achieve.'
  const task = `Choose this week's speaking challenge for a Spanish-speaking adult learning English (speaking level ${ctx.level}; daily goal ${ctx.dailyGoal} minutes).
Structures they often get wrong in class: ${ctx.frequent.length ? ctx.frequent.join('; ') : 'not enough data yet'}.
${last}
The app measures the challenge itself, so it MUST be one of these kinds:
- "minutes": minutes speaking English this week.
- "classes": classes finished with at least ${CLASS_MIN_TURNS} answers (optionally of one practice: "practice").
- "clean": spoken answers of ${CLEAN_MIN_WORDS}+ words with NO mistakes of one "category" (pick one they often get wrong).
- "review": phrases reviewed in the spaced-repetition review.
Return JSON:
- kind, target (a whole number; ranges: ${ranges}; achievable in one week with about 5 days of practice), category ("none" unless kind is "clean"), practice ("any" unless kind is "classes").
- title_es: a short motivating title in Spanish (max 6 words).
- goal_es: the goal in one short Spanish sentence addressed as "tú", with the exact target number.`
  try {
    const raw = await withRetry(models, (model) =>
      askGemini<RawChallenge>(apiKey, model, {
        system: 'You are an encouraging English coach who sets small, concrete weekly challenges.',
        contents: [{ role: 'user', parts: [{ text: task }] }],
        schema: CHALLENGE_SCHEMA,
      }),
    )
    return parseChallenge(raw ?? {}, base, ctx.topCategories)
  } catch {
    return base
  }
}

function describeLast(c: NonNullable<ChallengeContext['last']>): string {
  const what = c.kind === 'clean' ? `clean (${c.category})` : c.kind
  const result = c.doneAt ? 'achieved' : typeof c.progress === 'number' ? `reached ${c.progress} of ${c.target}` : 'unknown result'
  return `${what}, target ${c.target}, ${result}`
}

// ---------------------------------------------------------------------------
// Con Dexie

/** Tus categorías de error más frecuentes (los 40 errores más recientes), solo las que puede pedir `clean`. */
export async function topCategories(): Promise<MistakeCategory[]> {
  const recent = await db.mistakes.orderBy('createdAt').reverse().limit(40).toArray()
  const counts = new Map<MistakeCategory, number>()
  for (const m of recent) if (isCleanCategory(m.category)) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
}

export interface ChallengeSource {
  apiKey: string
  /** El modelo rápido (settings.ts › fastModels). */
  models: Models
  dailyGoal: number
  level: string
  /** Estructuras que más fallas (plan.ts › frequentStructures); se pasa para no cargar el plan aquí. */
  frequent: () => Promise<string[]>
}

let pending: { id: string; p: Promise<WeeklyChallenge> } | null = null

/**
 * El reto de esta semana: el guardado o, la primera vez que se abre el Inicio en la semana, uno nuevo (con IA si hay
 * clave; si no o si falla, el de respaldo). Dos llamadas a la vez comparten la misma generación.
 */
export function ensureWeekChallenge(src: ChallengeSource, now = new Date()): Promise<WeeklyChallenge> {
  const id = weekKey(now)
  if (pending?.id === id) return pending.p
  const p = (async () => {
    const have = await db.challenges.get(id)
    if (have) return have
    await closePastWeeks(now)
    const prev = (await challengeHistory()).find((c) => c.id !== id)
    const tops = await topCategories()
    const ctx: ChallengeContext = {
      level: src.level,
      dailyGoal: src.dailyGoal,
      topCategories: tops,
      frequent: await src.frequent().catch(() => []),
      last: prev,
    }
    const base = fallbackChallenge(id, ctx, now.getTime())
    const ch = src.apiKey.trim() ? await generateChallenge(src.apiKey, { ...src.models, timeoutMs: 25000 }, ctx, base) : base
    // Si mientras tanto se guardó otro (otra pantalla), gana el guardado.
    return db.transaction('rw', db.challenges, async () => (await db.challenges.get(id)) ?? (await db.challenges.put(ch), ch))
  })()
  pending = { id, p }
  p.catch(() => {
    if (pending?.p === p) pending = null
  })
  return p
}

/** Reto de esta semana si ya existe (sin crearlo). */
export const currentChallenge = (now = new Date()) => db.challenges.get(weekKey(now))

export interface ChallengeStatus {
  challenge: WeeklyChallenge
  progress: number
  done: boolean
}

/** Mide el reto, guarda lo medido y, si se acaba de cumplir, la fecha (para celebrarlo). */
export async function measureChallenge(c: WeeklyChallenge, now = Date.now()): Promise<ChallengeStatus> {
  const progress = challengeProgress(c, await loadWeekData(c))
  const done = progress >= c.target
  const patch: Partial<WeeklyChallenge> = {}
  if (c.progress !== progress) patch.progress = progress
  if (done && !c.doneAt) patch.doneAt = now
  if (Object.keys(patch).length) await db.challenges.update(c.id, patch)
  return { challenge: { ...c, ...patch }, progress, done: done || !!c.doneAt }
}

/** Cierra las semanas pasadas: mide su resultado final una vez (para el historial). */
export async function closePastWeeks(now = new Date()): Promise<void> {
  const id = weekKey(now)
  const open = (await db.challenges.toArray()).filter((c) => c.id !== id && !c.final && boundsOfKey(c.id).end <= now.getTime())
  for (const c of open) {
    const progress = challengeProgress(c, await loadWeekData(c))
    await db.challenges.update(c.id, { progress, final: true, ...(progress >= c.target && !c.doneAt ? { doneAt: now.getTime() } : {}) })
  }
}

/**
 * El historial, de la semana más reciente a la más antigua. Se ordena por la fecha del lunes, no por la clave: como
 * texto, «2026-11-2» va detrás de «2026-11-16».
 */
export async function challengeHistory(): Promise<WeeklyChallenge[]> {
  return sortWeeks(await db.challenges.toArray())
}

/** De la semana más reciente a la más antigua (puro). */
export const sortWeeks = <T extends { id: string }>(all: readonly T[]): T[] => [...all].sort((a, b) => boundsOfKey(b.id).start - boundsOfKey(a.id).start)

/** El primer reto cumplido sin celebrar (el más reciente). */
export function nextChallengeToCelebrate(all: readonly WeeklyChallenge[]): WeeklyChallenge | undefined {
  return all.filter((c) => c.doneAt && !c.celebratedAt).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))[0]
}

export const markChallengeCelebrated = (id: string, now = Date.now()) => db.challenges.update(id, { celebratedAt: now })

/** Día de la semana en que se cumplió («el jueves»), para la celebración y el historial. */
export const doneDay = (ts: number) => new Date(ts).toLocaleDateString('es', { weekday: 'long' })
