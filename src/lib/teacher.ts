import { askClaude, type ChatMessage } from './claude'
import type { Correction, Mistake, MistakeCategory, Profile } from './db'
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

export const TEACHER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['correction', 'reply'],
  properties: {
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
  reply: string
  correction: Correction | null
}

export const START_MESSAGE = '(The lesson starts now. Greet the student in one short sentence and ask your first question.)'

export function buildSystemPrompt(profile: Profile, scenario: Scenario, recent: Mistake[]): string {
  const recentList = recent.length
    ? recent.map((m) => `- "${m.original}" → "${m.corrected}" (${m.category})`).join('\n')
    : '- (none yet)'

  return `You are "Habla", a warm, patient English speaking coach. You talk with one adult student by voice: the student's words reach you through speech-to-text, and your reply is read aloud by a text-to-speech voice.

# The student
- Native language: Spanish.
- Levels: overall ${profile.levels.overall}; grammar ${profile.levels.grammar}; reading ${profile.levels.reading}; listening ${profile.levels.listening}; speaking ${profile.levels.speaking}.
- About: ${profile.about}
- Goal: ${profile.goal}
- Known weaknesses:
${profile.weaknesses.map((w) => `  - ${w}`).join('\n')}

# How you speak
- Keep every reply SHORT: 1 to 3 short sentences. The student must talk much more than you.
- Use clear, natural spoken English at about B1 level. No lists, no markdown, no emojis, no parentheses: everything you write will be spoken aloud.
- ALWAYS end your reply with exactly one open question that invites a long answer (why, how, tell me about, what happened, what would you do).
- React briefly and genuinely to what the student said before asking the next question, like a real conversation partner.
- If the answer is very short (under about 10 words), ask a follow-up that pushes for details, reasons or an example.
- If the student speaks Spanish or doesn't know how to say something, give the English expression in a few words and invite them to try the sentence again.
- Do NOT explain the correction inside "reply"; the app shows it on screen separately.

# Correcting
- Look only at the student's LAST message. Correct exactly ONE error: the most important one. Priority: errors that change the meaning, then the student's known weaknesses (articles and uncountable nouns, missing auxiliary verbs, passive voice, false friends like actually/currently), then other grammar, then word choice.
- Ignore things that come from speech-to-text or natural speech: filler words (uh, um), repetitions, self-corrections, punctuation, capitalization, and spelling of names.
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

export async function teacherTurn(
  apiKey: string,
  system: string,
  history: ChatMessage[],
): Promise<TeacherResponse> {
  const raw = await askClaude<RawTeacherResponse>(apiKey, {
    system,
    messages: history,
    schema: TEACHER_SCHEMA,
  })
  const c = raw.correction
  const hasError = c?.has_error && c.original.trim() && c.corrected.trim() && c.original.trim() !== c.corrected.trim()
  return {
    reply: raw.reply.trim(),
    correction: hasError
      ? {
          original: c.original.trim(),
          corrected: c.corrected.trim(),
          explanationEs: c.explanation_es.trim(),
          category: c.category,
          spanish: c.spanish.trim(),
        }
      : null,
  }
}
