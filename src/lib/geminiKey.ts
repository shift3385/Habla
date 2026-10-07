import { listModels, pickDefaultModel, pickFallbackModel, type ModelInfo } from './gemini'
import type { Settings } from './settings'

// AUD-FLU-209 (v5.8.2): una clave de Gemini nueva se comprueba ANTES de guardarla. Antes, en Ajustes se guardaba
// primero y se comprobaba después (una clave mal copiada pisaba la buena y la app se quedaba sin IA) y en la hoja
// de problemas («Usar esta clave») no se comprobaba nunca. Pedir la lista de modelos valida la clave sin gastar cuota.

export type KeyCheck = { ok: true; patch: Partial<Settings>; model: string } | { ok: false; error: string }

/**
 * Comprueba la clave con Google y devuelve los ajustes a guardar (clave + modelos válidos para ella).
 * Si falla, no devuelve nada que guardar: quien llama conserva la clave anterior.
 * `list` se puede sustituir en las pruebas (sin red).
 */
export async function verifyGeminiKey(
  key: string,
  current: Pick<Settings, 'geminiModel' | 'geminiFallbackModel'>,
  list: (k: string) => Promise<ModelInfo[]> = listModels,
): Promise<KeyCheck> {
  const k = key.trim()
  if (!k) return { ok: false, error: 'Pega tu clave de Gemini.' }
  let models: ModelInfo[]
  try {
    models = await list(k)
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'No se pudo comprobar la clave.' }
  }
  // Si el modelo elegido no existe para esta clave, se elige uno bueno automáticamente.
  const model = models.some((m) => m.id === current.geminiModel) ? current.geminiModel : pickDefaultModel(models)
  const fallback =
    models.some((m) => m.id === current.geminiFallbackModel) && current.geminiFallbackModel !== model
      ? current.geminiFallbackModel
      : pickFallbackModel(models, model)
  return { ok: true, model, patch: { geminiKey: k, geminiModel: model, geminiFallbackModel: fallback, modelList: models.map((m) => m.id) } }
}
