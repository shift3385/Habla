import { Preferences } from '@capacitor/preferences'
import type { Mode, TeacherKey, ThemeKey } from '../ui/theme'
import { DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL } from './gemini'

// La clave API vive solo en el almacenamiento local del teléfono (Preferences).
// Nunca se escribe en el código, en IndexedDB ni en las copias de seguridad.

export interface Settings {
  geminiKey: string
  geminiModel: string
  geminiFallbackModel: string // se usa si el principal está saturado (503)
  ttsRate: number // 0.5 – 1.5
  voiceIndex: number | null // índice de getSupportedVoices(); null = voz por defecto del acento del profe
  earMode: boolean // texto del profe oculto hasta tocarlo
  dailyGoalMinutes: number // minutos hablando al día
  theme: ThemeKey
  mode: Mode
  teacher: TeacherKey
  onboarded: boolean // ya vio la bienvenida
  lastSeenVersion: string // para avisar de novedades una vez por versión
  modelList: string[] // última lista de modelos que devolvió Google (por si luego no responde)
}

const DEFAULTS: Settings = {
  geminiKey: '',
  geminiModel: DEFAULT_MODEL,
  geminiFallbackModel: DEFAULT_FALLBACK_MODEL,
  ttsRate: 0.9,
  voiceIndex: null,
  earMode: false,
  dailyGoalMinutes: 5,
  theme: 'aurora',
  mode: 'dark',
  teacher: 'emma',
  onboarded: false,
  lastSeenVersion: '',
  modelList: [],
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
