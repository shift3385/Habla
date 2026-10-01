import { TextToSpeech } from '@capacitor-community/text-to-speech'

export interface VoiceOption {
  index: number
  name: string
  lang: string
}

// Voz del profe activo: Emma (en-US) o Leo (en-GB). Lo fija App.tsx al cambiar de profe.
let voiceLang = 'en-US'
let voicePitch = 1

export function setTeacherVoice(lang: string, pitch: number) {
  voiceLang = lang
  voicePitch = pitch
}

/** Voces en inglés del dispositivo (índices según getSupportedVoices); primero las del acento del profe. */
export async function englishVoices(): Promise<VoiceOption[]> {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices()
    const norm = (l: string) => l.toLowerCase().replace('_', '-')
    return voices
      .map((v, index) => ({ index, name: v.name, lang: v.lang }))
      .filter((v) => norm(v.lang).startsWith('en'))
      .sort((a, b) => Number(norm(b.lang) === norm(voiceLang)) - Number(norm(a.lang) === norm(voiceLang)))
  } catch {
    return []
  }
}

export async function speak(text: string, rate: number, voiceIndex: number | null): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
  await TextToSpeech.speak({
    text,
    lang: voiceLang,
    rate,
    pitch: voicePitch,
    volume: 1,
    category: 'playback',
    ...(voiceIndex !== null ? { voice: voiceIndex } : {}),
  })
}

export async function stopSpeaking(): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
}
