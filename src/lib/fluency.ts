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

/** Referencias aproximadas de velocidad al hablar (palabras/minuto) para un no nativo. */
const WPM_FLOOR = 45
const WPM_TARGET = 125

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
