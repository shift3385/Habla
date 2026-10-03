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
  /** Tema libre: lo que escribió el alumno, tal cual. */
  custom?: string
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

/** Temas favoritos: exactamente 3 (son los que se ven en el Inicio, sin scroll). */
export const FAV_COUNT = 3

/** ¿El perfil tiene exactamente 3 temas favoritos válidos? Si no, la app pide elegirlos. */
export function hasValidFavorites(interests: string[] | undefined): boolean {
  const ok = (interests ?? []).filter((id) => TOPIC_CATEGORIES.some((c) => c.id === id))
  return ok.length === FAV_COUNT && new Set(ok).size === FAV_COUNT
}

/** Los 3 temas favoritos, en el orden del catálogo. */
export function favoriteCategories(interests: string[] | undefined): TopicCategory[] {
  return TOPIC_CATEGORIES.filter((c) => (interests ?? []).includes(c.id)).slice(0, FAV_COUNT)
}

// "Tema libre": el tema lo escribe el alumno (también vale para proponer el tema de un debate).
export const CUSTOM_ID = 'custom'
const CUSTOM_BASE: TopicCategory = {
  id: CUSTOM_ID,
  title: 'Tema libre',
  emoji: '✍️',
  icon: 'pencil',
  live: false,
  brief: 'a topic chosen by the student',
}

export function customCategory(text: string): TopicCategory {
  return {
    ...CUSTOM_BASE,
    brief: `exactly this topic, chosen by the student: "${text.trim()}"`,
    custom: text.trim(),
  }
}

export function getCategory(id: string): TopicCategory {
  if (id === CUSTOM_ID) return CUSTOM_BASE
  return TOPIC_CATEGORIES.find((c) => c.id === id) ?? TOPIC_CATEGORIES[0]
}

/** Categoría al azar, evitando las usadas en las últimas sesiones. */
/** Categoría al azar sin repetir las recientes; el 70 % de las veces, de los intereses del usuario. */
export async function randomCategory(): Promise<TopicCategory> {
  const recent = (await recentTopics(4)).map((t) => t.category)
  const interests = (await db.profile.get('me'))?.interests ?? []
  const pool = TOPIC_CATEGORIES.filter((c) => !recent.includes(c.id))
  const list = pool.length ? pool : TOPIC_CATEGORIES
  const favs = list.filter((c) => interests.includes(c.id))
  const from = favs.length && Math.random() < 0.7 ? favs : list
  return from[Math.floor(Math.random() * from.length)]
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
  // Con tema libre manda el alumno: no se evita nada aunque ya se haya hablado de ello.
  const avoid =
    category.id === CUSTOM_ID ? '- (none)' : (await recentTopics(15)).map((t) => `- ${t.title}`).join('\n') || '- (none)'
  const today = new Date().toISOString().slice(0, 10)
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]

  const lv = (await db.profile.get('me'))?.levels ?? { overall: 'B1', speaking: 'B1' }
  const system = `You pick conversation topics for an English speaking class. The student is a Spanish speaker at ${lv.overall} level (speaking ${lv.speaking}) who wants varied, modern, engaging conversations.`
  // Tema libre: se respeta EXACTAMENTE lo que pidió el alumno (sin "ángulo" al azar ni noticia inventada).
  const task = category.custom
    ? `The student chose the topic of today's conversation: "${category.custom}".
Keep EXACTLY their topic: the same place, people, things and idea. Do not add a twist, do not make it futuristic, do not invent news or facts that the student did not mention. If it is personal (their trip, their job, their plans), keep it personal.
`
    : `Today is ${today}. Find ${category.brief}. Prefer something ${angle}.
Do NOT pick anything similar to these recent topics:
${avoid}

Return ONLY a JSON object with:
- "title": short catchy title in English (max 8 words)
- "title_es": the same title in Spanish
- "summary": ${
    category.custom
      ? `2-3 simple sentences in English (${lv.overall} level) introducing the student's topic with real, general facts that help them talk about it`
      : `2-3 simple sentences in English (${lv.overall} level) explaining it, as if you read it today${category.live ? ', with concrete facts (who, what, where, when)' : ''}`
  }
- "question": one open, personal question to start the conversation about it${category.custom ? " (about the student's own experience, plans or opinion on this exact topic)" : ''}
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
      // La búsqueda en Google tiene su propia cuota: si se agota, se recuerda y el tema se genera sin ella.
      const res = await withRetry(
        { ...models, quotaScope: 'search', timeoutMs: 25_000 },
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
