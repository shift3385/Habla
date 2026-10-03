import { db, type Profile, type Session, type Skill } from './db'

// Niveles MCER y reglas de evolución. El usuario no puede editar su nivel: lo fija el test.
// Las clases NO cambian el nivel: proponen una trayectoria. Solo el re-test (cada 4 semanas) ajusta el nivel,
// ponderando el resultado del test (70 %) con esa trayectoria (30 %).

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

export const RETEST_DAYS = 28

export function levelIdx(l: string): number {
  const i = LEVELS.indexOf(l.replace('+', '') as Level)
  return i < 0 ? 2 : i
}

export function levelAt(i: number): Level {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.round(i)))]
}

// ---------------------------------------------------------------------------
// Nivel general: las cuatro destrezas pesan lo mismo, con tope por destreza débil.

export interface OverallBreakdown {
  /** Niveles como número: A1 = 1 … C2 = 6. */
  values: Record<Skill, number>
  mean: number // (G + L + A + H) / 4
  rounded: number // al entero más cercano; un ,5 exacto hacia abajo, para no sobrevalorar
  cap: number // destreza más baja + 2
  final: Level
  capped: boolean
}

export function overallBreakdown(l: Record<Skill, string>): OverallBreakdown {
  const values = {
    grammar: levelIdx(l.grammar) + 1,
    reading: levelIdx(l.reading) + 1,
    listening: levelIdx(l.listening) + 1,
    speaking: levelIdx(l.speaking) + 1,
  }
  const v = Object.values(values)
  const mean = v.reduce((a, b) => a + b, 0) / 4
  const rounded = mean % 1 === 0.5 ? Math.floor(mean) : Math.round(mean)
  const cap = Math.min(...v) + 2
  return { values, mean, rounded, cap, final: levelAt(Math.min(rounded, cap) - 1), capped: cap < rounded }
}

/** N = (G + L + A + H) / 4, redondeado (,5 hacia abajo) y sin superar en más de 2 a la destreza más baja. */
export function overallFrom(levels: Record<Skill, string>): Level {
  return overallBreakdown(levels).final
}

// ---------------------------------------------------------------------------
// Re-test: 70 % test + 30 % trayectoria.

export const TEST_WEIGHT = 0.7

/** Nivel ponderado de una destreza (un ,5 exacto hacia abajo). `value` va en la escala 1–6. */
export function weightedLevel(test: string, trajectory: string): { level: Level; value: number } {
  const value = TEST_WEIGHT * levelIdx(test) + (1 - TEST_WEIGHT) * levelIdx(trajectory)
  const r = Math.abs((value % 1) - 0.5) < 1e-9 ? Math.floor(value) : Math.round(value)
  return { level: levelAt(r), value: Math.round((value + 1) * 100) / 100 }
}

/**
 * Trayectoria de cada destreza: lo que proponen las clases desde el último test. El habla se mide en cada clase;
 * para el resto, la trayectoria es el nivel con el que empezaste el periodo (las clases no las miden por separado).
 */
export function trajectoryOf(p: Profile): Record<Skill, Level> {
  const cur = (k: Skill) => levelAt(levelIdx(p.levels[k]))
  return {
    grammar: cur('grammar'),
    reading: cur('reading'),
    listening: cur('listening'),
    speaking: p.trajectory?.speaking ? levelAt(levelIdx(p.trajectory.speaking)) : cur('speaking'),
  }
}

/** Velocidad de voz del profe recomendada para un nivel. */
export function rateForLevel(l: string): number {
  return [0.8, 0.85, 0.95, 1, 1.05, 1.1][levelIdx(l)]
}

export function nextRetestAt(p: Profile): number | null {
  return p.calibratedAt ? p.calibratedAt + RETEST_DAYS * 86400000 : null
}

export interface TrajectoryChange {
  skill: Skill
  level: Level // nivel actual (no cambia)
  from: Level // propuesta anterior
  to: Level // nueva propuesta
  sessions: number
}

/**
 * Propuesta de la práctica: tras cada clase se mira la nota de fluidez media de las últimas 5 clases habladas
 * desde el último test. Si apunta a otro nivel de habla, la trayectoria propone un escalón arriba o abajo.
 * El nivel NO cambia: la propuesta pesa un 30 % en el próximo re-test. Devuelve el cambio de propuesta o null.
 */
export async function updateTrajectoryFromPractice(): Promise<TrajectoryChange | null> {
  const p = await db.profile.get('me')
  if (!p?.calibratedAt) return null
  const recent = (await db.sessions.where('startedAt').above(p.calibratedAt).toArray())
    .filter((s: Session) => s.metrics && (s.metrics.spokenTurns ?? s.metrics.turns) >= 3) // el habla sale de lo hablado
    .slice(-5)
  if (recent.length < 5) return null

  const avg = recent.reduce((a, s) => a + s.metrics!.score, 0) / recent.length
  // Nota de fluidez → nivel de habla aproximado.
  const practiceIdx = avg < 25 ? 1 : avg < 45 ? 2 : avg < 65 ? 3 : avg < 82 ? 4 : 5
  const cur = levelIdx(p.levels.speaking)
  let next = cur
  if (practiceIdx > cur) next = cur + 1
  else if (practiceIdx < cur - 1) next = cur - 1

  const level = levelAt(cur)
  const from = p.trajectory?.speaking ? levelAt(levelIdx(p.trajectory.speaking)) : level
  const to = levelAt(next)
  await db.profile.put({ ...p, trajectory: { speaking: to, date: Date.now(), sessions: recent.length } })
  return from !== to ? { skill: 'speaking', level, from, to, sessions: recent.length } : null
}
