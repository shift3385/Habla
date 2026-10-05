// Audio para Azure Speech: la API REST de audio corto acepta WAV PCM (16 kHz, 16 bits, mono) u OGG, pero el
// teléfono graba en WebM/Opus. Se decodifica con el navegador, se remuestrea a 16 kHz mono y se empaqueta en WAV.

export const AZURE_RATE = 16000
/** La API REST de audio corto admite hasta 60 s de audio. */
export const MAX_SECONDS = 60

export interface Wav {
  base64: string
  seconds: number
}

function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const data = samples.length * 2
  const buf = new ArrayBuffer(44 + data)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + data, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true) // tamaño del bloque fmt
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true) // bytes por segundo
  v.setUint16(32, 2, true) // bytes por muestra
  v.setUint16(34, 16, true) // bits
  str(36, 'data')
  v.setUint32(40, data, true)
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Convierte una grabación (WebM/Opus u otra que el navegador sepa leer) a WAV 16 kHz mono, hasta 60 s. */
export async function toWav16k(blob: Blob): Promise<Wav> {
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    const seconds = Math.min(decoded.duration, MAX_SECONDS)
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * AZURE_RATE)), AZURE_RATE)
    const src = off.createBufferSource()
    src.buffer = decoded
    src.connect(off.destination) // varios canales → mono al mezclar en 1 canal
    src.start()
    const rendered = await off.startRendering()
    return { base64: toBase64(encodeWav(rendered.getChannelData(0), AZURE_RATE)), seconds }
  } finally {
    ctx.close().catch(() => {})
  }
}
