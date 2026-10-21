import Dexie, { type EntityTable } from 'dexie'
import type { StudyPlan } from './plan'
import type { TestSummary } from './testSummary'
import type { PronResult } from './pronunciation'

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
  /** v5.10: tema de Gramática de la corrección (id de src/grammar). Las correcciones antiguas no lo tienen. */
  grammarTopic?: string
  /** v5.10 (P5): todos los temas de la corrección (1–3); `grammarTopic` es el primero, por compatibilidad. */
  grammarTopics?: string[]
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
  grammarTopic?: string // v5.10: id del tema de Gramática si fue «Practicar en una clase»
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
  /** Pronunciación evaluada por Azure (corrector fonético opcional). */
  pronunciation?: PronResult
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
  /** Resumen final del test (aciertos por parte, cada pregunta y el habla) para verlo y guardarlo luego. */
  summary?: TestSummary
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
  // v5.10 (punto 3): del MISMO sentido que en el contexto. Opcionales: las consultas guardadas antes no los tienen.
  synonyms?: string[]
  antonyms?: string[]
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
  /** v5.10: 'grammar' = ejercicio de Gramática fallado (sourceId = exerciseCardId del ejercicio, grammar.ts). */
  source: 'mistake' | 'lookup' | 'grammar'
  sourceId: number
  promptEs: string
  answerEn: string
  hintEs: string
  createdAt: number
  due: number // copia de fsrs.due para poder indexar
  fsrs: StoredFsrs
  /** v5.9: «Ya me la sé»: no vuelve al repaso hasta que la recuperes en Palabras → Ya las sé. */
  archivedAt?: number
}

/**
 * v5.10: progreso de un tema de Gramática (clave: id del tema). Una ronda = todos los ejercicios del tema una vez;
 * cuenta el primer intento. «Dominado» = ≥ 80 % en la última ronda completa (grammar.ts, `isMasteryRound`).
 */
export interface GrammarProgress {
  id: string // id del tema (src/grammar/*.json)
  seenAt?: number // primera vez que abriste el tema
  lastAt: number // último uso (abrir, ejercicios)
  correct: number // aciertos al primer intento, acumulados
  attempts: number // ejercicios hechos, acumulados
  rounds: number // rondas completas
  spoken?: number // v5.10 (D2): intentos de «Dilo tú» evaluados
  spokenOk?: number // de ellos, correctos
  lastRound?: { correct: number; total: number; at: number }
  mastered: boolean
  masteredAt?: number
}

/** 5.11 (S-01): estado de un sonido en la tabla. Nuevo → visto → practicado → dominado (nunca baja). */
export type SoundState = 'new' | 'seen' | 'practiced' | 'mastered'

/** 5.11 (S-01): aciertos de un día (clave AAAA-MM-DD en `SoundProgress.listen` y `SoundProgress.azure`). */
export interface SoundDayScore {
  ok: number
  total: number
}

/**
 * 5.11 (S-01): progreso de «Sonidos» (tabla `sounds`). Dos clases de fila en la misma tabla:
 * - un **sonido** (clave = id de la ficha de src/sounds/phonemes.json: `ih`, `th`, `s-cluster`…; `kind` ausente);
 * - una **lección** de la ruta (clave = `lesson:<id>`, p. ej. `lesson:V1`; `kind: 'lesson'`).
 * «Dominado» (sounds.ts, `masteryOf`): ≥ 85 % en «Escucha» y, con Azure, nota del sonido ≥ 80 en 4 de 5 palabras, en
 * dos días distintos; sin Azure basta «Escucha» y se marca `earOnly` («solo de oído»).
 */
export interface SoundProgress {
  id: string
  kind?: 'lesson'
  seenAt?: number // primera vez que abriste la ficha o la lección
  lastAt: number // último uso
  state: SoundState
  /** Rondas de «Escucha» por día: aciertos / total. */
  listen?: Record<string, SoundDayScore>
  /** Palabras dichas con Azure por día: con nota del sonido ≥ 80 / evaluadas. */
  azure?: Record<string, SoundDayScore>
  bestScore?: number // mejor nota de Azure del sonido (0–100)
  days?: string[] // días (AAAA-MM-DD) en que lo practicaste, sin repetir, en orden
  mastered: boolean
  masteredAt?: number
  earOnly?: boolean // dominado sin Azure: «solo de oído»
  completedAt?: number // lecciones: primera vez que llegaste al cierre
  seconds?: number // lecciones: tiempo acumulado (también suma a la meta del día, addPracticeSeconds)
}

/**
 * 5.11 (S-01, para M-03): un hito conseguido (tabla `milestones`, clave = id del hito de milestones.ts). Se guarda una
 * sola vez: así un hito no se celebra dos veces, ni tras recargar ni tras restaurar una copia.
 */
export interface Milestone {
  id: string
  at: number // cuándo se consiguió
  celebratedAt?: number // cuándo lo celebró la mascota (si ya lo hizo)
}

export const db = new Dexie('habla') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  turns: EntityTable<Turn, 'id'>
  mistakes: EntityTable<Mistake, 'id'>
  profile: EntityTable<Profile, 'id'>
  lookups: EntityTable<Lookup, 'id'>
  cards: EntityTable<SrsCard, 'id'>
  grammar: EntityTable<GrammarProgress, 'id'>
  sounds: EntityTable<SoundProgress, 'id'>
  milestones: EntityTable<Milestone, 'id'>
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

// v5.10: progreso de Gramática. Solo añade una tabla: los datos de las versiones anteriores no se tocan.
db.version(4).stores({
  grammar: 'id, lastAt',
})

// 5.11 (S-01): progreso de Sonidos y hitos conseguidos. Igual que la v4, solo añade tablas: nada de lo anterior cambia.
db.version(5).stores({
  sounds: 'id, lastAt',
  milestones: 'id, at',
})

export const TABLES = ['sessions', 'turns', 'mistakes', 'profile', 'lookups', 'cards', 'grammar', 'sounds', 'milestones'] as const
