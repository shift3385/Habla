// Análisis local del audio grabado (sin red): detecta si hubo voz, cuánto duró el habla
// y las pausas de más de 1 s. Es la base de las métricas de fluidez.

export interface SpeechAnalysis {
  hasSpeech: boolean
  speechSeconds: number // desde la primera hasta la última palabra
  pauses: number[] // duración (s) de cada silencio ≥ 1 s dentro del habla
}

const FRAME_S = 0.02
const PAUSE_S = 1.0

// Una grabación real de voz pesa ~3 KB por segundo (Opus a 24 kbps). Por debajo de esto, sin poder decodificarla,
// solo lleva la cabecera WebM.
const MIN_AUDIO_BYTES = 1024

/**
 * Error 400 del repaso (2026-10-08): al desconectar los auriculares Bluetooth el micro seguía en ellos y cada
 * grabación salía con solo la cabecera WebM (unos cientos de bytes). `blob.size === 0` no la detectaba y
 * `analyzeSpeech` devolvía null (no se puede decodificar), así que se mandaba a Gemini sin audio: «Request contains
 * an invalid argument». Con esto, la pantalla dice «No te he oído» y no se envía nada.
 */
export function isEmptyRecording(blob: Blob, analysis: SpeechAnalysis | null): boolean {
  return blob.size === 0 || (analysis === null && blob.size < MIN_AUDIO_BYTES)
}

export async function analyzeSpeech(blob: Blob): Promise<SpeechAnalysis | null> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  let buf: AudioBuffer
  try {
    buf = await ctx.decodeAudioData(await blob.arrayBuffer())
  } catch {
    return null // si no se puede decodificar, no bloqueamos: se envía igualmente
  } finally {
    ctx.close().catch(() => {})
  }

  const data = buf.getChannelData(0)
  const frame = Math.max(1, Math.round(buf.sampleRate * FRAME_S))
  const rms: number[] = []
  for (let i = 0; i + frame <= data.length; i += frame) {
    let sum = 0
    for (let j = i; j < i + frame; j++) sum += data[j] * data[j]
    rms.push(Math.sqrt(sum / frame))
  }
  if (rms.length === 0) return { hasSpeech: false, speechSeconds: 0, pauses: [] }

  const sorted = [...rms].sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.1)]
  const peak = sorted[Math.floor(sorted.length * 0.95)]
  if (peak < 0.008) return { hasSpeech: false, speechSeconds: 0, pauses: [] }

  const threshold = Math.max(floor * 2.5, floor + (peak - floor) * 0.12, 0.004)
  const voiced = rms.map((v) => v > threshold)
  const first = voiced.indexOf(true)
  const last = voiced.lastIndexOf(true)
  if (first < 0 || last - first < 10) return { hasSpeech: false, speechSeconds: 0, pauses: [] }

  const pauses: number[] = []
  let run = 0
  for (let i = first; i <= last; i++) {
    if (!voiced[i]) {
      run++
    } else {
      if (run * FRAME_S >= PAUSE_S) pauses.push(round1(run * FRAME_S))
      run = 0
    }
  }
  return { hasSpeech: true, speechSeconds: round1((last - first + 1) * FRAME_S), pauses }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
