import { TextToSpeech } from '@capacitor-community/text-to-speech'

export interface VoiceOption {
  index: number
  name: string
  lang: string
}

/** Voces en inglés disponibles en el dispositivo (índices según getSupportedVoices). */
export async function englishVoices(): Promise<VoiceOption[]> {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices()
    return voices
      .map((v, index) => ({ index, name: v.name, lang: v.lang }))
      .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
      .sort((a, b) => Number(b.lang.includes('US')) - Number(a.lang.includes('US')))
  } catch {
    return []
  }
}

export async function speak(text: string, rate: number, voiceIndex: number | null): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
  await TextToSpeech.speak({
    text,
    lang: 'en-US',
    rate,
    pitch: 1,
    volume: 1,
    category: 'playback',
    ...(voiceIndex !== null ? { voice: voiceIndex } : {}),
  })
}

export async function stopSpeaking(): Promise<void> {
  await TextToSpeech.stop().catch(() => {})
}
