// Aviso global de problemas con Gemini: cuando una llamada falla de verdad (tras los reintentos automáticos),
// la app enseña a la mascota proponiendo otro modelo u otra clave, esté donde esté el usuario.

export type TroubleKind = 'slow' | 'quota' | 'key' | 'model'

export interface Trouble {
  kind: TroubleKind
  message: string
  model?: string
}

type Listener = (t: Trouble) => void
const listeners = new Set<Listener>()

export function onGeminiTrouble(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Clasifica un error de la API (status HTTP) en algo que el usuario puede arreglar; null si no lo es. */
export function troubleKind(status: number, transient: boolean): TroubleKind | null {
  if (status === 429) return 'quota'
  if (status === 401 || status === 403) return 'key'
  if (status === 404) return 'model'
  if (transient) return 'slow' // 0 (sin respuesta / tardó demasiado), 500, 502, 503, 504
  return null
}

export function reportGeminiTrouble(t: Trouble) {
  listeners.forEach((fn) => fn(t))
}
