import { Capacitor, CapacitorHttp } from '@capacitor/core'

// Consumo del mes del recurso de Azure Speech, leído en Azure Monitor (métrica AudioSecondsTranscribed).
// La fuente de verdad es Azure: suma todo lo que entra por esa clave, venga de esta app o de otras personas.
// La clave de Speech no sirve para leer métricas: hace falta un service principal (App registration en
// Microsoft Entra ID) con el rol Monitoring Reader sobre el recurso.

export const F0_SECONDS = 5 * 3600 // 5 h gratis al mes

export interface MonitorCreds {
  tenantId: string
  clientId: string
  clientSecret: string
  resourceId: string // /subscriptions/…/resourceGroups/…/providers/Microsoft.CognitiveServices/accounts/…
}

export interface Usage {
  usedSeconds: number
  remainingSeconds: number // respecto al F0 (5 h)
  at: number // cuándo se consultó
  approx: true // Azure Monitor puede ir unos minutos por detrás
}

const CACHE_KEY = 'habla.azureUsage'
const CACHE_MS = 10 * 60_000

export const hasMonitor = (c: Partial<MonitorCreds>) => !!(c.tenantId?.trim() && c.clientId?.trim() && c.clientSecret?.trim() && c.resourceId?.trim())

/** Primer día del mes actual a las 00:00 UTC. */
export function monthStartUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

async function request(method: 'GET' | 'POST', url: string, headers: Record<string, string>, data?: Record<string, string>) {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ method, url, headers, data, responseType: 'json' })
    return { status: r.status, data: r.data as unknown }
  }
  const r = await fetch(url, { method, headers, body: data ? new URLSearchParams(data).toString() : undefined })
  return { status: r.status, data: (await r.json().catch(() => null)) as unknown }
}

async function token(c: MonitorCreds): Promise<string> {
  const r = await request(
    'POST',
    `https://login.microsoftonline.com/${encodeURIComponent(c.tenantId.trim())}/oauth2/v2.0/token`,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    { grant_type: 'client_credentials', client_id: c.clientId.trim(), client_secret: c.clientSecret.trim(), scope: 'https://management.azure.com/.default' },
  )
  const t = (r.data as { access_token?: string })?.access_token
  if (r.status !== 200 || !t) throw new Error('No se pudo entrar en Azure con el service principal (revisa Tenant ID, Client ID y Client Secret).')
  return t
}

/** Suma de los "Total" de todas las series y puntos que devuelve Azure Monitor. */
export function sumMetric(data: unknown): number {
  const d = data as { value?: { timeseries?: { data?: { total?: number }[] }[] }[] }
  let s = 0
  for (const v of d?.value ?? []) for (const ts of v.timeseries ?? []) for (const p of ts.data ?? []) s += p.total ?? 0
  return s
}

/** Consumo del mes (aproximado, en caché 10 min para no consultarlo en cada grabación). */
export async function monthUsage(c: MonitorCreds, force = false): Promise<Usage> {
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as (Usage & { res: string }) | null
      if (cached && cached.res === c.resourceId && Date.now() - cached.at < CACHE_MS && new Date(cached.at) >= monthStartUtc()) return cached
    } catch {
      // sin caché
    }
  }
  const t = await token(c)
  const start = monthStartUtc().toISOString()
  const end = new Date().toISOString()
  const res = c.resourceId.trim().replace(/\/$/, '')
  const url = `https://management.azure.com${res}/providers/microsoft.insights/metrics?api-version=2023-10-01&metricnames=AudioSecondsTranscribed&aggregation=Total&interval=P1D&timespan=${encodeURIComponent(`${start}/${end}`)}`
  const r = await request('GET', url, { Authorization: `Bearer ${t}` })
  if (r.status !== 200) {
    throw new Error(
      r.status === 403
        ? 'El service principal no tiene el rol Monitoring Reader sobre el recurso de Speech.'
        : r.status === 404
          ? 'No se encontró el recurso (revisa el Resource ID).'
          : `Azure Monitor respondió ${r.status}.`,
    )
  }
  const used = Math.round(sumMetric(r.data))
  const usage: Usage = { usedSeconds: used, remainingSeconds: Math.max(0, F0_SECONDS - used), at: Date.now(), approx: true }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...usage, res: c.resourceId }))
  } catch {
    // sin caché
  }
  return usage
}

/** "3 h 12 min" */
export function fmtHours(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}
