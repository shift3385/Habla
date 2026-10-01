import { db, type Topic } from './db'
import type { IconName } from '../ui/icons'
import { askGeminiMeta, withRetry, type JsonSchema, type Models, type RetryInfo } from './gemini'

export interface TopicCategory {
  id: string
  title: string // UI en español
  emoji: string
  icon: IconName
  /** true = noticia real y reciente buscada con Google Search */
  live: boolean
  brief: string // qué tipo de tema buscar (en inglés, para el modelo)
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  { id: 'news', title: 'Noticias de hoy', emoji: '📰', icon: 'news', live: true, brief: 'an interesting, non-tragic world news story from the last few days (science, society, culture, economy)' },
  { id: 'ai', title: 'IA y nuevos modelos', emoji: '🤖', icon: 'ai', live: true, brief: 'a recent development in artificial intelligence: a new model release, a breakthrough, a company announcement, a regulation or a surprising use case' },
  { id: 'tech', title: 'Tecnología y gadgets', emoji: '📱', icon: 'gadget', live: true, brief: 'recent consumer technology news: phones, gadgets, apps, gaming, cars, social media' },
  { id: 'business', title: 'Negocios y mercados', emoji: '🌍', icon: 'chart', live: true, brief: 'recent business or market news from another country: e-commerce trends, how a product is selling abroad, retail, exports, consumer habits' },
  { id: 'startups', title: 'Startups y emprendimiento', emoji: '🚀', icon: 'rocket', live: true, brief: 'a recent story about a startup, a founder, a funding round or a new business idea' },
  { id: 'science', title: 'Ciencia y espacio', emoji: '🔭', icon: 'planet', live: true, brief: 'a recent discovery in science, health, space exploration or the environment' },
  { id: 'travel', title: 'Viajes y culturas', emoji: '✈️', icon: 'globe', live: false, brief: 'a fascinating place, custom or tradition somewhere in the world, or a travel dilemma' },
  { id: 'movies', title: 'Cine, series y música', emoji: '🎬', icon: 'film', live: true, brief: 'a recent or popular movie, TV series, album or pop-culture moment' },
  { id: 'food', title: 'Comida', emoji: '🍜', icon: 'food', live: false, brief: 'food culture: a dish from some country, eating habits, cooking, restaurants or a food trend' },
  { id: 'sports', title: 'Deportes', emoji: '⚽', icon: 'ball', live: true, brief: 'a recent sports event, athlete story or sports business news' },
  { id: 'money', title: 'Dinero y finanzas', emoji: '💸', icon: 'money', live: false, brief: 'personal finance or the economy: saving, investing, inflation, prices, side hustles' },
  { id: 'whatif', title: '¿Y si…?', emoji: '🌀', icon: 'what', live: false, brief: 'a fun hypothetical "what if" question (e.g. what if you could live in any decade, what if AI ran a city) that sparks imagination' },
]

export function getCategory(id: string): TopicCategory {
  return TOPIC_CATEGORIES.find((c) => c.id === id) ?? TOPIC_CATEGORIES[0]
}

/** Categoría al azar, evitando las usadas en las últimas sesiones. */
export async function randomCategory(): Promise<TopicCategory> {
  const recent = (await recentTopics(4)).map((t) => t.category)
  const pool = TOPIC_CATEGORIES.filter((c) => !recent.includes(c.id))
  const list = pool.length ? pool : TOPIC_CATEGORIES
  return list[Math.floor(Math.random() * list.length)]
}

async function recentTopics(n: number): Promise<Topic[]> {
  const sessions = await db.sessions.orderBy('startedAt').reverse().limit(30).toArray()
  return sessions.map((s) => s.topic).filter((t): t is Topic => !!t).slice(0, n)
}

const TOPIC_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'title_es', 'summary', 'question', 'vocab'],
  properties: {
    title: { type: 'string' },
    title_es: { type: 'string' },
    summary: { type: 'string' },
    question: { type: 'string' },
    vocab: {
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

interface RawTopic {
  title: string
  title_es: string
  summary: string
  question: string
  vocab: { en: string; es: string }[]
}

const ANGLES = ['surprising', 'funny', 'controversial', 'inspiring', 'practical', 'futuristic', 'unusual', 'personal']

/**
 * Genera el tema de la sesión. Las categorías "live" buscan una noticia real con Google Search;
 * si la búsqueda falla (cuota, modelo sin soporte…), se genera un tema sin búsqueda.
 */
export async function generateTopic(
  apiKey: string,
  models: Models,
  category: TopicCategory,
  onRetry?: (info: RetryInfo) => void,
): Promise<Topic> {
  const avoid = (await recentTopics(15)).map((t) => `- ${t.title}`).join('\n') || '- (none)'
  const today = new Date().toISOString().slice(0, 10)
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]

  const system = `You pick conversation topics for an English speaking class. The student is a Spanish speaker at B1 level (speaking A2) who wants varied, modern, engaging conversations.`
  const task = `Today is ${today}. Find ${category.brief}. Prefer something ${angle}.
Do NOT pick anything similar to these recent topics:
${avoid}

Return ONLY a JSON object with:
- "title": short catchy title in English (max 8 words)
- "title_es": the same title in Spanish
- "summary": 2-3 simple sentences in English (B1 level) explaining it, as if you read it today${category.live ? ', with concrete facts (who, what, where, when)' : ''}
- "question": one open, personal question to start the conversation about it
- "vocab": exactly 3 useful English words or short phrases from this topic with their Spanish translation, as [{"en": "...", "es": "..."}]`

  const contents = [{ role: 'user' as const, parts: [{ text: task }] }]

  const toTopic = (raw: RawTopic, sources: Topic['sources']): Topic => ({
    category: category.id,
    title: String(raw.title ?? '').trim(),
    titleEs: String(raw.title_es ?? '').trim(),
    summary: String(raw.summary ?? '').trim(),
    question: String(raw.question ?? '').trim(),
    vocab: (Array.isArray(raw.vocab) ? raw.vocab : []).filter((v) => v?.en && v?.es).slice(0, 3),
    sources: sources?.slice(0, 3),
  })

  if (category.live) {
    try {
      const res = await withRetry(
        models,
        (model) => askGeminiMeta<RawTopic>(apiKey, model, { system, contents, grounded: true, temperature: 1 }),
        onRetry,
      )
      const topic = toTopic(res.data, res.sources)
      if (topic.title && topic.summary) return topic
    } catch {
      // Sin búsqueda en Google: seguimos con un tema generado.
    }
  }

  const res = await withRetry(
    models,
    (model) => askGeminiMeta<RawTopic>(apiKey, model, { system, contents, schema: TOPIC_SCHEMA, temperature: 1 }),
    onRetry,
  )
  return toTopic(res.data, [])
}
