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
  /** Fecha del último test de calibración. Sin él, la app obliga a hacer el test. */
  calibratedAt?: number
  tests?: CalibrationRecord[]
  /** Cambios de nivel por la práctica (no los puede editar el usuario). */
  levelEvents?: LevelEvent[]
}

export type Skill = 'grammar' | 'reading' | 'listening' | 'speaking'

export interface CalibrationRecord {
  date: number
  levels: Record<Skill | 'overall', string>
  speakingCriteria?: Record<string, string>
  strengthsEs: string[]
  weaknessesEs: string[]
  summaryEs: string
  grammarAnswers: { level: string; correct: boolean }[]
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

export const db = new Dexie('habla') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  turns: EntityTable<Turn, 'id'>
  mistakes: EntityTable<Mistake, 'id'>
  profile: EntityTable<Profile, 'id'>
  lookups: EntityTable<Lookup, 'id'>
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

export const TABLES = ['sessions', 'turns', 'mistakes', 'profile', 'lookups'] as const
