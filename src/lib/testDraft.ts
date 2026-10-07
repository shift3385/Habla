import type { SpeakingAnswer, SpeakingTask, TaskAssessment } from './calibration'
import type { Level } from './levels'
import type { BankUsage, GrammarItem } from './bank'
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

/**
 * Test A MEDIAS: lo hecho hasta ahora, guardado en cada punto seguro (cada respuesta de gramática, cada resumen de
 * una parte y cada tarea de habla). Si la app se cierra o se actualiza, el test sigue en ese paso. Se borra al terminar.
 */
export interface TestProgress {
  v: 1
  savedAt: number
  /** Paso donde retomar: 'grammar', 'review', 'section' (habla) o 'speaking'. */
  step: { k: string; [key: string]: unknown }
  gItems: GrammarItem[]
  gAnswers: GrammarAnswer[]
  gLevel: Level
  blocks: { reading: BlockResult[]; listening: BlockResult[] }
  tasks: SpeakingTask[]
  speech: (SpeakingAnswer | null | 'skipped')[]
  pre: (TaskAssessment | null)[]
  usedIds: string[]
  usage?: BankUsage
  /** v5.9: la pausa «seguir luego» ya se usó en este test (solo se permite una vez por test, decisión del dueño). */
  pauseUsed?: boolean
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

const PROGRESS = 'progress'
export const saveProgress = (p: TestProgress) => run('readwrite', (s) => s.put(p, PROGRESS)).then(() => undefined)
export const loadProgress = () => run<TestProgress | undefined>('readonly', (s) => s.get(PROGRESS)).catch(() => undefined)
export const clearProgress = () => run('readwrite', (s) => s.delete(PROGRESS)).then(() => undefined).catch(() => undefined)

/**
 * AUD-FLU-204 / AUD-MIC-311 (v5.9): un re-test que se quedó sin evaluar o a medias dejaba para siempre sus audios en
 * el teléfono. Solo para quien ya tiene nivel (el primer test es obligatorio y siempre se retoma): pasados
 * `maxDays` días sin volver, se borran.
 */
export async function expireRetestLeftovers(maxDays = 30): Promise<void> {
  const limit = Date.now() - maxDays * 864e5
  const [d, p] = await Promise.all([loadDraft(), loadProgress()])
  if (d && d.savedAt < limit) await clearDraft()
  if (p && p.savedAt < limit) await clearProgress()
}
