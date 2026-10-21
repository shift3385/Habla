/**
 * 5.11 (M-03, P-03 de A5 / R-10): hitos con celebración de la mascota y «Tus logros» en Progreso.
 *
 * Los hitos se DERIVAN del estado que ya hay en Dexie (racha, repasos, Gramática, Sonidos, clases, plan): ninguna
 * pantalla tiene que «avisar» de nada. Al volver al Inicio, `MilestoneGate` llama a `syncMilestones()`, que guarda en la
 * tabla `milestones` (S-01) los hitos conseguidos que aún no estaban (id + fecha). Es idempotente: un hito se guarda una
 * sola vez (`add` falla si ya existe), así que nunca se celebra dos veces, ni tras recargar ni tras restaurar una copia
 * que ya lo traía. Política de niveles intacta: los hitos solo MUESTRAN, no tocan el nivel. Sin IA.
 */
import { db, type GrammarProgress, type Milestone, type Session, type SoundProgress, type SrsCard } from './db'
import type { MascotElement } from '../ui/Mascot'

/** Lo que miran los hitos (se calcula en `loadMilestoneState`; en los tests se pasa a mano). */
export interface MilestoneState {
  /** Racha actual en días (stats.ts, con el comodín de M-04). */
  streak: number
  /** Repasos hechos en total (suma de `fsrs.reps` de todas las tarjetas, también las archivadas). */
  reviews: number
  /** Temas de Gramática dominados. */
  grammarMastered: number
  /** Sonidos dominados (tabla `sounds`, filas de sonido, no de lección). */
  soundsMastered: number
  /** Clases terminadas de más de 5 minutos. */
  longClasses: number
  /** Lecciones hechas en la semana del plan más completa (5 = semana completa). */
  bestPlanWeek: number
}

export const EMPTY_STATE: MilestoneState = { streak: 0, reviews: 0, grammarMastered: 0, soundsMastered: 0, longClasses: 0, bestPlanWeek: 0 }

export type MilestoneId =
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'streak-30'
  | 'reviews-10'
  | 'reviews-50'
  | 'reviews-100'
  | 'grammar-first'
  | 'sound-first'
  | 'class-5min'
  | 'plan-week'

export interface MilestoneDef {
  id: MilestoneId
  emoji: string
  /** Título corto (lista de logros y celebración). */
  title: string
  need: number
  have: (s: MilestoneState) => number
  /** «Te faltan N …» para los que aún no tienes. */
  left: (n: number) => string
}

const faltan = (n: number, one: string, many: string) => (n === 1 ? `Te falta 1 ${one}` : `Te faltan ${n} ${many}`)
const streak = (n: number): MilestoneDef => ({
  id: `streak-${n}` as MilestoneId,
  emoji: '🔥',
  title: n === 7 ? 'Una semana seguida' : n === 14 ? 'Dos semanas seguidas' : `${n} días seguidos`,
  need: n,
  have: (s) => s.streak,
  left: (k) => faltan(k, 'día seguido', 'días seguidos'),
})
const reviews = (n: number): MilestoneDef => ({
  id: `reviews-${n}` as MilestoneId,
  emoji: '🔁',
  title: `${n} repasos`,
  need: n,
  have: (s) => s.reviews,
  left: (k) => faltan(k, 'repaso', 'repasos'),
})

/** Todos los hitos, en el orden en que se enseñan en «Tus logros». */
export const MILESTONES: readonly MilestoneDef[] = [
  streak(3),
  streak(7),
  streak(14),
  streak(30),
  reviews(10),
  reviews(50),
  reviews(100),
  {
    id: 'class-5min',
    emoji: '⏱️',
    title: 'Tu primera clase de más de 5 minutos',
    need: 1,
    have: (s) => s.longClasses,
    left: () => 'Te falta 1 clase de más de 5 minutos',
  },
  {
    id: 'grammar-first',
    emoji: '📘',
    title: 'Tu primer tema de Gramática dominado',
    need: 1,
    have: (s) => s.grammarMastered,
    left: () => 'Te falta 1 tema de Gramática dominado',
  },
  {
    id: 'sound-first',
    emoji: '🔊',
    title: 'Tu primer sonido dominado',
    need: 1,
    have: (s) => s.soundsMastered,
    left: () => 'Te falta 1 sonido dominado',
  },
  {
    id: 'plan-week',
    emoji: '🗓️',
    title: 'Primera semana del plan completa',
    need: 5,
    have: (s) => s.bestPlanWeek,
    left: (k) => faltan(k, 'lección en una semana del plan', 'lecciones en una semana del plan'),
  },
]

export const milestoneDef = (id: string) => MILESTONES.find((m) => m.id === id)

/** Ids de los hitos que el estado ya cumple. */
export function reachedIds(s: MilestoneState): MilestoneId[] {
  return MILESTONES.filter((m) => m.have(s) >= m.need).map((m) => m.id)
}

/** Hitos cumplidos que aún no están guardados (los que hay que añadir). */
export function newMilestones(s: MilestoneState, saved: Iterable<string>): MilestoneId[] {
  const have = new Set(saved)
  return reachedIds(s).filter((id) => !have.has(id))
}

/** Una fila de «Tus logros»: conseguido (con fecha) o en gris con «Te faltan N». */
export interface MilestoneRow {
  def: MilestoneDef
  at?: number
  left?: string
}

export function milestoneRows(s: MilestoneState, saved: readonly Milestone[]): MilestoneRow[] {
  const at = new Map(saved.map((m) => [m.id, m.at]))
  return MILESTONES.map((def) => {
    if (at.has(def.id)) return { def, at: at.get(def.id) }
    // (Uno cumplido y aún sin guardar no llega aquí: «Tus logros» sincroniza antes. Por si acaso, nunca «Te faltan 0».)
    const n = Math.max(1, def.need - Math.max(0, def.have(s)))
    return { def, left: def.left(n) }
  })
}

/** El siguiente hito por celebrar (el más antiguo sin `celebratedAt`), uno por vez. */
export function nextToCelebrate(saved: readonly Milestone[]): Milestone | undefined {
  return saved
    .filter((m) => !m.celebratedAt && milestoneDef(m.id))
    .sort((a, b) => a.at - b.at || MILESTONES.findIndex((d) => d.id === a.id) - MILESTONES.findIndex((d) => d.id === b.id))[0]
}

// ---------------------------------------------------------------------------
// Guardar (idempotente)

/** Lo mínimo que hace falta de la tabla (Dexie en la app; un mapa en los tests). */
export interface MilestoneStore {
  all(): Promise<Milestone[]>
  /** Añade SOLO si no existe (si existe, no cambia nada). */
  addIfMissing(m: Milestone): Promise<void>
  markCelebrated(id: string, at: number): Promise<void>
}

/**
 * 5.11 (REV-11-D2-01): marca de la PRIMERA vez que la 5.11 miró los hitos, guardada en la propia tabla `milestones`
 * (fila `_since`; viaja en las copias como cualquier otra). Sirve para decidir el «backfill» una sola vez.
 */
export const SINCE_ID = '_since'

/**
 * ¿Se guardan sin celebrar los hitos de esta sincronización? Solo en la PRIMERA mirada (sin marca) con la tabla vacía y
 * actividad de hace > 2 días: alguien que ya usaba la app al actualizar a la 5.11, o una copia antigua (sin la tabla)
 * recién restaurada (la restauración borra la marca, así que vuelve a ser «primera mirada»). Un alumno nuevo pone la marca
 * el primer día; su primer hito, aunque llegue al tercer día o más tarde, ya se celebra.
 */
export function isBackfill(rows: readonly Milestone[], oldestActivity: number | undefined, now: number): boolean {
  if (rows.some((m) => m.id === SINCE_ID)) return false
  return rows.length === 0 && oldestActivity != null && oldestActivity < now - 2 * 864e5
}

/** Las filas sin la marca. */
const real = (rows: readonly Milestone[]) => rows.filter((m) => m.id !== SINCE_ID)

/**
 * Guarda los hitos nuevos y, la primera vez, la marca. En un «backfill» (`isBackfill`) se guardan ya «celebrados» (sin
 * mascota): sin esto, al actualizar saldrían de golpe todas las celebraciones de lo que hizo antes. Devuelve los hitos
 * guardados (sin la marca).
 */
export async function syncWith(store: MilestoneStore, s: MilestoneState, now: number, oldestActivity?: number): Promise<Milestone[]> {
  const rows = await store.all()
  const quiet = isBackfill(rows, oldestActivity, now)
  if (!rows.some((m) => m.id === SINCE_ID)) await store.addIfMissing({ id: SINCE_ID, at: now, celebratedAt: now })
  const saved = real(rows)
  const fresh = newMilestones(
    s,
    saved.map((m) => m.id),
  )
  for (const id of fresh) await store.addIfMissing({ id, at: now, ...(quiet ? { celebratedAt: now } : {}) })
  return fresh.length ? real(await store.all()) : saved
}

const dexieStore: MilestoneStore = {
  all: () => db.milestones.toArray(),
  addIfMissing: async (m) => {
    try {
      await db.milestones.add(m)
    } catch {
      // ya existía (otra pestaña o una sincronización a la vez): no se toca, así no se celebra dos veces
    }
  },
  markCelebrated: async (id, at) => {
    await db.milestones.update(id, { celebratedAt: at })
  },
}

/** Lo que se lee de Dexie para calcular el estado (REV-11-D2-02: `stateFrom` es pura y tiene test). */
export interface MilestoneSources {
  streak: number
  cards: readonly Pick<SrsCard, 'createdAt' | 'fsrs'>[]
  grammar: readonly Pick<GrammarProgress, 'mastered'>[]
  sounds: readonly Pick<SoundProgress, 'kind' | 'mastered'>[]
  sessions: readonly Pick<Session, 'startedAt' | 'endedAt' | 'metrics'>[]
  /** Lecciones hechas en cada semana del plan (vacío sin plan). */
  planWeeks: readonly number[]
}

/** Estado de los hitos a partir de los datos (sin Dexie). */
export function stateFrom(src: MilestoneSources): { state: MilestoneState; oldestActivity?: number } {
  // Clase «de más de 5 minutos»: terminada, con ≥ 3 respuestas (abrirla y dejarla 5 min no cuenta).
  const longClasses = src.sessions.filter((x) => x.metrics && x.metrics.turns >= 3 && x.endedAt && x.endedAt - x.startedAt > 5 * 60_000).length
  const oldest = Math.min(...src.sessions.map((x) => x.startedAt), ...src.cards.map((c) => c.createdAt))
  return {
    state: {
      streak: src.streak,
      reviews: src.cards.reduce((a, c) => a + (c.fsrs?.reps ?? 0), 0),
      grammarMastered: src.grammar.filter((g) => g.mastered).length,
      // Solo filas de sonido: las de lección (`kind: 'lesson'`) no son «sonidos dominados».
      soundsMastered: src.sounds.filter((x) => x.kind !== 'lesson' && x.mastered).length,
      longClasses,
      bestPlanWeek: Math.max(0, ...src.planWeeks),
    },
    oldestActivity: Number.isFinite(oldest) ? oldest : undefined,
  }
}

/** Estado actual desde Dexie. */
export async function loadMilestoneState(): Promise<{ state: MilestoneState; oldestActivity?: number }> {
  // Import perezoso: stats.ts y plan.ts arrastran más módulos y solo hacen falta aquí.
  const [{ loadDashboard }, { getPlan, weekDone, PLAN_WEEKS }] = await Promise.all([import('./stats'), import('./plan')])
  const [dash, cards, grammar, sounds, sessions, plan] = await Promise.all([
    loadDashboard(),
    db.cards.toArray(),
    db.grammar.toArray(),
    db.sounds.toArray(),
    db.sessions.toArray(),
    getPlan().catch(() => null),
  ])
  const planWeeks = plan ? Array.from({ length: PLAN_WEEKS }, (_, i) => weekDone(plan, i + 1)) : []
  return stateFrom({ streak: dash.streak, cards, grammar, sounds, sessions, planWeeks })
}

/** Mira el estado y guarda los hitos nuevos. Devuelve el estado y todos los hitos guardados. */
export async function syncMilestones(now = Date.now()): Promise<{ state: MilestoneState; saved: Milestone[] }> {
  const { state, oldestActivity } = await loadMilestoneState()
  const saved = await syncWith(dexieStore, state, now, oldestActivity)
  return { state, saved }
}

/** «Seguir»: ya celebrado (no vuelve a salir). */
export const markCelebrated = (id: string, now = Date.now()) => dexieStore.markCelebrated(id, now)

/**
 * «Tus logros» (Progreso). También sincroniza, para que un hito recién cumplido salga ya con su fecha; la mascota lo
 * celebra la próxima vez que vuelvas al Inicio (queda sin `celebratedAt`).
 */
export async function loadMilestones(now = Date.now()): Promise<MilestoneRow[]> {
  const { state, saved } = await syncMilestones(now)
  return milestoneRows(state, saved)
}

// ---------------------------------------------------------------------------
// Lo que dice cada mascota (personalidad de theme.ts › THEME_INFO): Chispa (fuego, enérgica, le encantan los retos),
// Musgo (tierra, tranquilo y paciente), Gota (agua, curiosa y juguetona) y Brisa (aire, ligera y soñadora).

const SAYS: Record<MilestoneId, Record<MascotElement, string>> = {
  'streak-3': {
    flame: '¡Tres días seguidos! Esto ya está prendido: ¿vamos por la semana?',
    terra: 'Tres días seguidos. Paso a paso, como crecen las raíces.',
    aqua: '¡Tres días seguidos! Ya vas tomando la corriente.',
    aero: 'Tres días seguidos… Ya se siente como una brisa constante.',
  },
  'streak-7': {
    flame: '¡Una semana entera sin parar! Eso es puro fuego.',
    terra: 'Siete días seguidos. Sin prisa y sin pausa: así se aprende de verdad.',
    aqua: '¡Una semana seguida! Fluyes con el inglés todos los días.',
    aero: 'Una semana seguida. Estás volando cada vez más alto.',
  },
  'streak-14': {
    flame: '¡Dos semanas seguidas! Ningún reto te asusta.',
    terra: 'Catorce días. Lo que se riega todos los días, florece.',
    aqua: '¡Dos semanas seguidas! Ya eres como un río que no se detiene.',
    aero: 'Dos semanas seguidas… ¡Ya ni se ven las nubes de abajo!',
  },
  'streak-30': {
    flame: '¡Treinta días seguidos! Eres una llama que no se apaga.',
    terra: 'Un mes entero. Esto ya es un árbol con raíces firmes.',
    aqua: '¡Un mes seguido! Hasta el mar te tiene envidia.',
    aero: 'Treinta días seguidos. Llegaste más arriba de lo que soñabas.',
  },
  'reviews-10': {
    flame: '¡Tus primeros 10 repasos! Cada frase repasada es un golpe a tus errores.',
    terra: 'Diez repasos. Volver a lo aprendido es lo que lo hace tuyo.',
    aqua: '¡10 repasos! Las frases ya empiezan a salir solitas.',
    aero: 'Diez repasos. Las frases flotan en tu memoria cada vez más ligeras.',
  },
  'reviews-50': {
    flame: '¡50 repasos! Tus errores ya te tienen miedo.',
    terra: 'Cincuenta repasos. Con calma, todo va quedando en su lugar.',
    aqua: '¡50 repasos! ¿Te diste cuenta de que ya fallas menos?',
    aero: 'Cincuenta repasos… Tu inglés se siente más ligero.',
  },
  'reviews-100': {
    flame: '¡CIEN repasos! Eso es entrenar como campeón.',
    terra: 'Cien repasos. Esto es constancia de la buena.',
    aqua: '¡100 repasos! Eres una máquina de frases bien dichas.',
    aero: 'Cien repasos. ¡Esto merece una voltereta en el aire!',
  },
  'class-5min': {
    flame: '¡Más de 5 minutos hablando sin rendirte! ¿La próxima, más larga?',
    terra: 'Tu primera clase de más de 5 minutos. Tomaste tu tiempo, y valió la pena.',
    aqua: '¡Más de 5 minutos de charla! Me encantó todo lo que contaste.',
    aero: 'Más de 5 minutos conversando… El tiempo se fue volando, ¿verdad?',
  },
  'grammar-first': {
    flame: '¡Dominaste tu primer tema de Gramática! ¿Cuál es el siguiente reto?',
    terra: 'Tu primer tema de Gramática dominado. Bien plantado, ya no se mueve.',
    aqua: '¡Primer tema de Gramática dominado! ¿Viste cómo encaja todo?',
    aero: 'Tu primer tema de Gramática dominado. Una regla menos que te pese.',
  },
  'sound-first': {
    flame: '¡Tu primer sonido dominado! Ahora suena con fuerza.',
    terra: 'Tu primer sonido dominado. Lo practicaste con paciencia, y se nota.',
    aqua: '¡Primer sonido dominado! Suena clarito, como el agua.',
    aero: 'Tu primer sonido dominado. Suena ligero y natural.',
  },
  'plan-week': {
    flame: '¡Completaste una semana entera del plan! Vamos por la siguiente.',
    terra: 'Una semana del plan completa. Así, semana a semana, se llega lejos.',
    aqua: '¡Semana del plan completa! ¿Qué nos traerá la próxima?',
    aero: 'Una semana del plan completa. Ya se ve el horizonte.',
  },
}

/** Frase de la mascota para un hito (con su personalidad). */
export function milestoneSays(id: string, element: MascotElement): string {
  return SAYS[id as MilestoneId]?.[element] ?? '¡Lo lograste!'
}

/** Para los tests: todas las frases. */
export const MILESTONE_SAYS = SAYS
