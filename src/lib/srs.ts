import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { db, type SrsCard, type StoredFsrs } from './db'
import { askGemini, withRetry, type JsonSchema, type Models } from './gemini'

// Cuaderno de errores con repetición espaciada (FSRS): tus correcciones y palabras guardadas
// vuelven como ejercicio oral (frase en español → la dices en inglés).

const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 })

export const NEW_PER_SESSION = 10

function toStored(c: Card): StoredFsrs {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
  }
}

function toInput(s: StoredFsrs) {
  return { ...s, last_review: s.last_review ?? undefined }
}

/** Crea tarjetas para las correcciones y palabras guardadas que aún no tengan (idempotente). */
export async function syncCards(): Promise<number> {
  const existing = await db.cards.toArray()
  const keys = new Set(existing.map((c) => `${c.source}:${c.sourceId}`))
  // Una misma corrección repetida da una sola tarjeta.
  const answers = new Set(existing.map((c) => c.answerEn.toLowerCase().trim()))
  const now = Date.now()
  const fresh: SrsCard[] = []
  const add = (source: SrsCard['source'], sourceId: number, promptEs: string, answerEn: string, hintEs: string) => {
    const k = `${source}:${sourceId}`
    const a = answerEn.toLowerCase().trim()
    if (!promptEs.trim() || !answerEn.trim() || keys.has(k) || answers.has(a)) return
    keys.add(k)
    answers.add(a)
    const f = toStored(createEmptyCard(new Date(now)))
    fresh.push({ source, sourceId, promptEs: promptEs.trim(), answerEn: answerEn.trim(), hintEs, createdAt: now, due: f.due, fsrs: f })
  }

  for (const m of await db.mistakes.orderBy('createdAt').toArray()) {
    if (m.id) add('mistake', m.id, m.spanish, m.corrected, m.explanationEs)
  }
  for (const l of await db.lookups.toArray()) {
    if (l.saved && l.id) add('lookup', l.id, l.result.exampleEs, l.result.exampleEn, `${l.result.headword}: ${l.result.translation}`)
  }
  if (fresh.length) await db.cards.bulkAdd(fresh)
  return fresh.length
}

/**
 * v5.10: un ejercicio de Gramática fallado pasa al Repaso. La tarjeta enseña el enunciado (con su hueco o las palabras
 * desordenadas) y se responde diciendo la frase completa en inglés. `sourceId` es el id numérico estable del ejercicio
 * (grammar.ts, `exerciseCardId`) y respeta el índice único `[source+sourceId]`: fallar otra vez el mismo ejercicio no
 * duplica la tarjeta (si estaba archivada con «Ya me la sé», se queda archivada). Devuelve true si la creó.
 */
export async function addGrammarCard(sourceId: number, promptEs: string, answerEn: string, hintEs: string): Promise<boolean> {
  if (!promptEs.trim() || !answerEn.trim()) return false
  const exists = await db.cards.where('[source+sourceId]').equals(['grammar', sourceId]).count()
  if (exists) return false
  const now = Date.now()
  const f = toStored(createEmptyCard(new Date(now)))
  try {
    await db.cards.add({ source: 'grammar', sourceId, promptEs: promptEs.trim(), answerEn: answerEn.trim(), hintEs, createdAt: now, due: f.due, fsrs: f })
    return true
  } catch {
    return false // dos fallos casi a la vez: el índice único rechaza el segundo
  }
}

export interface DueSummary {
  review: number // tarjetas ya vistas que tocan hoy
  fresh: number // nuevas disponibles (máx. NEW_PER_SESSION)
  total: number
}

export async function dueSummary(): Promise<DueSummary> {
  const now = Date.now()
  const all = (await db.cards.toArray()).filter((c) => !c.archivedAt)
  const review = all.filter((c) => c.fsrs.state !== State.New && c.due <= now).length
  const fresh = Math.min(NEW_PER_SESSION, all.filter((c) => c.fsrs.state === State.New).length)
  return { review, fresh, total: review + fresh }
}

/** Cola de la sesión: primero los repasos vencidos (los más atrasados antes), luego las nuevas. */
export async function sessionQueue(): Promise<SrsCard[]> {
  const now = Date.now()
  const all = (await db.cards.orderBy('due').toArray()).filter((c) => !c.archivedAt)
  const due = all.filter((c) => c.fsrs.state !== State.New && c.due <= now)
  const fresh = all.filter((c) => c.fsrs.state === State.New).slice(0, NEW_PER_SESSION)
  return [...due, ...fresh]
}

// v5.9 (nota del dueño): los botones dicen cómo te salió, en palabras de alumno, y debajo cuándo vuelve la frase.
export const GRADES: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'No me salió' },
  { grade: Rating.Hard, label: 'Me costó' },
  { grade: Rating.Good, label: 'Bien' },
  { grade: Rating.Easy, label: 'Fácil' },
]

/** «Ya me la sé»: la frase sale del repaso (se puede recuperar). */
export async function archiveCard(card: SrsCard): Promise<void> {
  if (card.id) await db.cards.update(card.id, { archivedAt: Date.now() })
}

/** Vuelve a repasar una frase archivada: entra en el repaso de hoy. */
export async function unarchiveCard(id: number): Promise<void> {
  const now = Date.now()
  const c = await db.cards.get(id)
  if (!c) return
  await db.cards.put({ ...c, archivedAt: undefined, due: Math.min(c.due, now), fsrs: { ...c.fsrs, due: Math.min(c.fsrs.due, now) } })
}

export const archivedCards = () =>
  db.cards
    .filter((c) => !!c.archivedAt)
    .toArray()
    .then((l) => l.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)))

function humanize(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  if (d < 31) return `${d} ${d === 1 ? 'día' : 'días'}`
  const mo = Math.round(d / 30)
  return `${mo} ${mo === 1 ? 'mes' : 'meses'}`
}

/** Cuándo volvería la tarjeta con cada nota (para mostrarlo en los botones). */
export function previewIntervals(card: SrsCard): Record<Grade, string> {
  const now = new Date()
  const p = scheduler.repeat(toInput(card.fsrs), now)
  const out = {} as Record<Grade, string>
  for (const { grade } of GRADES) out[grade] = humanize(p[grade].card.due.getTime() - now.getTime())
  return out
}

export async function reviewCard(card: SrsCard, grade: Grade): Promise<SrsCard> {
  const next = scheduler.next(toInput(card.fsrs), new Date(), grade)
  const f = toStored(next.card)
  const updated = { ...card, fsrs: f, due: f.due }
  await db.cards.put(updated)
  return updated
}

// ---------------------------------------------------------------------------
// Evaluación del ejercicio oral

export type Verdict = 'correct' | 'almost' | 'wrong'

export interface DrillResult {
  transcript: string
  verdict: Verdict
  feedbackEs: string
}

const DRILL_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['transcript', 'verdict', 'feedback_es'],
  properties: {
    transcript: { type: 'string' },
    verdict: { type: 'string', enum: ['correct', 'almost', 'wrong'] },
    feedback_es: { type: 'string' },
  },
}

export async function evaluateDrill(
  apiKey: string,
  models: Models,
  card: SrsCard,
  audio: { base64: string; mimeType: string },
): Promise<DrillResult> {
  // v5.10: en las tarjetas de Gramática se ve un ejercicio en inglés (hueco o palabras desordenadas), no una frase en español.
  const shown =
    card.source === 'grammar'
      ? `They saw this English grammar exercise (fill the gap, or put the words in order) and must say the complete correct sentence: "${card.promptEs}"`
      : `They saw this Spanish sentence: "${card.promptEs}"`
  const task = `Spaced-repetition speaking drill for a Spanish speaker learning English.
${shown}
Reference English answer: "${card.answerEn}"
${card.hintEs ? `Note about the point being practised: ${card.hintEs}` : ''}
The audio is their spoken English answer.
- "transcript": exactly what they said (keep mistakes).
- "verdict": "correct" if it is correct, natural English with the same meaning (other valid wordings count as correct, minor hesitations are fine); "almost" if the meaning is right but there is one small error (often the same point being practised) or it is incomplete; "wrong" if the key structure is wrong, the meaning is different, or there is no real answer.
- "feedback_es": one short, encouraging sentence in Spanish. If not correct, point out exactly what to change.`
  const raw = await withRetry(models, (model) =>
    askGemini<{ transcript: string; verdict: Verdict; feedback_es: string }>(apiKey, model, {
      system: 'You are a precise, encouraging English teacher grading short spoken answers.',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: audio.mimeType, data: audio.base64 } }, { text: task }] }],
      schema: DRILL_SCHEMA,
      temperature: 0.2,
    }),
  )
  return {
    transcript: (raw.transcript ?? '').trim(),
    verdict: ['correct', 'almost', 'wrong'].includes(raw.verdict) ? raw.verdict : 'wrong',
    feedbackEs: (raw.feedback_es ?? '').trim(),
  }
}

export function suggestedGrade(v: Verdict | 'unknown'): Grade {
  return v === 'correct' ? Rating.Good : v === 'almost' ? Rating.Hard : Rating.Again
}
