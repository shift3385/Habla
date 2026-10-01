import { db, type Session } from './db'

export interface Dashboard {
  streak: number
  practicedToday: boolean
  minutesToday: number // minutos hablando (tu voz), no de sesión
  lastHomework: { text: string; date: number } | null
  history: Session[] // sesiones con métricas, de más antigua a más reciente (máx. 20)
  totalSessions: number
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export async function loadDashboard(): Promise<Dashboard> {
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const done = sessions.filter((s) => s.metrics && s.metrics.turns > 0)

  const days = new Set(done.map((s) => dayKey(s.startedAt)))
  const today = new Date()
  const practicedToday = days.has(dayKey(today.getTime()))
  // La racha cuenta hasta hoy, o hasta ayer si hoy aún no has practicado.
  const cursor = new Date(today)
  if (!practicedToday) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const todayKey = dayKey(today.getTime())
  const secondsToday = done
    .filter((s) => dayKey(s.startedAt) === todayKey)
    .reduce((a, s) => a + (s.metrics?.speechSeconds ?? 0), 0)

  const withHomework = [...done].reverse().find((s) => s.report?.homeworkEs)
  return {
    streak,
    practicedToday,
    minutesToday: Math.round((secondsToday / 60) * 10) / 10,
    lastHomework: withHomework ? { text: withHomework.report!.homeworkEs, date: withHomework.startedAt } : null,
    history: done.slice(-20),
    totalSessions: done.length,
  }
}

/** Borra sesiones vacías (abiertas y cerradas sin que hablaras). */
export async function deleteSessionIfEmpty(sessionId: number): Promise<boolean> {
  const userTurns = await db.turns.where('sessionId').equals(sessionId).filter((t) => t.role === 'user').count()
  if (userTurns > 0) return false
  await db.turns.where('sessionId').equals(sessionId).delete()
  await db.sessions.delete(sessionId)
  return true
}
