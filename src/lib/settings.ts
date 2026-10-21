import { Preferences } from '@capacitor/preferences'
import { normalizeTheme, type Mode, type TeacherKey, type ThemeKey } from '../ui/theme'
import { DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL, type Models } from './gemini'
import type { OrientationMode } from './orientation'
import type { AzurePlan } from './phonetics'

// La clave API vive solo en el almacenamiento local del teléfono (Preferences).
// Nunca se escribe en el código, en IndexedDB ni en las copias de seguridad.

export interface Settings {
  geminiKey: string
  geminiModel: string
  geminiFallbackModel: string // se usa si el principal está saturado (503) o sin cuota (429)
  geminiFastModel: string // tareas ligeras: ideas, tema del día, informe, consultas de palabras
  ttsRate: number // 0.5 – 1.5
  voiceIndex: number | null // índice de getSupportedVoices(); null = voz por defecto del acento del profe
  earMode: boolean // texto del profe oculto hasta tocarlo
  dailyGoalMinutes: number // minutos hablando al día
  theme: ThemeKey
  mode: Mode
  teacher: TeacherKey
  onboarded: boolean // ya vio la bienvenida
  lastSeenVersion: string // para avisar de novedades una vez por versión
  mascotTapped: boolean // ya tocó a su mascota (oculta el globo "¡Tócame!")
  mascotNudgeSeen: boolean // ya vio la tarjeta "…quieren conocerte" (racha de 3 días)
  mascotNotices: boolean // globos de la mascota en el Inicio: avisos de hoy (clase, meta, repaso, racha, test)
  mascotAdvice: boolean // globos de la mascota en el Inicio: consejos de uso y qué significa cada nota
  keysIntroSeen: boolean // ya le explicaron para qué es la clave de Gemini (y Azure): bienvenida o aviso tras actualizar
  modelList: string[] // última lista de modelos que devolvió Google (por si luego no responde)
  reminderOn: boolean // aviso diario de la lección
  reminderTime: string // HH:MM
  audioPrefs: Record<string, 'headset' | 'split' | 'phone'> // por auriculares: por dónde escuchar y hablar
  retestSnoozed: string // día (AAAA-MM-DD) en que dijo "Más tarde" al re-test
  homeworkSeen: number // fecha de la última tarea ya enseñada antes del Inicio
  orientation: OrientationMode // automática, vertical u horizontal forzada (Apariencia)
  fontScale: number // 5.10.1 (REG-M-05): tamaño de letra (0,9 · 1 · 1,15 · 1,3), × la letra del sistema (lib/fontScale.ts)
  // Corrector fonético con Azure Speech (Ajustes → Modelos). Claves y secretos: mismo almacenamiento y misma
  // protección con el bloqueo del teléfono que la clave de Gemini; nunca en el código ni en las copias.
  azureKey: string
  azureRegion: string // p. ej. eastus
  azurePlan: AzurePlan // plan del recurso en Azure (la app no lo cambia)
  phoneticsOn: boolean
  reviewHelpSeen: boolean // v5.9: la mascota ya explicó cómo se elige cuándo volver a ver una frase
  grammarIntroSeen: boolean // v5.10: la mascota ya explicó la pestaña Gramática (la primera vez que entras)
  soundsIntroSeen: boolean // 5.11 (S-07): la mascota ya explicó la pestaña Sonidos (la primera vez que entras)
  reviewAutoGrade: boolean // 5.11 (M-10): «Que decida Habla» en el Repaso (aplica la nota sugerida y pasa sola a los 3 s)
  phoneticsUserOff: boolean // la apagaste tú: no se reactiva sola
  f0ExhaustedMonth: string // AAAA-MM en que Azure dijo que el F0 se agotó
  phoneticsAlertMonth: string // AAAA-MM del último aviso de la mascota
  azureTenantId: string // service principal para leer el consumo en Azure Monitor (opcional)
  azureClientId: string
  azureClientSecret: string
  azureResourceId: string
}

const DEFAULTS: Settings = {
  geminiKey: '',
  geminiModel: DEFAULT_MODEL,
  geminiFallbackModel: DEFAULT_FALLBACK_MODEL,
  geminiFastModel: DEFAULT_FALLBACK_MODEL,
  ttsRate: 0.9,
  voiceIndex: null,
  earMode: false,
  dailyGoalMinutes: 5,
  fontScale: 1, // REG-M-05: Normal = como siempre
  theme: 'marea', // Marea + Gota, claro por defecto (diseño V4)
  mode: 'light',
  teacher: 'emma',
  onboarded: false,
  lastSeenVersion: '',
  mascotTapped: false,
  mascotNudgeSeen: false,
  mascotNotices: true,
  mascotAdvice: true,
  keysIntroSeen: false,
  modelList: [],
  reminderOn: false,
  reminderTime: '19:00',
  audioPrefs: {},
  retestSnoozed: '',
  homeworkSeen: 0,
  orientation: 'auto',
  azureKey: '',
  azureRegion: '',
  azurePlan: 'F0',
  phoneticsOn: false,
  reviewHelpSeen: false,
  grammarIntroSeen: false,
  soundsIntroSeen: false,
  reviewAutoGrade: false, // apagado por defecto: decide el alumno (autonomía, M-10)
  phoneticsUserOff: false,
  f0ExhaustedMonth: '',
  phoneticsAlertMonth: '',
  azureTenantId: '',
  azureClientId: '',
  azureClientSecret: '',
  azureResourceId: '',
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
    s.theme = normalizeTheme(s.theme) // Aurora (v3) ya no existe: pasa a Marea
    return s
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) })
}

/** Modelos para conversar, corregir y evaluar. */
export function mainModels(s: Settings, signal?: AbortSignal): Models {
  return { primary: s.geminiModel, fallback: s.geminiFallbackModel, signal }
}

/** Modelos para tareas ligeras (respuesta en 1–2 s): el rápido y, si falla, el principal. */
export function fastModels(s: Settings, signal?: AbortSignal): Models {
  return { primary: s.geminiFastModel || s.geminiFallbackModel, fallback: s.geminiModel, signal }
}

export function hasKeys(s: Settings): boolean {
  return s.geminiKey.trim().length > 0
}
