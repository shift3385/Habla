import { db, type CalibrationRecord, type Profile, type Skill } from './db'
import { askGemini, withRetry, type GeminiPart, type JsonSchema, type Models, type RetryInfo } from './gemini'
import { LEVELS, levelAt, levelIdx, overallFrom, type Level } from './levels'
import { getProfile } from './profile'

// Test de calibración: gramática/vocabulario adaptativo, lectura, audición y habla evaluada por Gemini.

const SYSTEM =
  'You are an expert CEFR examiner who writes rigorous, unambiguous English placement tests for Spanish speakers. Each multiple-choice question has exactly ONE correct answer and three plausible distractors.'

export interface McqItem {
  level: Level
  skill: 'grammar' | 'vocabulary'
  question: string
  options: string[]
  answer: number // índice de la opción correcta (tras barajar)
  point: string // qué evalúa (para detectar debilidades)
}

const MCQ_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['level', 'skill', 'question', 'options', 'answer_index', 'point'],
        properties: {
          level: { type: 'string', enum: [...LEVELS] },
          skill: { type: 'string', enum: ['grammar', 'vocabulary'] },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer_index: { type: 'integer' },
          point: { type: 'string' },
        },
      },
    },
  },
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Banco de preguntas: 5 por nivel (A1–C2), mezcla de gramática y vocabulario. Las opciones se barajan aquí. */
export async function generateMcqPool(apiKey: string, models: Models, onRetry?: (i: RetryInfo) => void): Promise<McqItem[]> {
  const task = `Write a placement-test item bank: exactly 5 items for EACH CEFR level A1, A2, B1, B2, C1, C2 (30 items total).
- Mix grammar (tenses, auxiliaries, articles, conditionals, passive, reported speech, inversion…) and vocabulary (collocations, phrasal verbs, word choice, false friends for Spanish speakers).
- Each item: a sentence with a gap "____" or a short question; 4 options; answer_index = index of the correct option (0-3).
- Difficulty must match the level precisely. Vary topics. No two items testing the same point.
- "point": a short English label of what is tested (e.g. "present perfect vs past simple").`
  const raw = await withRetry(
    models,
    (model) =>
      askGemini<{ items: { level: Level; skill: 'grammar' | 'vocabulary'; question: string; options: string[]; answer_index: number; point: string }[] }>(
        apiKey,
        model,
        { system: SYSTEM, contents: [{ role: 'user', parts: [{ text: task }] }], schema: MCQ_SCHEMA, maxTokens: 12000, temperature: 0.9 },
      ),
    onRetry,
  )
  return (raw.items ?? [])
    .filter((it) => LEVELS.includes(it.level) && it.options?.length === 4 && it.answer_index >= 0 && it.answer_index < 4 && it.question)
    .map((it) => {
      const correct = it.options[it.answer_index]
      const options = shuffle(it.options)
      return { level: it.level, skill: it.skill, question: it.question, options, answer: options.indexOf(correct), point: it.point }
    })
}

// ---------------------------------------------------------------------------
// Selección adaptativa (escalera): acierto → sube un nivel, fallo → baja uno.

export const MCQ_COUNT = 15

export interface McqAnswer {
  item: McqItem
  chosen: number
  correct: boolean
}

export function nextMcq(pool: McqItem[], answers: McqAnswer[]): McqItem | null {
  if (answers.length >= MCQ_COUNT) return null
  const used = new Set(answers.map((a) => a.item))
  let target = 2 // empieza en B1
  for (const a of answers) target = Math.max(0, Math.min(5, target + (a.correct ? 1 : -1)))
  // Alterna gramática y vocabulario, y busca el nivel más cercano con preguntas libres.
  const wantSkill = answers.length % 2 === 0 ? 'grammar' : 'vocabulary'
  for (let d = 0; d <= 5; d++) {
    for (const lv of [target + d, target - d]) {
      if (lv < 0 || lv > 5) continue
      const free = pool.filter((it) => !used.has(it) && it.level === LEVELS[lv])
      const pick = free.find((it) => it.skill === wantSkill) ?? free[0]
      if (pick) return pick
    }
  }
  return null
}

/** Nivel estimado: el más alto con ≥ 60 % de aciertos (mín. 2 preguntas); si ninguno, uno por debajo del más bajo probado. */
export function estimateMcqLevel(answers: McqAnswer[]): Level {
  const stats = LEVELS.map((l) => {
    const at = answers.filter((a) => a.item.level === l)
    return { n: at.length, ok: at.filter((a) => a.correct).length }
  })
  for (let i = 5; i >= 0; i--) if (stats[i].n >= 2 && stats[i].ok / stats[i].n >= 0.6) return LEVELS[i]
  for (let i = 5; i >= 0; i--) if (stats[i].n === 1 && stats[i].ok === 1) return LEVELS[Math.max(0, i - 1)]
  const lowest = stats.findIndex((s) => s.n > 0)
  return levelAt(Math.max(0, lowest - 1))
}

// ---------------------------------------------------------------------------
// Lectura y audición: un texto/audio del nivel estimado y otro del superior.

export interface Comprehension {
  level: Level
  text: string // texto para leer o guion para escuchar
  questions: { q: string; options: string[]; answer: number }[]
}

const COMP_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reading', 'listening'],
  properties: Object.fromEntries(
    ['reading', 'listening'].map((k) => [
      k,
      {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['level', 'text', 'questions'],
          properties: {
            level: { type: 'string', enum: [...LEVELS] },
            text: { type: 'string' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['q', 'options', 'answer_index'],
                properties: { q: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, answer_index: { type: 'integer' } },
              },
            },
          },
        },
      },
    ]),
  ) as Record<string, JsonSchema>,
}

export async function generateComprehension(
  apiKey: string,
  models: Models,
  base: Level,
  onRetry?: (i: RetryInfo) => void,
): Promise<{ reading: Comprehension[]; listening: Comprehension[] }> {
  const levels = [base, levelAt(levelIdx(base) + 1)]
  const task = `Write comprehension tasks for these CEFR levels: ${levels.join(' and ')}.
- "reading": one text per level (A1-A2: 60-90 words; B1-B2: 110-150; C1-C2: 150-190), each with exactly 2 questions.
- "listening": one script per level to be read aloud by a single voice (40-110 words, natural spoken style; a short monologue or an announcement), each with exactly 2 questions.
- Questions test understanding (main idea, detail, inference at higher levels), 4 options, answer_index 0-3. Topics: everyday life, work, travel, technology, culture. Different topics for each text.`
  const raw = await withRetry(
    models,
    (model) =>
      askGemini<Record<'reading' | 'listening', { level: Level; text: string; questions: { q: string; options: string[]; answer_index: number }[] }[]>>(
        apiKey,
        model,
        { system: SYSTEM, contents: [{ role: 'user', parts: [{ text: task }] }], schema: COMP_SCHEMA, maxTokens: 8000, temperature: 0.9 },
      ),
    onRetry,
  )
  const clean = (arr: typeof raw.reading): Comprehension[] =>
    (arr ?? [])
      .slice(0, 2)
      .map((c, i) => ({
        level: LEVELS.includes(c.level) ? c.level : levels[i],
        text: c.text,
        questions: (c.questions ?? [])
          .filter((q) => q.options?.length === 4 && q.answer_index >= 0 && q.answer_index < 4)
          .slice(0, 2)
          .map((q) => {
            const correct = q.options[q.answer_index]
            const options = shuffle(q.options)
            return { q: q.q, options, answer: options.indexOf(correct) }
          }),
      }))
      .filter((c) => c.text && c.questions.length > 0)
  return { reading: clean(raw.reading), listening: clean(raw.listening) }
}

/** Nivel de lectura/audición a partir de aciertos en los dos textos (nivel base y superior). */
export function comprehensionLevel(base: Level, results: { level: Level; correct: number; total: number }[]): Level {
  const at = (l: Level) => results.find((r) => r.level === l)
  const upper = results.find((r) => levelIdx(r.level) > levelIdx(base))
  const own = at(base) ?? results[0]
  if (upper && upper.correct === upper.total) return upper.level
  if (own && own.correct === own.total) return base
  if (own && own.correct >= 1 && upper && upper.correct >= 1) return base
  return levelAt(levelIdx(base) - 1)
}

// ---------------------------------------------------------------------------
// Habla: 3 tareas, evaluadas por Gemini en una sola llamada con los tres audios.

export interface SpeakingTask {
  title: string // en español, para la UI
  prompt: string // lo que dice el profe (inglés)
  seconds: number // duración recomendada
}

export function speakingTasks(base: Level): SpeakingTask[] {
  const high = levelIdx(base) >= 3
  return [
    {
      title: 'Preséntate',
      prompt: 'Please introduce yourself. Tell me where you live, what you do, and what you like doing in your free time.',
      seconds: 45,
    },
    {
      title: 'Describe y compara',
      prompt: high
        ? 'Compare living in a big city and living in a small town. What are the advantages and disadvantages of each?'
        : 'Describe a normal day in your life, from the morning to the evening.',
      seconds: 60,
    },
    high
      ? {
          title: 'Da tu opinión',
          prompt: 'Some people think artificial intelligence will replace many jobs. What is your opinion? Give reasons and examples.',
          seconds: 75,
        }
      : {
          title: 'Cuenta una historia',
          prompt: 'Tell me about a trip or a special day you remember well. What happened?',
          seconds: 60,
        },
  ]
}

export interface SpeakingAnswer {
  base64: string
  mimeType: string
  wpm: number | null
  pauses: number
  seconds: number
}

export interface SpeakingEval {
  level: Level
  criteria: Record<'fluency' | 'grammar' | 'vocabulary' | 'pronunciation' | 'coherence', Level>
  strengthsEs: string[]
  weaknessesEs: string[]
  weaknessesEn: string[]
  summaryEs: string
}

const SPEAK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['transcripts', 'criteria', 'speaking_level', 'strengths_es', 'weaknesses_es', 'weaknesses_en', 'summary_es'],
  properties: {
    transcripts: { type: 'array', items: { type: 'string' } },
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: ['fluency', 'grammar', 'vocabulary', 'pronunciation', 'coherence'],
      properties: Object.fromEntries(
        ['fluency', 'grammar', 'vocabulary', 'pronunciation', 'coherence'].map((k) => [k, { type: 'string', enum: [...LEVELS] }]),
      ) as Record<string, JsonSchema>,
    },
    speaking_level: { type: 'string', enum: [...LEVELS] },
    strengths_es: { type: 'array', items: { type: 'string' } },
    weaknesses_es: { type: 'array', items: { type: 'string' } },
    weaknesses_en: { type: 'array', items: { type: 'string' } },
    summary_es: { type: 'string' },
  },
}

export async function evaluateSpeaking(
  apiKey: string,
  models: Models,
  tasks: SpeakingTask[],
  answers: SpeakingAnswer[],
  failedPoints: string[],
  onRetry?: (i: RetryInfo) => void,
): Promise<SpeakingEval> {
  const parts: GeminiPart[] = []
  answers.forEach((a, i) => {
    parts.push({
      text: `Task ${i + 1}: "${tasks[i].prompt}" — recorded ${Math.round(a.seconds)} s, measured speech rate ${a.wpm ?? 'n/a'} words/min, ${a.pauses} pauses over 1 s.`,
    })
    parts.push({ inlineData: { mimeType: a.mimeType, data: a.base64 } })
  })
  parts.push({
    text: `Evaluate this Spanish-speaking candidate's SPEAKING with the CEFR descriptors. Be rigorous and realistic: do not inflate levels; very short or hesitant answers cannot be above A2.
- "transcripts": verbatim transcription of each answer (keep mistakes).
- "criteria": CEFR level for fluency, grammar, vocabulary, pronunciation and coherence.
- "speaking_level": overall speaking level.
- "strengths_es": 2-3 concrete strengths, in Spanish.
- "weaknesses_es": 3-4 concrete, recurring weaknesses in Spanish, quoting examples from the answers.
- "weaknesses_en": the same weaknesses as short English notes for the teacher (e.g. "Drops the auxiliary in continuous tenses: 'I working' → 'I'm working'").
- "summary_es": 2 sentences in Spanish summarising the level, encouraging but honest.
Grammar/vocabulary points the candidate FAILED in the written part (consider them for weaknesses): ${failedPoints.join('; ') || 'none'}.`,
  })

  const raw = await withRetry(
    models,
    (model) =>
      askGemini<{
        transcripts: string[]
        criteria: SpeakingEval['criteria']
        speaking_level: Level
        strengths_es: string[]
        weaknesses_es: string[]
        weaknesses_en: string[]
        summary_es: string
      }>(apiKey, model, { system: SYSTEM, contents: [{ role: 'user', parts }], schema: SPEAK_SCHEMA, temperature: 0.3 }),
    onRetry,
  )
  return {
    level: LEVELS.includes(raw.speaking_level) ? raw.speaking_level : 'A2',
    criteria: raw.criteria,
    strengthsEs: (raw.strengths_es ?? []).slice(0, 3),
    weaknessesEs: (raw.weaknesses_es ?? []).slice(0, 4),
    weaknessesEn: (raw.weaknesses_en ?? []).slice(0, 4),
    summaryEs: raw.summary_es ?? '',
  }
}

// ---------------------------------------------------------------------------

export interface CalibrationResult {
  levels: Record<Skill | 'overall', Level>
  speaking: SpeakingEval
  mcq: McqAnswer[]
}

/** Guarda el resultado en el perfil: niveles, debilidades (para el profe) y el registro del test. */
export async function saveCalibration(r: CalibrationResult): Promise<Profile> {
  const p = await getProfile()
  const record: CalibrationRecord = {
    date: Date.now(),
    levels: r.levels,
    speakingCriteria: r.speaking.criteria,
    strengthsEs: r.speaking.strengthsEs,
    weaknessesEs: r.speaking.weaknessesEs,
    summaryEs: r.speaking.summaryEs,
    grammarAnswers: r.mcq.map((a) => ({ level: a.item.level, correct: a.correct })),
  }
  const events = (['grammar', 'reading', 'listening', 'speaking', 'overall'] as const)
    .filter((k) => p.levels[k] !== r.levels[k])
    .map((k) => ({ date: record.date, skill: k, from: p.levels[k], to: r.levels[k], reason: 'test' as const }))
  const next: Profile = {
    ...p,
    levels: { ...r.levels },
    weaknesses: r.speaking.weaknessesEn.length ? r.speaking.weaknessesEn : p.weaknesses,
    calibratedAt: record.date,
    tests: [...(p.tests ?? []), record],
    levelEvents: [...(p.levelEvents ?? []), ...events],
  }
  await db.profile.put(next)
  return next
}

export function buildLevels(grammar: Level, reading: Level, listening: Level, speaking: Level): Record<Skill | 'overall', Level> {
  const base = { grammar, reading, listening, speaking }
  return { ...base, overall: overallFrom(base) }
}
