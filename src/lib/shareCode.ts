// 5.13 (Fase 3): códigos para compartir sin servidor ni cuentas. Un código es texto `HABLA:1:<base64url(JSON)>` que se
// manda por WhatsApp (con @capacitor/share) y se pega en Progreso → «Pegar un código». Tres tipos:
//  - `challenge`: un reto de la semana para hacerlo juntos («Reto con Ana»); se mide en el teléfono de quien lo pega.
//  - `progress`: cuánto lleva alguien en ese reto, para compararse («Ana: 6 de 8 · Tú: 4 de 8»).
//  - `word`: una palabra guardada (palabra, traducción, significado y ejemplo) que entra en Palabras y en el Repaso.
// Un código viene de OTRA persona: es dato no fiable. Se valida como las copias (backupCheck.ts): tope de tamaño, versión,
// tipo conocido, solo los campos de la lista (lo demás se ignora; `__proto__` no tiene efecto), textos en una línea, con
// tope y sin marcas, cifras dentro de rango. Se pintan con React (nunca innerHTML) y el código nunca entra en un prompt.
// Importarlo no llama a la IA. Módulo puro (sin Dexie ni Capacitor): se prueba en Node (tests/codes-513.test.mjs).
import { CHALLENGE_PRACTICES, clampTarget, isCleanCategory, localGoal, localTitle } from './challenge'
import type { ChallengeKind, LookupResult, MistakeCategory, WeeklyChallenge } from './db'

export const CODE_PREFIX = 'HABLA'
export const CODE_VERSION = 1
/** Tope del código entero (unos 2 KB): uno normal ocupa 300–700 caracteres. */
export const MAX_CODE_CHARS = 2048
export type CodeType = 'challenge' | 'progress' | 'word' | 'week'
const TYPES: readonly CodeType[] = ['challenge', 'progress', 'word', 'week']
const KINDS: readonly ChallengeKind[] = ['minutes', 'classes', 'clean', 'review']

export interface ChallengeCode {
  type: 'challenge'
  from: string
  kind: ChallengeKind
  target: number
  category?: MistakeCategory
  scenario?: string
  title: string
  goal: string
}

export interface ProgressCode {
  type: 'progress'
  from: string
  week: string // weekKey de quien lo manda
  kind: ChallengeKind
  target: number
  category?: MistakeCategory
  scenario?: string
  title: string
  progress: number
}

export interface WordCode {
  type: 'word'
  from: string
  headword: string
  translation: string
  meaningEs: string
  exampleEn: string
  exampleEs: string
  ipa: string
  partOfSpeech: string
}

/** 5.13 (Fase 7): tu semana para el tablero «Mi familia» de otra persona. Necesita nombre. */
export interface WeekCode {
  type: 'week'
  from: string
  week: string
  minutes: number
  streak: number
  days: number
  challenge?: { title: string; progress: number; target: number; done: boolean }
}

export type ShareCode = ChallengeCode | ProgressCode | WordCode | WeekCode

// ---------------------------------------------------------------------------
// Texto seguro

/**
 * Texto de otra persona: una línea, sin comillas dobles ni marcas (#, *, `, <, >, {, }), sin caracteres de control y
 * con tope. Lo que no sea texto, ''.
 */
export function safeText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  const t = v
    .normalize('NFC')
    // Controles (también saltos de línea y tabuladores) y caracteres invisibles de dirección/ancho cero.
    // oxlint-disable-next-line no-control-regex -- a propósito: se quitan los caracteres de control
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]+/g, ' ')
    .replace(/["\u201c\u201d]/g, "'")
    .replace(/[#*`<>{}\\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

const intIn = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null

/** Clave de semana `AAAA-M-D` (stats.ts › weekKey). */
const WEEK_RE = /^\d{4}-(?:[1-9]|1[0-2])-(?:[1-9]|[12]\d|3[01])$/
/** Una palabra o expresión corta: empieza por letra o cifra; luego letras, cifras, espacios y . , ' ? ! / - */
const HEADWORD_RE = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}' .,?!/-]{0,47}$/u

// ---------------------------------------------------------------------------
// Codificar

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** El código de un dato (los textos se limpian también al crear: así nunca sale uno que la otra app rechazaría). */
export function encodeCode(c: ShareCode): string {
  const clean = parsePayload({ ...c, t: c.type, v: CODE_VERSION })
  if (!clean.ok) throw new Error(clean.error)
  const { type, ...rest } = clean.code
  const json = JSON.stringify({ t: type, v: CODE_VERSION, ...rest })
  const code = `${CODE_PREFIX}:${CODE_VERSION}:${toBase64Url(json)}`
  if (code.length > MAX_CODE_CHARS) throw new Error('El código saldría demasiado largo.')
  return code
}

// ---------------------------------------------------------------------------
// Leer

export type CodeCheck = { ok: true; code: ShareCode } | { ok: false; error: string }

const DAMAGED = 'Este código está incompleto o dañado. Pídele a la otra persona que te lo vuelva a mandar; no se cambió nada.'
const NEWER = 'Este código es de una versión más nueva de Habla. Actualiza la app y vuelve a pegarlo; no se cambió nada.'
const NOT_A_CODE = 'No encuentro ningún código de Habla en lo que pegaste. Copia el mensaje entero que te mandaron; no se cambió nada.'

/**
 * Busca el código dentro de lo pegado (el mensaje de WhatsApp lleva texto alrededor) y lo comprueba entero. Si falla,
 * explica en español qué pasa y no se toca nada.
 */
export function parseCode(pasted: unknown): CodeCheck {
  if (typeof pasted !== 'string' || !pasted.trim()) return { ok: false, error: NOT_A_CODE }
  if (pasted.length > 20000) return { ok: false, error: 'Lo que pegaste es demasiado largo para ser un código de Habla; no se cambió nada.' }
  const m = /HABLA:(\d{1,4}):([A-Za-z0-9_-]*)/.exec(pasted)
  if (!m) return { ok: false, error: NOT_A_CODE }
  if (Number(m[1]) > CODE_VERSION) return { ok: false, error: NEWER }
  if (Number(m[1]) < 1) return { ok: false, error: DAMAGED }
  if (m[0].length > MAX_CODE_CHARS) return { ok: false, error: 'Este código es demasiado largo; no se cambió nada.' }
  const json = fromBase64Url(m[2])
  if (json === null || !json) return { ok: false, error: DAMAGED }
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: DAMAGED }
  }
  return parsePayload(data)
}

/** Comprueba el contenido del código y copia SOLO los campos conocidos. */
export function parsePayload(data: unknown): CodeCheck {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, error: DAMAGED }
  const d = data as Record<string, unknown>
  const v = d.v
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, error: DAMAGED }
  if (v > CODE_VERSION) return { ok: false, error: NEWER }
  if (typeof d.t !== 'string') return { ok: false, error: DAMAGED }
  if (!(TYPES as readonly string[]).includes(d.t)) return { ok: false, error: 'Este código es de un tipo que esta versión de Habla no conoce. Actualiza la app; no se cambió nada.' }
  const from = safeText(d.from, 24)
  if (d.t === 'word') {
    const headword = safeText(d.headword, 48)
    const translation = safeText(d.translation, 80)
    if (!HEADWORD_RE.test(headword) || !translation) return { ok: false, error: DAMAGED }
    return {
      ok: true,
      code: {
        type: 'word',
        from,
        headword,
        translation,
        meaningEs: safeText(d.meaningEs, 240),
        exampleEn: safeText(d.exampleEn, 200),
        exampleEs: safeText(d.exampleEs, 200),
        ipa: safeText(d.ipa, 40),
        partOfSpeech: safeText(d.partOfSpeech, 24),
      },
    }
  }
  if (d.t === 'week') {
    // Sin nombre no se sabe de quién es la fila del tablero.
    const minutes = intIn(d.minutes, 0, 7 * 24 * 60)
    const streak = intIn(d.streak, 0, 100000)
    const days = intIn(d.days, 0, 7)
    if (!from || minutes === null || streak === null || days === null || typeof d.week !== 'string' || !WEEK_RE.test(d.week)) return { ok: false, error: DAMAGED }
    let challenge: WeekCode['challenge']
    if (d.challenge !== undefined && d.challenge !== null) {
      const c = d.challenge as Record<string, unknown>
      const target = typeof c === 'object' ? intIn(c.target, 1, 100000) : null
      const progress = typeof c === 'object' ? intIn(c.progress, 0, 100000) : null
      const title = typeof c === 'object' ? safeText(c.title, 48) : ''
      if (target === null || progress === null || !title || typeof c.done !== 'boolean') return { ok: false, error: DAMAGED }
      challenge = { title, progress: Math.min(progress, target), target, done: c.done }
    }
    return { ok: true, code: { type: 'week', from, week: d.week, minutes, streak, days, ...(challenge ? { challenge } : {}) } }
  }
  // Reto o progreso: tipo, cifra (en su rango, sin recortar: fuera de rango es un código manipulado), categoría y práctica.
  if (typeof d.kind !== 'string' || !(KINDS as readonly string[]).includes(d.kind)) return { ok: false, error: DAMAGED }
  const kind = d.kind as ChallengeKind
  const target = intIn(d.target, 1, 100000)
  if (target === null || clampTarget(kind, target) !== target) return { ok: false, error: DAMAGED }
  let category: MistakeCategory | undefined
  if (kind === 'clean') {
    if (!isCleanCategory(d.category)) return { ok: false, error: DAMAGED }
    category = d.category
  }
  let scenario: string | undefined
  if (kind === 'classes' && d.scenario !== undefined && d.scenario !== null) {
    if (typeof d.scenario !== 'string' || !(CHALLENGE_PRACTICES as readonly string[]).includes(d.scenario)) return { ok: false, error: DAMAGED }
    scenario = d.scenario
  }
  const base = { kind, target, ...(category ? { category } : {}), ...(scenario ? { scenario } : {}) }
  const title = safeText(d.title, 48) || localTitle(base)
  if (d.t === 'challenge') return { ok: true, code: { type: 'challenge', from, ...base, title, goal: safeText(d.goal, 140) || localGoal(base) } }
  const progress = intIn(d.progress, 0, 100000)
  if (progress === null || typeof d.week !== 'string' || !WEEK_RE.test(d.week)) return { ok: false, error: DAMAGED }
  return { ok: true, code: { type: 'progress', from, week: d.week, ...base, title, progress: Math.min(progress, target * 10) } }
}

// ---------------------------------------------------------------------------
// De/para los datos de la app

/** Lo que identifica un reto para compararse (mismo tipo, cifra, categoría y práctica). */
export const sameChallenge = (
  a: Pick<WeeklyChallenge, 'kind' | 'target' | 'category' | 'scenario'>,
  b: Pick<WeeklyChallenge, 'kind' | 'target' | 'category' | 'scenario'>,
) => a.kind === b.kind && a.target === b.target && (a.category ?? '') === (b.category ?? '') && (a.scenario ?? '') === (b.scenario ?? '')

/** El código del reto de tu semana (para «Retar a alguien»). */
export function challengeToCode(c: WeeklyChallenge, from: string): ChallengeCode {
  return { type: 'challenge', from: safeText(from, 24), kind: c.kind, target: c.target, category: c.category, scenario: c.scenario, title: c.titleEs, goal: c.goalEs }
}

/** El código de cuánto llevas en el reto de tu semana (para compararos). */
export function progressToCode(c: WeeklyChallenge, progress: number, from: string): ProgressCode {
  return { type: 'progress', from: safeText(from, 24), week: c.id, kind: c.kind, target: c.target, category: c.category, scenario: c.scenario, title: c.titleEs, progress: Math.max(0, Math.floor(progress)) }
}

/** El reto recibido como reto de TU semana: se mide con tus datos (challenge.ts › challengeProgress). */
export function challengeFromCode(c: ChallengeCode, weekId: string, now = Date.now()): WeeklyChallenge {
  return {
    id: weekId,
    kind: c.kind,
    target: c.target,
    ...(c.category ? { category: c.category } : {}),
    ...(c.scenario ? { scenario: c.scenario } : {}),
    titleEs: c.title,
    goalEs: c.goal,
    createdAt: now,
    source: 'shared',
    ...(c.from ? { fromName: c.from } : {}),
  }
}

/** El código de una palabra guardada. */
export function wordToCode(r: LookupResult, from: string): WordCode {
  return {
    type: 'word',
    from: safeText(from, 24),
    headword: r.headword,
    translation: r.translation,
    meaningEs: r.meaningEs,
    exampleEn: r.exampleEn,
    exampleEs: r.exampleEs,
    ipa: r.ipa,
    partOfSpeech: r.partOfSpeech,
  }
}

/** La palabra recibida como consulta guardada (los campos que el código no trae, vacíos). */
export function lookupFromCode(c: WordCode): LookupResult {
  return {
    headword: c.headword,
    ipa: c.ipa,
    partOfSpeech: c.partOfSpeech,
    translation: c.translation,
    meaningEs: c.meaningEs,
    whyEs: '',
    otherMeanings: [],
    register: '',
    collocations: [],
    falseFriendEs: '',
    exampleEn: c.exampleEn,
    exampleEs: c.exampleEs,
  }
}

/** «compartida por Ana» (o «compartida contigo» sin nombre): el contexto de la palabra en Palabras. */
export const sharedContext = (from: string) => (from ? `compartida por ${from}` : 'compartida contigo')

/** Quien lo manda, para los textos («Ana», o «alguien» sin nombre). */
export const whoOf = (from: string) => from || 'Alguien'

/** 5.13 (Fase 7): tu semana como código (minutos enteros). */
export function weekToCode(w: { from: string; week: string; minutes: number; streak: number; days: number; challenge?: WeekCode['challenge'] | null }): WeekCode {
  return {
    type: 'week',
    from: safeText(w.from, 24),
    week: w.week,
    minutes: Math.max(0, Math.round(w.minutes)),
    streak: Math.max(0, Math.floor(w.streak)),
    days: Math.min(7, Math.max(0, Math.floor(w.days))),
    ...(w.challenge ? { challenge: { ...w.challenge, progress: Math.min(Math.max(0, Math.floor(w.challenge.progress)), w.challenge.target) } } : {}),
  }
}

// ---------------------------------------------------------------------------
// Mensajes para WhatsApp (el código va al final, en su propia línea)

const HOW = 'Para usarlo, copia este mensaje entero y pégalo en Habla → Progreso → «Pegar un código».'

export function challengeMessage(c: ChallengeCode): string {
  return `¡Te reto en Habla! «${c.title}»: ${c.goal}\n${HOW}\n${encodeCode(c)}`
}

export function progressMessage(c: ProgressCode): string {
  return `Llevo ${c.progress} de ${c.target} en nuestro reto de Habla «${c.title}».\n${HOW}\n${encodeCode(c)}`
}

export function weekMessage(c: WeekCode): string {
  const reto = c.challenge ? (c.challenge.done ? ` y cumplí mi reto «${c.challenge.title}»` : `; reto «${c.challenge.title}»: ${c.challenge.progress} de ${c.challenge.target}`) : ''
  return `Mi semana en Habla: ${c.minutes} min hablando inglés, racha de ${c.streak} ${c.streak === 1 ? 'día' : 'días'}${reto}.\n${HOW}\n${encodeCode(c)}`
}

export function wordMessage(c: WordCode): string {
  return `Te paso una palabra de Habla: «${c.headword}» = ${c.translation}.\n${HOW}\n${encodeCode(c)}`
}
