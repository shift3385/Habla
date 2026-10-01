import Dexie, { type EntityTable } from 'dexie'

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
  correction?: Correction
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
  about: string
  weaknesses: string[]
  goal: string
  startedAt: number
}

export const db = new Dexie('habla') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  turns: EntityTable<Turn, 'id'>
  mistakes: EntityTable<Mistake, 'id'>
  profile: EntityTable<Profile, 'id'>
}

db.version(1).stores({
  sessions: '++id, startedAt, scenario',
  turns: '++id, sessionId, createdAt',
  mistakes: '++id, sessionId, createdAt, category',
  profile: 'id',
})

export const TABLES = ['sessions', 'turns', 'mistakes', 'profile'] as const
