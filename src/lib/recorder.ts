// Grabación con MediaRecorder (webm/opus en el WebView de Android).
// El stream del micrófono se abre al empezar la sesión y se mantiene abierto,
// así al pulsar el botón la grabación empieza al instante y no se corta la primera palabra.
//
// Robustez (Android): el sistema puede cortar el micrófono (p. ej. cuando suena la voz del profe).
// - `isOpen` comprueba que la pista siga viva; si no, `begin()` lo reabre.
// - `stop()` nunca se queda esperando: si el grabador no avisa, se resuelve a los 2 s con lo grabado.
//
// Auriculares Bluetooth: Android manda el micrófono "por defecto" a los auriculares, pero el canal de micrófono
// del Bluetooth no se activa y llega SILENCIO ABSOLUTO (todas las muestras a 0). Medido en un POCO con
// auriculares BT: por defecto → 0; "Bluetooth headset" → 0; "Speakerphone" (micro del teléfono) → funciona.
// Por eso, al abrir, se espera hasta 2 s a la primera señal (un micro recién abierto tarda hasta ~1,3 s en dar
// muestras); si solo llega silencio digital se prueban: 1) los micrófonos del teléfono (abren en <1 s) y 2) el
// micro por defecto sin procesado (Android tarda 3–7 s en salir del "modo llamada"). La elección se recuerda
// para toda la sesión y se olvida al conectar o desconectar auriculares.

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

export class MicError extends Error {}

/** Calidad de grabación (bits/s). */
const AUDIO_BPS = 24_000

const PROCESSING = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

// Micrófono elegido tras detectar silencio (p. ej. con auriculares Bluetooth). Es compartido por todas las
// grabadoras (clase, test, repaso) y se olvida al conectar o desconectar un dispositivo de audio.
let chosen: MediaTrackConstraints | null = null
// El micrófono por defecto ya se comprobó y da señal: no hace falta volver a medirlo en cada clase.
let defaultOk = false
const recorders = new Set<Recorder>() // las que tienen el micrófono abierto
navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  chosen = null
  defaultOk = false
  // Se vuelve a abrir en la próxima grabación (si ahora mismo se está grabando, no se corta).
  recorders.forEach((r) => r.releaseIfIdle())
})

/** ¿Llega algo del micrófono? Un micro real siempre tiene ruido de fondo; uno "mudo" da ceros exactos. */
async function hasSignal(stream: MediaStream, ms = 2000): Promise<boolean> {
  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    await ctx.resume()
    const an = ctx.createAnalyser()
    an.fftSize = 2048
    ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Float32Array(an.fftSize)
    const t0 = performance.now()
    while (performance.now() - t0 < ms) {
      await new Promise((r) => setTimeout(r, 30))
      an.getFloatTimeDomainData(buf)
      if (buf.some((v) => v !== 0)) return true
    }
    return false
  } catch {
    return true // si no se puede medir, no bloqueamos la grabación
  } finally {
    ctx?.close().catch(() => {})
  }
}

/** Micrófonos del propio teléfono (no Bluetooth), el altavoz/micro principal primero. */
async function phoneMics(): Promise<MediaDeviceInfo[]> {
  const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
  const ok = all.filter((d) => d.deviceId && d.deviceId !== 'default' && !/bluetooth|bt|sco/i.test(d.label))
  return ok.sort((a, b) => Number(/speaker|built|phone|tel/i.test(b.label)) - Number(/speaker|built|phone|tel/i.test(a.label)))
}

export class Recorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  /** Último micrófono usado, para diagnóstico. */
  label = ''

  releaseIfIdle() {
    if (!this.recorder || this.recorder.state === 'inactive') this.close()
  }

  async open(): Promise<void> {
    if (this.isOpen) return
    this.close() // descarta un stream muerto antes de pedir uno nuevo
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicError('Este dispositivo no permite grabar audio.')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: chosen ?? PROCESSING,
      })
      this.label = this.stream.getAudioTracks()[0]?.label || 'default'
      recorders.add(this)
      if (!chosen && !defaultOk) {
        if (await hasSignal(this.stream)) defaultOk = true
        else await this.fallback()
      }
    } catch (e) {
      if (e instanceof MicError) throw e
      const name = (e as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new MicError(
          'Sin permiso para el micrófono. Actívalo en Ajustes de Android → Apps → Habla → Permisos → Micrófono.',
        )
      }
      throw new MicError('No se pudo abrir el micrófono. Cierra otras apps que lo estén usando e inténtalo de nuevo.')
    }
  }

  /** El micrófono por defecto llega mudo (auriculares Bluetooth): se prueban alternativas hasta que haya señal. */
  private async fallback() {
    const options: { label: string; c: MediaTrackConstraints }[] = [
      ...(await phoneMics()).map((d) => ({ label: d.label, c: { ...PROCESSING, deviceId: { exact: d.deviceId } } })),
      { label: 'por defecto sin procesado', c: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } },
    ]
    for (const o of options) {
      this.stream?.getTracks().forEach((t) => t.stop())
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: o.c })
      if (await hasSignal(this.stream)) {
        chosen = o.c
        this.label = o.label
        console.info(`[HABLA-MIC] micrófono por defecto mudo; usando "${o.label}"`)
        return
      }
    }
    // Ninguno da señal: se deja el último abierto (mejor grabar algo que nada).
    console.warn('[HABLA-MIC] ningún micrófono da señal')
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
    // 24 kbps en Opus basta para la voz y sube ~5 veces menos datos que los 128 kbps por defecto de Android.
    this.recorder = new MediaRecorder(this.stream!, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: AUDIO_BPS })
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
    recorders.delete(this)
  }
}
