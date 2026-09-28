import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db, TABLES } from './db'

// Copia de seguridad en JSON de todo el progreso (IndexedDB).
// Las claves API NO se incluyen: se quedan solo en Preferences del teléfono.

const FORMAT = 'habla-backup'
const VERSION = 1

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function buildBackup(): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) tables[t] = await db.table(t).toArray()
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), tables }
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
  }
  return { savedPath }
}

export interface ImportSummary {
  sessions: number
  mistakes: number
}

/** Sustituye TODO el progreso actual por el del archivo. */
export async function importBackup(file: File): Promise<ImportSummary> {
  let data: Backup
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (data?.format !== FORMAT || typeof data.tables !== 'object') {
    throw new Error('Este archivo no es una copia de seguridad de Habla.')
  }
  if (data.version > VERSION) {
    throw new Error('La copia es de una versión más nueva de Habla. Actualiza la app primero.')
  }

  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = data.tables[t]
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows)
    }
  })

  return {
    sessions: data.tables.sessions?.length ?? 0,
    mistakes: data.tables.mistakes?.length ?? 0,
  }
}
