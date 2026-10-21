import { turnCorrections, type SessionMetrics, type SessionReport, type Topic, type Turn } from './db'
import { askGemini, withRetry, type JsonSchema, type Models, type RetryInfo } from './gemini'
import { getProfile } from './profile'

const FILLERS = new Set(['uh', 'um', 'umm', 'uhm', 'er', 'erm', 'eh', 'ah', 'hmm', 'mm'])

export function countWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLERS.has(w)).length
}

export interface TurnMetrics {
  words: number
  wpm: number | null
  pauses: number
}

export function turnMetrics(t: Turn): TurnMetrics {
  const words = countWords(t.text)
  const secs = t.typed ? 0 : (t.speechSeconds ?? t.audioSeconds ?? 0)
  return {
    words,
    wpm: secs >= 1.5 && words >= 3 ? Math.round(words / (secs / 60)) : null,
    pauses: t.pauses?.length ?? 0,
  }
}

/**
 * 5.10.1 (UX-03, UX-04): metas al hablar según tu nivel (MCER de «speaking»): palabras por minuto y palabras por
 * respuesta. Es la ÚNICA fuente de las metas: la usan el informe de la clase, el consejo de la mascota y la nota (cuyo
 * 100 % de velocidad es la meta de C1). Antes había tres cifras distintas (meta B2 110+, «ronda las 120» y 125) y una A2
 * veía siempre la meta de B2.
 */
export const SPEAKING_GOALS: Record<string, { wpm: number; words: number }> = {
  A1: { wpm: 60, words: 8 },
  A2: { wpm: 75, words: 12 },
  B1: { wpm: 95, words: 20 },
  B2: { wpm: 110, words: 30 },
  C1: { wpm: 125, words: 40 },
  C2: { wpm: 125, words: 40 },
}

/** Las metas de un nivel («A2», «B1+»…); sin nivel conocido, las de B1. */
export function speakingGoal(level: string | undefined): { level: string; wpm: number; words: number } {
  const key = (level ?? '').trim().toUpperCase().slice(0, 2)
  const lv = SPEAKING_GOALS[key] ? key : 'B1'
  return { level: lv, ...SPEAKING_GOALS[lv] }
}

/** Referencias de velocidad al hablar (palabras/minuto) para la nota: de un principiante a la meta de C1. */
const WPM_FLOOR = 45
const WPM_TARGET = SPEAKING_GOALS.C1.wpm

export function sessionMetrics(turns: Turn[]): SessionMetrics | null {
  const user = turns.filter((t) => t.role === 'user')
  if (user.length === 0) return null
  // Velocidad y pausas solo salen de lo hablado; longitud y precisión, de todas las respuestas.
  const spoken = user.filter((t) => !t.typed)
  const counts = user.map((t) => countWords(t.text))
  const words = counts.reduce((a, b) => a + b, 0)
  const spokenWords = spoken.reduce((a, t) => a + countWords(t.text), 0)
  const speechSeconds = spoken.reduce((a, t) => a + (t.speechSeconds ?? t.audioSeconds ?? 0), 0)
  const pauses = spoken.reduce((a, t) => a + (t.pauses?.length ?? 0), 0)
  // Total de errores corregidos; la precisión mira qué parte de las respuestas tuvo alguno.
  const corrections = user.reduce((a, t) => a + turnCorrections(t).length, 0)
  const withErrors = user.filter((t) => turnCorrections(t).length > 0).length
  const minutes = Math.max(speechSeconds / 60, 0.05)
  const wpm = spoken.length ? Math.round(spokenWords / minutes) : 0
  const pausesPerMin = spoken.length ? Math.round((pauses / minutes) * 10) / 10 : 0
  const avgWords = Math.round(words / user.length)

  const clamp = (x: number) => Math.max(0, Math.min(1, x))
  const speed = clamp((wpm - WPM_FLOOR) / (WPM_TARGET - WPM_FLOOR))
  const length = clamp((avgWords - 5) / (40 - 5))
  const smooth = clamp(1 - pausesPerMin / 6)
  const accuracy = clamp(1 - (withErrors / user.length) * 0.8)
  const score = spoken.length
    ? Math.round((speed * 0.3 + length * 0.3 + smooth * 0.2 + accuracy * 0.2) * 100)
    : Math.round(((length * 0.3 + accuracy * 0.2) / 0.5) * 100)

  return {
    turns: user.length,
    spokenTurns: spoken.length,
    words,
    speechSeconds: Math.round(speechSeconds),
    wpm,
    pauses,
    pausesPerMin,
    avgWords,
    longestWords: Math.max(...counts),
    corrections,
    score,
    level: scoreLevel(score),
  }
}

export function scoreLevel(score: number): string {
  if (score < 30) return 'A2'
  if (score < 50) return 'B1'
  if (score < 65) return 'B1+'
  if (score < 80) return 'B2'
  return 'B2+'
}

const REPORT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary_es', 'strengths_es', 'improve_es', 'homework_es', 'phrase_en', 'phrase_es'],
  properties: {
    summary_es: { type: 'string' },
    strengths_es: { type: 'array', items: { type: 'string' } },
    improve_es: { type: 'array', items: { type: 'string' } },
    homework_es: { type: 'string' },
    phrase_en: { type: 'string' },
    phrase_es: { type: 'string' },
  },
}

interface RawReport {
  summary_es: string
  strengths_es: string[]
  improve_es: string[]
  homework_es: string
  phrase_en: string
  phrase_es: string
}

export async function generateReport(
  apiKey: string,
  models: Models,
  turns: Turn[],
  metrics: SessionMetrics,
  topic: Topic | undefined,
  onRetry?: (info: RetryInfo) => void,
): Promise<SessionReport> {
  const transcript = turns
    .map((t) => {
      const line = `${t.role === 'user' ? (t.typed ? 'STUDENT (typed)' : 'STUDENT') : 'COACH'}: ${t.text}`
      // Pronunciación de Azure (si la hubo), para que el informe también hable de ella.
      const weak = t.pronunciation?.words.filter((w) => w.error !== 'None' || w.accuracy < 70).map((w) => w.word) ?? []
      const pron = t.pronunciation ? [`  [pronunciation ${t.pronunciation.pron}/100${weak.length ? `; weak words: ${weak.slice(0, 5).join(', ')}` : ''}]`] : []
      return [line, ...turnCorrections(t).map((c) => `  [corrected: "${c.original}" → "${c.corrected}"]`), ...pron].join('\n')
    })
    .join('\n')

  const lv = (await getProfile()).levels
  const task = `Write a short end-of-session report for a Spanish-speaking English learner (${lv.overall}, speaking ${lv.speaking}, goal: speak fluently).
${topic ? `Topic: ${topic.title}\n` : ''}Metrics: ${metrics.turns} answers (${metrics.spokenTurns ?? metrics.turns} spoken, the rest typed), ${metrics.words} words, ${metrics.wpm} words/min when speaking, ${metrics.pauses} pauses over 1 s, average ${metrics.avgWords} words per answer, longest ${metrics.longestWords} words, ${metrics.corrections} corrections. Fluency score ${metrics.score}/100.

Conversation:
${transcript}

Return JSON, all in Spanish except phrase_en, friendly and motivating but honest, addressing the student as "tú":
- summary_es: 1-2 sentences about how the session went.
- strengths_es: 2 concrete strengths seen in THIS conversation.
- improve_es: 2 concrete things to improve, quoting a real example from the conversation when possible.
- homework_es: ONE concrete task for tomorrow, doable in 5-10 minutes, focused on speaking (e.g. "Graba 1 minuto contando… usando 3 veces…").
- phrase_en / phrase_es: one natural, useful English phrase related to the conversation that would have helped, with its Spanish translation.`

  const raw = await withRetry(
    models,
    (model) =>
      askGemini<RawReport>(apiKey, model, {
        system: 'You are an expert, encouraging English speaking coach.',
        contents: [{ role: 'user', parts: [{ text: task }] }],
        schema: REPORT_SCHEMA,
      }),
    onRetry,
  )
  return {
    summaryEs: raw.summary_es ?? '',
    strengthsEs: (raw.strengths_es ?? []).slice(0, 3),
    improveEs: (raw.improve_es ?? []).slice(0, 3),
    homeworkEs: raw.homework_es ?? '',
    phrase: { en: raw.phrase_en ?? '', es: raw.phrase_es ?? '' },
  }
}

// ---------------------------------------------------------------------------
// 5.11 (M-07, P-07 de A5 / UX-03): el informe te compara contigo mismo, no con una meta lejana.

/** Cuántas clases anteriores forman «tu media». */
export const BASELINE_CLASSES = 5

/** Tu media de las últimas clases terminadas (antes de esta). `null` en velocidad y pausas si ninguna fue hablada. */
export interface MetricBaseline {
  classes: number
  wpm: number | null
  pausesPerMin: number | null
  avgWords: number
  score: number
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
/** Clase con respuestas habladas (las anteriores a la v5.7 no guardaban `spokenTurns`: eran todas habladas). */
const spokenIn = (m: SessionMetrics) => (m.spokenTurns ?? m.turns) > 0

/**
 * Media de las `BASELINE_CLASSES` clases terminadas con métricas más recientes ANTES de `current` (por fecha de inicio;
 * la propia clase no cuenta). Con menos de 2 clases previas no hay media: «Esta es tu primera referencia». Las clases
 * escritas no cuentan para la velocidad ni las pausas.
 */
export function baselineFrom(
  sessions: readonly { id?: number; startedAt: number; metrics?: SessionMetrics }[],
  current: { id?: number; startedAt: number },
): MetricBaseline | null {
  const prev = sessions
    .filter((s) => s.metrics && s.metrics.turns > 0 && s.id !== current.id && s.startedAt < current.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, BASELINE_CLASSES)
    .map((s) => s.metrics!)
  if (prev.length < 2) return null
  const spoken = prev.filter(spokenIn)
  return {
    classes: prev.length,
    wpm: spoken.length ? Math.round(mean(spoken.map((m) => m.wpm))) : null,
    pausesPerMin: spoken.length ? Math.round(mean(spoken.map((m) => m.pausesPerMin)) * 10) / 10 : null,
    avgWords: Math.round(mean(prev.map((m) => m.avgWords))),
    score: Math.round(mean(prev.map((m) => m.score))),
  }
}

export interface Trend {
  /** ▲ sube, ▼ baja, = igual. */
  arrow: '▲' | '▼' | '='
  /** Mejor que tu media (en pausas, mejor es bajar). */
  better: boolean
  /** «+8 frente a tu media», «−0,5/min frente a tu media» (REV-11-D2-05: las pausas se comparan por minuto), «igual que tu media». */
  text: string
}

/** Cifra de hoy frente a tu media. `decimals` 1 para las pausas/min. Sin media (null) no hay flecha. */
export function trend(today: number, avg: number | null, opts: { lowerIsBetter?: boolean; decimals?: number; unit?: string } = {}): Trend | null {
  if (avg == null || !Number.isFinite(today) || !Number.isFinite(avg)) return null
  const f = 10 ** (opts.decimals ?? 0)
  const d = Math.round((today - avg) * f) / f
  if (d === 0) return { arrow: '=', better: false, text: 'igual que tu media' }
  const abs = Math.abs(d).toLocaleString('es', { maximumFractionDigits: opts.decimals ?? 0 })
  return { arrow: d > 0 ? '▲' : '▼', better: opts.lowerIsBetter ? d < 0 : d > 0, text: `${d > 0 ? '+' : '−'}${abs}${opts.unit ?? ''} frente a tu media` }
}

/** Flechas del informe: velocidad y pausas solo si hoy hablaste (y hay media hablada). */
export function reportTrends(m: SessionMetrics, base: MetricBaseline | null) {
  const spokeToday = spokenIn(m)
  return {
    wpm: spokeToday ? trend(m.wpm, base?.wpm ?? null) : null,
    pausesPerMin: spokeToday ? trend(m.pausesPerMin, base?.pausesPerMin ?? null, { lowerIsBetter: true, decimals: 1, unit: '/min' }) : null,
    avgWords: trend(m.avgWords, base?.avgWords ?? null),
    score: trend(m.score, base?.score ?? null),
  }
}

/**
 * 5.11 (M-07, UX-09): «Hoy has sonado como un B1+» en vez de «Nivel al hablar hoy» (sale de la nota de fluidez, no del
 * MCER: tu nivel solo lo cambia el re-test). Oculto para A1–A2 y mientras no se sepa tu nivel: a un principiante una
 * etiqueta B2 le confunde más de lo que le ayuda.
 */
export function soundedLike(scoreLevelToday: string, studentLevel: string | undefined): string | null {
  const lv = (studentLevel ?? '').trim().toUpperCase()
  if (!lv || lv.startsWith('A')) return null
  return `Hoy has sonado como un ${scoreLevelToday}`
}
