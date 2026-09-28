import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { ApiError, describeError } from './claude'
import type { WordTiming } from './db'

const URL = 'https://api.openai.com/v1/audio/transcriptions'

// Un prompt con muletillas y errores reales evita que Whisper "corrija" la gramática del alumno
// y hace que conserve las dudas (uh, um), que son justo lo que queremos medir.
const VERBATIM_PROMPT =
  'Umm, so... I attending the meeting yesterday, uh, and the software are very... how do you say... Actually I work in AI agents, for gestorías, the paperworks.'

export interface Transcript {
  text: string
  words: WordTiming[]
  duration: number
}

export async function transcribe(apiKey: string, audio: Blob): Promise<Transcript> {
  const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  const contentType = audio.type.split(';')[0] || 'audio/webm'
  const fields: Record<string, string> = {
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
    'timestamp_granularities[]': 'word',
    prompt: VERBATIM_PROMPT,
  }

  let status: number
  let data: unknown
  try {
    if (Capacitor.isNativePlatform()) {
      // Multipart binario por la capa nativa de CapacitorHttp.
      const base64 = await blobToBase64(audio)
      const res = await CapacitorHttp.request({
        url: URL,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'multipart/form-data',
        },
        dataType: 'formData',
        data: [
          { key: 'file', value: base64, type: 'base64File', fileName: `audio.${ext}`, contentType },
          ...Object.entries(fields).map(([key, value]) => ({ key, value, type: 'string' })),
        ],
        connectTimeout: 15000,
        readTimeout: 60000,
      })
      status = res.status
      data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    } else {
      // Navegador de desarrollo: fetch normal (la API de OpenAI admite CORS).
      const form = new FormData()
      form.append('file', audio, `audio.${ext}`)
      for (const [k, v] of Object.entries(fields)) form.append(k, v)
      const res = await fetch(URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        body: form,
      })
      status = res.status
      data = await res.json().catch(() => null)
    }
  } catch {
    throw new ApiError('Sin conexión con Whisper. Revisa tu internet.', 0)
  }

  if (status !== 200) throw new ApiError(describeError('OpenAI (Whisper)', status, data), status)
  const d = data as { text?: string; words?: WordTiming[]; duration?: number }
  return {
    text: (d.text ?? '').trim(),
    words: (d.words ?? []).map((w) => ({ word: w.word, start: w.start, end: w.end })),
    duration: d.duration ?? 0,
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Frases que Whisper inventa cuando solo hay silencio o ruido.
const HALLUCINATIONS = [/^thank(s| you)[.!]*$/i, /^bye[.!]*$/i, /^you[.!]*$/i, /^\.+$/]

export function isEmptyTranscript(t: Transcript): boolean {
  const text = t.text.trim()
  return text.length === 0 || (t.words.length <= 2 && HALLUCINATIONS.some((r) => r.test(text)))
}
