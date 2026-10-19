import { db, type Lookup, type LookupResult } from './db'
import { askGemini, withRetry, type JsonSchema, type Models, type RetryInfo } from './gemini'
import { MAX_RELATED, relatedWords, type LookupRelation } from './lookupStack'

// Consulta de palabras EN CONTEXTO: no es una traducción literal, sino qué significa la palabra en esa frase.

const SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headword',
    'ipa',
    'part_of_speech',
    'translation',
    'meaning_es',
    'why_es',
    'other_meanings',
    'register',
    'collocations',
    'false_friend_es',
    'example_en',
    'example_es',
    'synonyms',
    'antonyms',
  ],
  properties: {
    headword: { type: 'string' },
    ipa: { type: 'string' },
    part_of_speech: { type: 'string' },
    translation: { type: 'string' },
    meaning_es: { type: 'string' },
    why_es: { type: 'string' },
    other_meanings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['meaning_es', 'example_en', 'example_es'],
        properties: { meaning_es: { type: 'string' }, example_en: { type: 'string' }, example_es: { type: 'string' } },
      },
    },
    register: { type: 'string' },
    collocations: { type: 'array', items: { type: 'string' } },
    false_friend_es: { type: 'string' },
    example_en: { type: 'string' },
    example_es: { type: 'string' },
    // v5.10 (punto 3): relaciones léxicas del mismo sentido; se tocan para consultarlas sin salir de la hoja.
    synonyms: { type: 'array', items: { type: 'string' } },
    antonyms: { type: 'array', items: { type: 'string' } },
  },
}

interface Raw {
  headword: string
  ipa: string
  part_of_speech: string
  translation: string
  meaning_es: string
  why_es: string
  other_meanings: { meaning_es: string; example_en: string; example_es: string }[]
  register: string
  collocations: string[]
  false_friend_es: string
  example_en: string
  example_es: string
  synonyms?: string[]
  antonyms?: string[]
}

export async function lookupWord(
  apiKey: string,
  models: Models,
  query: string,
  context: string,
  level: string,
  onRetry?: (i: RetryInfo) => void,
  relation?: LookupRelation,
): Promise<Lookup> {
  const q = query.trim()
  const ctx = context.trim()
  const task = `A Spanish-speaking learner of English (level ${level}) asks about: "${q}"
${ctx ? `It appeared in this sentence/context: "${ctx}"` : 'No context was given: explain the most common meaning and mention the main alternatives.'}
${relation ? relationLine(relation, q) : ''}

Explain it like a great bilingual teacher, NOT like a literal translator. The meaning depends on the context: focus on what it means HERE.
- If "${q}" is English: "translation" = the natural Spanish equivalent in this context.
- If "${q}" is Spanish: "headword" = the best English word/expression for this context, and "translation" = the original Spanish.
- "headword": the dictionary form (or the full phrasal verb / idiom if it is part of one in the context, e.g. "run into", "take off").
- "ipa": British or American IPA of the headword between slashes.
- "part_of_speech": in Spanish (verbo, sustantivo, phrasal verb, expresión…).
- "meaning_es": what it means in this context, in simple Spanish (1-2 sentences).
- "why_es": why it means that here (the clue in the sentence), in Spanish, 1-2 sentences.
- "other_meanings": up to 3 OTHER frequent meanings, each with a short English example and its Spanish translation. Empty if it really has one meaning.
- "register": in Spanish: formal / informal / neutro / coloquial / jerga / técnico, plus a short usage note.
- "collocations": up to 4 typical combinations in English (e.g. "make a decision").
- "false_friend_es": if it is a false friend for Spanish speakers (actually, assist, career…), a short warning in Spanish; otherwise "".
- "example_en"/"example_es": one new natural example with the SAME meaning as in the context, and its translation.
- "synonyms": 0-${MAX_RELATED} English synonyms of the headword with the SAME meaning it has in this context (most common first; single words or short expressions, no explanations). Empty if none fits well.
- "antonyms": 0-${MAX_RELATED} English antonyms of that SAME meaning. Empty if there is no natural antonym (do not force one).
Adapt the difficulty of the explanations to level ${level}.`

  const raw = await withRetry(
    models,
    (model) =>
      askGemini<Raw>(apiKey, model, {
        system: 'You are an expert bilingual (English–Spanish) teacher and lexicographer.',
        contents: [{ role: 'user', parts: [{ text: task }] }],
        schema: SCHEMA,
        temperature: 0.3,
      }),
    onRetry,
  )
  const result: LookupResult = {
    headword: raw.headword || q,
    ipa: raw.ipa ?? '',
    partOfSpeech: raw.part_of_speech ?? '',
    translation: raw.translation ?? '',
    meaningEs: raw.meaning_es ?? '',
    whyEs: raw.why_es ?? '',
    otherMeanings: (raw.other_meanings ?? [])
      .slice(0, 3)
      .map((m) => ({ meaningEs: m.meaning_es, exampleEn: m.example_en, exampleEs: m.example_es })),
    register: raw.register ?? '',
    collocations: (raw.collocations ?? []).slice(0, 4),
    falseFriendEs: raw.false_friend_es ?? '',
    exampleEn: raw.example_en ?? '',
    exampleEs: raw.example_es ?? '',
    synonyms: relatedWords(raw.synonyms, raw.headword || q),
    antonyms: relatedWords(raw.antonyms, raw.headword || q),
  }
  const lookup: Lookup = { query: q, context: ctx, result, saved: false, createdAt: Date.now() }
  lookup.id = await db.lookups.add(lookup)
  return lookup
}

/** Por qué se consulta: se tocó como sinónimo/antónimo de otra palabra; hay que explicarla en ese mismo sentido. */
function relationLine(r: LookupRelation, q: string): string {
  const kind = r.kind === 'synonym' ? 'a synonym' : 'an antonym'
  const sense = r.meaningEs ? ` (there it meant, in Spanish: "${r.meaningEs}")` : ''
  return (
    `The learner tapped it as ${kind} of "${r.of}" as used in that context${sense}. ` +
    `Explain "${q}" in the sense that makes it ${kind} of "${r.of}"; the context sentence is about "${r.of}", not about this word.`
  )
}

export async function setSaved(id: number, saved: boolean): Promise<void> {
  await db.lookups.update(id, { saved })
}

/** Frase que contiene la palabra tocada (para usarla como contexto). */
export function sentenceAround(text: string, wordStart: number): string {
  const before = text.slice(0, wordStart)
  const start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('? '), before.lastIndexOf('! '))
  const rest = text.slice(wordStart)
  const m = rest.search(/[.?!](\s|$)/)
  return text.slice(start < 0 ? 0 : start + 2, m < 0 ? text.length : wordStart + m + 1).trim()
}
