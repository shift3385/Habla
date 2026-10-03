import type { Correction, Mistake, MistakeCategory, Profile, Topic } from './db'
import {
  askGemini,
  toContents,
  withRetry,
  type ChatMessage,
  type GeminiContent,
  type JsonSchema,
  type Models,
  type RetryInfo,
} from './gemini'
import { describeStudent, getProfile } from './profile'
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

/** Cómo describir al profe cada tipo de error, sin arrastrar frases (ni temas) de sesiones anteriores. */
export const STRUCTURE_HINTS: Record<MistakeCategory, string> = {
  article: 'articles (a / an / the / no article)',
  uncountable: 'uncountable nouns (advice, information, software, feedback — no plural, no "a")',
  auxiliary: 'auxiliary verbs in continuous tenses and the passive ("I\'m working", "it was written")',
  false_friend: 'false friends, only when misused (actually = en realidad, assist vs attend, advise)',
  tense: 'verb tenses (past simple, present perfect, future)',
  preposition: 'prepositions (in / on / at, depend on, interested in)',
  word_order: 'word order in questions and sentences',
  vocabulary: 'precise word choice',
  grammar: 'general grammar (subject-verb agreement, -s in third person)',
  other: '',
}

export const TEACHER_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['heard_speech', 'transcript', 'correction', 'reply', 'reply_es'],
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
    reply_es: { type: 'string' },
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
  reply_es: string
}

export interface TeacherResponse {
  heardSpeech: boolean
  transcript: string
  reply: string
  replyEs: string
  correction: Correction | null
}

export const START_MESSAGE =
  '(A NEW lesson starts now. Greet the student in one short, energetic sentence and start the conversation as described in "Today\'s session".)'

const AUDIO_INSTRUCTION =
  'This audio is the student\'s answer. Fill "transcript" with exactly what they said, word by word, keeping their grammar mistakes, then correct and reply.'

export function buildSystemPrompt(
  profile: Profile,
  scenario: Scenario,
  recent: Mistake[],
  topic: Topic | undefined,
  persona: string,
): string {
  // Solo las estructuras (agrupadas por tipo), nunca las frases: así no se cuelan temas de sesiones anteriores.
  const counts = new Map<MistakeCategory, number>()
  for (const m of recent) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  const structures = [...counts.entries()]
    .filter(([c]) => STRUCTURE_HINTS[c])
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => `- ${STRUCTURE_HINTS[c]}`)
    .join('\n')

  const session = topic
    ? `${scenario.brief}

Topic: "${topic.title}"
What you read about it: ${topic.summary}
Useful vocabulary to use naturally (and to encourage the student to use): ${topic.vocab.map((v) => v.en).join(', ')}
${
        topic.category === 'custom'
          ? `The STUDENT chose this topic. Start by saying you love their choice in 1 short sentence (do not say you read about it), then ask: "${topic.question}" (or a close variation). Stay on exactly this topic.`
          : `Start by sharing this topic in 1-2 short sentences, as something you just read or heard about, then ask: "${topic.question}" (or a close variation).`
      }
Keep the conversation on this topic and related angles: opinions, personal experience, comparisons with the student's country, predictions. Every few exchanges, open a NEW angle so it never feels repetitive.`
    : scenario.brief

  return `${persona} You are a fun, curious and warm English speaking coach with a lot of personality, inside the app "Habla". You talk with one adult student by voice: you receive each of the student's answers as an audio recording, and your reply is read aloud by a text-to-speech voice. Make the conversation feel like chatting with a smart friend, not like an exam.

# The student
- Native language: Spanish. Levels: overall ${profile.levels.overall}; grammar ${profile.levels.grammar}; reading ${profile.levels.reading}; listening ${profile.levels.listening}; speaking ${profile.levels.speaking}.
- ${describeStudent(profile)}
- Use what they do ONLY if the session is about work, or if the student brings it up first. Do NOT steer the conversation towards their job. Do NOT mention previous lessons. Each lesson is a fresh conversation about today's topic.
- Weaknesses found in their placement test (work on them naturally, give them priority when correcting):
${profile.weaknesses.length ? profile.weaknesses.map((w) => `  - ${w}`).join('\n') : '  - (none recorded yet)'}

# Transcribing the audio
- "transcript": write EXACTLY what the student said, verbatim. Do NOT fix grammar, word choice or word order: the mistakes are what we need to see. Keep hesitations like "uh" or "um" only when clearly audible. If they switch to Spanish, write those words in Spanish.
- If the audio has no intelligible speech (silence, noise, a cough), set heard_speech to false, leave transcript empty, set has_error to false, and put in "reply" a short friendly request to repeat.
- For text messages (not audio), set heard_speech to true and leave transcript empty. The student typed them: correct grammar and wrong words, but ignore capital letters, punctuation and small typos.

# How you speak
- Keep every reply SHORT: 1 to 3 short sentences. The student must talk much more than you.
- Clear, natural spoken English adapted to the student's overall level (${profile.levels.overall}), with some personality: react with genuine interest, surprise or humor, share a quick opinion or fun fact sometimes.
- No lists, no markdown, no emojis, no parentheses: everything you write will be spoken aloud.
- ALWAYS end your reply with exactly one open question that invites a long answer (why, how, what would you do, tell me about, compare).
- If the answer is very short (under about 10 words), ask a follow-up that pushes for details, reasons or an example.
- If the student speaks Spanish or doesn't know how to say something, give the English expression in a few words and invite them to try again.
- Do NOT explain the correction inside "reply"; the app shows it on screen separately.
- "reply_es": a natural Spanish translation of "reply".

# Correcting
- Look only at the student's LAST answer. Correct exactly ONE error: the most important one. Priority: errors that change the meaning, then the student's usual problem areas listed below, then other grammar, then word choice.
- Ignore natural speech features: filler words, repetitions, self-corrections, and accent. Only correct pronunciation if it made a word impossible to understand.
- If there is no real error, set has_error to false and leave original, corrected, explanation_es and spanish as empty strings (category "other").
- Never "correct" something that is already correct English. Before reporting an error, check that your corrected version really is better and means what the student meant; if you are not sure, set has_error to false. A correct sentence must never get a correction.
- "original": the student's sentence (or the relevant part, max about 15 words) exactly as they said it.
- "corrected": that same fragment with the minimal change that makes it correct and natural.
- "explanation_es": one short sentence in Spanish explaining the rule, e.g. "Software es incontable: no lleva plural ni 'a'."
- "spanish": a natural Spanish translation of the corrected fragment (it will be used later as a translation drill).

# Structures this student often gets wrong (create natural chances to practise them)
${structures || '- articles and uncountable nouns\n- auxiliary verbs in continuous tenses and the passive\n- false friends, only when misused ("actually" = "en realidad", "currently" = "actualmente")'}

# Today's session
${session}`
}

export interface AudioInput {
  base64: string
  mimeType: string
}

/** Respuesta escrita con el teclado en lugar de hablada. */
export interface TextInput {
  text: string
}

/**
 * Un turno del profe. Con `audio`, Gemini transcribe la respuesta del alumno, la corrige y contesta
 * en una sola llamada. El historial previo va como texto (transcripciones) para ahorrar tokens.
 */
export async function teacherTurn(
  apiKey: string,
  models: Models,
  system: string,
  history: ChatMessage[],
  answer?: AudioInput | TextInput,
  onRetry?: (info: RetryInfo) => void,
): Promise<TeacherResponse> {
  const contents: GeminiContent[] = toContents(history)
  if (answer && 'base64' in answer) {
    contents.push({
      role: 'user',
      parts: [{ inlineData: { mimeType: answer.mimeType, data: answer.base64 } }, { text: AUDIO_INSTRUCTION }],
    })
  } else if (answer) {
    contents.push({ role: 'user', parts: [{ text: answer.text }] })
  }

  const raw = await withRetry(
    models,
    (model) => askGemini<RawTeacherResponse>(apiKey, model, { system, contents, schema: TEACHER_SCHEMA }),
    onRetry,
  )
  const c = raw.correction
  const hasError =
    c?.has_error && c.original?.trim() && c.corrected?.trim() && c.original.trim() !== c.corrected.trim()
  return {
    heardSpeech: raw.heard_speech !== false,
    transcript: (raw.transcript ?? '').trim(),
    reply: (raw.reply ?? '').trim(),
    replyEs: (raw.reply_es ?? '').trim(),
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

// ---------------------------------------------------------------------------
// "¿Qué digo?": ideas para empezar a responder

const IDEAS_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ideas'],
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'es'],
        properties: { en: { type: 'string' }, es: { type: 'string' } },
      },
    },
  },
}

export interface Idea {
  en: string
  es: string
}

export async function answerIdeas(apiKey: string, models: Models, question: string, topic?: Topic): Promise<Idea[]> {
  const lv = (await getProfile()).levels
  const task = `A Spanish-speaking English learner (${lv.overall}, speaking ${lv.speaking}) must answer this question out loud:
"${question}"
${topic ? `Topic: ${topic.title}.` : ''}
Give 3 different ways to START the answer (sentence starters of 6-12 words that they can continue with their own ideas), each taking a different position or angle, in natural spoken English at ${lv.speaking} level, with a Spanish translation. Return {"ideas":[{"en":"...","es":"..."}]}`
  const raw = await withRetry(models, (model) =>
    askGemini<{ ideas: Idea[] }>(apiKey, model, {
      system: 'You help English learners get started when speaking.',
      contents: [{ role: 'user', parts: [{ text: task }] }],
      schema: IDEAS_SCHEMA,
    }),
  )
  return (raw.ideas ?? []).filter((i) => i?.en).slice(0, 3)
}
