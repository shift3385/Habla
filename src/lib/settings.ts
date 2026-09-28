import { Preferences } from '@capacitor/preferences'
import { DEFAULT_MODEL } from './gemini'

// La clave API vive solo en el almacenamiento local del teléfono (Preferences).
// Nunca se escribe en el código, en IndexedDB ni en las copias de seguridad.

export interface Settings {
  geminiKey: string
  geminiModel: string
  ttsRate: number // 0.5 – 1.5
  voiceIndex: number | null // índice de getSupportedVoices(); null = voz por defecto en-US
  earMode: boolean // texto del profe oculto hasta tocarlo
}

const DEFAULTS: Settings = {
  geminiKey: '',
  geminiModel: DEFAULT_MODEL,
  ttsRate: 0.9,
  voiceIndex: null,
  earMode: false,
}

const KEY = 'habla.settings'

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return { ...DEFAULTS }
  try {
    const stored = JSON.parse(value) as Partial<Settings>
    const s = { ...DEFAULTS }
    for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) {
      if (stored[k] !== undefined) (s as Record<string, unknown>)[k] = stored[k]
    }
    return s
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) })
}

export function hasKeys(s: Settings): boolean {
  return s.geminiKey.trim().length > 0
}
