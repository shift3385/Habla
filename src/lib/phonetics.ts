import { hasMonitor, monthUsage, type Usage } from './azureUsage'
import { AzureError, assessPronunciation, assessWord, type PronResult, type WordScore } from './pronunciation'
import type { Settings } from './settings'
import { toWav16k, WORD_PAD_MS } from './wav'

// Política del corrector fonético (Azure). Es opcional: sin credenciales o desactivado, todo va solo con Gemini.
// El plan elegido en Ajustes solo REFLEJA el plan del recurso de Azure; cambiarlo se hace en el portal de Azure.
// Al agotarse el F0, Azure no cobra ni cambia de plan: deja de procesar hasta el mes siguiente.

export type AzurePlan = 'F0' | 'S0batch' | 'S0payg'

export const PLANS: { key: AzurePlan; title: string; price: string; perHour: number }[] = [
  { key: 'F0', title: 'F0 · gratis', price: '5 h de audio al mes', perHour: 0 },
  { key: 'S0batch', title: 'S0 Batch', price: '≈ $0.18 por hora de audio', perHour: 0.18 },
  { key: 'S0payg', title: 'S0 Pago por uso', price: '≈ $1.30 por hora de audio', perHour: 1.3 },
]

/** "cada 10 minutos de audio ≈ $0.03" */
export function costEstimate(plan: AzurePlan): string {
  const p = PLANS.find((x) => x.key === plan)!
  if (!p.perHour) return 'gratis hasta 5 h al mes'
  return `cada 10 minutos de audio ≈ $${(p.perHour / 6).toFixed(2)}`
}

export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

export const hasAzure = (s: Settings) => !!(s.azureKey.trim() && s.azureRegion.trim())

export const monitorCreds = (s: Settings) => ({ tenantId: s.azureTenantId, clientId: s.azureClientId, clientSecret: s.azureClientSecret, resourceId: s.azureResourceId })

const PLAN_SHORT: Record<AzurePlan, string> = { F0: 'F0', S0batch: 'S0 Batch', S0payg: 'S0 por uso' }

/** Para la tarjeta de Ajustes: el modelo de fonética ("Azure F0", "Azure S0 Batch") o null si no hay credenciales. */
export const azureModelName = (s: Settings): string | null => (hasAzure(s) ? `Azure ${PLAN_SHORT[s.azurePlan]}` : null)

/** Estado de la fonética: "activa", "apagada", "agotada" (F0 de este mes) o "sin fonética". */
export function phoneticsState(s: Settings): string {
  if (!hasAzure(s)) return 'sin fonética'
  if (s.azurePlan === 'F0' && s.f0ExhaustedMonth === monthKey()) return 'fonética agotada'
  return `fonética ${s.phoneticsOn ? 'activa' : 'apagada'}`
}

/** ¿Se usa el corrector en esta respuesta? */
export function phoneticsActive(s: Settings): boolean {
  if (!hasAzure(s) || !s.phoneticsOn) return false
  return !(s.azurePlan === 'F0' && s.f0ExhaustedMonth === monthKey())
}

export interface StartupCheck {
  patch: Partial<Settings>
  /** La mascota avisa: el F0 se agotó este mes (y, si el plan es de pago, la tarifa). */
  alert: boolean
  usage?: Usage
}

/**
 * Comprobación al abrir la app. Con el plan F0: si quedan horas (según Azure Monitor), la fonética se activa por
 * defecto (salvo que la apagaras tú); si no quedan, se desactiva y la mascota avisa una vez al mes.
 * Sin service principal no se puede saber lo consumido: se usa la señal de cuota agotada de las respuestas.
 */
export async function startupCheck(s: Settings): Promise<StartupCheck> {
  if (!hasAzure(s) || s.azurePlan !== 'F0') return { patch: {}, alert: false }
  const month = monthKey()
  let exhausted = s.f0ExhaustedMonth === month
  let usage: Usage | undefined
  if (!exhausted && hasMonitor(monitorCreds(s))) {
    try {
      usage = await monthUsage(monitorCreds(s))
      exhausted = usage.remainingSeconds <= 0
    } catch {
      // Sin dato de consumo: se decide con la señal de cuota de las respuestas.
    }
  }
  if (exhausted) {
    const alert = s.phoneticsAlertMonth !== month
    return { patch: { phoneticsOn: false, f0ExhaustedMonth: month, ...(alert ? { phoneticsAlertMonth: month } : {}) }, alert, usage }
  }
  // Quedan horas: activada por defecto, salvo que la apagaras tú.
  return { patch: s.phoneticsOn || s.phoneticsUserOff ? {} : { phoneticsOn: true }, alert: false, usage }
}

/** Azure respondió "cuota excedida": F0 agotado este mes. Se desactiva y la mascota avisa. */
export function quotaExhaustedPatch(): Partial<Settings> {
  const month = monthKey()
  return { phoneticsOn: false, f0ExhaustedMonth: month, phoneticsAlertMonth: month }
}

// Aviso de la mascota (lo escucha App y lo muestra encima de cualquier pantalla).
type Listener = () => void
const listeners = new Set<Listener>()
export function onPhoneticsQuota(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export const reportPhoneticsQuota = () => listeners.forEach((fn) => fn())

/**
 * v5.9 (nota del dueño): evaluación fonética común a todo lo que graba (clase, prácticas, temas, repaso y test).
 * Devuelve la nota de Azure, el motivo (texto) por el que no hay nota, o null si la fonética está apagada.
 * Con el F0 agotado apaga la fonética y avisa a la mascota, como hacía la clase.
 */
export function runPhonetics(
  s: Settings,
  update: (p: Partial<Settings>) => void,
  blob: Blob,
  reference: () => Promise<string>,
): Promise<PronResult | string> | null {
  if (!phoneticsActive(s)) return null
  return (async () => (await assessPronunciation(s.azureKey, s.azureRegion, await toWav16k(blob), reference)) ?? NO_SPEECH)().catch(azureFailure(update))
}

const NO_SPEECH = 'Azure no oyó habla clara en este audio'

/** Fallo de Azure → texto para el alumno. Con el F0 agotado apaga la fonética y avisa a la mascota. */
const azureFailure = (update: (p: Partial<Settings>) => void) => (e: unknown) => {
  if (e instanceof AzureError && e.kind === 'quota') {
    // F0 agotado este mes: se apaga la fonética, sigue solo Gemini y la mascota avisa.
    update(quotaExhaustedPatch())
    reportPhoneticsQuota()
  } else console.warn('[HABLA-NET] azure:', (e as Error).message)
  return e instanceof AzureError ? e.message : 'No se pudo preparar el audio para Azure'
}

/**
 * 5.11 (S-06): nota de una palabra o frase conocida en Sonidos (`say-word`, `say-pair`), con la MISMA política que la
 * clase: null si la fonética está apagada, sin Azure o con el F0 agotado este mes (no llama: «sin nota», y Sonidos
 * ofrece «Escúchate»); el texto del motivo si Azure falla o no oyó habla. Una sola petición, con 300 ms de silencio
 * delante y detrás. `target` es el sonido que se practica, en IPA (`/θ/` → 'θ').
 */
export function runWordPhonetics(
  s: Settings,
  update: (p: Partial<Settings>) => void,
  blob: Blob,
  reference: string,
  target?: string,
): Promise<WordScore | string> | null {
  if (!phoneticsActive(s) || !reference.trim()) return null
  return (async () => (await assessWord(s.azureKey, s.azureRegion, await toWav16k(blob, { padMs: WORD_PAD_MS }), reference, target)) ?? NO_SPEECH)().catch(
    azureFailure(update),
  )
}
