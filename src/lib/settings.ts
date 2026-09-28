import { Preferences } from '@capacitor/preferences'

// Las claves API viven solo en el almacenamiento local del teléfono (Preferences).
// Nunca se escriben en el código, en IndexedDB ni en las copias de seguridad.

export interface Settings {
  anthropicKey: string
  openaiKey: string
  ttsRate: number // 0.5 – 1.5
  voiceIndex: number | null // índice de getSupportedVoices(); null = voz por defecto en-US
  earMode: boolean // texto del profe oculto hasta tocarlo
}

const DEFAULTS: Settings = {
  anthropicKey: '',
  openaiKey: '',
  ttsRate: 0.9,
  voiceIndex: null,
  earMode: false,
}

const KEY = 'habla.settings'

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...(JSON.parse(value) as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) })
}

export function hasKeys(s: Settings): boolean {
  return s.anthropicKey.trim().length > 0 && s.openaiKey.trim().length > 0
}
