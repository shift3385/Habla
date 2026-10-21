import { Preferences } from '@capacitor/preferences'

// 5.10.1 (REG-M-03) · Prueba de sonido en un paso (diseño de A5 §«Pruebas de voz y audio», requisitos del dueño).
// Lógica sin interfaz, para probarla con node:test:
//   - la frase que la mascota dice (solo hablada: si la repites, es que la oíste → valida la salida y la entrada);
//   - el detector de voz LOCAL (sin Gemini ni coste): mide el ruido de fondo y pide voz por encima de él, con corte
//     por silencio y un tiempo máximo;
//   - qué auriculares ya pasaron la prueba (en Preferences, por nombre: solo el nombre, el modo y la fecha).

/** Frases cortas en inglés (dos o tres palabras fáciles), una al azar en cada intento. */
export const CHECK_PHRASES = ['blue sky', 'good morning', 'green apple', 'happy day', 'big smile', 'warm coffee', 'thank you', 'nice day']

/** Una frase al azar distinta de la anterior (si se repite el intento, no se oye lo mismo). */
export function pickPhrase(prev?: string, rnd: () => number = Math.random): string {
  const pool = CHECK_PHRASES.filter((p) => p !== prev)
  return pool[Math.floor(rnd() * pool.length) % pool.length]
}

/**
 * Espera entre el fin de la instrucción y el inicio de la escucha (requisito del dueño): que calle el altavoz y se
 * vacíe el búfer, para que la propia voz de la mascota no cuente. Con Bluetooth la latencia es mayor.
 */
export const listenDelayMs = (bluetooth: boolean) => (bluetooth ? 600 : 400)

export interface VadOptions {
  /** Al empezar, este tiempo mide el ruido de fondo (no cuenta como voz). */
  calibMs: number
  /** Voz mínima para dar la prueba por buena. */
  minVoiceMs: number
  /** Silencio tras la voz que da la frase por terminada. */
  endSilenceMs: number
  /** Con esta voz seguida ya basta (no hace falta esperar al silencio). */
  maxVoiceMs: number
  /** Sin voz suficiente en este tiempo: no te oigo. */
  timeoutMs: number
}

export const VAD_DEFAULTS: VadOptions = { calibMs: 300, minVoiceMs: 400, endSilenceMs: 800, maxVoiceMs: 2500, timeoutMs: 8000 }

export type VadState = 'calibrating' | 'listening' | 'voice' | 'heard' | 'timeout'

/**
 * Detector de voz por nivel (RMS 0–1 de cada fotograma). El umbral es relativo al ruido medido al empezar (como el
 * «automático» de Discord), no fijo como el 0,18 de la prueba antigua: en una habitación con ruido no basta el ruido, y en
 * una silenciosa basta una voz normal.
 */
export class VoiceDetector {
  private o: VadOptions
  private t = 0
  private calib: number[] = []
  private threshold = 0
  private voiced = 0
  private silence = 0
  state: VadState = 'calibrating'

  constructor(opts: Partial<VadOptions> = {}) {
    this.o = { ...VAD_DEFAULTS, ...opts }
  }

  /** Umbral de voz para un ruido de fondo dado (RMS). Público para las pruebas. */
  static thresholdFor(noise: number): number {
    return Math.max(noise * 3, noise + 0.012, 0.01)
  }

  /** Umbral de voz calculado con el ruido medido, o null si aún calibra. */
  get limit(): number | null {
    return this.state === 'calibrating' ? null : this.threshold
  }

  /** Añade un fotograma de `dtMs` con nivel `rms` y devuelve el estado. */
  push(rms: number, dtMs: number): VadState {
    if (this.state === 'heard' || this.state === 'timeout') return this.state
    this.t += dtMs
    if (this.state === 'calibrating') {
      this.calib.push(rms)
      if (this.t >= this.o.calibMs) {
        const s = [...this.calib].sort((a, b) => a - b)
        this.threshold = VoiceDetector.thresholdFor(s[Math.floor(s.length / 2)] ?? 0)
        this.state = 'listening'
      }
      return this.state
    }
    if (rms > this.threshold) {
      this.voiced += dtMs
      this.silence = 0
      this.state = 'voice'
      if (this.voiced >= this.o.maxVoiceMs) return (this.state = 'heard')
    } else if (this.voiced > 0) {
      this.silence += dtMs
      if (this.silence >= this.o.endSilenceMs) {
        if (this.voiced >= this.o.minVoiceMs) return (this.state = 'heard')
        // Un golpe o una tos corta: no cuenta; se sigue escuchando.
        this.voiced = 0
        this.silence = 0
        this.state = 'listening'
      }
    }
    if (this.t >= this.o.timeoutMs + this.o.calibMs) {
      // Al acabar el tiempo, una voz suficiente que aún no había terminado también vale.
      return (this.state = this.voiced >= this.o.minVoiceMs ? 'heard' : 'timeout')
    }
    return this.state
  }
}

/** RMS (0–1) de un fotograma de muestras de 8 bits sin signo (AnalyserNode.getByteTimeDomainData). */
export function rmsOfBytes(buf: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const x = (buf[i] - 128) / 128
    sum += x * x
  }
  return buf.length ? Math.sqrt(sum / buf.length) : 0
}

// ------------------------------------------------------------------------------------------------
// Auriculares ya probados (Preferences `habla.soundChecked`): { [nombre]: { mode, ok, at } }. Nada sensible.

export type CheckedMode = 'headset' | 'split' | 'phone'
export interface CheckRecord {
  mode: CheckedMode
  ok: boolean
  at: number
}

const KEY = 'habla.soundChecked'
type Store = { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void> }
let store: Store = {
  get: async (k) => (await Preferences.get({ key: k })).value,
  set: async (k, v) => Preferences.set({ key: k, value: v }),
}
let cache: Record<string, CheckRecord> | null = null

/** Solo para las pruebas. */
export function __setCheckStoreForTests(s: Store) {
  store = s
  cache = null
}

export async function loadChecked(): Promise<Record<string, CheckRecord>> {
  if (cache) return cache
  try {
    const raw = await store.get(KEY)
    const v = raw ? JSON.parse(raw) : {}
    cache = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    cache = {}
  }
  return cache!
}

/** Apunta el resultado de la prueba para esos auriculares (con el modo probado). */
export async function markChecked(name: string, mode: CheckedMode, ok: boolean): Promise<void> {
  if (!name) return
  const all = { ...(await loadChecked()), [name]: { mode, ok, at: Date.now() } }
  cache = all
  await store.set(KEY, JSON.stringify(all)).catch(() => {})
}

/**
 * ¿Hay que hacer la prueba? Solo con auriculares nuevos, si cambió el modo elegido o si la última falló (o el micro salió
 * mudo en uso real). No en cada arranque ni al volver del segundo plano.
 */
export function needsCheck(rec: CheckRecord | undefined, mode: CheckedMode): boolean {
  return !rec || !rec.ok || rec.mode !== mode
}
