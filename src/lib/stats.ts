import { db, type Session } from './db'

export interface Dashboard {
  streak: number
  practicedToday: boolean
  minutesToday: number // minutos hablando (tu voz), no de sesión
  lastHomework: { text: string; date: number } | null
  history: Session[] // sesiones con métricas, de más antigua a más reciente (máx. 20)
  totalSessions: number
  /** 5.11 (M-04): día de descanso (comodín) usado esta semana dentro de la racha, como `dayKey`. */
  restDay?: string
  /** 5.11 (M-04): ayer fue el día de descanso: la mascota lo cuenta («Ayer descansaste; tu racha sigue a salvo»). */
  restedYesterday?: boolean
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Lunes de la semana natural (lunes–domingo) del día, como `dayKey`. */
const weekKey = (d: Date) => dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime())

export interface StreakResult {
  streak: number
  /** Días de descanso (comodines) dentro de la racha, del más reciente al más antiguo. */
  restDays: string[]
}

/**
 * 5.11 (M-04, P-04 de A5): racha con comodín. Un día sin práctica por semana natural (lunes–domingo) no la rompe, pero
 * ese día no suma. Dos días sin práctica en la misma semana, o dos seguidos (aunque caigan en semanas distintas), la
 * rompen. Hoy sin practicar se trata como hasta ahora: la racha cuenta hasta ayer.
 * Sin días de descanso da exactamente lo mismo que la 5.10.1 (test `m1-streak`).
 */
export function computeStreak(days: Set<string>, now: Date): StreakResult {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  const restDays: string[] = []
  const restWeeks = new Set<string>()
  for (;;) {
    const k = dayKey(cursor.getTime())
    if (days.has(k)) {
      streak++
    } else {
      // Comodín: solo si la semana aún no lo usó y el día anterior sí practicaste (si no, son dos seguidos).
      const before = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
      const week = weekKey(cursor)
      if (restWeeks.has(week) || !days.has(dayKey(before.getTime()))) break
      restWeeks.add(week)
      restDays.push(k)
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return { streak, restDays }
}

/**
 * 5.11 (M-04, REV-11-D1-03): de los comodines de la racha, el de ESTA semana (lunes–domingo) y si fue ayer (lo que cuenta
 * la mascota). Puro, para probarlo sin Dexie.
 */
export function restInfo(restDays: string[], today: Date): { restDay?: string; restedYesterday: boolean } {
  const thisWeek = weekKey(today)
  const restDay = restDays.find((k) => {
    const [y, m, d] = k.split('-').map(Number)
    return weekKey(new Date(y, m - 1, d)) === thisWeek
  })
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  return { ...(restDay ? { restDay } : {}), restedYesterday: restDays.includes(dayKey(yesterday.getTime())) }
}

// v5.9: lo que hablas FUERA de una clase (el repaso de frases) también cuenta para la meta diaria y la racha.
// Segundos por día en localStorage (solo los últimos 60 días): es un contador, no un historial.
const PRACTICE_KEY = 'habla.practiceSeconds'
function practiceByDay(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(PRACTICE_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
/** Suma segundos hablados hoy fuera de una clase (repaso). */
export function addPracticeSeconds(seconds: number) {
  if (!(seconds > 0)) return
  const all = practiceByDay()
  const k = dayKey(Date.now())
  all[k] = (all[k] ?? 0) + seconds
  const keep = Date.now() - 60 * 864e5
  for (const key of Object.keys(all)) {
    const [y, m, d] = key.split('-').map(Number)
    if (new Date(y, m - 1, d).getTime() < keep) delete all[key]
  }
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(all))
  } catch {
    // sin almacenamiento: solo se pierde el contador del repaso
  }
}

/** Al importar una copia: los minutos del repaso eran de los datos de antes. */
export function resetPracticeSeconds() {
  try {
    localStorage.removeItem(PRACTICE_KEY)
  } catch {
    // sin almacenamiento: nada que borrar
  }
}

/**
 * Segundos hablados HOY en clase, por la hora de cada respuesta (no por el día en que empezó la clase).
 * AUD-E2E-603 (v5.9): cuenta también la clase a medias, y una clase guardada ayer que sigues o terminas hoy suma hoy.
 * Mismo criterio que `sessionMetrics`: solo respuestas habladas.
 */
async function classSecondsToday(start: number): Promise<number> {
  const turns = await db.turns.where('createdAt').aboveOrEqual(start).toArray()
  return turns.filter((t) => t.role === 'user' && !t.typed).reduce((a, t) => a + (t.speechSeconds ?? t.audioSeconds ?? 0), 0)
}

export async function loadDashboard(): Promise<Dashboard> {
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const done = sessions.filter((s) => s.metrics && s.metrics.turns > 0)

  const practice = practiceByDay()
  // MOV-5 (revisión móvil 5.9): también cuenta un día en el que solo hablaste en una clase que quedó a medias (mismo
  // criterio que los minutos de hoy, AUD-E2E-603). Antes, la racha se rompía si no terminabas la clase.
  const spoken = await db.turns.where('createdAt').aboveOrEqual(Date.now() - 60 * 864e5).toArray()
  const days = new Set([
    ...done.map((s) => dayKey(s.startedAt)),
    ...Object.keys(practice).filter((k) => practice[k] > 0),
    ...spoken.filter((t) => t.role === 'user' && !t.typed).map((t) => dayKey(t.createdAt)),
  ])
  const today = new Date()
  const todayKey = dayKey(today.getTime())
  const secondsToday = (await classSecondsToday(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())) + (practice[todayKey] ?? 0)
  if (secondsToday > 0) days.add(todayKey)
  const practicedToday = days.has(dayKey(today.getTime()))
  // La racha cuenta hasta hoy, o hasta ayer si hoy aún no has practicado. 5.11 (M-04): con un comodín por semana.
  const { streak, restDays } = computeStreak(days, today)
  const { restDay, restedYesterday } = restInfo(restDays, today)

  const withHomework = [...done].reverse().find((s) => s.report?.homeworkEs)
  return {
    streak,
    practicedToday,
    minutesToday: Math.round((secondsToday / 60) * 10) / 10,
    lastHomework: withHomework ? { text: withHomework.report!.homeworkEs, date: withHomework.startedAt } : null,
    history: done.slice(-20),
    totalSessions: done.length,
    restDay,
    restedYesterday,
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
  const practice = practiceByDay()
  for (let d = 0; d < 7; d++) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d)
    days[d] += (practice[dayKey(day.getTime())] ?? 0) / 60
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
  // Primero las palabras que guardaste al consultarlas.
  const saved = (await db.lookups.orderBy('createdAt').reverse().toArray()).filter((l) => l.saved)
  saved.forEach((l) => add(l.result.headword, l.result.translation))
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
