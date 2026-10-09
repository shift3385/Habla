import { db, type GrammarProgress } from './db'
import { cardPrompt, exerciseCardId, fullSentence, isMasteryRound, topicForLesson, type ForYouSignals, type GrammarExercise, type GrammarTopic } from './grammar'
import { todayLesson } from './plan'
import { addGrammarCard } from './srs'

// v5.10: progreso de Gramática en la tabla `grammar` de Dexie (visto, aciertos, rondas, dominado, último uso).
// Entra en las copias de seguridad como tabla opcional (backupCheck.ts).

const empty = (id: string, now: number): GrammarProgress => ({ id, lastAt: now, correct: 0, attempts: 0, rounds: 0, mastered: false })

/** Todo el progreso, por id de tema. */
export async function loadGrammarProgress(): Promise<Record<string, GrammarProgress>> {
  const out: Record<string, GrammarProgress> = {}
  for (const p of await db.grammar.toArray()) out[p.id] = p
  return out
}

export const topicProgress = (id: string) => db.grammar.get(id)

/** Abriste el tema: pasa a «visto» (la primera vez) y se apunta el último uso. */
export async function markTopicSeen(id: string): Promise<GrammarProgress> {
  const now = Date.now()
  return db.transaction('rw', db.grammar, async () => {
    const p = (await db.grammar.get(id)) ?? empty(id, now)
    const next = { ...p, seenAt: p.seenAt ?? now, lastAt: now }
    await db.grammar.put(next)
    return next
  })
}

/**
 * Primer intento de un ejercicio: suma al acumulado y, si fallaste, crea su tarjeta del Repaso (una por ejercicio).
 * Devuelve true si se creó una tarjeta nueva.
 */
export async function recordAnswer(topic: GrammarTopic, ex: GrammarExercise, correct: boolean): Promise<boolean> {
  const now = Date.now()
  await db.transaction('rw', db.grammar, async () => {
    const p = (await db.grammar.get(topic.id)) ?? empty(topic.id, now)
    await db.grammar.put({ ...p, seenAt: p.seenAt ?? now, lastAt: now, attempts: p.attempts + 1, correct: p.correct + (correct ? 1 : 0) })
  })
  if (correct) return false
  return addGrammarCard(exerciseCardId(ex.id), cardPrompt(ex), fullSentence(ex), `${topic.nameEs}: ${ex.whyEs}`).catch(() => false)
}

/** Ronda completa (todos los ejercicios del tema): decide «dominado» con la última ronda (≥ 80 %). */
export async function finishRound(topicId: string, correct: number, total: number): Promise<GrammarProgress> {
  const now = Date.now()
  return db.transaction('rw', db.grammar, async () => {
    const p = (await db.grammar.get(topicId)) ?? empty(topicId, now)
    const mastered = isMasteryRound(correct, total)
    const next: GrammarProgress = {
      ...p,
      seenAt: p.seenAt ?? now,
      lastAt: now,
      rounds: (p.rounds ?? 0) + 1,
      lastRound: { correct, total, at: now },
      mastered,
      masteredAt: mastered ? (p.mastered ? p.masteredAt : now) : undefined,
    }
    await db.grammar.put(next)
    return next
  })
}

/** v5.10 (D2): un intento evaluado de «Dilo tú» (cuenta como uso del tema; no decide «dominado», que es de los ejercicios). */
export async function recordSpeaking(topicId: string, correct: boolean): Promise<GrammarProgress> {
  const now = Date.now()
  return db.transaction('rw', db.grammar, async () => {
    const p = (await db.grammar.get(topicId)) ?? empty(topicId, now)
    const next = { ...p, seenAt: p.seenAt ?? now, lastAt: now, spoken: (p.spoken ?? 0) + 1, spokenOk: (p.spokenOk ?? 0) + (correct ? 1 : 0) }
    await db.grammar.put(next)
    return next
  })
}

/**
 * v5.10 (D3): señales de «Para ti»: tus errores de clase de los últimos 60 días (con su tema o su categoría) y el tema de
 * la lección del plan de hoy.
 */
export async function loadForYouSignals(): Promise<ForYouSignals> {
  const since = Date.now() - 60 * 864e5
  const [mistakes, profile] = await Promise.all([
    db.mistakes.where('createdAt').above(since).reverse().limit(200).toArray(),
    db.profile.get('me'),
  ])
  const today = profile?.plan ? todayLesson(profile.plan) : null
  const planTopic = today?.lesson ? (topicForLesson(today.week, today.lesson)?.id ?? null) : null
  return { mistakes: mistakes.map((m) => ({ grammarTopic: m.grammarTopic, category: m.category })), planTopic }
}
