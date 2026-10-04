import { Preferences } from '@capacitor/preferences'
import { db, type Topic } from './db'
import { sessionMetrics } from './fluency'
import type { ChatMessage } from './gemini'

// Clase en progreso (NC-16): una sola entrada que se sobrescribe. Los mensajes y las correcciones ya viven en
// la base de datos (tabla turns, por sessionId); aquí se guarda lo necesario para retomar la clase en el mismo
// punto: qué clase era, el prompt del profe, el historial que se le manda a Gemini y la mascota.

export interface SavedClass {
  sessionId: number
  scenarioId: string
  categoryId?: string
  customTopic?: string
  planLesson?: string
  topic?: Topic
  system: string
  history: ChatMessage[]
  mascot: string // tema/mascota con la que se hizo
  title: string // para la tarjeta "Continuar clase"
  turns: number // respuestas del alumno hasta ahora
  savedAt: number
}

const KEY = 'habla.savedClass'

export async function getSavedClass(): Promise<SavedClass | null> {
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (!value) return null
    const s = JSON.parse(value) as SavedClass
    // Si la sesión ya no existe (p. ej. se borraron los datos), no hay nada que retomar.
    const session = await db.sessions.get(s.sessionId)
    return session && !session.endedAt ? s : null
  } catch {
    return null
  }
}

export async function saveClass(s: SavedClass): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) })
}

export async function clearSavedClass(): Promise<void> {
  await Preferences.remove({ key: KEY })
}

/**
 * Empezar una clase nueva descarta la guardada: su sesión se cierra tal como quedó (cuenta en tu progreso,
 * pero ya no se puede continuar).
 */
export async function discardSavedClass(): Promise<void> {
  const s = await getSavedClass()
  await clearSavedClass()
  if (!s) return
  const turns = await db.turns.where('sessionId').equals(s.sessionId).sortBy('createdAt')
  const metrics = sessionMetrics(turns)
  if (metrics) await db.sessions.update(s.sessionId, { endedAt: Date.now(), metrics })
  else await db.sessions.delete(s.sessionId)
}
