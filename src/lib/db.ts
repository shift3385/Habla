import Dexie, { type EntityTable } from 'dexie'
import type { StudyPlan } from './plan'

export type MistakeCategory =
  | 'article'
  | 'uncountable'
  | 'auxiliary'
  | 'false_friend'
  | 'tense'
  | 'preposition'
  | 'word_order'
  | 'vocabulary'
  | 'grammar'
  | 'other'

export interface Correction {
  original: string
  corrected: string
  explanationEs: string
  category: MistakeCategory
  spanish: string // la frase correcta traducida al español (para el ejercicio oral)
}

export interface VocabItem {
  en: string
  es: string
}

export interface Topic {
  category: string // id de TOPIC_CATEGORIES
  title: string // en inglés
  titleEs: string
  summary: string // 2–3 frases en inglés, lo que el profe "ha leído"
  question: string // pregunta de arranque
  vocab: VocabItem[]
  sources?: { title: string; uri: string }[]
}

export interface SessionMetrics {
  turns: number
  spokenTurns?: number // respuestas habladas (las escritas no cuentan para velocidad ni pausas)
  words: number
  speechSeconds: number
  wpm: number
  pauses: number
  pausesPerMin: number
  avgWords: number
  longestWords: number
  corrections: number
  score: number // 0–100
  level: string // A2, B1, B1+, B2, B2+
}

export interface SessionReport {
  summaryEs: string
  strengthsEs: string[]
  improveEs: string[]
  homeworkEs: string
  phrase: VocabItem
}

export interface Session {
  id?: number
  scenario: string
  startedAt: number
  endedAt?: number
  topic?: Topic
  metrics?: SessionMetrics
  report?: SessionReport
  planLesson?: string // id de la lección del plan (w3l2), si la clase era una lección del plan
}

export interface Turn {
  id?: number
  sessionId: number
  role: 'user' | 'teacher'
  text: string
  translation?: string // turnos del profe: traducción al español
  createdAt: number
  audioSeconds?: number // duración grabada
  speechSeconds?: number // de la primera a la última palabra (análisis local)
  pauses?: number[] // silencios ≥ 1 s dentro del habla, en segundos
  typed?: boolean // respuesta escrita con el teclado
  /** Primera corrección (las clases anteriores a la v5.7 solo guardaban una). */
  correction?: Correction
  /** Todas las correcciones de la respuesta (NC-03). */
  corrections?: Correction[]
}

/** Correcciones de una respuesta, también de las clases antiguas (que solo tenían una). */
export function turnCorrections(t: Turn): Correction[] {
  return t.corrections?.length ? t.corrections : t.correction ? [t.correction] : []
}

export interface Mistake extends Correction {
  id?: number
  sessionId: number
  turnId: number
  createdAt: number
}

export interface Profile {
  id: 'me'
  levels: {
    overall: string
    grammar: string
    reading: string
    listening: string
    speaking: string
  }
  about: string // a qué se dedica (texto libre del usuario)
  weaknesses: string[]
  goal: string
  startedAt: number
  name?: string
  purposes?: string[] // ids de PURPOSES
  interests?: string[] // títulos de las categorías de temas que le interesan
  /** Fecha del último test de calibración. Sin él, la app obliga a hacer el test. */
  calibratedAt?: number
  tests?: CalibrationRecord[]
  /** Cambios de nivel por la práctica (no los puede editar el usuario). */
  levelEvents?: LevelEvent[]
  /** Plan de 12 semanas (fase 4). */
  plan?: StudyPlan
  /** Lo que proponen las clases desde el último test (no cambia el nivel; pesa un 30 % en el re-test). */
  trajectory?: { speaking?: string; date: number; sessions: number }
  /** Ítems del banco del test ya vistos y veces que se ha servido cada uno (rotación). */
  bankUsage?: { seen: string[]; uses: Record<string, number> }
}

export type Skill = 'grammar' | 'reading' | 'listening' | 'speaking'

export interface CalibrationRecord {
  date: number
  levels: Record<Skill | 'overall', string>
  speakingCriteria?: Record<string, string>
  strengthsEs: string[]
  weaknessesEs: string[]
  summaryEs: string
  grammarAnswers: { level: string; correct: boolean; unknown?: boolean; point?: string }[]
  /** Nivel que dio el test por sí solo (en el re-test, antes de ponderar con la trayectoria). */
  testLevels?: Record<Skill | 'overall', string>
  /** Trayectoria usada en el re-test (30 %). */
  trajectory?: Record<Skill, string>
  confidence?: Partial<Record<Skill, 'high' | 'medium' | 'low'>>
  /** Ítems del banco usados y versión del banco/modelo (para auditar cambios de nivel). */
  bankIds?: string[]
  bankVersion?: number
  model?: string
}

export interface LevelEvent {
  date: number
  skill: Skill | 'overall'
  from: string
  to: string
  reason: 'practice' | 'test'
}

export interface LookupResult {
  headword: string
  ipa: string
  partOfSpeech: string
  translation: string // equivalente natural en el otro idioma, en este contexto
  meaningEs: string // qué significa aquí
  whyEs: string // por qué en este contexto significa eso
  otherMeanings: { meaningEs: string; exampleEn: string; exampleEs: string }[]
  register: string
  collocations: string[]
  falseFriendEs: string // aviso si es falso amigo (vacío si no)
  exampleEn: string
  exampleEs: string
}

export interface Lookup {
  id?: number
  query: string
  context: string
  result: LookupResult
  saved: boolean
  createdAt: number
}

/** Estado FSRS guardado con fechas en milisegundos (serializa bien en IndexedDB y en las copias JSON). */
export interface StoredFsrs {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number // 0 nueva · 1 aprendiendo · 2 repaso · 3 reaprendiendo
  last_review: number | null
}

/** Tarjeta de repaso: frase en español → cómo se dice en inglés. */
export interface SrsCard {
  id?: number
  source: 'mistake' | 'lookup'
  sourceId: number
  promptEs: string
  answerEn: string
  hintEs: string
  createdAt: number
  due: number // copia de fsrs.due para poder indexar
  fsrs: StoredFsrs
}

export const db = new Dexie('habla') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  turns: EntityTable<Turn, 'id'>
  mistakes: EntityTable<Mistake, 'id'>
  profile: EntityTable<Profile, 'id'>
  lookups: EntityTable<Lookup, 'id'>
  cards: EntityTable<SrsCard, 'id'>
}

db.version(1).stores({
  sessions: '++id, startedAt, scenario',
  turns: '++id, sessionId, createdAt',
  mistakes: '++id, sessionId, createdAt, category',
  profile: 'id',
})

// v2: historial de consultas de palabras en contexto.
db.version(2).stores({
  lookups: '++id, createdAt',
})

// v3: tarjetas de repaso espaciado (FSRS).
db.version(3).stores({
  cards: '++id, due, &[source+sourceId]',
})

export const TABLES = ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards'] as const
