import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { releaseAudioFocus, takeAudioFocus } from './audioFocus'
import { beginSpeaking, endSpeaking, speakingKey } from './speaking'

export { speakingKey, useSpeaking } from './speaking'

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
  const turn = beginSpeaking(key)
  interruptCurrent()
  await TextToSpeech.stop().catch(() => {})
  if (lang) voiceIndex = null
  const auto = voiceIndex === null && !lang ? await autoVoice() : null
  const index = voiceIndex ?? auto?.index ?? null
  // Si el teléfono no tiene ninguna voz masculina, al menos bajamos el tono para Leo.
  const pitch = voiceIndex === null && !auto && voiceGender === 'male' ? 0.8 : 1
  // Si la pararon (o empezó otra) mientras buscábamos la voz, no la lanzamos: sonaría con el botón ya en ▶.
  if (!turn.active()) return
  takeAudioFocus('tts') // v5.10 (P2): la música de otras apps baja mientras suena
  return new Promise<void>((resolve, reject) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (finishCurrent === finish) finishCurrent = null
      turn.end()
      releaseAudioFocus('tts')
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
        turn.end()
        releaseAudioFocus('tts')
        reject(e)
      })
  })
}

export async function stopSpeaking(): Promise<void> {
  endSpeaking()
  interruptCurrent()
  await TextToSpeech.stop().catch(() => {})
  releaseAudioFocus('tts')
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

/** v5.10 (P4): ▶/⏸ para textos en español (explicaciones de Gramática), con la voz española del teléfono. */
export function toggleSpeakSpanish(text: string, key: string = text): Promise<void> {
  if (speakingKey() === key) return stopSpeaking()
  return speak(text, prefRate, null, key, 'es-ES').catch(() => {})
}
