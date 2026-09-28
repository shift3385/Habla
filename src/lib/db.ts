import Dexie, { type EntityTable } from 'dexie'

export interface WordTiming {
  word: string
  start: number // segundos
  end: number
}

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

export interface Session {
  id?: number
  scenario: string
  startedAt: number
  endedAt?: number
}

export interface Turn {
  id?: number
  sessionId: number
  role: 'user' | 'teacher'
  text: string
  createdAt: number
  words?: WordTiming[] // solo turnos del usuario (timestamps de Whisper)
  audioSeconds?: number // duración grabada
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
