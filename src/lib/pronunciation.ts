import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { Wav } from './wav'

// Corrector fonético con Azure Speech — Pronunciation Assessment (API REST de audio corto, en-US).
// Corre en paralelo a Gemini con el mismo audio: Gemini da el contenido y las correcciones; Azure, la
// pronunciación (precisión, fluidez, completitud, prosodia y errores por palabra y fonema).
// Si Azure falla, la clase sigue solo con Gemini.

export type PronError = 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone'

export interface PronPhoneme {
  phoneme: string // en IPA
  accuracy: number // 0–100
}

export interface PronWord {
  word: string
  accuracy: number
  error: PronError
  phonemes: PronPhoneme[]
}

export interface PronResult {
  /** Puntuación global de pronunciación (0–100). */
  pron: number
  accuracy: number
  fluency: number
  completeness: number
  prosody?: number
  text: string
  words: PronWord[]
  /** true si se evaluó con el texto de Gemini como referencia (Azure no evaluó el habla libre). */
  scripted?: boolean
}

export type AzureErrorKind = 'quota' | 'rate' | 'auth' | 'region' | 'network' | 'other'

export class AzureError extends Error {
  kind: AzureErrorKind
  status: number
  constructor(kind: AzureErrorKind, status: number, message: string) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Cuota agotada (F0 sin horas este mes) frente a demasiadas peticiones a la vez (solo hay que reintentar). */
export function classifyAzureError(status: number, body: string): AzureErrorKind {
  const quota = /quota|1007|exceeded.*(month|limit)|out of call volume/i.test(body)
  if (quota && (status === 403 || status === 429 || status === 400)) return 'quota'
  if (status === 429) return 'rate'
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'region'
  if (status === 0) return 'network'
  return 'other'
}

const MESSAGES: Record<AzureErrorKind, string> = {
  quota: 'Se acabaron las horas gratis de Azure este mes.',
  rate: 'Azure está recibiendo demasiadas peticiones; inténtalo en un momento.',
  auth: 'La clave de Azure Speech no es válida o no tiene permiso.',
  region: 'La región de Azure no es correcta (p. ej. eastus).',
  network: 'No se pudo conectar con Azure.',
  other: 'Azure no pudo evaluar la pronunciación.',
}

interface HttpResult {
  status: number
  data: unknown
}

/** POST binario: en el teléfono, cliente nativo (sin CORS); en el navegador, fetch. */
async function postBinary(url: string, headers: Record<string, string>, base64: string): Promise<HttpResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.request({ method: 'POST', url, headers, data: base64, dataType: 'file', responseType: 'json', connectTimeout: 15000, readTimeout: 45000 })
      return { status: r.status, data: r.data }
    }
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const r = await fetch(url, { method: 'POST', headers, body: bytes })
    const text = await r.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      // texto plano
    }
    return { status: r.status, data }
  } catch (e) {
    return { status: 0, data: String(e) }
  }
}

const n = (x: unknown) => (typeof x === 'number' && isFinite(x) ? Math.round(x) : 0)

interface RawWord {
  Word?: string
  AccuracyScore?: number
  ErrorType?: string
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string }
  Phonemes?: { Phoneme?: string; AccuracyScore?: number; PronunciationAssessment?: { AccuracyScore?: number } }[]
}
interface RawBest {
  Display?: string
  Lexical?: string
  AccuracyScore?: number
  FluencyScore?: number
  CompletenessScore?: number
  PronScore?: number
  ProsodyScore?: number
  PronunciationAssessment?: { AccuracyScore?: number; FluencyScore?: number; CompletenessScore?: number; PronScore?: number; ProsodyScore?: number }
  Words?: RawWord[]
}

/** Lee la respuesta de Azure (acepta el formato REST y el del SDK, con las notas anidadas o no). */
export function parseAssessment(data: unknown): PronResult | null {
  const d = data as { RecognitionStatus?: string; DisplayText?: string; NBest?: RawBest[] }
  if (!d || d.RecognitionStatus !== 'Success' || !d.NBest?.length) return null
  const b = d.NBest[0]
  const pa = b.PronunciationAssessment ?? b
  if (typeof pa.AccuracyScore !== 'number' && typeof pa.PronScore !== 'number') return null // sin evaluación
  const words: PronWord[] = (b.Words ?? []).map((w) => ({
    word: w.Word ?? '',
    accuracy: n(w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore),
    error: ((w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None') as PronError),
    phonemes: (w.Phonemes ?? []).map((p) => ({ phoneme: p.Phoneme ?? '', accuracy: n(p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore) })),
  }))
  return {
    pron: n(pa.PronScore ?? pa.AccuracyScore),
    accuracy: n(pa.AccuracyScore),
    fluency: n(pa.FluencyScore),
    completeness: n(pa.CompletenessScore),
    prosody: typeof pa.ProsodyScore === 'number' ? n(pa.ProsodyScore) : undefined,
    text: d.DisplayText ?? b.Display ?? '',
    words,
  }
}

async function assessOnce(key: string, region: string, wav: Wav, reference: string): Promise<PronResult | null> {
  const config = {
    ReferenceText: reference,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: !!reference,
    EnableProsodyAssessment: true,
    PhonemeAlphabet: 'IPA',
  }
  const url = `https://${encodeURIComponent(region.trim())}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`
  const headers = {
    'Ocp-Apim-Subscription-Key': key.trim(),
    'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    Accept: 'application/json',
    'Pronunciation-Assessment': btoa(unescape(encodeURIComponent(JSON.stringify(config)))),
  }
  // Reintentos solo ante "demasiadas peticiones" o cortes de red.
  for (let attempt = 0; ; attempt++) {
    const r = await postBinary(url, headers, wav.base64)
    if (r.status === 200) return parseAssessment(r.data)
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '')
    const kind = classifyAzureError(r.status, body)
    console.info(`[HABLA-NET] azure ${r.status} ${kind}`)
    if ((kind === 'rate' || kind === 'network') && attempt < 2) {
      await sleep(1200 * (attempt + 1))
      continue
    }
    throw new AzureError(kind, r.status, MESSAGES[kind])
  }
}

/** Palabras de una frase, para comparar transcripciones (sin mayúsculas ni puntuación). */
const wordsOf = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function numberWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberWords(n % 100) : '')
  return numberWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberWords(n % 1000) : '')
}

/** Cifras en palabras ("20" → "twenty"): Azure alinea mal una cifra del texto de referencia con lo que se dijo. */
export const spellNumbers = (s: string) => s.replace(/\b\d{1,6}\b/g, (d) => numberWords(Number(d)))

/** ¿Azure y Gemini entendieron las mismas palabras? */
export const sameWords = (a: string, b: string) => wordsOf(spellNumbers(a)).join(' ') === wordsOf(spellNumbers(b)).join(' ')

/**
 * Evalúa la pronunciación del audio. Primero sin texto de referencia (habla libre), en paralelo con Gemini.
 * Sin referencia, Azure puntúa lo que ÉL cree que oyó: una palabra mal dicha que suena a otra ("jesterday" →
 * "just stared", "jears" → "jeers") sale como bien dicha o en otra palabra. Por eso, si lo que entendió Azure no
 * coincide con la transcripción de Gemini (lo que querías decir), se vuelve a evaluar con ese texto como
 * referencia y manda esa nota. Devuelve null si no se oyó habla.
 */
export async function assessPronunciation(key: string, region: string, wav: Wav, reference: () => Promise<string>): Promise<PronResult | null> {
  const free = await assessOnce(key, region, wav, '')
  const text = (await reference()).trim()
  if (!text || (free && sameWords(free.text, text))) return free
  const scripted = await assessOnce(key, region, wav, spellNumbers(text))
  return scripted ? { ...scripted, scripted: true } : free
}

/** Comprueba la clave y la región pidiendo un token (no gasta audio). */
export async function checkAzureKey(key: string, region: string): Promise<void> {
  const url = `https://${encodeURIComponent(region.trim())}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
  let status = 0
  let body = ''
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.request({ method: 'POST', url, headers: { 'Ocp-Apim-Subscription-Key': key.trim(), 'Content-Type': 'application/x-www-form-urlencoded' }, data: {} })
      status = r.status
      body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '')
    } else {
      const r = await fetch(url, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key.trim() } })
      status = r.status
      body = await r.text()
    }
  } catch (e) {
    body = String(e)
  }
  if (status === 200) return
  const kind = classifyAzureError(status, body)
  throw new AzureError(kind, status, MESSAGES[kind])
}

// ---------------------------------------------------------------------------
// Mensaje del coach: la pronunciación contada en español, para unirla a las correcciones de Gemini.

/** Palabras a cuidar: mal pronunciadas, omitidas o con baja precisión, con su fonema más flojo. */
export function weakWords(r: PronResult, max = 4): { word: string; error: PronError; accuracy: number; phoneme?: string }[] {
  return r.words
    .filter((w) => w.error === 'Mispronunciation' || w.error === 'Omission' || (w.error === 'None' && w.accuracy < 70))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, max)
    .map((w) => {
      const worst = [...w.phonemes].sort((a, b) => a.accuracy - b.accuracy)[0]
      return { word: w.word, error: w.error, accuracy: w.accuracy, phoneme: worst && worst.accuracy < 70 ? worst.phoneme : undefined }
    })
}

/** Una frase natural sobre la pronunciación (en español). */
export function pronunciationLine(r: PronResult): string {
  const weak = weakWords(r, 3)
  const head = r.pron >= 90 ? '¡Muy buena pronunciación!' : r.pron >= 80 ? 'Buena pronunciación.' : r.pron >= 60 ? 'Se te entiende, pero hay sonidos por pulir.' : 'Tu pronunciación necesita práctica.'
  if (!weak.length) return `${head} No encontré palabras con problemas.`
  const list = weak.map((w) => `«${w.word}»${w.phoneme ? ` (el sonido /${w.phoneme}/)` : w.error === 'Omission' ? ' (te la comiste)' : ''}`).join(', ')
  return `${head} Cuida ${list}.`
}
