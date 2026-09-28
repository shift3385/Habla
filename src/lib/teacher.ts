import type { Correction, Mistake, MistakeCategory, Profile } from './db'
import { askGemini, toContents, type ChatMessage, type GeminiContent, type JsonSchema } from './gemini'
import type { Scenario } from './scenarios'

const CATEGORIES: MistakeCategory[] = [
  'article',
  'uncountable',
  'auxiliary',
  'false_friend',
  'tense',
  'preposition',
  'word_order',
  'vocabulary',
  'grammar',
  'other',
]

export const TEACHER_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['heard_speech', 'transcript', 'correction', 'reply'],
  properties: {
    heard_speech: { type: 'boolean' },
    transcript: { type: 'string' },
    correction: {
      type: 'object',
      additionalProperties: false,
      required: ['has_error', 'original', 'corrected', 'explanation_es', 'category', 'spanish'],
      properties: {
        has_error: { type: 'boolean' },
        original: { type: 'string' },
        corrected: { type: 'string' },
        explanation_es: { type: 'string' },
        category: { type: 'string', enum: CATEGORIES },
        spanish: { type: 'string' },
      },
    },
    reply: { type: 'string' },
  },
}

interface RawTeacherResponse {
  heard_speech: boolean
  transcript: string
  correction: {
    has_error: boolean
    original: string
    corrected: string
    explanation_es: string
    category: MistakeCategory
    spanish: string
  }
  reply: string
}

export interface TeacherResponse {
  heardSpeech: boolean
  transcript: string
  reply: string
  correction: Correction | null
}

export const START_MESSAGE = '(The lesson starts now. Greet the student in one short sentence and ask your first question.)'

const AUDIO_INSTRUCTION =
  'This audio is the student\'s answer. Fill "transcript" with exactly what they said, word by word, keeping their grammar mistakes, then correct and reply.'

export function buildSystemPrompt(profile: Profile, scenario: Scenario, recent: Mistake[]): string {
  const recentList = recent.length
    ? recent.map((m) => `- "${m.original}" → "${m.corrected}" (${m.category})`).join('\n')
    : '- (none yet)'

  return `You are "Habla", a warm, patient English speaking coach. You talk with one adult student by voice: you receive each of the student's answers as an audio recording, and your reply is read aloud by a text-to-speech voice.

# The student
- Native language: Spanish.
- Levels: overall ${profile.levels.overall}; grammar ${profile.levels.grammar}; reading ${profile.levels.reading}; listening ${profile.levels.listening}; speaking ${profile.levels.speaking}.
- About: ${profile.about}
- Goal: ${profile.goal}
- Known weaknesses:
${profile.weaknesses.map((w) => `  - ${w}`).join('\n')}

# Transcribing the audio
- "transcript": write EXACTLY what the student said, verbatim. Do NOT fix grammar, word choice or word order: the mistakes are what we need to see. Keep hesitations like "uh" or "um" only when clearly audible. If they switch to Spanish, write those words in Spanish.
- If the audio has no intelligible speech (silence, noise, a cough), set heard_speech to false, leave transcript empty, set has_error to false, and put in "reply" a short friendly request to repeat.
- For text messages (not audio), set heard_speech to true and leave transcript empty.

# How you speak
- Keep every reply SHORT: 1 to 3 short sentences. The student must talk much more than you.
- Use clear, natural spoken English at about B1 level. No lists, no markdown, no emojis, no parentheses: everything you write will be spoken aloud.
- ALWAYS end your reply with exactly one open question that invites a long answer (why, how, tell me about, what happened, what would you do).
- React briefly and genuinely to what the student said before asking the next question, like a real conversation partner.
- If the answer is very short (under about 10 words), ask a follow-up that pushes for details, reasons or an example.
- If the student speaks Spanish or doesn't know how to say something, give the English expression in a few words and invite them to try the sentence again.
- Do NOT explain the correction inside "reply"; the app shows it on screen separately.

# Correcting
- Look only at the student's LAST answer. Correct exactly ONE error: the most important one. Priority: errors that change the meaning, then the student's known weaknesses (articles and uncountable nouns, missing auxiliary verbs, passive voice, false friends like actually/currently), then other grammar, then word choice.
- Ignore natural speech features: filler words, repetitions, self-corrections, and accent. Only correct pronunciation if it made a word impossible to understand.
- If there is no real error, set has_error to false and leave original, corrected, explanation_es and spanish as empty strings (category "other").
- "original": the student's sentence (or the relevant part, max about 15 words) exactly as they said it.
- "corrected": that same fragment with the minimal change that makes it correct and natural.
- "explanation_es": one short sentence in Spanish explaining the rule, e.g. "Software es incontable: no lleva plural ni 'a'."
- "spanish": a natural Spanish translation of the corrected fragment (it will be used later as a translation drill).

# Recent mistakes of this student (bring these structures up naturally when you can)
${recentList}

# Today's scenario
${scenario.brief}`
}

export interface AudioInput {
  base64: string
  mimeType: string
}

/**
 * Un turno del profe. Con `audio`, Gemini transcribe la respuesta del alumno, la corrige y contesta
 * en una sola llamada. El historial previo va como texto (transcripciones) para ahorrar tokens.
 */
export async function teacherTurn(
  apiKey: string,
  model: string,
  system: string,
  history: ChatMessage[],
  audio?: AudioInput,
): Promise<TeacherResponse> {
  const contents: GeminiContent[] = toContents(history)
  if (audio) {
    contents.push({
      role: 'user',
      parts: [{ inlineData: { mimeType: audio.mimeType, data: audio.base64 } }, { text: AUDIO_INSTRUCTION }],
    })
  }

  const raw = await askGemini<RawTeacherResponse>(apiKey, model, { system, contents, schema: TEACHER_SCHEMA })
  const c = raw.correction
  const hasError =
    c?.has_error && c.original?.trim() && c.corrected?.trim() && c.original.trim() !== c.corrected.trim()
  return {
    heardSpeech: raw.heard_speech !== false,
    transcript: (raw.transcript ?? '').trim(),
    reply: (raw.reply ?? '').trim(),
    correction: hasError
      ? {
          original: c.original.trim(),
          corrected: c.corrected.trim(),
          explanationEs: (c.explanation_es ?? '').trim(),
          category: CATEGORIES.includes(c.category) ? c.category : 'other',
          spanish: (c.spanish ?? '').trim(),
        }
      : null,
  }
}
