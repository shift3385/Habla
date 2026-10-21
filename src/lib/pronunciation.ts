import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { Wav } from './wav'
// 5.11 (M-12b): los consejos cortos de las fichas de Sonidos (`tipShortEs`), copiados por scripts/validate-sounds.mjs
// --write-tips en un JSON pequeño (~1–4 KB) para no cargar las fichas en el arranque. El validador exige que esté al día.
import soundTipsJson from '../sounds/tips.json'

// Corrector fonético con Azure Speech — Pronunciation Assessment (API REST de audio corto, en-US).
// Corre en paralelo a Gemini con el mismo audio: Gemini da el contenido y las correcciones; Azure, la
// pronunciación (precisión, fluidez, completitud, prosodia y errores por palabra y fonema).
// Si Azure falla, la clase sigue solo con Gemini.

export type PronError = 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone'

export interface PronPhoneme {
  phoneme: string // en IPA
  accuracy: number // 0–100
  /**
   * 5.11 (M-11): los sonidos que Azure cree que dijiste de verdad (`NBestPhonemeCount`, solo en-US), del más probable
   * al menos. No llega en respuestas antiguas ni si Azure no lo da: entonces todo queda como en la 5.10.1.
   */
  nbest?: { phoneme: string; score: number }[]
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
  Phonemes?: RawPhoneme[]
}
type RawNBest = { Phoneme?: string; Score?: number }[]
interface RawPhoneme {
  Phoneme?: string
  AccuracyScore?: number
  NBestPhonemes?: RawNBest
  PronunciationAssessment?: { AccuracyScore?: number; NBestPhonemes?: RawNBest }
}

/** 5.11 (M-11): candidatos de Azure (formato REST plano o del SDK anidado), del más probable al menos. */
function parseNBest(p: RawPhoneme): PronPhoneme['nbest'] {
  const raw = p.PronunciationAssessment?.NBestPhonemes ?? p.NBestPhonemes
  if (!Array.isArray(raw) || !raw.length) return undefined
  const list = raw.filter((c) => typeof c?.Phoneme === 'string' && c.Phoneme).map((c) => ({ phoneme: c.Phoneme!, score: n(c.Score) }))
  return list.length ? list.sort((a, b) => b.score - a.score) : undefined
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
    phonemes: (w.Phonemes ?? []).map((p) => {
      const nbest = parseNBest(p)
      return { phoneme: p.Phoneme ?? '', accuracy: n(p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore), ...(nbest ? { nbest } : {}) }
    }),
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

/**
 * 5.11 (M-11, S-06): cuántos sonidos candidatos pide la app a Azure por fonema («te salió /s/ en vez de /θ/»). Va en la
 * misma petición: no envía más audio ni cuesta más (se factura por segundo de audio).
 */
export const NBEST_PHONEME_COUNT = 5

/** Configuración de la evaluación (cabecera `Pronunciation-Assessment`). La de la clase, salvo lo que cambie `extra`. */
export function assessmentConfig(reference: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ReferenceText: reference,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: !!reference,
    EnableProsodyAssessment: true,
    PhonemeAlphabet: 'IPA',
    NBestPhonemeCount: NBEST_PHONEME_COUNT,
    ...extra,
  }
}

/**
 * 5.11 (M-11): red de seguridad hasta F0-4. Si Azure rechazara `NBestPhonemeCount` con un 400, se repite UNA vez sin
 * él y no se vuelve a pedir en esta sesión: la fonética de la clase nunca se rompe por el campo nuevo.
 */
let nbestRejected = false

const assessUrl = (region: string) =>
  `https://${encodeURIComponent(region.trim())}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`

async function assessOnce(key: string, region: string, wav: Wav, reference: string, extra?: Record<string, unknown>): Promise<PronResult | null> {
  const headersFor = (config: Record<string, unknown>) => ({
    'Ocp-Apim-Subscription-Key': key.trim(),
    'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    Accept: 'application/json',
    'Pronunciation-Assessment': btoa(unescape(encodeURIComponent(JSON.stringify(config)))),
  })
  const config = assessmentConfig(reference, extra)
  if (nbestRejected) delete config.NBestPhonemeCount
  let headers = headersFor(config)
  // Reintentos solo ante "demasiadas peticiones" o cortes de red.
  for (let attempt = 0; ; attempt++) {
    const r = await postBinary(assessUrl(region), headers, wav.base64)
    // 5.11 (M-11, S-06): segundos de audio enviados (lo que factura Azure), para medirlos por CDP. Sin claves.
    console.info(`[HABLA-NET] azure ${r.status} ${wav.seconds.toFixed(1)}s${reference ? ' ref' : ''}${config.NBestPhonemeCount ? ' nbest' : ''}`)
    if (r.status === 200) return parseAssessment(r.data)
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '')
    const kind = classifyAzureError(r.status, body)
    console.info(`[HABLA-NET] azure ${r.status} ${kind}`)
    if (r.status === 400 && kind === 'other' && config.NBestPhonemeCount) {
      nbestRejected = true
      delete config.NBestPhonemeCount
      headers = headersFor(config)
      continue
    }
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

const ORDINAL: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' }
/** «twenty-one» → «twenty-first», «five» → «fifth», «twenty» → «twentieth». */
function ordinalWords(n: number): string {
  return numberWords(n).replace(/[a-z]+$/, (last) => ORDINAL[last] ?? (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th'))
}

/** «10:00» → «ten o'clock», «7:30» → «seven thirty», «9:05» → «nine oh five» (como se dice en inglés). */
function timeWords(h: number, m: number): string {
  if (m === 0) return `${numberWords(h)} o'clock`
  return `${numberWords(h)} ${m < 10 ? 'oh ' : ''}${numberWords(m)}`
}

/**
 * Cifras en palabras ("20" → "twenty"): Azure alinea mal una cifra del texto de referencia con lo que se dijo.
 * 5.10.1 (REG-M-09): antes «10:00» salía como la palabra «ten:zero» en la lista de palabras a cuidar. Ahora también
 * las horas (10:00, 7:30 pm), los ordinales (5th), los miles con coma (1,000), los decimales (2.5) y el «%».
 */
export const spellNumbers = (s: string) =>
  s
    .replace(/\b(\d{1,2}):(\d{2})\s*([ap])\.?\s?m\b\.?/gi, (_, h, m, ap: string) => `${timeWords(Number(h), Number(m))} ${ap.toLowerCase() === 'a' ? 'a.m.' : 'p.m.'}`)
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => timeWords(Number(h), Number(m)))
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (d) => d.replace(/,/g, ''))
    .replace(/\b(\d{1,6})\.(\d{1,3})\b/g, (_, a, b: string) => `${numberWords(Number(a))} point ${[...b].map((x) => ONES[Number(x)]).join(' ')}`)
    .replace(/\b(\d{1,6})(?:st|nd|rd|th)\b/gi, (_, d) => ordinalWords(Number(d)))
    .replace(/\b(\d{1,6})\s?%/g, (_, d) => `${numberWords(Number(d))} percent`)
    .replace(/\b\d{1,6}\b/g, (d) => numberWords(Number(d)))

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

/** 5.11 (S-06): nota de una palabra o frase conocida (Sonidos: `say-word`, `say-pair`). */
export interface WordScore {
  /** Precisión global (0–100). */
  accuracy: number
  /** El sonido que se practica: su peor aparición en lo dicho, con lo que salió en su lugar si Azure lo sabe. */
  target?: { phoneme: string; accuracy: number; heard?: string }
  /** Todos los fonemas, en orden, de todas las palabras. */
  phonemes: PronPhoneme[]
}

/** 5.11 (S-06): config de `assessWord`: sin miscue (la referencia es la palabra misma) ni prosodia (palabras sueltas). */
export const WORD_CONFIG = { EnableMiscue: false, EnableProsodyAssessment: false }

/** 5.11 (S-06): de la respuesta de Azure a la nota de la palabra y de su sonido objetivo (IPA, normalizado). */
export function wordScore(r: PronResult, target?: string, rules?: Partial<typeof HEARD_RULES>): WordScore {
  const phonemes = r.words.flatMap((w) => w.phonemes)
  let t: WordScore['target']
  if (target) {
    const want = normPhoneme(target)
    const worst = phonemes.filter((p) => normPhoneme(p.phoneme) === want).sort((a, b) => a.accuracy - b.accuracy)[0]
    if (worst) {
      const heard = heardInstead(worst, rules)
      t = { phoneme: worst.phoneme, accuracy: worst.accuracy, ...(heard ? { heard } : {}) }
    }
  }
  return { accuracy: r.accuracy, ...(t ? { target: t } : {}), phonemes }
}

/**
 * 5.11 (S-06, DISENO §6.2): evalúa UNA palabra o frase conocida. Una sola petición con texto de referencia (no hace
 * falta la pasada «sin referencia» de la clase: la mitad de audio facturado), `EnableMiscue: false` y
 * `NBestPhonemeCount: 5`. El audio debe llevar ~300 ms de silencio delante y detrás (`toWav16k(blob, { padMs: 300 })`).
 * Devuelve null si Azure no oyó habla. La política F0/S0 y la cuota agotada van en `phonetics.ts › runWordPhonetics`.
 */
export async function assessWord(key: string, region: string, wav: Wav, reference: string, target?: string): Promise<WordScore | null> {
  const r = await assessOnce(key, region, wav, spellNumbers(reference.trim()), WORD_CONFIG)
  return r ? wordScore(r, target) : null
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

/**
 * Consejo en español por símbolo de Azure (IPA en-US; Azure escribe /iː/ como «i» y /uː/ como «u»). Un A2 no lee IPA:
 * la nota debe decir CÓMO arreglarlo (5.10.1, REG-A3-19).
 * 5.11 (M-12b): una sola fuente de texto: el `tipShortEs` de cada ficha de Sonidos (src/sounds/tips.json, que genera
 * validate-sounds). Con las fichas completas se borró la tabla de la 5.10.1 que vivía aquí. Las pistas son de español
 * neutro (M-12: /θ/ ya no dice «como la "z" de España»).
 */
export const SOUND_TIPS: Record<string, string> = (soundTipsJson as { byAzure?: Record<string, string> }).byAzure ?? {}

/** Clave para comparar símbolos de Azure en la tabla de consejos: /iː/ = «i», /uː/ = «u», /ɡ/ = «g». */
const tipKey = (p: string) => p.trim().replace(/ː/g, '').replace(/ɡ/g, 'g')
const tipsByKey = new Map(Object.entries(SOUND_TIPS).map(([k, v]) => [tipKey(k), v]))

/**
 * 5.10.1 (REG-A3-19): palabras de función. Sus vocales son débiles y Azure las puntúa bajo, pero no son lo que hay que
 * practicar: van detrás de las palabras de contenido (salvo si te las comiste).
 */
const FUNCTION_WORDS = new Set(
  'a an the of to and or but in on at for from with by as is are am was were be been it its i you he she we they me my your his her our their this that can could do does did have has had will would not so if than then'.split(
    ' ',
  ),
)

/** ¿Es un token que Azure saca de una cifra u hora sin pasar a palabras («ten:zero», «10:00»)? No se enseña. */
const odd = (w: string) => /[\d:]/.test(w)

/**
 * 5.10.1 (REG-A3-19): el consejo en español para una palabra y su sonido más flojo. Primero los casos típicos que se
 * ven con lo que da Azure: la «e» de más antes de s + consonante (Spain → «Espain») y la -ed con sílaba de más.
 */
export function soundTipEs(word: string, phoneme?: string, error?: PronError): string | undefined {
  const special = specialSound(word, phoneme)
  if (special === 's-cluster') return 'no digas «es-»: empieza directamente con la s (Spain, no Espain)'
  if (special === 'ed') return 'la -ed suena /t/ o /d/, sin sílaba de más: worked es una sílaba'
  if (error === 'Omission') return 'te la comiste: dila entera'
  return phoneme ? (SOUND_TIPS[phoneme] ?? tipsByKey.get(tipKey(phoneme))) : undefined
}

/** Los dos casos que se deducen de la palabra: «e» de más antes de s + consonante, y -ed con sílaba de más. */
function specialSound(word: string, phoneme?: string): 's-cluster' | 'ed' | undefined {
  const w = word.toLowerCase()
  if (phoneme === 's' && /^s[ptkcqmnlw]/.test(w)) return 's-cluster'
  if ((phoneme === 't' || phoneme === 'd') && /[^etd]ed$/.test(w)) return 'ed'
  return undefined
}

/** 5.11 (S-11): el sonido que se propone practicar en Sonidos desde la nota de pronunciación (uno solo). */
export interface PracticeSound {
  word: string
  /** IPA de Azure del sonido más flojo (para `phonemeByAzure` de sounds.ts). */
  phoneme: string
  /** Rasgo en vez de fonema: s + consonante (lección E1) o -ed (E4). */
  feature?: 's-cluster' | 'ed'
}

/**
 * 5.11 (S-11, DISENO §5.4): el sonido de las palabras a cuidar que se enlaza con Sonidos: el primero (las palabras ya
 * vienen por prioridad) con fonema flojo. Omisiones y palabras sin fonema flojo → sin enlace. `hasSheet` dice si el
 * sonido o rasgo tiene ficha (lo resuelve sounds.ts); se salta los que no la tienen.
 */
export function practiceSound(weak: WeakWord[], hasSheet: (s: PracticeSound) => boolean = () => true): PracticeSound | null {
  for (const w of weak) {
    if (w.error === 'Omission' || !w.phoneme) continue
    const feature = specialSound(w.word, w.phoneme)
    const s: PracticeSound = { word: w.word, phoneme: w.phoneme, ...(feature ? { feature } : {}) }
    if (hasSheet(s)) return s
  }
  return null
}

/** 5.11 (S-11): la ficha (de sounds.ts) del sonido que se propone practicar: el primero de `practiceSound` que la tiene. */
export function practiceSheet<T>(weak: WeakWord[], find: (s: PracticeSound) => T | undefined): T | undefined {
  let sheet: T | undefined
  return practiceSound(weak, (s) => (sheet = find(s)) !== undefined) ? sheet : undefined
}

/** 5.11 (S-11): «Practicar el sonido /θ/ en Sonidos», o el rasgo por su nombre («Practicar «s + consonante» en Sonidos»). */
export const practiceLabel = (p: { kind: string; ipa: string; nameEs: string }) =>
  p.kind === 'feature' ? `Practicar «${p.nameEs}» en Sonidos` : `Practicar el sonido /${p.ipa}/ en Sonidos`

/**
 * 5.11 (M-11): IPA de Azure normalizado para comparar el sonido esperado con el que salió: Azure en-US escribe /iː/
 * como «i» y /uː/ como «u», y puede mezclar «ɡ» (IPA) con «g» y «ɚ» con «ɝ». No son sonidos distintos para el alumno.
 */
export const normPhoneme = (p: string) => p.trim().replace(/ː/g, '').replace(/ɡ/g, 'g').replace(/ɚ/g, 'ɝ')

/**
 * 5.11 (M-11): umbrales del «te salió /x/». PROVISIONALES hasta F0-4 (el dueño grabando 20 palabras bien y mal a
 * propósito): se ajustan aquí o se pasan a `heardInstead`.
 * - `maxAccuracy`: solo se dice si la nota del fonema es floja (la misma frontera que «palabras a cuidar»).
 * - `minScore`: el sonido que salió debe tener al menos esta probabilidad según Azure.
 * - `minMargin`: y sacarle esta ventaja al esperado (si van casi empatados, no se dice nada: mejor callar que confundir).
 */
export const HEARD_RULES = { maxAccuracy: 70, minScore: 40, minMargin: 15 }

/** 5.11 (M-11): el sonido que Azure cree que dijiste en lugar del esperado, o undefined (sin NBest, o salió bien). */
export function heardInstead(p: PronPhoneme, rules: Partial<typeof HEARD_RULES> = {}): string | undefined {
  const r = { ...HEARD_RULES, ...rules }
  if (!p.nbest?.length || p.accuracy >= r.maxAccuracy) return undefined
  const expected = normPhoneme(p.phoneme)
  const top = p.nbest[0]
  if (!top || normPhoneme(top.phoneme) === expected) return undefined
  const own = p.nbest.find((c) => normPhoneme(c.phoneme) === expected)?.score ?? 0
  if (top.score < r.minScore || top.score - own < r.minMargin) return undefined
  return top.phoneme
}

export interface WeakWord {
  word: string
  error: PronError
  accuracy: number
  phoneme?: string
  /** 5.11 (M-11): nota del fonema más flojo (0–100). */
  phonemeAccuracy?: number
  /** 5.11 (M-11): el sonido que salió en su lugar («te salió /s/»), si Azure lo dio. */
  heard?: string
  tip?: string
}

/** Palabras a cuidar: mal pronunciadas, omitidas o con baja precisión, con su fonema más flojo y su consejo. */
export function weakWords(r: PronResult, max = 4): WeakWord[] {
  // Las palabras de función, detrás (salvo omitidas); a igual prioridad, la peor primero.
  const rank = (w: PronWord) => (FUNCTION_WORDS.has(w.word.toLowerCase()) && w.error !== 'Omission' ? 1 : 0)
  return r.words
    .filter((w) => w.word && !odd(w.word))
    .filter((w) => w.error === 'Mispronunciation' || w.error === 'Omission' || (w.error === 'None' && w.accuracy < 70))
    .sort((a, b) => rank(a) - rank(b) || a.accuracy - b.accuracy)
    .slice(0, max)
    .map((w) => {
      const worst = [...w.phonemes].sort((a, b) => a.accuracy - b.accuracy)[0]
      const flojo = worst && worst.accuracy < 70 ? worst : undefined
      const phoneme = flojo?.phoneme
      const heard = flojo && w.error !== 'Omission' ? heardInstead(flojo) : undefined
      return {
        word: w.word,
        error: w.error,
        accuracy: w.accuracy,
        phoneme,
        ...(flojo ? { phonemeAccuracy: flojo.accuracy } : {}),
        ...(heard ? { heard } : {}),
        tip: soundTipEs(w.word, phoneme, w.error),
      }
    })
}

/** Una frase natural sobre la pronunciación (en español), con el consejo de cada sonido flojo. */
export function pronunciationLine(r: PronResult): string {
  const weak = weakWords(r, 3)
  const head = r.pron >= 90 ? '¡Muy buena pronunciación!' : r.pron >= 80 ? 'Buena pronunciación.' : r.pron >= 60 ? 'Se te entiende, pero hay sonidos por pulir.' : 'Vamos a pulir unos sonidos.'
  if (!weak.length) return `${head} No encontré palabras con problemas.`
  // El mismo consejo no se repite (dos palabras con /θ/ lo llevan solo en la primera).
  const used = new Set<string>()
  const list = weak.map((w) => {
    if (w.tip) {
      const fresh = !used.has(w.tip)
      used.add(w.tip)
      return `«${w.word}»${fresh ? ` (${w.tip})` : ''}`
    }
    return `«${w.word}»${w.phoneme ? ` (el sonido /${w.phoneme}/)` : ''}`
  })
  return `${head} Cuida ${list.join('; ')}.`
}
