import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { BACKUP_FORMAT, backupVersionFor, exportTables, MAX_BACKUP_BYTES, parseBackup, type CheckedBackup } from './backupCheck'
import { db, TABLES } from './db'
import { clearSavedClass } from './savedClass'
import { resetPracticeSeconds } from './stats'
import { clearDraft, clearProgress } from './testDraft'

// Copia de seguridad en JSON de todo el progreso (IndexedDB).
// Las claves API NO se incluyen: se quedan solo en Preferences del teléfono.

// Formato y validación de la copia: backupCheck.ts (AUD-SEG-501).
interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function buildBackup(): Promise<Backup> {
  const all: Record<string, unknown[]> = {}
  for (const t of TABLES) all[t] = await db.table(t).toArray()
  // 5.11 (S-01): Sonidos y logros solo si tienen algo (sin ellos, la copia la lee igual la 5.10.1); con algo, versión 3.
  const tables = exportTables(all)
  // 5.10.1 (REG-A1-07, decisión del dueño): con Gramática la copia es versión 2, así una app 5.8/5.9 dice «Actualiza la
  // app» en vez de «archivo dañado» (o de perder el progreso de Gramática sin avisar). Sin Gramática sigue siendo 1.
  return { format: BACKUP_FORMAT, version: backupVersionFor(tables as Parameters<typeof backupVersionFor>[0]), exportedAt: new Date().toISOString(), tables }
}

export interface ExportResult {
  savedPath?: string
}

export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 1)
  const fileName = `habla-backup-${new Date().toISOString().slice(0, 10)}.json`

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    return {}
  }

  // 1) Intento guardar una copia en Documentos/Habla (visible con el explorador de archivos).
  let savedPath: string | undefined
  try {
    await Filesystem.writeFile({
      path: `Habla/${fileName}`,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    savedPath = `Documentos/Habla/${fileName}`
  } catch {
    // Algunas versiones de Android no lo permiten; seguimos con compartir.
  }

  // 2) Abro "Compartir" para mandarlo a Drive, correo, WhatsApp o al PC.
  const cached = await Filesystem.writeFile({
    path: fileName,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  try {
    await Share.share({ title: 'Copia de seguridad de Habla', files: [cached.uri] })
  } catch {
    // El usuario cerró el diálogo de compartir: no es un error.
  } finally {
    forgetSharedFile(fileName)
  }
  return { savedPath }
}

/** 5.10.1 (REG-A2-04, FUG-403): archivos que Habla deja en la caché solo para Compartir (copia y resumen del test). */
export const SHARE_CACHE_FILE = /^habla-(backup|test)-[\w.-]*\.(json|txt)$/

/** Margen antes de borrar: si la app destino (Drive, WhatsApp…) aún lee el archivo, ya tiene su permiso de URI. */
const SHARE_GRACE_MS = 60_000

/**
 * 5.10.1 (REG-A2-04, FUG-403): la copia (perfil y todas tus transcripciones en claro) y el resumen del test se quedaban
 * para siempre en la caché tras Compartir. Se borran 60 s después (el temporizador se congela en segundo plano, así que
 * en la práctica es al volver a la app) y, por si la app se cerró antes, al siguiente arranque (`cleanShareCache`).
 */
export function forgetSharedFile(fileName: string) {
  setTimeout(() => {
    Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {})
  }, SHARE_GRACE_MS)
}

/** Al arrancar (App.tsx): borra de la caché las copias y resúmenes compartidos que quedaran. Nunca falla. */
export async function cleanShareCache(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0
  let n = 0
  try {
    const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache })
    for (const f of files) {
      const name = typeof f === 'string' ? f : f.name
      if (!SHARE_CACHE_FILE.test(name)) continue
      await Filesystem.deleteFile({ path: name, directory: Directory.Cache }).then(
        () => n++,
        () => {},
      )
    }
  } catch {
    // Sin caché o sin permiso: no hay nada que limpiar.
  }
  return n
}

export interface ImportSummary {
  sessions: number
  mistakes: number
  /** v5.9: dónde quedó la copia automática de lo que había antes de importar (solo en el teléfono). */
  safetyCopy?: string
}

/** Copia leída y comprobada, lista para importar (todavía no se ha tocado nada). */
export interface ReadyBackup {
  backup: CheckedBackup
  summary: ImportSummary
}

/**
 * Lee el archivo y lo comprueba entero (AUD-SEG-501). Si algo falla, lanza un error en español y NO toca los datos.
 * Se separa de `applyBackup` para poder enseñar el resumen antes de sustituir nada.
 */
export async function readBackup(file: File): Promise<ReadyBackup> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo es demasiado grande para ser una copia de Habla (máx. 20 MB); no se cambió nada.')
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error('No se pudo leer el archivo; no se cambió nada.')
  }
  const r = parseBackup(text)
  if (!r.ok) throw new Error(r.error)
  return { backup: r.backup, summary: { sessions: r.backup.tables.sessions.length, mistakes: r.backup.tables.mistakes.length } }
}

/** Sustituye TODO el progreso actual por el de una copia ya comprobada. Todo o nada (una sola transacción). */
export async function applyBackup(ready: ReadyBackup): Promise<ImportSummary> {
  const { tables } = ready.backup
  // v5.9 (INFORME §8.4.5): antes de sustituir nada se guarda una copia de lo que hay, por si la copia importada era
  // la equivocada. Si no se puede guardar, no se importa.
  let safetyCopy: string | undefined
  if (Capacitor.isNativePlatform()) {
    // Con segundos y milisegundos: dos importaciones seguidas no pisan la copia de lo que había al principio.
    const stamp = new Date().toISOString().slice(0, 23).replace(/[-:T.]/g, '')
    const fileName = `habla-antes-de-importar-${stamp}.json`
    try {
      await Filesystem.writeFile({
        path: `Habla/${fileName}`,
        data: JSON.stringify(await buildBackup(), null, 1),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      safetyCopy = `Documentos/Habla/${fileName}`
    } catch {
      throw new Error('No se pudo guardar una copia de tus datos actuales antes de importar, así que no se importó nada.')
    }
  }
  try {
    await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
      for (const t of TABLES) {
        await db.table(t).clear()
        if (tables[t].length) await db.table(t).bulkPut(tables[t])
      }
    })
  } catch {
    // AUD-SEG-510: nada de mensajes internos de Dexie en inglés. La transacción deshace todo.
    throw new Error('No se pudo importar la copia (la base de datos la rechazó). No se cambió nada.')
  }
  // AUD-FLU-219: la clase guardada y los borradores del test apuntaban a sesiones de ANTES de importar: fuera.
  await Promise.all([clearSavedClass().catch(() => {}), clearDraft(), clearProgress()])
  resetPracticeSeconds() // los minutos del repaso eran de los datos de antes
  return { ...ready.summary, safetyCopy }
}

/** Comprueba la copia y, si es buena, sustituye todo el progreso por el suyo. */
export async function importBackup(file: File): Promise<ImportSummary> {
  return applyBackup(await readBackup(file))
}
