import { TextToSpeech } from '@capacitor-community/text-to-speech'

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

export async function speak(text: string, rate: number, voiceIndex: number | null): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
  const auto = voiceIndex === null ? await autoVoice() : null
  const index = voiceIndex ?? auto?.index ?? null
  // Si el teléfono no tiene ninguna voz masculina, al menos bajamos el tono para Leo.
  const pitch = voiceIndex === null && !auto && voiceGender === 'male' ? 0.8 : 1
  await TextToSpeech.speak({
    text,
    lang: auto ? auto.lang : voiceLang,
    rate,
    pitch,
    volume: 1,
    category: 'playback',
    ...(index !== null ? { voice: index } : {}),
  })
}

export async function stopSpeaking(): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
}
