// 5.11 «Sonidos» (S-01 tipos · S-05 motor): fichas de sonidos, abecedario, lecciones y créditos de audio (src/sounds/*.json),
// mapa de símbolos de Azure → ficha/lección, y progreso en la tabla `sounds` de Dexie (visto, «Escucha» por día, notas de
// Azure, días practicados, dominado). Formato del contenido: docs/v5.11/FORMATO-sonidos.md (lo valida
// scripts/validate-sounds.mjs). Los JSON se cargan con import() perezoso: no entran en el arranque de la app.
import { db, type SoundDayScore, type SoundProgress, type SoundState } from './db'
import { addPracticeSeconds, dayKey } from './stats'

export type { SoundDayScore, SoundProgress, SoundState }

// ---------------------------------------------------------------------------
// Tipos del contenido (src/sounds/*.json)

export type SoundLevel = 'A1' | 'A2' | 'B1' | 'B2'
export type SoundKind = 'vowel' | 'diphthong' | 'consonant' | 'feature'
export type ChartBlock = 'vowels' | 'diphthongs' | 'consonants'

export interface Articulation {
  lips: 'spread' | 'neutral' | 'rounded'
  jaw: 'close' | 'mid' | 'open'
  place: string // front, central, back, bilabial, labiodental, dental, alveolar, postalveolar, velar, glottal…
  lipsEs: string
  tongueEs: string
  voiceEs: string
}

export interface MinimalPairs {
  with: string // id de la otra ficha
  pairs: [string, string][] // la primera palabra lleva ESTE sonido; la segunda, el de `with`
}

export interface Phoneme {
  id: string // ARPAbet en minúsculas (`ih`, `th`) o rasgo (`s-cluster`, `ed`, `s-ending`)
  ipa: string // símbolo que se enseña (/iː/ con «ː»); en rasgos, una etiqueta corta («s+cons.», «-ed»)
  azure: string[] // símbolos que puede devolver Azure en-US (IPA) para este sonido; [] en rasgos
  kind: SoundKind
  chart?: { block: ChartBlock; row: number; col: number } // posición en la tabla (no en rasgos)
  keyword: string
  nameEs: string
  level: SoundLevel
  difficulty: 1 | 2 | 3
  priority: 'P1' | 'P2' | 'P3'
  voiced: boolean | null
  articulation: Articulation
  tipShortEs: string // ≤ 90 car.: el consejo de la nota de Azure (M-12: SOUND_TIPS sale de aquí)
  explanationEs: string[] // 1–3 párrafos de ≤ 300 car. que dice la mascota
  spanishEs: string
  mistakeEs: string
  spellings: { pattern: string; examples: string[] }[]
  examples: { initial: string[]; medial: string[]; final: string[] }
  positionNoteEs?: string
  minimalPairs: MinimalPairs[]
  sentences: { en: string; es: string }[]
  ukNoteEs?: string
  related: string[]
  /** Id del audio suelto en credits.json (S-04). Sin él, la ficha no muestra «▶ sonido suelto». */
  audio?: string
  /** Palabra «estirada» para imitar los sonidos continuos (sssun). Se escribe, NO se le da a la voz. */
  stretchEn?: string
}

export interface AlphabetFamily {
  id: string // id de la ficha del sonido de la vocal del nombre (`ey`, `iy`, `eh`, `ay`, `ow`, `uw`) o `ar`
  ipa: string
  labelEs: string // «ei», «i», …
  letters: string[]
}

export interface AlphabetLetter {
  letter: string // A–Z
  ipa: string // nombre en IPA
  family: string // id de AlphabetFamily
  soundsLikeEs: string // ayuda escrita al estilo español («ei»), no transcripción
  ttsText: string // lo que se le da a la voz para que diga el NOMBRE de la letra (F0-5)
  trapEs?: string
  confusedWith?: string[] // letras con las que se confunde al deletrear
}

export interface Alphabet {
  families: AlphabetFamily[]
  letters: AlphabetLetter[]
  spellingPhrases: { en: string; es: string }[] // «How do you spell that?»…
  symbols: { symbol: string; en: string; es: string }[] // @ = at, . = dot…
}

interface ExerciseBase {
  id: string // <lección>-<n>
}
/** Suena una palabra (o letra) del par y eliges cuál fue. `letters`: los elementos son letras (se lee su `ttsText`). */
export interface ListenChooseExercise extends ExerciseBase {
  type: 'listen-choose'
  pairs: string[][] // pares (o tríos) de palabras; cada ronda suena una de ellas
  rounds: number
  letters?: boolean
  hintEs?: string // qué escuchar (se enseña al fallar)
}
/** ¿Cuál tiene otro sonido? */
export interface OddOneOutExercise extends ExerciseBase {
  type: 'odd-one-out'
  words: string[]
  answer: number
  whyEs: string
  letters?: boolean
}
/** Clasifica palabras en 2–3 columnas por su sonido (con toques). */
export interface SortExercise extends ExerciseBase {
  type: 'sort'
  columns: string[] // ids de fichas (o de rasgos)
  columnLabels?: string[] // etiqueta de cada columna si no basta el símbolo (/ɪd/)
  words: [string, string][] // [palabra, columna]
  letters?: boolean
}
/** Dices palabras sueltas; Azure (assessWord) puntúa el sonido objetivo o, sin Azure, «Escúchate». */
export interface SayWordExercise extends ExerciseBase {
  type: 'say-word'
  target: string
  words: string[]
}
/** Dices las dos palabras de cada par. */
export interface SayPairExercise extends ExerciseBase {
  type: 'say-pair'
  pairs: [string, string][]
}
/** Una frase corta con el sonido. */
export interface SaySentenceExercise extends ExerciseBase {
  type: 'say-sentence'
  en: string
  es: string
  targets: string[]
}
/** La voz deletrea (con pausas) y escribes la palabra. `items`: lo que se deletrea. */
export interface SpellListenExercise extends ExerciseBase {
  type: 'spell-listen'
  items: string[]
  hintEs?: string
}
export type SoundExercise =
  | ListenChooseExercise
  | OddOneOutExercise
  | SortExercise
  | SayWordExercise
  | SayPairExercise
  | SaySentenceExercise
  | SpellListenExercise

export interface SoundLesson {
  id: string // S0, A1, V1, C2a…
  order: number // posición en la ruta COMPLETA (DISENO §5.2): la 5.11.x añade lecciones sin renumerar
  unit: number // 0–7
  titleEs: string
  level: SoundLevel
  minutes: number // 3–10
  phonemes: string[] // ids de las fichas que trabaja (la primera es la principal); [] en S0
  introEs: string
  exercises: SoundExercise[]
  closingEs?: string // lo que dice la mascota al terminar
  classFocusEn?: string // para la clase centrada en el sonido (fase 2)
}

export interface AudioCredit {
  id: string // lo cita `Phoneme.audio`
  file: string // en public/sounds/
  phoneme: string // id de la ficha
  title: string // nombre del archivo original en Commons
  page: string // https://commons.wikimedia.org/wiki/File:…
  author: string
  license: string // texto exacto: «CC BY-SA 3.0», «CC BY-SA 4.0», «Dominio público»…
  licenseUrl: string
  modified: boolean
  modifiedEs?: string // qué se cambió (recortado, recodificado…), si `modified`
  versionEs?: string // si se usa una versión antigua del archivo (no la actual), cuál y por qué
}

export interface SoundCatalog {
  phonemes: Phoneme[]
  lessons: SoundLesson[]
  alphabet: Alphabet
}

// ---------------------------------------------------------------------------
// Carga perezosa (un chunk aparte por JSON; nada de esto entra en el arranque)

const files = import.meta.glob<{ default: unknown }>('../sounds/{phonemes,lessons,alphabet,credits}.json') // tips.json no: lo importa estático pronunciation.ts
const load = async <T>(name: string): Promise<T> => {
  const f = files[`../sounds/${name}.json`]
  if (!f) throw new Error(`Falta src/sounds/${name}.json`)
  return (await f()).default as T
}

let catalog: Promise<SoundCatalog> | null = null

/** Todo el contenido de Sonidos (se carga una vez y queda en memoria). */
export function loadSounds(): Promise<SoundCatalog> {
  catalog ??= Promise.all([
    load<{ phonemes: Phoneme[] }>('phonemes'),
    load<{ lessons: SoundLesson[] }>('lessons'),
    load<Alphabet>('alphabet'),
  ]).then(([p, l, alphabet]) => ({ phonemes: p.phonemes, lessons: [...l.lessons].sort((a, b) => a.order - b.order), alphabet }))
  catalog.catch(() => (catalog = null)) // si falla la carga, el siguiente intento vuelve a probar
  return catalog
}

/** Créditos de los audios sueltos (pantalla «Acerca de» → Créditos de audio). */
export async function loadAudioCredits(): Promise<AudioCredit[]> {
  return (await load<{ credits: AudioCredit[] }>('credits')).credits
}

/** Ruta del audio suelto para `new Audio()` (Vite copia public/sounds/ al APK). */
export const audioUrl = (c: Pick<AudioCredit, 'file'>) => `${import.meta.env.BASE_URL}sounds/${c.file}`

export const phonemeById = (cat: Pick<SoundCatalog, 'phonemes'>, id: string) => cat.phonemes.find((p) => p.id === id)

// ---------------------------------------------------------------------------
// Mapa de Azure → ficha y lección (S-05, S-11)

/** Azure escribe /iː/ como «i», /uː/ como «u» y a veces /ɡ/ como «g»: se normaliza antes de buscar. */
export function normalizeAzure(symbol: string): string {
  const s = symbol.trim().replace(/ː/g, '')
  return s === 'g' ? 'ɡ' : s
}

/** Símbolo de Azure (normalizado) → id de la ficha. Lo construye `buildAzureMap`; el validador exige que sea único. */
export function buildAzureMap(phonemes: Phoneme[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of phonemes) for (const a of p.azure) if (!map.has(normalizeAzure(a))) map.set(normalizeAzure(a), p.id)
  return map
}

/**
 * Ficha que conviene practicar para el sonido flojo de una palabra (enlace «🔊 Practicar el sonido» de S-11). Mismos
 * casos especiales que `soundTipEs()` de pronunciation.ts: s + consonante al principio → `s-cluster` (lección E1);
 * -ed con /t/ o /d/ flojo → `ed` (E4). Una omisión no lleva enlace (no es un problema de sonido).
 */
export function phonemeByAzure(phonemes: Phoneme[], symbol: string | undefined, word = '', omission = false): Phoneme | undefined {
  if (omission || !symbol) return undefined
  const w = word.toLowerCase()
  const s = normalizeAzure(symbol)
  const byId = (id: string) => phonemes.find((p) => p.id === id)
  if (s === 's' && /^s[ptkcqmnlw]/.test(w)) return byId('s-cluster')
  if ((s === 't' || s === 'd') && /[^etd]ed$/.test(w)) return byId('ed')
  const id = buildAzureMap(phonemes).get(s)
  return id ? byId(id) : undefined
}

/**
 * Lección de la ruta para una ficha: la que la tiene como principal; si no, la primera (por orden) que la trabaja,
 * dejando para el final las del abecedario (unidades 0–1: /iː/ debe llevar a V1, no a «Letras con ei e i»).
 */
export function lessonFor(lessons: SoundLesson[], phonemeId: string): SoundLesson | undefined {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  const has = (l: SoundLesson) => l.phonemes.includes(phonemeId)
  return sorted.find((l) => l.phonemes[0] === phonemeId && l.unit > 1) ?? sorted.find((l) => has(l) && l.unit > 1) ?? sorted.find(has)
}

/** Consejos de una línea por símbolo de Azure (M-12: `SOUND_TIPS` de pronunciation.ts sale de aquí). */
export async function loadSoundTips(): Promise<Record<string, string>> {
  const { phonemes } = await loadSounds()
  const out: Record<string, string> = {}
  for (const p of phonemes) for (const a of p.azure) out[a] ??= p.tipShortEs
  return out
}

// ---------------------------------------------------------------------------
// Progreso y «dominado» (S-05). Lógica pura primero (se prueba en Node), luego Dexie.

/**
 * Umbrales de «dominado» (PLAN S-05). El de Azure se puede ajustar tras F0-4.
 * - «Escucha»: ≥ 85 % de aciertos en un día con al menos `minListen` rondas.
 * - Azure: nota del sonido ≥ `azureScore` en ≥ 80 % de las palabras (4 de 5) en un día con al menos `minAzure` palabras.
 * - Hace falta en `days` días distintos: con Azure, «Escucha» en 2 días y Azure en 2 días; sin Azure, «Escucha» en 2
 *   días, y queda «solo de oído».
 */
export const MASTERY = { listen: 0.85, minListen: 6, azureScore: 80, azureRatio: 0.8, minAzure: 5, days: 2 } as const

const goodDays = (scores: Record<string, SoundDayScore> | undefined, ratio: number, min: number) =>
  Object.values(scores ?? {}).filter((d) => d.total >= min && d.ok / d.total >= ratio - 1e-9).length

/** ¿Qué le falta a un sonido para quedar dominado? `hasAzure`: el alumno tiene la fonética activa. */
export function masteryOf(p: Pick<SoundProgress, 'listen' | 'azure'>, hasAzure: boolean): { mastered: boolean; earOnly: boolean } {
  const ear = goodDays(p.listen, MASTERY.listen, MASTERY.minListen) >= MASTERY.days
  if (!ear) return { mastered: false, earOnly: false }
  if (!hasAzure) return { mastered: true, earOnly: true }
  const said = goodDays(p.azure, MASTERY.azureRatio, MASTERY.minAzure) >= MASTERY.days
  return { mastered: said, earOnly: false }
}

const RANK: Record<SoundState, number> = { new: 0, seen: 1, practiced: 2, mastered: 3 }

/** Estado que toca según lo hecho. Nunca baja (un sonido dominado sigue dominado). */
export function stateOf(p: Partial<SoundProgress> | undefined): SoundState {
  if (!p) return 'new'
  const derived: SoundState = p.mastered ? 'mastered' : p.listen || p.azure ? 'practiced' : p.seenAt ? 'seen' : 'new'
  return p.state && RANK[p.state] > RANK[derived] ? p.state : derived
}

const emptyRow = (id: string, now: number): SoundProgress => ({ id, lastAt: now, state: 'new', mastered: false })

const addDay = (days: string[] | undefined, day: string) => (days?.includes(day) ? days : [...(days ?? []), day])

const bump = (scores: Record<string, SoundDayScore> | undefined, day: string, ok: boolean): Record<string, SoundDayScore> => {
  const d = scores?.[day] ?? { ok: 0, total: 0 }
  return { ...scores, [day]: { ok: d.ok + (ok ? 1 : 0), total: d.total + 1 } }
}

/** Aplica el estado y «dominado» a una fila (idempotente: aplicarlo dos veces da lo mismo). */
export function settle(p: SoundProgress, hasAzure: boolean, now: number): SoundProgress {
  const m = p.mastered ? { mastered: true, earOnly: !!p.earOnly } : masteryOf(p, hasAzure)
  // Dominado «solo de oído» que luego consigue también la nota de Azure: deja de ser solo de oído.
  const earOnly = m.mastered && m.earOnly && hasAzure && masteryOf(p, true).mastered ? false : m.earOnly
  const next: SoundProgress = { ...p, mastered: m.mastered, earOnly: m.mastered ? earOnly : undefined }
  if (m.mastered && !p.masteredAt) next.masteredAt = now
  if (!next.earOnly) delete next.earOnly
  next.state = stateOf(next)
  return next
}

/** Una ronda de «Escucha» (listen-choose, odd-one-out, sort…) sobre una ficha. Puro: devuelve la fila nueva. */
export function withListen(p: SoundProgress | undefined, id: string, correct: boolean, hasAzure: boolean, now: number): SoundProgress {
  const day = dayKey(now)
  const row = p ?? emptyRow(id, now)
  return settle({ ...row, seenAt: row.seenAt ?? now, lastAt: now, listen: bump(row.listen, day, correct), days: addDay(row.days, day) }, hasAzure, now)
}

/** Una palabra dicha con nota de Azure del sonido objetivo (0–100). Puro. */
export function withAzure(p: SoundProgress | undefined, id: string, score: number, hasAzure: boolean, now: number): SoundProgress {
  const day = dayKey(now)
  const row = p ?? emptyRow(id, now)
  const ok = score >= MASTERY.azureScore
  return settle(
    { ...row, seenAt: row.seenAt ?? now, lastAt: now, azure: bump(row.azure, day, ok), bestScore: Math.max(row.bestScore ?? 0, Math.round(score)), days: addDay(row.days, day) },
    hasAzure,
    now,
  )
}

// --- Dexie ---

/** Todo el progreso, por id (sonidos y lecciones; las lecciones con clave `lesson:<id>`). */
export async function loadSoundProgress(): Promise<Record<string, SoundProgress>> {
  const out: Record<string, SoundProgress> = {}
  for (const p of await db.sounds.toArray()) out[p.id] = p
  return out
}

export const lessonKey = (lessonId: string) => `lesson:${lessonId}`

/** Abriste la ficha (o la lección): pasa a «visto» la primera vez y se apunta el último uso. */
export async function markSoundSeen(id: string, now = Date.now()): Promise<SoundProgress> {
  return db.transaction('rw', db.sounds, async () => {
    const p = (await db.sounds.get(id)) ?? emptyRow(id, now)
    const next: SoundProgress = { ...p, seenAt: p.seenAt ?? now, lastAt: now, kind: id.startsWith('lesson:') ? 'lesson' : p.kind }
    if (!next.kind) delete next.kind
    next.state = stateOf(next)
    await db.sounds.put(next)
    return next
  })
}

/** Guarda una ronda de «Escucha». Devuelve la fila y si con ella el sonido acaba de quedar dominado. */
export async function recordListen(id: string, correct: boolean, hasAzure: boolean, now = Date.now()): Promise<{ progress: SoundProgress; justMastered: boolean }> {
  return db.transaction('rw', db.sounds, async () => {
    const before = await db.sounds.get(id)
    const progress = withListen(before, id, correct, hasAzure, now)
    await db.sounds.put(progress)
    return { progress, justMastered: progress.mastered && !before?.mastered }
  })
}

/** Guarda la nota de Azure del sonido en una palabra. Devuelve la fila y si acaba de quedar dominado. */
export async function recordAzureScore(id: string, score: number, hasAzure = true, now = Date.now()): Promise<{ progress: SoundProgress; justMastered: boolean }> {
  return db.transaction('rw', db.sounds, async () => {
    const before = await db.sounds.get(id)
    const progress = withAzure(before, id, score, hasAzure, now)
    await db.sounds.put(progress)
    return { progress, justMastered: progress.mastered && !before?.mastered }
  })
}

/**
 * Tiempo de una lección o ficha: suma a la meta del día y a la racha (`addPracticeSeconds`, como Gramática) y a la
 * fila de la lección. `completed`: llegaste al cierre (la primera vez se guarda `completedAt`).
 */
export async function recordLessonTime(lessonId: string, seconds: number, completed: boolean, now = Date.now()): Promise<SoundProgress> {
  const secs = Math.max(0, Math.round(seconds))
  addPracticeSeconds(secs)
  const id = lessonKey(lessonId)
  return db.transaction('rw', db.sounds, async () => {
    const p = (await db.sounds.get(id)) ?? emptyRow(id, now)
    const next: SoundProgress = {
      ...p,
      kind: 'lesson',
      seenAt: p.seenAt ?? now,
      lastAt: now,
      seconds: (p.seconds ?? 0) + secs,
      completedAt: p.completedAt ?? (completed ? now : undefined),
    }
    if (next.completedAt === undefined) delete next.completedAt
    next.state = next.completedAt ? 'practiced' : stateOf(next)
    await db.sounds.put(next)
    return next
  })
}

/** Ruta: lecciones terminadas, total y la siguiente sin terminar (en orden). Puro. */
export function routeProgress(lessons: SoundLesson[], progress: Record<string, SoundProgress>): { done: number; total: number; next?: SoundLesson } {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  const isDone = (l: SoundLesson) => !!progress[lessonKey(l.id)]?.completedAt
  return { done: sorted.filter(isDone).length, total: sorted.length, next: sorted.find((l) => !isDone(l)) }
}

/** Número de sonidos dominados (para el hito «primer sonido dominado» de M-03). */
export async function masteredSoundCount(): Promise<number> {
  return (await db.sounds.toArray()).filter((p) => p.kind !== 'lesson' && p.mastered).length
}
