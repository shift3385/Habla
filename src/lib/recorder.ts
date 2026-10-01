// Grabación con MediaRecorder (webm/opus en el WebView de Android).
// El stream del micrófono se abre al empezar la sesión y se mantiene abierto,
// así al pulsar el botón la grabación empieza al instante y no se corta la primera palabra.
//
// Robustez (Android): el sistema puede cortar el micrófono (p. ej. cuando suena la voz del profe).
// - `isOpen` comprueba que la pista siga viva; si no, `begin()` lo reabre.
// - `stop()` nunca se queda esperando: si el grabador no avisa, se resuelve a los 2 s con lo grabado.

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

export class MicError extends Error {}

export class Recorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0

  async open(): Promise<void> {
    if (this.isOpen) return
    this.close() // descarta un stream muerto antes de pedir uno nuevo
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
      throw new MicError('No se pudo abrir el micrófono. Cierra otras apps que lo estén usando e inténtalo de nuevo.')
    }
  }

  /** true solo si el micrófono sigue realmente vivo. */
  get isOpen() {
    return !!this.stream && this.stream.active && this.stream.getAudioTracks().some((t) => t.readyState === 'live')
  }

  /** Stream del micrófono abierto (para dibujar la onda en vivo). */
  get mediaStream(): MediaStream | null {
    return this.stream
  }

  start(): void {
    if (!this.isOpen) throw new MicError('El micrófono no está abierto.')
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))
    this.chunks = []
    this.recorder = new MediaRecorder(this.stream!, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
    this.startedAt = performance.now()
  }

  /** Abre (o reabre) el micrófono y empieza a grabar; si falla, lo reintenta una vez con un stream nuevo. */
  async begin(): Promise<void> {
    try {
      await this.open()
      this.start()
    } catch (e) {
      if (e instanceof MicError && /permiso/i.test(e.message)) throw e
      this.close()
      await this.open()
      try {
        this.start()
      } catch {
        this.close()
        throw new MicError('No se pudo grabar. Vuelve a intentarlo.')
      }
    }
  }

  /** Detiene la grabación y devuelve el audio y su duración en segundos. Nunca se queda colgado. */
  stop(): Promise<{ blob: Blob; seconds: number }> {
    const rec = this.recorder
    this.recorder = null
    if (!rec || rec.state === 'inactive') {
      return Promise.resolve({ blob: new Blob(this.chunks), seconds: 0 })
    }
    const seconds = (performance.now() - this.startedAt) / 1000
    return new Promise((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve({ blob: new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }), seconds })
      }
      rec.onstop = finish
      rec.onerror = finish
      setTimeout(finish, 2000)
      try {
        rec.stop()
      } catch {
        finish()
      }
    })
  }

  close(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    } catch {
      // ya estaba detenido
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
  }
}
