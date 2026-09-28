// Grabación con MediaRecorder (webm/opus en el WebView de Android).
// El stream del micrófono se abre al empezar la sesión y se mantiene abierto,
// así al pulsar el botón la grabación empieza al instante y no se corta la primera palabra.

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

export class MicError extends Error {}

export class Recorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0

  async open(): Promise<void> {
    if (this.stream) return
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicError('Este dispositivo no permite grabar audio.')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch (e) {
      const name = (e as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new MicError(
          'Sin permiso para el micrófono. Actívalo en Ajustes de Android → Apps → Habla → Permisos → Micrófono.',
        )
      }
      throw new MicError('No se pudo abrir el micrófono.')
    }
  }

  get isOpen() {
    return this.stream !== null
  }

  start(): void {
    if (!this.stream) throw new MicError('El micrófono no está abierto.')
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))
    this.chunks = []
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
    this.startedAt = performance.now()
  }

  /** Detiene la grabación y devuelve el audio y su duración en segundos. */
  stop(): Promise<{ blob: Blob; seconds: number }> {
    const rec = this.recorder
    if (!rec || rec.state === 'inactive') {
      return Promise.resolve({ blob: new Blob(), seconds: 0 })
    }
    const seconds = (performance.now() - this.startedAt) / 1000
    return new Promise((resolve) => {
      rec.onstop = () => {
        resolve({ blob: new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }), seconds })
      }
      rec.stop()
    })
  }

  close(): void {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
  }
}
