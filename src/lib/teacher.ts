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
import { topicIdsForPrompt, validTopicId } from './grammar'
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
  required: ['heard_speech', 'transcript', 'corrections', 'reply', 'reply_es'],
  properties: {
    heard_speech: { type: 'boolean' },
    transcript: { type: 'string' },
    // Todos los errores reales de la respuesta (NC-03), cada uno con su corrección. Vacío si no hay errores.
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original', 'corrected', 'explanation_es', 'category', 'spanish', 'grammar_topics'],
        properties: {
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanation_es: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          spanish: { type: 'string' },
          // v5.10 (D3): id del tema de Gramática de la corrección, o "" (sin enum: la lista de ids va en el prompt).
          grammar_topics: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    reply: { type: 'string' },
    reply_es: { type: 'string' },
  },
}

interface RawTeacherResponse {
  heard_speech: boolean
  transcript: string
  corrections: {
    original: string
    corrected: string
    explanation_es: string
    category: MistakeCategory
    spanish: string
    grammar_topics?: string[]
    grammar_topic?: string // respuestas antiguas o modelos que no sigan el esquema
  }[]
  reply: string
  reply_es: string
}

export interface TeacherResponse {
  heardSpeech: boolean
  transcript: string
  reply: string
  replyEs: string
  /** Todos los errores de la respuesta, en el orden en que aparecen. */
  corrections: Correction[]
}

export const START_MESSAGE =
  '(A NEW lesson starts now. Greet the student in one short, energetic sentence and start the conversation as described in "Today\'s session".)'

const AUDIO_INSTRUCTION =
  'This audio is the student\'s answer. Fill "transcript" with exactly what they said, word by word, keeping their grammar mistakes, then correct and reply. ' +
  // v5.10 (P6, uso real): la voz del teléfono leyendo una idea de «¿Qué digo?» se colaba en la grabación.
  'Transcribe only the student\'s own voice: ignore any synthetic or text-to-speech voice, music or background speech. If only such a voice is audible, set heard_speech to false.'

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// 5.10.1 (REG-A1-04): titubeos que no cuentan como «algo tuyo» en ningún sitio de la frase…
const HESITATIONS = new Set(['um', 'umm', 'uh', 'uhm', 'er', 'erm', 'eh', 'ah', 'hmm', 'mm', 'mmm'])
// …y muletillas que, en lo que DIJISTE, solo se ignoran al principio o al final («so, I think…», «…was, yeah»).
const EDGE_FILLERS = new Set([...HESITATIONS, 'so', 'and', 'yeah', 'well', 'like', 'okay', 'ok'])

/** Las palabras de una frase sin mayúsculas, puntuación ni titubeos (um, uh…). */
const plainWords = (s: string): string[] =>
  fold(s)
    .split(' ')
    .filter((x) => x && !HESITATIONS.has(x))

/**
 * v5.10 (P6): ¿la transcripción es una de las ideas de «¿Qué digo?» que se acaban de enseñar? Si lo «dicho» es solo la
 * idea, lo más probable es que el micro captara la voz del teléfono leyéndola (la voz lee el texto tal cual).
 * 5.10.1 (REG-A1-04): solo cuenta la idea EXACTA y ENTERA (sin mayúsculas, puntuación ni «…»). En lo dicho se ignoran
 * los titubeos y las muletillas de los extremos («so», «yeah»…); en la idea solo los titubeos, porque «well», «like» o
 * «so» pueden ser contenido (REV-D4-01: idea «I don't sleep well» + «I don't sleep» es una respuesta, no la idea).
 * Antes bastaba con empezar igual y añadir hasta 2 palabras, y se rechazaban respuestas reales de un A2 que hace justo lo
 * que pide «¿Qué digo?» («…my weekend was the party»).
 */
export function echoesIdea(transcript: string, ideas: readonly { en: string }[]): boolean {
  const said = plainWords(transcript)
  if (!said.length) return false
  let lead = 0
  while (lead < said.length && EDGE_FILLERS.has(said[lead])) lead++
  let trail = 0
  while (trail < said.length - lead && EDGE_FILLERS.has(said[said.length - 1 - trail])) trail++
  return ideas.some((i) => {
    const idea = plainWords(i?.en ?? '').join(' ')
    if (!idea) return false
    // Lo dicho, quitando de 0 a todas las muletillas de cada extremo, tiene que ser la idea entera.
    for (let a = 0; a <= lead; a++) {
      for (let b = 0; b <= trail; b++) {
        if (said.slice(a, said.length - b).join(' ') === idea) return true
      }
    }
    return false
  })
}

/**
 * 5.10.1 (REG-A3-15): coherencia entre lo que se dice y lo que se corrige en TODAS las clases (antes solo estaba en el
 * brief de Gramática): con correcciones en pantalla, el profe no puede decir «Great English!».
 */
export const REPLY_AGREES =
  '- "reply" must agree with "corrections": if "corrections" is not empty, never call the answer correct, perfect, great English or spot on; react to the content and, if you praise, praise the idea, not the grammar.'

/** v5.10 (D3): ids de los temas de Gramática, compactos (solo ids, ~1–2 KB), para que el profe marque cada corrección. */
function grammarIds(): string {
  const ids = topicIdsForPrompt()
  return ids ? `- Grammar topic ids: ${ids}` : '- (no grammar topics available: always use "")'
}

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
- If the audio has no intelligible speech (silence, noise, a cough), set heard_speech to false, leave transcript empty and put in "reply" a short friendly request to repeat.
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
- Look only at the student's LAST answer and list EVERY real error in it, in the order they appear: grammar, word choice, word order, missing words, false friends. A long answer with several mistakes must get several corrections; do not stop at the first one. One item per error (do not merge two different errors into one item).
- Ignore natural speech features: filler words, repetitions, self-corrections, and accent. Only correct pronunciation if it made a word impossible to understand.
- If there is no real error, "corrections" is an empty array.
- Never "correct" something that is already correct English. Before reporting an error, check that your corrected version really is better and means what the student meant; if you are not sure, leave it out. A correct sentence must never get a correction.
- "original": the fragment with the error (max about 15 words) exactly as the student said it.
- "corrected": that same fragment with the minimal change that makes it correct and natural.
- "explanation_es": one short sentence in Spanish explaining the rule, e.g. "Software es incontable: no lleva plural ni 'a'."
- "spanish": a natural Spanish translation of the corrected fragment (it will be used later as a translation drill).
- "grammar_topics": the ids of the grammar topics the error belongs to (1–3, the most relevant first), chosen ONLY from the list below (the app links the correction to their explanations). Include EVERY topic the correction involves: e.g. "in my breakfast" → "for breakfast" involves both prepositions of time and for/since/during/ago. Use [] for pure vocabulary or pronunciation errors, or when no topic clearly fits.
${grammarIds()}
${REPLY_AGREES}

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
/** v5.10 (P5): temas válidos de una corrección (máx. 3, sin repetir); el primero también en `grammarTopic`. */
export function grammarFields(c: { grammar_topics?: unknown; grammar_topic?: unknown }): { grammarTopic?: string; grammarTopics?: string[] } {
  const raw = Array.isArray(c.grammar_topics) ? c.grammar_topics : [c.grammar_topic]
  const ids = [...new Set(raw.map(validTopicId).filter((x): x is string => !!x))].slice(0, 3)
  return ids.length ? { grammarTopic: ids[0], grammarTopics: ids } : {}
}

export async function teacherTurn(
  apiKey: string,
  models: Models,
  system: string,
  history: ChatMessage[],
  answer?: AudioInput | TextInput,
  onRetry?: (info: RetryInfo) => void,
  /**
   * 5.11 (M-06): instrucción de ESTE turno (turnStyle.ts › turnInstruction), o ''. Va al final del prompt de sistema
   * solo en esta petición: no entra en el historial ni en la clase guardada, y con '' el prompt es el de siempre.
   */
  turnNote = '',
): Promise<TeacherResponse> {
  const sys = turnNote ? `${system}\n\n${turnNote}` : system
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
    (model) => askGemini<RawTeacherResponse>(apiKey, model, { system: sys, contents, schema: TEACHER_SCHEMA }),
    onRetry,
  )
  // 5.10.1 (REG-A2-05): tipos defensivos. Con el esquema Gemini respeta los tipos, pero un modelo de respaldo o un
  // reintento sin esquema podría mandar un número u objeto, y `.trim()` lanzaría un TypeError en inglés.
  const corrections: Correction[] = (Array.isArray(raw.corrections) ? raw.corrections : [])
    .map((c) => ({ c, original: str(c?.original), corrected: str(c?.corrected) }))
    .filter(({ original, corrected }) => original && corrected && original !== corrected)
    .map(({ c, original, corrected }) => ({
      original,
      corrected,
      explanationEs: str(c.explanation_es),
      category: CATEGORIES.includes(c.category) ? c.category : 'other',
      spanish: str(c.spanish),
      // v5.10: solo ids que existen en el catálogo; uno inventado o vacío no se guarda.
      ...grammarFields(c),
    }))
  return {
    heardSpeech: raw.heard_speech !== false,
    transcript: str(raw.transcript),
    reply: tidyReply(str(raw.reply)),
    replyEs: tidyReply(str(raw.reply_es)),
    corrections,
  }
}

/**
 * 5.10.1 (5.8c, uso real): la respuesta se pinta y se lee en una sola línea. Gemini a veces separa con un salto de
 * línea y sin espacio («Remember:» + salto + «at is for times») y en pantalla salía «Remember:at». Los saltos pasan a
 * un espacio y tras «:» seguido de una letra se pone uno (en inglés las horas van con cifras: «10:30» no cambia).
 */
export const tidyReply = (s: string): string =>
  s
    .replace(/[ \t]*[\r\n]+[ \t]*/g, ' ')
    .replace(/:(?=\p{L})/gu, ': ')
    .replace(/ {2,}/g, ' ')
    .trim()

/** 5.10.1 (REG-A2-05): texto de una respuesta de la IA, o '' si no es una cadena. */
export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * 5.10.1 (REG-A3-04): tramos de la respuesta del profe en la clase de Gramática, listos para leer cada uno con su voz.
 * El brief obliga a poner TODO el español entre « » (y el inglés citado entre "…"), así que aquí no se adivina: lo de
 * dentro de « » es español y el resto, inglés. Las comillas « » se quitan (no se leen). Fuera de la clase de Gramática
 * no hace falta: la respuesta del profe es solo inglés.
 */
export function replySegments(reply: string): { lang: 'es' | 'en'; text: string }[] {
  const out: { lang: 'es' | 'en'; text: string }[] = []
  const push = (lang: 'es' | 'en', text: string) => {
    if (!text.trim()) return
    const cur = out.at(-1)
    // Puntuación suelta («?», «.»): se queda con el tramo anterior (ayuda a la pausa y no crea un tramo vacío).
    if (cur && !/[\p{L}\p{N}]/u.test(text)) cur.text += text.trim()
    else if (cur && cur.lang === lang) cur.text += ` ${text.trim()}`
    else out.push({ lang, text: text.trim() })
  }
  let last = 0
  for (const m of reply.matchAll(/«([^»]*)»/g)) {
    push('en', reply.slice(last, m.index))
    push('es', m[1])
    last = m.index! + m[0].length
  }
  push('en', reply.slice(last))
  return out
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
