import { db, type LevelEvent, type Profile, type Session, type Skill } from './db'

// Niveles MCER y reglas de evolución. El usuario no puede editar su nivel:
// lo fija el test de calibración y luego cambia con la práctica y los re-tests.

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

/** Nivel global: media ponderada de las cuatro habilidades (habla cuenta doble). */
export function overallFrom(levels: Record<Skill, string>): Level {
  // Habla es el objetivo de la app: cuenta doble y el nivel global nunca supera al de habla en más de un nivel
  // (antes, leer y escuchar muy bien daban un C1 global a alguien que habla en B1).
  const speaking = levelIdx(levels.speaking)
  const avg = (levelIdx(levels.grammar) + levelIdx(levels.reading) + levelIdx(levels.listening) + 2 * speaking) / 5
  return levelAt(Math.min(avg, speaking + 1))
}

/** Velocidad de voz del profe recomendada para un nivel. */
export function rateForLevel(l: string): number {
  return [0.8, 0.85, 0.95, 1, 1.05, 1.1][levelIdx(l)]
}

export function nextRetestAt(p: Profile): number | null {
  return p.calibratedAt ? p.calibratedAt + RETEST_DAYS * 86400000 : null
}

/**
 * Ajuste por la práctica: tras cada sesión se mira la media de la nota de fluidez de las últimas 5 sesiones
 * (desde el último test). Si apunta a otro nivel de habla, se sube o baja UN escalón, como mucho una vez
 * por semana. Devuelve el cambio aplicado (para avisar al usuario) o null.
 */
export async function updateLevelsFromPractice(): Promise<LevelEvent | null> {
  const p = await db.profile.get('me')
  if (!p?.calibratedAt) return null
  const recent = (await db.sessions.where('startedAt').above(p.calibratedAt).toArray())
    .filter((s: Session) => s.metrics && (s.metrics.spokenTurns ?? s.metrics.turns) >= 3) // el nivel de habla sale de lo hablado
    .slice(-5)
  if (recent.length < 5) return null

  const lastChange = (p.levelEvents ?? []).filter((e) => e.skill === 'speaking').at(-1)
  if (lastChange && Date.now() - lastChange.date < 7 * 86400000) return null

  const avg = recent.reduce((a, s) => a + s.metrics!.score, 0) / recent.length
  // Nota de fluidez → nivel de habla aproximado.
  const practiceIdx = avg < 25 ? 1 : avg < 45 ? 2 : avg < 65 ? 3 : avg < 82 ? 4 : 5
  const cur = levelIdx(p.levels.speaking)
  let next = cur
  if (practiceIdx > cur) next = cur + 1
  else if (practiceIdx < cur - 1) next = cur - 1
  if (next === cur) return null

  const from = p.levels.speaking
  const to = levelAt(next)
  const levels = { ...p.levels, speaking: to }
  levels.overall = overallFrom(levels)
  const event: LevelEvent = { date: Date.now(), skill: 'speaking', from, to, reason: 'practice' }
  await db.profile.put({ ...p, levels, levelEvents: [...(p.levelEvents ?? []), event] })
  return event
}
