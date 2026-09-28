import { CapacitorHttp } from '@capacitor/core'

export const CLAUDE_MODEL = 'claude-sonnet-5'
const URL = 'https://api.anthropic.com/v1/messages'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface AskOptions {
  system: string
  messages: ChatMessage[]
  schema: object
  maxTokens?: number
}

/**
 * Llama a la Messages API con salida estructurada (JSON Schema) y devuelve el objeto parseado.
 * Usa CapacitorHttp: en Android la petición sale por la capa nativa (sin CORS);
 * en el navegador de desarrollo cae a fetch, por eso se envía también el header de acceso directo.
 */
export async function askClaude<T>(apiKey: string, opts: AskOptions): Promise<T> {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    // Conversación por voz: prioriza latencia baja.
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: opts.schema },
    },
    // Caché automática del prefijo (system + historial) para abaratar turnos sucesivos.
    cache_control: { type: 'ephemeral' },
    system: opts.system,
    messages: opts.messages,
  }

  let res
  try {
    res = await CapacitorHttp.post({
      url: URL,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      data: body,
      connectTimeout: 15000,
      readTimeout: 60000,
    })
  } catch {
    throw new ApiError('Sin conexión con Claude. Revisa tu internet.', 0)
  }

  const data = typeof res.data === 'string' ? safeParse(res.data) : res.data
  if (res.status !== 200) {
    throw new ApiError(describeError('Claude', res.status, data), res.status)
  }
  if (data?.stop_reason === 'refusal') {
    throw new ApiError('Claude no pudo responder a este mensaje. Prueba a decirlo de otra forma.', 200)
  }
  const text = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
  const parsed = safeParse(text)
  if (!parsed) throw new ApiError('Respuesta de Claude incompleta. Inténtalo de nuevo.', 200)
  return parsed as T
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export function describeError(service: string, status: number, data: unknown): string {
  const msg = (data as { error?: { message?: string } } | null)?.error?.message
  if (status === 401) return `La clave de ${service} no es válida. Revísala en Ajustes.`
  if (status === 429) return `${service}: demasiadas peticiones o sin saldo. Espera un momento o revisa tu cuenta.`
  if (status >= 500) return `${service} tiene problemas ahora mismo (${status}). Inténtalo en un momento.`
  return `${service} devolvió un error ${status}${msg ? `: ${msg}` : ''}`
}
