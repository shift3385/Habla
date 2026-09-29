import { CapacitorHttp } from '@capacitor/core'

export const DEFAULT_MODEL = 'gemini-3.8-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function toContents(history: ChatMessage[]): GeminiContent[] {
  return history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
}

interface AskOptions {
  system: string
  contents: GeminiContent[]
  schema: JsonSchema
  maxTokens?: number
}

/**
 * generateContent con salida JSON estructurada. Usa CapacitorHttp: en Android la petición sale por
 * la capa nativa (sin CORS); en el navegador de desarrollo cae a fetch (la API de Gemini admite CORS).
 * La clave va en la cabecera x-goog-api-key, nunca en la URL.
 */
export async function askGemini<T>(apiKey: string, model: string, opts: AskOptions): Promise<T> {
  const base = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
  }
  const config = { responseMimeType: 'application/json', maxOutputTokens: opts.maxTokens ?? 4096, temperature: 0.7 }
  // 1º intento: JSON Schema + razonamiento bajo (modelos Gemini 3.x).
  // 2º intento, si el modelo rechaza esos campos: esquema OpenAPI clásico y sin thinkingConfig.
  const attempts = [
    { ...base, generationConfig: { ...config, responseJsonSchema: opts.schema, thinkingConfig: { thinkingLevel: 'LOW' } } },
    { ...base, generationConfig: { ...config, responseSchema: toOpenApiSchema(opts.schema) } },
  ]

  let status = 0
  let data: GeminiResponse | null = null
  for (let i = 0; i < attempts.length; i++) {
    ;({ status, data } = await post(apiKey, `${BASE}/models/${model}:generateContent`, attempts[i]))
    const retryable = status === 400 && !isKeyError(data)
    if (!retryable) break
  }

  if (status !== 200) throw new ApiError(describeError(status, data, model), status)
  if (data?.promptFeedback?.blockReason) {
    throw new ApiError('Gemini bloqueó este mensaje. Prueba a decirlo de otra forma.', 200)
  }
  const cand = data?.candidates?.[0]
  const text = (cand?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('')
  const parsed = safeParse(text)
  if (!parsed) {
    const why = cand?.finishReason === 'MAX_TOKENS' ? ' (respuesta cortada)' : ''
    throw new ApiError(`Respuesta de Gemini incompleta${why}. Inténtalo de nuevo.`, 200)
  }
  return parsed as T
}

export interface ModelInfo {
  id: string
  displayName: string
}

/** Lista los modelos de texto disponibles para la clave. También sirve para validarla (no gasta cuota). */
export async function listModels(apiKey: string): Promise<ModelInfo[]> {
  let res
  try {
    res = await CapacitorHttp.get({
      url: `${BASE}/models?pageSize=1000`,
      headers: { 'x-goog-api-key': apiKey.trim() },
    })
  } catch {
    throw new ApiError('Sin conexión con Gemini. Revisa tu internet.', 0)
  }
  const data = parseData(res.data) as { models?: RawModel[] } | null
  if (res.status !== 200) throw new ApiError(describeError(res.status, data), res.status)
  return (data?.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), displayName: m.displayName ?? m.name }))
    .filter((m) => m.id.startsWith('gemini') && !/tts|image|embed|live|audio|native|robotics|computer/.test(m.id))
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
}

/** Elige un modelo razonable de la lista: el Flash más reciente (no Lite), si no el primero. */
export function pickDefaultModel(models: ModelInfo[]): string {
  const ids = models.map((m) => m.id)
  if (ids.includes(DEFAULT_MODEL)) return DEFAULT_MODEL
  return ids.find((id) => /^gemini-[\d.]+-flash$/.test(id)) ?? ids.find((id) => id.includes('flash')) ?? ids[0] ?? DEFAULT_MODEL
}

// ---------------------------------------------------------------------------

interface RawModel {
  name: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string; details?: { reason?: string }[] }
}

async function post(apiKey: string, url: string, body: unknown) {
  try {
    const res = await CapacitorHttp.post({
      url,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      data: body,
      connectTimeout: 15000,
      readTimeout: 90000,
    })
    return { status: res.status, data: parseData(res.data) as GeminiResponse | null }
  } catch {
    throw new ApiError('Sin conexión con Gemini. Revisa tu internet.', 0)
  }
}

function parseData(d: unknown) {
  return typeof d === 'string' ? safeParse(d) : d
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function isKeyError(data: GeminiResponse | null): boolean {
  const e = data?.error
  return !!e && (e.details?.some((d) => d.reason === 'API_KEY_INVALID') || /api key/i.test(e.message ?? ''))
}

export function describeError(status: number, data: unknown, model?: string): string {
  const d = data as GeminiResponse | null
  const msg = d?.error?.message
  if (isKeyError(d) || status === 401) return 'La clave de Gemini no es válida. Revísala en Ajustes.'
  if (status === 403) {
    return (
      'Tu clave de Gemini no tiene permiso para esta API. Crea una clave nueva en aistudio.google.com/apikey ' +
      `o quita las restricciones de la clave en Google Cloud.${msg ? ` Detalle de Google: ${msg}` : ''}`
    )
  }
  if (status === 404) return `El modelo "${model ?? ''}" no está disponible. Elige otro en Ajustes.`
  if (status === 429) return 'Gemini: límite de uso alcanzado. Espera un minuto o revisa tu cuota en Google AI Studio.'
  if (status === 400 && /location|region|country/i.test(msg ?? '')) {
    return 'Gemini no está disponible desde tu país con esta clave. Detalle de Google: ' + msg
  }
  if (status >= 500) return `Gemini tiene problemas ahora mismo (${status}). Inténtalo en un momento.`
  return `Gemini devolvió un error ${status}${msg ? `: ${msg}` : ''}`
}

// ---------------------------------------------------------------------------
// Esquemas

export interface JsonSchema {
  type: 'object' | 'string' | 'boolean' | 'number' | 'integer' | 'array'
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean
  enum?: string[]
  items?: JsonSchema
  description?: string
}

/** JSON Schema → subconjunto OpenAPI de responseSchema (tipos en mayúsculas, sin additionalProperties). */
function toOpenApiSchema(s: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: s.type.toUpperCase() }
  if (s.description) out.description = s.description
  if (s.enum) out.enum = s.enum
  if (s.required) out.required = s.required
  if (s.items) out.items = toOpenApiSchema(s.items)
  if (s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toOpenApiSchema(v)]))
    out.propertyOrdering = Object.keys(s.properties)
  }
  return out
}
