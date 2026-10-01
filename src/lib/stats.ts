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

/** Minutos hablando de lunes a domingo de la semana actual. */
export async function weekMinutes(): Promise<number[]> {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const sessions = await db.sessions.where('startedAt').aboveOrEqual(monday.getTime()).toArray()
  const days = new Array(7).fill(0)
  for (const s of sessions) {
    if (!s.metrics) continue
    const d = (new Date(s.startedAt).getDay() + 6) % 7
    days[d] += s.metrics.speechSeconds / 60
  }
  return days.map((m) => Math.round(m * 10) / 10)
}

export interface ErrorSummary {
  original: string
  corrected: string
  explanationEs: string
  count: number
  last: number
}

/** Tus errores agrupados (misma corrección = mismo error), los más repetidos primero. */
export async function errorSummary(): Promise<ErrorSummary[]> {
  const all = await db.mistakes.toArray()
  const map = new Map<string, ErrorSummary>()
  for (const m of all) {
    const key = `${m.original.toLowerCase().trim()}|${m.corrected.toLowerCase().trim()}`
    const e = map.get(key)
    if (e) {
      e.count++
      e.last = Math.max(e.last, m.createdAt)
    } else {
      map.set(key, { original: m.original, corrected: m.corrected, explanationEs: m.explanationEs, count: 1, last: m.createdAt })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last - a.last)
}

/** Vocabulario visto en tus clases (palabras de los temas y frases del día), sin repetir. */
export async function wordsCollected(): Promise<{ en: string; es: string }[]> {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray()
  const seen = new Set<string>()
  const out: { en: string; es: string }[] = []
  const add = (en: string, es: string) => {
    const k = en.toLowerCase().trim()
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push({ en, es })
  }
  for (const s of sessions) {
    if (!s.metrics?.turns) continue
    s.topic?.vocab.forEach((v) => add(v.en, v.es))
    if (s.report?.phrase.en) add(s.report.phrase.en, s.report.phrase.es)
  }
  return out
}

/** Borra sesiones vacías (abiertas y cerradas sin que hablaras). */
export async function deleteSessionIfEmpty(sessionId: number): Promise<boolean> {
  const userTurns = await db.turns.where('sessionId').equals(sessionId).filter((t) => t.role === 'user').count()
  if (userTurns > 0) return false
  await db.turns.where('sessionId').equals(sessionId).delete()
  await db.sessions.delete(sessionId)
  return true
}
