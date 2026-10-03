import { BANK_VERSION, recordUse, type BankItem, type SpeakingItem } from './bank'
import { db, type CalibrationRecord, type Profile, type Skill } from './db'
import { askGemini, withRetry, type GeminiPart, type JsonSchema, type Models, type RetryInfo } from './gemini'
import { LEVELS, levelAt, levelIdx, overallFrom, trajectoryOf, weightedLevel, type Level } from './levels'
import { medianLevel, SPEAK_CRITERIA, type BlockResult, type Confidence, type GrammarAnswer, type SpeakCriterion } from './placement'
import { getProfile } from './profile'

// Test de nivel: las preguntas salen del banco (sin tokens); Gemini solo corrige el habla, con rúbrica y temperatura 0.

const SYSTEM =
  'You are an expert CEFR speaking examiner (IELTS Speaking and Cambridge descriptors) assessing Spanish speakers in an English placement test. You are rigorous, consistent and never inflate levels.'

// ---------------------------------------------------------------------------
// Habla: 3 tareas del banco.

export interface SpeakingTask {
  title: string // en español, para la UI
  /** Lo que lee el profe en voz alta (todas las preguntas de la tarea seguidas). */
  prompt: string
  prompts: string[]
  cues?: string[]
  seconds: number // duración recomendada de la respuesta
  item: SpeakingItem
}

export function taskFromItem(item: SpeakingItem): SpeakingTask {
  const title = item.task === 1 ? 'Preguntas personales' : item.task === 2 ? 'Describe y cuenta' : item.variant ? 'Tu opinión' : 'Opina y argumenta'
  const prompt =
    item.task === 2
      ? `${item.prompts[0]} You should say: ${(item.cues ?? []).join('; ')}.`
      : item.prompts.join(' ')
  return { title, prompt, prompts: item.prompts, cues: item.cues, seconds: item.task === 1 ? item.seconds * 2 : item.seconds, item }
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
  /** Rúbrica de 4 criterios; el nivel de habla es su mediana. */
  criteria: Record<SpeakCriterion, Level>
  /** Justificación breve de cada criterio, en español (se muestra en el resultado). */
  reasonsEs: Partial<Record<SpeakCriterion, string>>
  strengthsEs: string[]
  weaknessesEs: string[]
  weaknessesEn: string[]
  summaryEs: string
}

// Cada respuesta se evalúa sola en cuanto se graba (mientras haces la siguiente tarea), escuchando el audio.
// Al final solo se envían esas notas en texto: la evaluación final ya no sube audio y tarda segundos.

export interface TaskAssessment {
  transcript: string
  level: Level
  notes: string // observaciones del examinador en inglés (errores citados, pronunciación, fluidez)
}

const TASK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['transcript', 'level', 'notes'],
  properties: {
    transcript: { type: 'string' },
    level: { type: 'string', enum: [...LEVELS] },
    notes: { type: 'string' },
  },
}

export async function assessSpeakingTask(apiKey: string, models: Models, task: SpeakingTask, a: SpeakingAnswer): Promise<TaskAssessment> {
  const raw = await withRetry({ ...models, timeoutMs: 90_000 }, (model) =>
    askGemini<{ transcript: string; level: Level; notes: string }>(apiKey, model, {
      system: SYSTEM,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Speaking task ${task.item.task} (it lets the candidate show ${task.item.from}–${task.item.to}): "${task.prompt}" — recorded ${Math.round(a.seconds)} s, ${a.pauses} pauses over 1 s.`,
            },
            { inlineData: { mimeType: a.mimeType, data: a.base64 } },
            {
              text: `This is one answer of a Spanish speaker in a CEFR placement test.
- "transcript": verbatim transcription (keep every mistake and hesitation).
- "level": CEFR level shown in THIS answer. Be rigorous: very short or hesitant answers cannot be above A2.
- "notes": 3-5 short examiner notes in English about fluency and coherence, vocabulary, grammatical accuracy and pronunciation, quoting the real mistakes (e.g. "'the people was' → 'the people were'").`,
            },
          ],
        },
      ],
      schema: TASK_SCHEMA,
      temperature: 0,
    }),
  )
  return { transcript: (raw.transcript ?? '').trim(), level: LEVELS.includes(raw.level) ? raw.level : 'A2', notes: (raw.notes ?? '').trim() }
}

const CRITERION_EN: Record<SpeakCriterion, string> = {
  fluency: 'fluency and coherence',
  vocabulary: 'lexical resource (vocabulary)',
  grammar: 'grammatical range and accuracy',
  pronunciation: 'pronunciation',
}

const SPEAK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'reasons_es', 'strengths_es', 'weaknesses_es', 'weaknesses_en', 'summary_es'],
  properties: {
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: [...SPEAK_CRITERIA],
      properties: Object.fromEntries(SPEAK_CRITERIA.map((k) => [k, { type: 'string', enum: [...LEVELS] }])) as Record<string, JsonSchema>,
    },
    reasons_es: {
      type: 'object',
      additionalProperties: false,
      required: [...SPEAK_CRITERIA],
      properties: Object.fromEntries(SPEAK_CRITERIA.map((k) => [k, { type: 'string' }])) as Record<string, JsonSchema>,
    },
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
  unknownPoints: string[],
  onRetry?: (i: RetryInfo) => void,
  pre: (TaskAssessment | null)[] = [],
): Promise<SpeakingEval> {
  const parts: GeminiPart[] = []
  answers.forEach((a, i) => {
    parts.push({
      text: `Task ${tasks[i].item.task}: "${tasks[i].prompt}" — recorded ${Math.round(a.seconds)} s, ${a.pauses} pauses over 1 s.`,
    })
    const p = pre[i]
    // Ya evaluada por separado: solo el texto. Si aquella evaluación falló, se manda el audio.
    if (p)
      parts.push({
        text: `Transcript (verbatim): "${p.transcript}"
Examiner notes from listening to the audio: ${p.notes}
Level shown in this answer: ${p.level}`,
      })
    else parts.push({ inlineData: { mimeType: a.mimeType, data: a.base64 } })
  })
  parts.push({
    text: `Rate this Spanish-speaking candidate's SPEAKING with a 4-criterion rubric based on the public IELTS Speaking and Cambridge descriptors, mapped to CEFR. Be rigorous and realistic: do not inflate; very short or hesitant answers cannot be above A2.
- "criteria": one CEFR level for each criterion: fluency (${CRITERION_EN.fluency}), vocabulary (${CRITERION_EN.vocabulary}), grammar (${CRITERION_EN.grammar}), pronunciation (${CRITERION_EN.pronunciation}).
- "reasons_es": for each criterion, ONE short sentence in Spanish justifying the level with concrete evidence from the answers.
- "strengths_es": 2-3 concrete strengths, in Spanish.
- "weaknesses_es": 3-4 concrete, recurring weaknesses in Spanish, quoting examples from the answers.
- "weaknesses_en": the same weaknesses as short English notes for the teacher (e.g. "Drops the auxiliary in continuous tenses: 'I working' → 'I'm working'").
- "summary_es": 2 sentences in Spanish about how the candidate SPEAKS, encouraging but honest.
Grammar points the candidate FAILED in the written part (consider them for weaknesses): ${failedPoints.join('; ') || 'none'}.
Points the candidate HONESTLY marked as "I don't know" (known gaps: give them priority among the weaknesses): ${unknownPoints.join('; ') || 'none'}.`,
  })

  const raw = await withRetry(
    { ...models, timeoutMs: pre.every(Boolean) ? 60_000 : 150_000 },
    (model) =>
      askGemini<{
        criteria: Record<SpeakCriterion, Level>
        reasons_es: Record<SpeakCriterion, string>
        strengths_es: string[]
        weaknesses_es: string[]
        weaknesses_en: string[]
        summary_es: string
      }>(apiKey, model, { system: SYSTEM, contents: [{ role: 'user', parts }], schema: SPEAK_SCHEMA, temperature: 0 }),
    onRetry,
  )
  const criteria = Object.fromEntries(SPEAK_CRITERIA.map((k) => [k, LEVELS.includes(raw.criteria?.[k]) ? raw.criteria[k] : 'A2'])) as Record<
    SpeakCriterion,
    Level
  >
  return {
    level: medianLevel(Object.values(criteria)),
    criteria,
    reasonsEs: raw.reasons_es ?? {},
    strengthsEs: (raw.strengths_es ?? []).slice(0, 3),
    weaknessesEs: (raw.weaknesses_es ?? []).slice(0, 4),
    weaknessesEn: (raw.weaknesses_en ?? []).slice(0, 4),
    summaryEs: raw.summary_es ?? '',
  }
}

// ---------------------------------------------------------------------------
// Resultado y guardado.

export interface CalibrationResult {
  /** Niveles finales (en el re-test, ya ponderados: 70 % test + 30 % trayectoria). */
  levels: Record<Skill | 'overall', Level>
  /** Lo que dio el test por sí solo. */
  testLevels: Record<Skill | 'overall', Level>
  /** Re-test: trayectoria de cada destreza (lo que proponían las clases). */
  trajectory?: Record<Skill, Level>
  confidence: Record<Skill, Confidence>
  speaking: SpeakingEval
  grammar: GrammarAnswer[]
  reading: BlockResult[]
  listening: BlockResult[]
  /** Re-test: niveles anteriores, para mostrar el antes → después. */
  prev?: Record<Skill | 'overall', Level>
}

export function buildLevels(grammar: Level, reading: Level, listening: Level, speaking: Level): Record<Skill | 'overall', Level> {
  const base = { grammar, reading, listening, speaking }
  return { ...base, overall: overallFrom(base) }
}

/**
 * Primer test: el resultado es tu nivel (sin "transición" desde el B1 provisional).
 * Re-test: cada destreza = 70 % test + 30 % trayectoria; el general se recalcula con la fórmula.
 */
export function finalLevels(test: Record<Skill | 'overall', Level>, p: Profile): Pick<CalibrationResult, 'levels' | 'trajectory' | 'prev'> {
  if (!p.calibratedAt) return { levels: test }
  const trajectory = trajectoryOf(p)
  const w = (k: Skill) => weightedLevel(test[k], trajectory[k]).level
  const levels = buildLevels(w('grammar'), w('reading'), w('listening'), w('speaking'))
  const prev = Object.fromEntries((['grammar', 'reading', 'listening', 'speaking', 'overall'] as const).map((k) => [k, levelAt(levelIdx(p.levels[k]))])) as Record<
    Skill | 'overall',
    Level
  >
  return { levels, trajectory, prev }
}

/** Guarda el resultado: niveles, debilidades (para el profe), registro del test y uso del banco. */
export async function saveCalibration(r: CalibrationResult, used: BankItem[], model: string): Promise<Profile> {
  const p = await getProfile()
  const first = !p.calibratedAt
  const record: CalibrationRecord = {
    date: Date.now(),
    levels: r.levels,
    testLevels: r.testLevels,
    trajectory: r.trajectory,
    confidence: r.confidence,
    speakingCriteria: r.speaking.criteria,
    strengthsEs: r.speaking.strengthsEs,
    weaknessesEs: r.speaking.weaknessesEs,
    summaryEs: r.speaking.summaryEs,
    grammarAnswers: r.grammar.map((a) => ({ level: a.item.level, correct: a.correct, unknown: a.unknown, point: a.item.point })),
    bankIds: used.map((i) => i.id),
    bankVersion: BANK_VERSION,
    model,
  }
  // En el primer test no hay "cambio de nivel": el B1 previo era solo un marcador.
  const events = first
    ? []
    : (['grammar', 'reading', 'listening', 'speaking', 'overall'] as const)
        .filter((k) => p.levels[k] !== r.levels[k])
        .map((k) => ({ date: record.date, skill: k, from: p.levels[k], to: r.levels[k], reason: 'test' as const }))
  const next: Profile = {
    ...p,
    levels: { ...r.levels },
    weaknesses: r.speaking.weaknessesEn.length ? r.speaking.weaknessesEn : p.weaknesses,
    calibratedAt: record.date,
    tests: [...(p.tests ?? []), record],
    levelEvents: [...(p.levelEvents ?? []), ...events],
    trajectory: undefined, // empieza un periodo nuevo: las clases vuelven a proponer desde aquí
    bankUsage: recordUse(p.bankUsage ?? { seen: [], uses: {} }, used),
  }
  await db.profile.put(next)
  return next
}
