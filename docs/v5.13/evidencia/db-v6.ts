// Arnés 5.13 (NO es parte de la app): crea la base `habla` tal como la dejaba la 5.12 (Dexie v6, con un dato de «Lo que
// recuerda tu profe»), para comprobar en el navegador que la v7 de la 5.13 (tabla `challenges`) la migra sin tocar nada.
import Dexie from 'dexie'
import { seedV5 } from '../../v5.12/evidencia/db-v5'

export async function seedV6(now = Date.now()): Promise<number> {
  await seedV5(now)
  const old = new Dexie('habla')
  old.version(1).stores({ sessions: '++id, startedAt, scenario', turns: '++id, sessionId, createdAt', mistakes: '++id, sessionId, createdAt, category', profile: 'id' })
  old.version(2).stores({ lookups: '++id, createdAt' })
  old.version(3).stores({ cards: '++id, due, &[source+sourceId]' })
  old.version(4).stores({ grammar: 'id, lastAt' })
  old.version(5).stores({ sounds: 'id, lastAt', milestones: 'id, at' })
  old.version(6).stores({ facts: '++id, createdAt' })
  await old.open()
  await old.table('facts').add({ text: 'Su nieta se llama Ana y vive en Londres.', createdAt: now })
  const v = old.verno
  old.close()
  return v
}
