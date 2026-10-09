import { askGemini, withRetry, type JsonSchema, type Models } from './gemini'
import { grammarCatalog, validTopicId, type GrammarTopic, type SpeakingPrompt } from './grammar'
import type { Verdict } from './srs'

// v5.10 (D2): lo único de Gramática que usa Gemini: «Dilo tú» (evaluar lo que dices) y «Pregúntale a <mascota>».
// La explicación y los ejercicios no gastan nada (están en la app).

export interface SpeakResult {
  transcript: string
  verdict: Verdict
  feedbackEs: string
}

const SPEAK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['transcript', 'verdict', 'feedback_es'],
  properties: {
    transcript: { type: 'string' },
    verdict: { type: 'string', enum: ['correct', 'almost', 'wrong'] },
    feedback_es: { type: 'string' },
  },
}

/** «Dilo tú»: Gemini transcribe la frase y comprueba que usa bien la estructura del tema (como el Repaso). */
export async function evaluateSpeaking(
  apiKey: string,
  models: Models,
  topic: GrammarTopic,
  challenge: SpeakingPrompt,
  audio: { base64: string; mimeType: string },
): Promise<SpeakResult> {
  const task = `Speaking challenge for a Spanish speaker learning English, about the grammar topic "${topic.name}" (${topic.level}).
The challenge (in Spanish) was: "${challenge.promptEs}"
What must be checked: ${challenge.checkEs}
A model answer (one of many valid ones): "${challenge.modelEn}"
The audio is the student's spoken answer. Their own content is welcome: do NOT require the model answer.
- "transcript": exactly what they said (keep mistakes).
- "verdict": "correct" if it answers the challenge in correct, natural English AND uses the target structure correctly; "almost" if the structure is used but with one small error, or the answer is incomplete; "wrong" if the structure is missing or wrong, or there is no real answer.
- "feedback_es": 1–2 short, encouraging sentences in Spanish. If not correct, say exactly what to change, with the corrected sentence in English.`
  const raw = await withRetry(models, (model) =>
    askGemini<{ transcript: string; verdict: Verdict; feedback_es: string }>(apiKey, model, {
      system: 'You are a precise, encouraging English teacher grading short spoken answers about one grammar point.',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: audio.mimeType, data: audio.base64 } }, { text: task }] }],
      schema: SPEAK_SCHEMA,
      temperature: 0.2,
    }),
  )
  return {
    transcript: (raw.transcript ?? '').trim(),
    verdict: ['correct', 'almost', 'wrong'].includes(raw.verdict) ? raw.verdict : 'wrong',
    feedbackEs: (raw.feedback_es ?? '').trim(),
  }
}

export interface MascotAnswer {
  answerEs: string[] // párrafos cortos
  examples: { en: string; es: string }[]
  topics: string[] // ids del catálogo que existen
}

const ASK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer_es', 'examples', 'topics'],
  properties: {
    answer_es: { type: 'array', items: { type: 'string' } },
    examples: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['en', 'es'], properties: { en: { type: 'string' }, es: { type: 'string' } } },
    },
    topics: { type: 'array', items: { type: 'string' } },
  },
}

/**
 * «Pregúntale a <mascota>»: duda libre de gramática, respondida en español con ejemplos en inglés y enlaces a los temas
 * del catálogo (se le pasa la lista de ids y nombres; los ids que devuelve se comprueban: uno inventado no se enseña).
 */
export async function askMascot(
  apiKey: string,
  models: Models,
  mascotName: string,
  question: string,
  level: string,
  topic?: GrammarTopic,
): Promise<MascotAnswer> {
  const list = grammarCatalog()
    .topics.map((t) => `${t.id}: ${t.name} / ${t.nameEs}`)
    .join('\n')
  const task = `Question from a Spanish-speaking English learner (level ${level}):
"${question.trim()}"
${topic ? `They are reading the app's lesson "${topic.name}" (${topic.nameEs}): ${topic.summaryEs}\n` : ''}
Answer as ${mascotName}, the friendly mascot of the app, in Spanish (informal "tú", warm and clear), like a good teacher for Spanish speakers:
- "answer_es": 1–4 short paragraphs (max ~350 characters each). Go straight to the point, compare with Spanish when it helps. No markdown.
- "examples": 2–4 natural English sentences that illustrate the answer, each with its Spanish translation.
- "topics": up to 3 ids of related lessons, chosen ONLY from this list (or an empty list):
${list}
If the question is not about English, answer kindly in one paragraph that you only help with English, with no examples or topics.`
  const raw = await withRetry(models, (model) =>
    askGemini<{ answer_es: string[]; examples: { en: string; es: string }[]; topics: string[] }>(apiKey, model, {
      system: `You are ${mascotName}, a cheerful mascot and expert English grammar teacher for Spanish speakers.`,
      contents: [{ role: 'user', parts: [{ text: task }] }],
      schema: ASK_SCHEMA,
      temperature: 0.4,
    }),
  )
  const topics = [...new Set((raw.topics ?? []).map(validTopicId).filter((x): x is string => !!x))].slice(0, 3)
  return {
    answerEs: (raw.answer_es ?? []).map((p) => String(p).trim()).filter(Boolean),
    examples: (raw.examples ?? []).filter((e) => e?.en?.trim()).map((e) => ({ en: e.en.trim(), es: (e.es ?? '').trim() })).slice(0, 4),
    topics,
  }
}
