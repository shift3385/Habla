import type { SpeakingAnswer, SpeakingTask, TaskAssessment } from './calibration'
import type { Level } from './levels'
import type { BlockResult, GrammarAnswer } from './placement'

// Test terminado pendiente de evaluar: respuestas, audios y evaluaciones parciales del habla.
// Se guarda en su propia base de datos (fuera del esquema de Dexie) antes de llamar a Gemini, para que un
// error, un modelo saturado o cerrar la app no obliguen a repetir el test. Se borra al guardar el resultado.

export interface TestDraft {
  v: 1
  savedAt: number
  gAnswers: GrammarAnswer[]
  gLevel: Level
  blocks: { reading: BlockResult[]; listening: BlockResult[] }
  tasks: SpeakingTask[]
  speech: (SpeakingAnswer | null | 'skipped')[]
  /** Evaluación de cada respuesta hecha mientras grababa las siguientes (null = falló o no llegó). */
  pre: (TaskAssessment | null)[]
  usedIds: string[]
}

const DB = 'habla-draft'
const STORE = 'kv'
const KEY = 'calibration'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export const saveDraft = (d: TestDraft) => run('readwrite', (s) => s.put(d, KEY)).then(() => undefined)
export const loadDraft = () => run<TestDraft | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined)
export const clearDraft = () => run('readwrite', (s) => s.delete(KEY)).then(() => undefined).catch(() => undefined)
