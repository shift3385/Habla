import { CapacitorHttp } from '@capacitor/core'
import { reportGeminiTrouble, troubleKind } from './geminiTrouble'

export const DEFAULT_MODEL = 'gemini-3.8-flash'
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite'
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
  /** Errores pasajeros (saturación, cortes de red, respuesta cortada): vale la pena reintentar. */
  transient: boolean
  /** En un 429: si la cuota agotada es por minuto o por día, y cuánto pide Google esperar. */
  quota?: 'minute' | 'day'
  retryAfterMs?: number
  /** Google rechaza la clave (llega como 400 "API key not valid"). */
  keyError?: boolean
  constructor(message: string, status: number, transient = TRANSIENT_STATUS.has(status)) {
    super(message)
    this.status = status
    this.transient = transient
  }
}

/** Lee del error 429 de Google si la cuota es diaria y el tiempo de espera que sugiere (RetryInfo). */
function quotaInfo(data: GeminiResponse | null): Pick<ApiError, 'quota' | 'retryAfterMs'> {
  const details = data?.error?.details ?? []
  const text = JSON.stringify(details) + (data?.error?.message ?? '')
  const delay = details.find((d) => d.retryDelay)?.retryDelay
  const secs = delay ? parseFloat(delay) : NaN
  return {
    quota: /PerDay|per day|daily/i.test(text) ? 'day' : 'minute',
    retryAfterMs: Number.isFinite(secs) ? Math.max(10, secs) * 1000 : undefined,
  }
}

const TRANSIENT_STATUS = new Set([0, 429, 500, 502, 503, 504])

export function toContents(history: ChatMessage[]): GeminiContent[] {
  return history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
}

interface AskOptions {
  system: string
  contents: GeminiContent[]
  /** Salida JSON forzada por esquema. */
  schema?: JsonSchema
  /**
   * Búsqueda en Google (grounding) para temas de actualidad. No se combina con `schema`:
   * se pide el JSON en el texto y se extrae.
   */
  grounded?: boolean
  maxTokens?: number
  temperature?: number
}

export interface Source {
  title: string
  uri: string
}

export interface GeminiResult<T> {
  data: T
  sources: Source[]
}

/**
 * generateContent con salida JSON. Usa CapacitorHttp: en Android la petición sale por
 * la capa nativa (sin CORS); en el navegador de desarrollo cae a fetch (la API de Gemini admite CORS).
 * La clave va en la cabecera x-goog-api-key, nunca en la URL.
 */
export async function askGemini<T>(apiKey: string, model: string, opts: AskOptions): Promise<T> {
  return (await askGeminiMeta<T>(apiKey, model, opts)).data
}

export async function askGeminiMeta<T>(apiKey: string, model: string, opts: AskOptions): Promise<GeminiResult<T>> {
  const base = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
  }
  const config = { maxOutputTokens: opts.maxTokens ?? 4096, temperature: opts.temperature ?? 0.7 }
  const thinking = { thinkingConfig: { thinkingLevel: 'LOW' } }
  // 1º intento: con razonamiento bajo (modelos Gemini 3.x).
  // 2º intento, si el modelo rechaza algún campo (400): formato clásico, sin thinkingConfig.
  const attempts = opts.grounded
    ? [
        { ...base, tools: [{ googleSearch: {} }], generationConfig: { ...config, ...thinking } },
        { ...base, tools: [{ googleSearch: {} }], generationConfig: config },
      ]
    : [
        {
          ...base,
          generationConfig: {
            ...config,
            ...thinking,
            responseMimeType: 'application/json',
            ...(opts.schema ? { responseJsonSchema: opts.schema } : {}),
          },
        },
        {
          ...base,
          generationConfig: {
            ...config,
            responseMimeType: 'application/json',
            ...(opts.schema ? { responseSchema: toOpenApiSchema(opts.schema) } : {}),
          },
        },
      ]

  let status = 0
  let data: GeminiResponse | null = null
  for (let i = 0; i < attempts.length; i++) {
    ;({ status, data } = await post(apiKey, `${BASE}/models/${model}:generateContent`, attempts[i]))
    const retryable = status === 400 && !isKeyError(data)
    if (!retryable) break
  }

  if (status !== 200) {
    const err = new ApiError(describeError(status, data, model), status)
    if (status === 429) Object.assign(err, quotaInfo(data))
    if (isKeyError(data)) err.keyError = true
    throw err
  }
  if (data?.promptFeedback?.blockReason) {
    throw new ApiError('Gemini bloqueó este mensaje. Prueba a decirlo de otra forma.', 200)
  }
  const cand = data?.candidates?.[0]
  const text = (cand?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('')
  const parsed = safeParse(text) ?? extractJson(text)
  if (!parsed) {
    const why = cand?.finishReason === 'MAX_TOKENS' ? ' (respuesta cortada)' : ''
    throw new ApiError(`Respuesta de Gemini incompleta${why}. Inténtalo de nuevo.`, 200, true)
  }
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter((w): w is Source => !!w?.uri)
    .map((w) => ({ title: w.title ?? w.uri, uri: w.uri }))
  return { data: parsed as T, sources }
}

/** Extrae el primer objeto JSON de un texto (p. ej. dentro de ```json … ```). */
function extractJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? safeParse(text.slice(start, end + 1)) : null
}

export interface RetryInfo {
  attempt: number // 2, 3, … (el 1 es el intento normal)
  total: number
  model: string
  switchedModel: boolean
}

/**
 * askGemini con reintentos automáticos ante errores pasajeros (503 saturado, 5xx, red):
 * 3 intentos con el modelo principal y 2 con el de respaldo, con esperas crecientes.
 * Sin cuota (429) se pasa al momento al otro modelo. Los errores definitivos se lanzan al momento.
 */
export async function askGeminiWithRetry<T>(
  apiKey: string,
  models: Models,
  opts: AskOptions,
  onRetry?: (info: RetryInfo) => void,
): Promise<T> {
  return withRetry(models, (model) => askGemini<T>(apiKey, model, opts), onRetry)
}

export interface Models {
  primary: string
  fallback?: string
  /** Al abortarse (p. ej. al salir de la clase) no se reintenta ni se entrega la respuesta. */
  signal?: AbortSignal
  /** Tiempo máximo total, contando reintentos (por defecto 60 s). */
  timeoutMs?: number
  /**
   * Cuota propia de la llamada (p. ej. 'search' para la búsqueda en Google): un 429 agota esa cuota,
   * no el modelo, y no se reintenta con otro modelo.
   */
  quotaScope?: string
}

/** La petición se canceló porque el usuario salió de la pantalla: no es un error que mostrar. */
export class AbortedError extends Error {
  constructor() {
    super('Cancelado')
    this.name = 'AbortedError'
  }
}

export function isAborted(e: unknown): boolean {
  return e instanceof AbortedError
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new AbortedError()
}

// ---------------------------------------------------------------------------
// Cuotas agotadas (429): se recuerda qué modelo (o cuota) no tiene saldo y hasta cuándo,
// para no gastar tiempo pidiéndoselo otra vez. Se guarda en el teléfono (sobrevive al reinicio).

const QUOTA_KEY = 'habla.quota'

function readQuota(): Record<string, number> {
  try {
    const q = JSON.parse(localStorage.getItem(QUOTA_KEY) ?? '{}') as Record<string, number>
    const now = Date.now()
    return Object.fromEntries(Object.entries(q).filter(([, until]) => until > now))
  } catch {
    return {}
  }
}

export function isExhausted(key: string): boolean {
  return (readQuota()[key] ?? 0) > Date.now()
}

/** Modelos o cuotas sin saldo ahora mismo, con la hora a la que vuelven a probarse. */
export function exhaustedList(): { key: string; until: number }[] {
  return Object.entries(readQuota()).map(([key, until]) => ({ key, until }))
}

export function markExhausted(key: string, e: ApiError) {
  // Cuota diaria: hasta que Google la renueva (medianoche del Pacífico, ~8:00 UTC). Por minuto: lo que diga Google.
  let until = Date.now() + (e.retryAfterMs ?? 60_000)
  if (e.quota === 'day') {
    const d = new Date()
    d.setUTCHours(8, 0, 0, 0)
    if (d.getTime() <= Date.now()) d.setUTCDate(d.getUTCDate() + 1)
    until = d.getTime()
  }
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ ...readQuota(), [key]: until }))
  } catch {
    // Sin almacenamiento: solo se pierde el recuerdo.
  }
  console.info(`[HABLA-NET] sin cuota: ${key} hasta ${new Date(until).toLocaleTimeString()}`)
}

export function clearExhausted() {
  try {
    localStorage.removeItem(QUOTA_KEY)
  } catch {
    // nada
  }
}

/**
 * Reintentos genéricos para cualquier llamada que reciba el modelo a usar. Si al final falla por algo que el
 * usuario puede arreglar (saturado, lento, sin cuota, clave o modelo), se avisa a la app para que la mascota
 * proponga cambiar de modelo o de clave.
 */
export async function withRetry<T>(models: Models, call: (model: string) => Promise<T>, onRetry?: (info: RetryInfo) => void): Promise<T> {
  try {
    return await retryLoop(models, call, onRetry)
  } catch (e) {
    // La búsqueda en Google tiene su propia cuota y la app sigue sin ella: no es motivo para avisar.
    if (e instanceof ApiError && !models.quotaScope) {
      const kind = e.keyError ? 'key' : troubleKind(e.status, e.transient)
      if (kind) reportGeminiTrouble({ kind, message: e.message, model: models.primary })
    }
    throw e
  }
}

async function retryLoop<T>(models: Models, call: (model: string) => Promise<T>, onRetry?: (info: RetryInfo) => void): Promise<T> {
  const { signal, quotaScope } = models
  if (quotaScope && isExhausted(quotaScope)) throw new ApiError(describeError(429, null), 429)

  const candidates = [models.primary, ...(models.fallback && models.fallback !== models.primary ? [models.fallback] : [])]
  // Los modelos sin cuota se saltan; si todos están agotados, se prueba igualmente el último (la estimación puede fallar).
  const usable = candidates.filter((m) => !isExhausted(m))
  const plan = (usable.length ? usable : candidates.slice(-1)).flatMap((m, i) => (i === 0 && m === models.primary ? [m, m, m] : [m, m]))

  const deadline = Date.now() + (models.timeoutMs ?? 60_000)
  let delay = 1500
  let lastError: ApiError | null = null
  for (let i = 0; i < plan.length; i++) {
    const model = plan[i]
    checkAborted(signal)
    if (lastError && isExhausted(model)) continue // se quedó sin cuota en este mismo bucle
    if (i > 0) {
      const sameModel = plan[i - 1] === model
      console.info(`[HABLA-NET] reintento ${i + 1}/${plan.length} con ${model} tras ${lastError?.status}${sameModel ? ` (espera ${delay} ms)` : ''}`)
      onRetry?.({ attempt: i + 1, total: plan.length, model, switchedModel: model !== models.primary })
      // Solo se espera al reintentar el mismo modelo; al cambiar de modelo se prueba al instante.
      if (sameModel) {
        if (Date.now() + delay > deadline) break
        await sleep(delay, signal)
        delay = Math.min(delay * 2, 8000)
      }
      checkAborted(signal)
    }
    const left = deadline - Date.now()
    if (left < 2000) break
    try {
      const result = await withTimeout(call(model), left)
      // Una petición ya enviada no se puede recuperar, pero su respuesta se descarta.
      checkAborted(signal)
      return result
    } catch (e) {
      checkAborted(signal)
      if (!(e instanceof ApiError)) throw e
      lastError = e
      if (e.status === 429) {
        // Sin cuota: no tiene sentido repetir. Se recuerda y se pasa al siguiente modelo.
        markExhausted(quotaScope ?? model, e)
        if (quotaScope) throw e
        continue
      }
      // Si el modelo de respaldo no existe para esta clave, no insistimos con él.
      if (e.status === 404 && model !== models.primary) break
      if (!e.transient) throw e
    }
  }
  if (lastError?.status === 429) throw new ApiError(describeError(429, null), 429)
  if (Date.now() >= deadline - 2000) {
    throw new ApiError('Gemini está tardando demasiado (Google saturado o internet lento). Inténtalo de nuevo.', 0, true)
  }
  throw lastError ?? new ApiError('Gemini no respondió.', 0)
}

/** Corta la espera de una petición (la respuesta tardía se ignora). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new ApiError('Gemini está tardando demasiado.', 0, true)), ms)
    p.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      },
    )
  })
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((r) => {
    const id = setTimeout(r, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      r()
    }, { once: true })
  })
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
  if (res.status !== 200) throw new ApiError(keyCheckError(res.status, data), res.status)
  return (data?.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), displayName: m.displayName ?? m.name }))
    .filter((m) => m.id.startsWith('gemini') && !/tts|image|embed|live|audio|native|robotics|computer/.test(m.id))
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
}

/** Modelos conocidos: siempre se ofrecen, aunque Google no responda al pedir la lista. */
export const KNOWN_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
]

/** Une la lista de Google (o la guardada) con los modelos conocidos, sin repetir, más nuevos primero. */
export function mergeModels(fetched: string[]): string[] {
  return [...new Set([...fetched, ...KNOWN_MODELS])].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
}

/** Modelo de respaldo: preferiblemente un Flash-Lite (otra capacidad, rápido); si no, otro Flash distinto. */
export function pickFallbackModel(models: ModelInfo[], primary: string): string {
  const ids = models.map((m) => m.id).filter((id) => id !== primary && !/preview|exp/.test(id))
  return (
    ids.find((id) => /^gemini-[\d.]+-flash-lite$/.test(id)) ??
    ids.find((id) => /^gemini-[\d.]+-flash$/.test(id)) ??
    ids.find((id) => id.includes('flash')) ??
    ''
  )
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
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] }
    finishReason?: string
    groundingMetadata?: { groundingChunks?: { web?: { uri: string; title?: string } }[] }
  }[]
  promptFeedback?: { blockReason?: string }
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number }
  error?: { message?: string; status?: string; details?: { reason?: string; retryDelay?: string }[] }
}

// ---------------------------------------------------------------------------
// Diagnóstico: cada llamada a Gemini queda anotada (tiempo, tamaño, tokens) para encontrar lentitudes.
// Sale por consola (logcat: "Capacitor/Console") y se guarda en memoria para verla en Ajustes.

export interface NetLog {
  at: number
  what: string // primeras palabras de la instrucción de sistema
  model: string
  thinking: boolean
  kb: number // tamaño enviado
  status: number
  ms: number
  tokens?: { prompt?: number; out?: number; thoughts?: number }
  error?: string
}

// Las últimas llamadas se guardan en el teléfono para poder revisarlas en Ajustes → Diagnóstico.
const NETLOG_KEY = 'habla.netlog'
const netLog: NetLog[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(NETLOG_KEY) ?? '[]') as NetLog[]
  } catch {
    return []
  }
})()

export function getNetLog(): NetLog[] {
  return [...netLog]
}

export function clearNetLog() {
  netLog.length = 0
  try {
    localStorage.removeItem(NETLOG_KEY)
  } catch {
    // nada
  }
}

function record(e: NetLog) {
  netLog.push(e)
  while (netLog.length > 120) netLog.shift()
  try {
    localStorage.setItem(NETLOG_KEY, JSON.stringify(netLog))
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  console.info('[HABLA-NET] ' + JSON.stringify(e))
}

async function post(apiKey: string, url: string, body: unknown) {
  const b = body as { systemInstruction?: { parts?: { text?: string }[] }; generationConfig?: { thinkingConfig?: unknown } }
  const json = JSON.stringify(body)
  const entry = {
    at: Date.now(),
    what: (b.systemInstruction?.parts?.[0]?.text ?? '').replace(/\s+/g, ' ').slice(0, 50),
    model: url.match(/models\/([^:]+)/)?.[1] ?? '?',
    thinking: !!b.generationConfig?.thinkingConfig,
    kb: Math.round(json.length / 1024),
  }
  const t0 = performance.now()
  try {
    const res = await CapacitorHttp.post({
      url,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      data: body,
      connectTimeout: 15000,
      readTimeout: 90000,
    })
    const data = parseData(res.data) as GeminiResponse | null
    const u = data?.usageMetadata
    record({
      ...entry,
      status: res.status,
      ms: Math.round(performance.now() - t0),
      tokens: u ? { prompt: u.promptTokenCount, out: u.candidatesTokenCount, thoughts: u.thoughtsTokenCount } : undefined,
      error: res.status !== 200 ? (data?.error?.message ?? '').slice(0, 120) : undefined,
    })
    return { status: res.status, data }
  } catch (e) {
    record({ ...entry, status: 0, ms: Math.round(performance.now() - t0), error: String((e as Error)?.message ?? e).slice(0, 120) })
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

/** 403: la clave existe pero no puede usar esta API (bloqueada, con restricciones…). */
function permissionError(msg?: string): string {
  return (
    'Tu clave de Gemini no tiene permiso para esta API. Crea una clave nueva en aistudio.google.com/apikey ' +
    `o quita las restricciones de la clave en Google Cloud.${msg ? ` Detalle de Google: ${msg}` : ''}`
  )
}

export function describeError(status: number, data: unknown, model?: string): string {
  const d = data as GeminiResponse | null
  const msg = d?.error?.message
  if (isKeyError(d) || status === 401) return 'La clave de Gemini no es válida. Revísala en Ajustes.'
  if (status === 403) return permissionError(msg)
  if (status === 404) return `El modelo "${model ?? ''}" no está disponible. Elige otro en Ajustes.`
  if (status === 429) return 'Tu clave de Gemini se quedó sin cuota en los modelos elegidos. Prueba otro modelo en Ajustes → Gemini o revisa tu plan en Google AI Studio.'
  if (status === 400 && /location|region|country/i.test(msg ?? '')) {
    return 'Gemini no está disponible desde tu país con esta clave. Detalle de Google: ' + msg
  }
  if (status >= 500) return `Gemini tiene problemas ahora mismo (${status}). Inténtalo en un momento.`
  return `Gemini devolvió un error ${status}${msg ? `: ${msg}` : ''}`
}

/**
 * Error al pedir la lista de modelos (al comprobar una clave en la bienvenida, en Ajustes → Modelos y en la hoja de
 * problemas, o al refrescar la lista). AUD-E2E-604: el texto general manda a «Ajustes», que no existe aún en la
 * bienvenida y es justo donde ya está el usuario en Ajustes. REV-U4-1: con 429 no se sabe si la clave es buena y el
 * texto general invitaba a cambiar de modelo. Los textos de 429/5xx valen para los dos usos (comprobar y refrescar).
 */
export function keyCheckError(status: number, data: unknown): string {
  // 403 primero: una clave bloqueada o con restricciones también dice «API key» y no se arregla copiándola otra vez.
  const d = data as GeminiResponse | null
  if (status === 403) return permissionError(d?.error?.message)
  if (isKeyError(d) || status === 401) {
    return 'Esa clave no es válida: cópiala otra vez desde Google AI Studio (aistudio.google.com/apikey). Empieza por «AIza».'
  }
  if (status === 429) return 'Google no responde ahora mismo (demasiadas peticiones). Tu clave puede estar bien: inténtalo de nuevo en un minuto.'
  if (status >= 500) return `Google no responde ahora mismo (error ${status}). Tu clave puede estar bien: inténtalo en un momento.`
  return describeError(status, data)
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
