// v5.10 (punto 4 del dueño): evaluación al terminar el Repaso espaciado. Todo se calcula en el teléfono, sin Gemini:
// el repaso ya gastó una llamada por frase y el resumen solo junta lo que pasó. Separado de ReviewScreen para
// probar la fórmula y el feedback con node:test (tests/reviewSummary.test.mjs).

export type ReviewOutcome = 'correct' | 'almost' | 'wrong' | 'unknown'

/** Un intento del repaso: una frase respondida (o «No lo sé») y la nota que eligió el usuario para ella. */
export interface ReviewAttempt {
  cardId: number
  source: 'mistake' | 'lookup' | 'grammar'
  promptEs: string
  answerEn: string
  outcome: ReviewOutcome
  /** Nota de pronunciación de Azure (0–100) si hubo fonética y llegó. */
  pron?: number | null
}

/**
 * Puntos de cada resultado para la precisión: «Correcto» vale 1, «Casi» medio punto (el sentido estaba bien y falló
 * un detalle), y «Aún no» y «No lo sé» 0. Precisión = round(100 × puntos / intentos).
 */
export const OUTCOME_POINTS: Record<ReviewOutcome, number> = { correct: 1, almost: 0.5, wrong: 0, unknown: 0 }

/** Cuántas frases difíciles se listan como mucho (cabe en 320×640 sin una lista eterna). */
export const HARDEST_MAX = 5

export interface HardCard {
  cardId: number
  promptEs: string
  answerEn: string
  /** El peor resultado que tuvo la frase en este repaso. */
  worst: ReviewOutcome
  /** Veces que no salió bien (con «Otra vez» una frase puede salir dos veces). */
  misses: number
}

export interface ReviewSummary {
  total: number
  correct: number
  almost: number
  wrong: number
  unknown: number
  /** Precisión 0–100 (OUTCOME_POINTS). */
  score: number
  /** Media de las notas de pronunciación que llegaron; null si no hubo fonética. */
  pronAvg: number | null
  pronCount: number
  /** Segundos hablados en el repaso (los mismos que suman a la meta diaria). */
  spokenSeconds: number
  hardest: HardCard[]
  title: string
  /** Feedback general en español, frases cortas. */
  feedback: string[]
  mood: 'happy' | 'speaking' | 'idle'
}

export function reviewScore(attempts: ReviewAttempt[]): number {
  if (!attempts.length) return 0
  const pts = attempts.reduce((s, a) => s + OUTCOME_POINTS[a.outcome], 0)
  return Math.round((100 * pts) / attempts.length)
}

// Orden de «lo que más costó»: no saberla pesa más que fallarla (ni lo intentaste), y fallar más que «casi».
const WORST_RANK: Record<ReviewOutcome, number> = { unknown: 0, wrong: 1, almost: 2, correct: 3 }

/** Frases con algún intento que no fue «Correcto», de la que más costó a la que menos (agrupadas por tarjeta). */
export function hardestCards(attempts: ReviewAttempt[], max = HARDEST_MAX): HardCard[] {
  const byCard = new Map<number, HardCard & { pts: number; n: number; order: number }>()
  attempts.forEach((a, order) => {
    const prev = byCard.get(a.cardId)
    if (!prev) {
      byCard.set(a.cardId, {
        cardId: a.cardId,
        promptEs: a.promptEs,
        answerEn: a.answerEn,
        worst: a.outcome,
        misses: a.outcome === 'correct' ? 0 : 1,
        pts: OUTCOME_POINTS[a.outcome],
        n: 1,
        order,
      })
      return
    }
    if (WORST_RANK[a.outcome] < WORST_RANK[prev.worst]) prev.worst = a.outcome
    if (a.outcome !== 'correct') prev.misses++
    prev.pts += OUTCOME_POINTS[a.outcome]
    prev.n++
  })
  return [...byCard.values()]
    .filter((c) => c.misses > 0)
    .sort((a, b) => WORST_RANK[a.worst] - WORST_RANK[b.worst] || b.misses - a.misses || a.pts / a.n - b.pts / b.n || a.order - b.order)
    .slice(0, max)
    .map(({ cardId, promptEs, answerEn, worst, misses }) => ({ cardId, promptEs, answerEn, worst, misses }))
}

/**
 * Resumen del repaso. `left` = frases que quedaron sin hacer (saliste a mitad): se menciona en el feedback.
 * Bandas del feedback por precisión: ≥ 90 redondo, ≥ 70 bien, ≥ 40 a medias, < 40 costó. Después, un consejo según
 * lo que más falló (muchos «No lo sé», muchos «Casi», Gramática, pronunciación).
 */
export function summarizeReview(attempts: ReviewAttempt[], spokenSeconds = 0, left = 0): ReviewSummary {
  const count = (o: ReviewOutcome) => attempts.filter((a) => a.outcome === o).length
  const total = attempts.length
  const correct = count('correct')
  const almost = count('almost')
  const wrong = count('wrong')
  const unknown = count('unknown')
  const score = reviewScore(attempts)
  const prons = attempts.map((a) => a.pron).filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
  const pronAvg = prons.length ? Math.round(prons.reduce((s, p) => s + p, 0) / prons.length) : null

  let title: string
  let mood: ReviewSummary['mood']
  const feedback: string[] = []
  if (score >= 90) {
    title = '¡Repaso redondo!'
    mood = 'happy'
    feedback.push(total === 1 ? 'Te salió a la primera.' : 'Casi todas te salieron bien: estas frases ya se te están quedando.')
  } else if (score >= 70) {
    title = '¡Buen repaso!'
    mood = 'happy'
    feedback.push('La mayoría te salieron. Las que fallaste volverán pronto para que las afiances.')
  } else if (score >= 40) {
    title = 'Vas por buen camino'
    mood = 'speaking'
    feedback.push('Algunas te costaron, y es normal: repasar justo cuando empiezas a olvidar es lo que las fija.')
  } else {
    title = 'Hoy costó, y eso también cuenta'
    mood = 'speaking'
    feedback.push('Fallar en el repaso no es perder el tiempo: así sabe Habla qué frases tienen que volver antes.')
  }

  // Un solo consejo, el más útil según lo que falló (varios a la vez abrumaban).
  const missed = total - correct
  const grammarMisses = attempts.filter((a) => a.source === 'grammar' && a.outcome !== 'correct').length
  if (total >= 2 && unknown * 3 >= total && unknown >= 1) {
    feedback.push('Cuando no la sepas, intenta decir algo antes de pedir la respuesta: equivocarte también te la fija.')
  } else if (almost >= 2 && almost * 2 >= missed) {
    feedback.push('Muchas fueron «Casi»: te faltó un detalle. Escucha la respuesta y fíjate en las palabras pequeñas (a, the, to…).')
  } else if (grammarMisses >= 2 && grammarMisses * 2 >= missed) {
    feedback.push('Las de Gramática te costaron más: repasa su explicación en Gramática antes del próximo repaso.')
  } else if (missed > 0 && score < 90) {
    feedback.push('Escucha abajo las que más te costaron y repítelas en voz alta un par de veces.')
  }

  if (pronAvg !== null) {
    if (pronAvg >= 85) feedback.push(`Tu pronunciación fue muy clara (${pronAvg} de media).`)
    else if (pronAvg < 60) feedback.push(`La pronunciación (${pronAvg} de media) tiene margen: imita la voz de la respuesta correcta.`)
  }
  if (left > 0) feedback.push(`Te ${left === 1 ? 'quedó 1 frase' : `quedaron ${left} frases`} sin repasar: ${left === 1 ? 'volverá' : 'volverán'} en el próximo repaso.`)

  return {
    total,
    correct,
    almost,
    wrong,
    unknown,
    score,
    pronAvg,
    pronCount: prons.length,
    spokenSeconds: Math.round(spokenSeconds),
    hardest: hardestCards(attempts),
    title,
    feedback,
    mood,
  }
}
