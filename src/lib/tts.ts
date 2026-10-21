import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { focusOwnerFor, releaseAudioFocus, takeAudioFocus } from './audioFocus'
import { beginSpeaking, endSpeaking, speakingKey } from './speaking'
import { splitByLanguage, type LangSegment } from './speechLang'

export { speakingKey, useSpeaking } from './speaking'
// Para los tests (la misma instancia del módulo que usa la voz).
export { audioFocusState } from './audioFocus'

export type Gender = 'male' | 'female'

export interface VoiceOption {
  index: number
  name: string
  lang: string
  gender: Gender | null
}

// Voz del profe activo: Emma (en-US, femenina) o Leo (en-GB, masculina). La fija App.tsx al cambiar de profe.
let voiceLang = 'en-US'
let voiceGender: Gender = 'female'

export function setTeacherVoice(lang: string, gender: Gender) {
  voiceLang = lang
  voiceGender = gender
}

// Velocidad y voz elegidas por el usuario (settings.ttsRate / voiceIndex). También las fija App.tsx, igual que la voz
// del profe: así un botón de reproducir en una pieza pequeña (p. ej. CorrectionView) no necesita recibirlas por props.
let prefRate = 1
let prefVoice: number | null = null

export function setVoicePrefs(rate: number, voiceIndex: number | null) {
  prefRate = rate
  prefVoice = voiceIndex
}

// Códigos de las voces de Google TTS en Android (p. ej. "en-gb-x-gbb-network") con su género conocido.
const GOOGLE_VOICE_GENDER: Record<string, Gender> = {
  // en-GB
  gba: 'female',
  gbb: 'male',
  gbc: 'female',
  gbd: 'male',
  gbg: 'female',
  rjs: 'male',
  // en-US
  iob: 'female',
  iog: 'female',
  iol: 'male',
  iom: 'male',
  tpc: 'female',
  tpd: 'male',
  tpf: 'female',
  sfg: 'female',
  // en-AU / en-IN (por si no hay voces del acento pedido)
  aua: 'female',
  aub: 'male',
  auc: 'female',
  aud: 'male',
  ahp: 'female',
  cxx: 'female',
  ene: 'female',
  enc: 'female',
  end: 'male',
}

function guessGender(name: string): Gender | null {
  const n = name.toLowerCase()
  const code = n.match(/-x-([a-z]{3})(?:-|$)/)?.[1]
  if (code && GOOGLE_VOICE_GENDER[code]) return GOOGLE_VOICE_GENDER[code]
  // Voces del navegador / otros motores: "Google UK English Male", "Microsoft Ryan", etc.
  if (/\b(male|man|ryan|guy|daniel|george|brian|arthur|oliver)\b/.test(n) && !/female/.test(n)) return 'male'
  if (/\b(female|woman|aria|jenny|libby|sonia|emma|amy|samantha|karen)\b/.test(n)) return 'female'
  return null
}

const norm = (l: string) => l.toLowerCase().replace('_', '-')

let cache: VoiceOption[] | null = null

async function allEnglishVoices(): Promise<VoiceOption[]> {
  if (cache?.length) return cache
  try {
    const { voices } = await TextToSpeech.getSupportedVoices()
    cache = voices
      .map((v, index) => ({ index, name: v.name, lang: v.lang, gender: guessGender(`${v.name} ${v.voiceURI ?? ''}`) }))
      .filter((v) => norm(v.lang).startsWith('en'))
    return cache
  } catch {
    return []
  }
}

/** Voces en inglés del dispositivo; primero las del acento y género del profe. */
export async function englishVoices(): Promise<VoiceOption[]> {
  const list = await allEnglishVoices()
  const score = (v: VoiceOption) => (norm(v.lang) === norm(voiceLang) ? 2 : 0) + (v.gender === voiceGender ? 1 : 0)
  return [...list].sort((a, b) => score(b) - score(a))
}

/**
 * Voz automática del profe: acento + género correctos; si no existe, el mismo género con otro acento.
 * Preferimos las voces "network" (más naturales) sobre las "local".
 */
async function autoVoice(): Promise<VoiceOption | null> {
  const list = await allEnglishVoices()
  const quality = (v: VoiceOption) => (/network/i.test(v.name) ? 1 : 0)
  const pick = (f: (v: VoiceOption) => boolean) => list.filter(f).sort((a, b) => quality(b) - quality(a))[0]
  return (
    pick((v) => norm(v.lang) === norm(voiceLang) && v.gender === voiceGender) ??
    pick((v) => v.gender === voiceGender) ??
    null
  )
}

// En Android, si una frase se interrumpe (stop o nueva frase), el plugin nunca resuelve su promesa.
// Guardamos cómo terminar la frase en curso para resolverla nosotros al interrumpirla.
let finishCurrent: (() => void) | null = null

function interruptCurrent() {
  finishCurrent?.()
  finishCurrent = null
}

// 5.10.1 (REG-A1-02/03, REG-M-06): el foco de audio va por LECTURA, no por frase ni por tramo. Lo coge la lectura en
// curso y lo suelta al acabar (con el retraso de audioFocus.ts, que encadena la siguiente sin que la música rebote).
// Una lectura que sustituye a otra lo hereda; si cambia de clase (▶ corto ↔ lectura larga), se cambia sin esperas.
let heldFocus: 'tts' | 'read' | null = null

function holdFocus(who: 'tts' | 'read') {
  // Primero se coge el nuevo y luego se suelta el viejo: nunca hay un instante sin foco.
  takeAudioFocus(who)
  if (heldFocus && heldFocus !== who) releaseAudioFocus(heldFocus, true)
  heldFocus = who
}

function dropFocus() {
  if (!heldFocus) return
  releaseAudioFocus(heldFocus)
  heldFocus = null
}

type Turn = ReturnType<typeof beginSpeaking>

/**
 * Lee una frase dentro de la lectura `turn` (no toca el estado ▶/⏸ ni el foco): busca la voz y la lanza. Vuelve al
 * acabar, al interrumpirse, o sin hablar si la lectura ya no es la activa. `onStart` se llama justo antes de sonar.
 */
async function utter(turn: Turn, text: string, rate: number, voiceIndex: number | null, lang?: string, onStart?: () => void): Promise<void> {
  if (lang) voiceIndex = null
  const auto = voiceIndex === null && !lang ? await autoVoice() : null
  const index = voiceIndex ?? auto?.index ?? null
  // Si el teléfono no tiene ninguna voz masculina, al menos bajamos el tono para Leo. 5.10.1 (REG-A1-06): solo en
  // inglés; los tramos en español (voz española del sistema) van con su tono normal.
  const pitch = !lang && voiceIndex === null && !auto && voiceGender === 'male' ? 0.8 : 1
  // Si la pararon (o empezó otra) mientras buscábamos la voz, no la lanzamos: sonaría con el botón ya en ▶.
  if (!turn.active()) return
  onStart?.()
  return new Promise<void>((resolve, reject) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (finishCurrent === finish) finishCurrent = null
      resolve()
    }
    finishCurrent = finish
    TextToSpeech.speak({
      text,
      lang: lang ?? (auto ? auto.lang : voiceLang),
      rate,
      pitch,
      volume: 1,
      category: 'playback',
      ...(index !== null ? { voice: index } : {}),
    })
      .then(finish)
      .catch((e) => {
        if (done) return
        done = true
        if (finishCurrent === finish) finishCurrent = null
        reject(e)
      })
  })
}

/** Empieza una lectura: corta la que sonara (también una lectura por tramos) y su clave pasa a ⏸. */
async function beginRead(key: string): Promise<Turn> {
  const turn = beginSpeaking(key)
  interruptCurrent()
  await TextToSpeech.stop().catch(() => {})
  return turn
}

/** Fin de una lectura: si sigue siendo la activa, su botón vuelve a ▶ y suelta el foco (con retraso). */
function endRead(turn: Turn) {
  if (!turn.active()) return
  turn.end()
  dropFocus()
}

/**
 * Lee `text`. `key` identifica qué botón muestra ⏸ mientras suena (por defecto, la propia frase: así, cuando el profe
 * lee un mensaje solo, su botón «Repetir» también pasa a ⏸).
 */
export async function speak(
  text: string,
  rate: number,
  voiceIndex: number | null,
  key: string = text,
  // v5.10 (P4): otro idioma (p. ej. las explicaciones de Gramática, en español): voz del sistema para ese idioma.
  lang?: string,
): Promise<void> {
  const turn = await beginRead(key)
  try {
    // v5.10 (P2): la música de otras apps baja mientras suena. 5.10.1 (REG-M-06): si es larga (> ~12 s), se pausa.
    await utter(turn, text, rate, voiceIndex, lang, () => holdFocus(focusOwnerFor(text, rate)))
  } finally {
    endRead(turn)
  }
}

export async function stopSpeaking(): Promise<void> {
  endSpeaking()
  interruptCurrent()
  // Antes del await: una lectura que empiece mientras se para el motor coge su propio foco y no se le quita.
  dropFocus()
  await TextToSpeech.stop().catch(() => {})
}

/**
 * Botón ▶/⏸: si esa clave ya suena, la para; si no, la lee (y corta lo que sonara). Sin velocidad ni voz, usa las del
 * usuario (setVoicePrefs). Nunca rechaza: un fallo del motor de voz solo deja el botón en ▶.
 */
export function toggleSpeak(
  text: string,
  rate: number = prefRate,
  voiceIndex: number | null = prefVoice,
  key: string = text,
): Promise<void> {
  if (speakingKey() === key) return stopSpeaking()
  return speak(text, rate, voiceIndex, key).catch(() => {})
}

/**
 * v5.10 (P4b, uso real): lee un texto en español con inglés dentro: el español con la voz española y algo más
 * despacio (a la velocidad normal «iba de carretilla»), y cada palabra o frase inglesa con la voz del profe, con su
 * pronunciación de verdad.
 * 5.10.1 (REG-M-06/07, REG-A1-03): es UNA lectura: una sola clave ⏸ de principio a fin (antes volvía a ▶ un instante
 * entre tramos) y un solo foco que pausa la música para todos los tramos. Otra lectura o stopSpeaking() la cortan.
 */
async function speakSpanish(text: string, key: string): Promise<void> {
  const segs = splitByLanguage(text)
  return readSegments(segs, key, prefRate * EN_IN_ES_RATE, segs.length > 1 ? 'read' : focusOwnerFor(text, prefRate * ES_RATE))
}

/**
 * Lee tramos ya partidos como UNA lectura: una clave ▶/⏸ y un foco de audio para todos. El español, con la voz
 * española a su ritmo (ES_RATE); el inglés, con la voz y el tono del profe a `enRate`.
 */
async function readSegments(segs: LangSegment[], key: string, enRate: number, owner: 'tts' | 'read'): Promise<void> {
  const turn = await beginRead(key)
  try {
    if (!segs.length || !turn.active()) return
    holdFocus(owner)
    for (const seg of segs) {
      if (!turn.active()) return
      if (seg.lang === 'es') await utter(turn, seg.text, prefRate * ES_RATE, null, 'es-ES')
      else await utter(turn, seg.text, enRate, prefVoice)
    }
  } finally {
    endRead(turn)
  }
}

/**
 * 5.10.1 (REG-A3-04): lee la respuesta del profe ya partida por idiomas (`replySegments()` de teacher.ts): el inglés con
 * la voz del profe a la velocidad del usuario y las citas en español («¿cómo dirías…?») con la voz española. Es una
 * sola lectura (una clave, por defecto el texto entero; un foco: baja la música o, si es larga, la pausa). Nunca
 * rechaza; vuelve al acabar o al cortarse.
 */
export function speakSegments(segments: { lang: 'es' | 'en'; text: string }[], key?: string): Promise<void> {
  const segs = segments.filter((x) => /[\p{L}\p{N}]/u.test(x.text))
  const all = segs.map((x) => x.text).join(' ')
  return readSegments(segs, key ?? all, prefRate, focusOwnerFor(all, prefRate)).catch(() => {})
}

/** Velocidad del español respecto a la elegida por el usuario, y del inglés que va dentro (un poco más lento: es el modelo). */
const ES_RATE = 0.85
const EN_IN_ES_RATE = 0.9

/** v5.10 (P4): ▶/⏸ para textos en español (explicaciones de Gramática): el inglés que llevan, con voz inglesa. */
export function toggleSpeakSpanish(text: string, key: string = text): Promise<void> {
  if (speakingKey() === key) return stopSpeaking()
  return speakSpanish(text, key).catch(() => {})
}

/**
 * 5.10.1 (REG-M-07, REG-A1-05): para la voz solo si lo que suena es `key` (o, con `prefix`, una clave que empieza
 * así: `explain:`). Lo usan las pantallas de Gramática al cambiar de parte o salir: la explicación no sigue sonando sin
 * ningún ⏸ a la vista, y no se corta lo que no es suyo (el profe de la clase que hay debajo de la hoja).
 */
export function stopSpeakingIf(key: string, prefix = false): Promise<void> {
  const k = speakingKey()
  if (k === null || (prefix ? !k.startsWith(key) : k !== key)) return Promise.resolve()
  return stopSpeaking()
}
