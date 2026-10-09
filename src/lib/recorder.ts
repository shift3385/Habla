// Grabación con MediaRecorder (webm/opus en el WebView de Android).
// El stream del micrófono se abre al empezar la sesión y se mantiene abierto,
// así al pulsar el botón la grabación empieza al instante y no se corta la primera palabra.
//
// Robustez (Android): el sistema puede cortar el micrófono (p. ej. cuando suena la voz del profe).
// - `isOpen` comprueba que la pista siga viva; si no, `begin()` lo reabre.
// - `stop()` nunca se queda esperando: si el grabador no avisa, se resuelve a los 2 s con lo grabado.
//
// Micrófono seguro (v5.8.1, auditoría AUD-MIC-301/302/304/800):
// - Una sola apertura en curso por grabadora: las llamadas simultáneas a `open()`/`begin()` comparten la misma
//   promesa (antes, un doble toque abría dos streams y el primero quedaba huérfano, captando hasta matar la app).
// - La grabadora entra en `recorders` ANTES del primer `await`, así `releaseAllMics()` (segundo plano) también
//   cancela una apertura a medias. `close()` sube un contador de generación: cada paso de la apertura lo
//   comprueba al volver de un `await` y, si cambió, para lo que acaba de abrir y sale sin grabar.
// - `start()` con una grabación ya en marcha se ignora (antes el primer MediaRecorder quedaba huérfano).
//
// Auriculares Bluetooth: Android manda el micrófono "por defecto" a los auriculares, pero el canal de micrófono
// del Bluetooth no se activa y llega SILENCIO ABSOLUTO (todas las muestras a 0). Medido en un POCO con
// auriculares BT: por defecto → 0; "Bluetooth headset" → 0; "Speakerphone" (micro del teléfono) → funciona.
// Por eso, al abrir, se espera hasta 2 s a la primera señal (un micro recién abierto tarda hasta ~1,3 s en dar
// muestras). AUD-MIC-800: el micro del teléfono con procesado de voz TAMBIÉN da ceros exactos en una habitación
// en silencio, así que el silencio solo se toma por «micro mudo» si hay motivo (pista silenciada por el sistema,
// un micro Bluetooth conectado o nombres de micros desconocidos). Entonces se prueba UNA sola alternativa: el
// micro del teléfono con procesado (conserva la cancelación de eco) o, si no se encuentra, el micro por defecto
// sin procesado solo para esa apertura (nunca se recuerda un micro sin cancelación de eco para la sesión).
// La elección se recuerda para toda la sesión y se olvida al conectar o desconectar auriculares.
//
// Con auriculares, el usuario elige el modo (selector de audio, ver audioRoute.ts):
//   headset → el plugin nativo pone los auriculares como dispositivo de comunicación; micro por defecto con
//             procesado de voz (Android lo toma de los auriculares).
//   split   → micro por defecto SIN procesado: Android no entra en "modo llamada", usa el micro del teléfono y
//             la voz del profe sigue saliendo por los auriculares con calidad normal.
//   phone   → todo por el teléfono (detección automática de arriba).

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

export class MicError extends Error {}

/** Calidad de grabación (bits/s). */
const AUDIO_BPS = 24_000

const PROCESSING = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
const BLUETOOTH = /bluetooth|bt|sco/i

export type MicMode = 'auto' | 'headset' | 'split' | 'phone'
let micMode: MicMode = 'auto'

// Se llama justo después de abrir el micrófono. En modo auriculares vuelve a fijar los auriculares como
// dispositivo de comunicación: el WebView elige el suyo al abrir el micro y pisaría la elección.
let afterOpen: (() => Promise<void>) | null = null
export function onMicOpened(fn: (() => Promise<void>) | null) {
  afterOpen = fn
}

export const getMicMode = () => micMode

/**
 * MOV-4: la comprobación nativa (audioRoute.verifyHeadsetMic) confirmó que el micro de los auriculares entrega audio.
 * Ya no se mide la señal al abrir: los auriculares con cancelación de ruido mandan ceros exactos mientras no hablas,
 * y esos ceros se tomaban por «micro mudo» (6 s de espera y cambio al micro del teléfono).
 */
export function trustDefaultMic() {
  defaultOk = true
}

/**
 * Una grabación salió vacía (p. ej. auriculares Bluetooth desconectados sin que llegara el aviso): se olvida el
 * micrófono elegido y la confianza en el de por defecto, así la próxima apertura vuelve a medir la señal y busca
 * uno que funcione (normalmente el del teléfono) en vez de repetir el mismo micro muerto.
 */
export function distrustMic() {
  chosen = null
  defaultOk = false
  recorders.forEach((r) => r.releaseIfIdle())
}

/** Cambia cómo se abre el micrófono (lo llama el selector de audio). Se aplica en la próxima grabación. */
export function setMicMode(mode: MicMode) {
  if (mode === micMode) return
  micMode = mode
  chosen = null
  defaultOk = false
  recorders.forEach((r) => r.releaseIfIdle())
}

// Micrófono elegido tras detectar silencio (p. ej. con auriculares Bluetooth). Es compartido por todas las
// grabadoras (clase, test, repaso) y se olvida al conectar o desconectar un dispositivo de audio.
// Solo se guarda uno CON cancelación de eco (AUD-MIC-800).
let chosen: MediaTrackConstraints | null = null
// El micrófono por defecto ya se comprobó y da señal: no hace falta volver a medirlo en cada clase.
let defaultOk = false
// Las que tienen el micrófono abierto O ABRIÉNDOSE (AUD-MIC-301: así el segundo plano cancela la apertura).
const recorders = new Set<Recorder>()
navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  chosen = null
  defaultOk = false
  // Se vuelve a abrir en la próxima grabación (si ahora mismo se está grabando, no se corta).
  recorders.forEach((r) => r.releaseIfIdle())
})

/**
 * Cierra TODOS los micrófonos abiertos (también uno que esté grabando: esa grabación se descarta) y cancela
 * las aperturas en curso (AUD-MIC-301).
 * Se llama al pasar la app a segundo plano: un micrófono abierto mantiene despierto el audio del teléfono
 * toda la noche y vacía la batería (NC-14). Al volver, la próxima grabación lo reabre sola.
 */
export function releaseAllMics() {
  ;[...recorders].forEach((r) => r.close())
}

function stopTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop())
}

/**
 * ¿Llega algo del micrófono? Un micro real suele tener ruido de fondo; uno "mudo" da ceros exactos.
 * `cancelled` corta la espera en cuanto se cierra la grabadora.
 */
async function hasSignal(stream: MediaStream, ms: number, cancelled: () => boolean): Promise<boolean> {
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
      if (cancelled()) return false
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

/**
 * AUD-MIC-800 · segunda comprobación antes de dar un micro por mudo: ceros exactos también salen del micro del
 * teléfono con procesado en una habitación en silencio. Solo es sospechoso si la pista está silenciada por el
 * sistema, si hay un micro Bluetooth conectado o si no se pueden leer los nombres de los micros.
 */
async function looksMuted(stream: MediaStream): Promise<boolean> {
  const track = stream.getAudioTracks()[0]
  if (!track || track.readyState !== 'live' || track.muted) return true
  try {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
    if (!inputs.length || inputs.some((d) => !d.label)) return true
    return inputs.some((d) => BLUETOOTH.test(d.label))
  } catch {
    return true
  }
}

/** Micrófonos del propio teléfono (no Bluetooth), el altavoz/micro principal primero. */
async function phoneMics(): Promise<MediaDeviceInfo[]> {
  const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
  const ok = all.filter((d) => d.deviceId && d.deviceId !== 'default' && !BLUETOOTH.test(d.label))
  return ok.sort((a, b) => Number(/speaker|built|phone|tel/i.test(b.label)) - Number(/speaker|built|phone|tel/i.test(a.label)))
}

function micError(e: unknown): MicError {
  if (e instanceof MicError) return e
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new MicError('Sin permiso para el micrófono. Actívalo en Ajustes de Android → Apps → Habla → Permisos → Micrófono.')
  }
  return new MicError('No se pudo abrir el micrófono. Cierra otras apps que lo estén usando e inténtalo de nuevo.')
}

export class Recorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  /** Sube con cada `close()`: una apertura que ve otro número sabe que la cancelaron (AUD-MIC-301). */
  private gen = 0
  /** Apertura en curso, compartida por las llamadas simultáneas (AUD-MIC-302). */
  private opening: Promise<boolean> | null = null
  /** `begin()` en curso, compartido por los toques repetidos (AUD-MIC-302). */
  private beginning: Promise<boolean> | null = null
  /** Último micrófono usado, para diagnóstico. */
  label = ''
  /** Medidor de volumen (v5.9, petición del dueño): las barras junto al micro siguen tu voz de verdad. Solo mientras se graba. */
  private meter: { ctx: AudioContext; an: AnalyserNode; buf: Uint8Array<ArrayBuffer>; stream: MediaStream } | null = null

  /** Cierra si no está grabando. Una apertura en curso se deja terminar (p. ej. `devicechange` al conceder el permiso). */
  releaseIfIdle() {
    if (this.opening) return
    if (!this.recorder || this.recorder.state === 'inactive') this.close()
  }

  /** ¿Se está abriendo el micrófono ahora mismo? */
  get isOpening() {
    return !!this.opening
  }

  /**
   * Abre el micrófono (si no lo estaba). Devuelve `false` si la apertura se canceló con `close()` /
   * `releaseAllMics()` mientras se abría: en ese caso no queda nada abierto.
   */
  open(): Promise<boolean> {
    if (this.opening) return this.opening
    if (this.isOpen) return Promise.resolve(true)
    const p: Promise<boolean> = this.doOpen(this.gen).finally(() => {
      if (this.opening === p) this.opening = null
    })
    this.opening = p
    return p
  }

  private async doOpen(gen: number): Promise<boolean> {
    const cancelled = () => this.gen !== gen
    // Descarta un stream muerto antes de pedir uno nuevo (sin subir la generación: esta apertura sigue).
    stopTracks(this.stream)
    this.stream = null
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicError('Este dispositivo no permite grabar audio.')
    }
    // AUD-MIC-301: registrada ANTES de cualquier await, así releaseAllMics() también cancela esta apertura.
    recorders.add(this)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micMode === 'split' ? RAW : (chosen ?? PROCESSING),
      })
      if (cancelled()) {
        stopTracks(stream) // se pidió cerrar mientras Android abría el micro: se cierra sin usarlo
        return false
      }
      this.stream = stream
      this.label = stream.getAudioTracks()[0]?.label || 'default'
      await afterOpen?.().catch(() => {})
      if (cancelled()) return false
      // MOV-4: en modo auriculares, si ya se eligió otro micro (`chosen`) tampoco se vuelve a medir: antes cada toque
      // repetía la espera de 5 s y otra alternativa (~9 s hasta grabar).
      const measure = micMode === 'headset' ? !defaultOk && !chosen : micMode !== 'split' && !chosen && !defaultOk
      if (!measure) return true
      // El micro Bluetooth tarda 1–3 s en activarse: se le da margen antes de rendirse.
      const ok = await hasSignal(stream, micMode === 'headset' ? 5000 : 2000, cancelled)
      if (cancelled()) return false
      if (ok) {
        defaultOk = true
        return true
      }
      const muted = await looksMuted(stream)
      if (cancelled()) return false
      if (!muted) {
        // AUD-MIC-800: silencio en una habitación tranquila, no un micro mudo. Se queda el micro con procesado.
        defaultOk = true
        console.info('[HABLA-MIC] solo silencio, pero sin micro Bluetooth: sigo con el micro por defecto')
        return true
      }
      console.warn(`[HABLA-MIC] el micrófono por defecto no da señal (modo ${micMode}); pruebo otro`)
      return await this.fallback(gen)
    } catch (e) {
      if (cancelled()) return false // cancelada: el error de una apertura abandonada no importa
      this.release() // AUD-MIC-306: si algo falla, no queda nada abierto
      throw micError(e)
    }
  }

  /**
   * El micrófono por defecto llega mudo (auriculares Bluetooth): se prueba UNA alternativa (AUD-MIC-800).
   * El stream nuevo queda en `this.stream`, y la grabadora sigue en `recorders` (AUD-MIC-301).
   */
  private async fallback(gen: number): Promise<boolean> {
    const cancelled = () => this.gen !== gen
    const phone = (await phoneMics().catch(() => []))[0]
    if (cancelled()) return false
    const raw = { label: 'por defecto sin procesado', c: RAW as MediaTrackConstraints, remember: false }
    // REV-T1-1: si el micro del teléfono no se puede abrir (p. ej. OverconstrainedError), se prueba el por defecto
    // sin procesado, como en la v5.8. Sigue siendo UN solo reintento: como mucho una alternativa llega a abrirse.
    const options = phone
      ? [{ label: phone.label || 'micrófono del teléfono', c: { ...PROCESSING, deviceId: { exact: phone.deviceId } } as MediaTrackConstraints, remember: true }, raw]
      : [raw]
    stopTracks(this.stream)
    this.stream = null
    let option = options[0]
    let next: MediaStream | null = null
    for (let i = 0; i < options.length && !next; i++) {
      option = options[i]
      try {
        next = await navigator.mediaDevices.getUserMedia({ audio: option.c })
      } catch (e) {
        if (cancelled() || i === options.length - 1) throw e // en doOpen: cancelada → false; si no, error en español
        console.warn(`[HABLA-MIC] no se pudo abrir "${option.label}"; pruebo "${options[i + 1].label}"`)
      }
    }
    if (!next) return false
    if (cancelled()) {
      stopTracks(next)
      return false
    }
    this.stream = next
    recorders.add(this)
    this.label = option.label
    if (!option.remember) {
      // Sin procesado no se recuerda nunca: no hace falta medirlo (2 s menos de espera al tocar el micro).
      console.info(`[HABLA-MIC] micrófono por defecto mudo (modo ${micMode}); uso "${option.label}" solo esta vez`)
      return true
    }
    const ok = await hasSignal(next, 2000, cancelled)
    if (cancelled()) return false
    // Solo se recuerda para la sesión un micro con cancelación de eco y que haya dado señal.
    if (ok) chosen = option.c
    if (ok) console.info(`[HABLA-MIC] micrófono por defecto mudo (modo ${micMode}); usando "${option.label}"`)
    else console.warn(`[HABLA-MIC] "${option.label}" tampoco da señal; lo uso igualmente (sin más reintentos)`)
    return true
  }

  /** true solo si el micrófono sigue realmente vivo. */
  get isOpen() {
    return !!this.stream && this.stream.active && this.stream.getAudioTracks().some((t) => t.readyState === 'live')
  }

  /** ¿Hay un MediaRecorder grabando? */
  get isRecording() {
    return !!this.recorder && this.recorder.state !== 'inactive'
  }

  /** Stream del micrófono abierto (para dibujar la onda en vivo). */
  get mediaStream(): MediaStream | null {
    return this.stream
  }

  /** Empieza a grabar. Devuelve `false` (y no hace nada) si ya había una grabación en marcha (AUD-MIC-304). */
  start(): boolean {
    if (this.isRecording) return false
    if (!this.isOpen) throw new MicError('El micrófono no está abierto.')
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))
    // AUD-MIC-309: cada grabación tiene su propia lista de trozos; uno tardío de la anterior no se cuela.
    const chunks: Blob[] = []
    this.chunks = chunks
    // 24 kbps en Opus basta para la voz y sube ~5 veces menos datos que los 128 kbps por defecto de Android.
    const rec = new MediaRecorder(this.stream!, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: AUDIO_BPS })
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    this.recorder = rec
    rec.start()
    this.startedAt = performance.now()
    return true
  }

  /**
   * Abre (o reabre) el micrófono y empieza a grabar; si falla, lo reintenta una vez con un stream nuevo.
   * Devuelve `true` si hay una grabación en marcha gracias a esta llamada (o a la que comparte), `false` si se
   * canceló durante la apertura (cerraste la pantalla, cambiaste de paso, segundo plano) o si ya se grababa.
   */
  begin(): Promise<boolean> {
    if (this.beginning) return this.beginning
    const p: Promise<boolean> = this.doBegin().finally(() => {
      if (this.beginning === p) this.beginning = null
    })
    this.beginning = p
    return p
  }

  private async doBegin(): Promise<boolean> {
    const gen = this.gen
    try {
      if (!(await this.open())) return false
      if (this.gen !== gen) return false
      return this.start()
    } catch (e) {
      if (this.gen !== gen) return false // se cerró mientras tanto: no se reintenta
      if (e instanceof MicError && /permiso/i.test(e.message)) throw e
      this.close()
      const retry = this.gen
      if (!(await this.open())) return false
      if (this.gen !== retry) return false
      try {
        return this.start()
      } catch {
        this.close()
        throw new MicError('No se pudo grabar. Vuelve a intentarlo.')
      }
    }
  }

  /** Detiene la grabación y devuelve el audio y su duración en segundos. Nunca se queda colgado. */
  stop(): Promise<{ blob: Blob; seconds: number }> {
    const rec = this.recorder
    const chunks = this.chunks
    this.recorder = null
    if (!rec || rec.state === 'inactive') {
      return Promise.resolve({ blob: new Blob(chunks), seconds: 0 })
    }
    const seconds = (performance.now() - this.startedAt) / 1000
    return new Promise((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve({ blob: new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), seconds })
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

  /**
   * v5.9 (AUD-MIC-305): termina la grabación y SUELTA el micrófono. El micro solo está abierto mientras grabas: antes
   * se quedaba abierto (punto verde, modo llamada) toda la clase y entre tarjetas del repaso o tareas del test.
   */
  async finish(): Promise<{ blob: Blob; seconds: number }> {
    const r = await this.stop()
    this.close()
    return r
  }

  /** Para la grabación y el micrófono, y cancela cualquier apertura en curso (AUD-MIC-301). */
  close(): void {
    this.gen++
    this.opening = null
    this.beginning = null
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    } catch {
      // ya estaba detenido
    }
    this.release()
  }

  /**
   * Volumen de la voz ahora mismo (0–1); 0 si no se está grabando. El analizador se crea con la primera lectura de
   * cada grabación y se cierra al soltar el micro (no queda ningún AudioContext abierto).
   */
  level(): number {
    const s = this.stream
    if (!s || !this.recorder || this.recorder.state !== 'recording') return 0
    try {
      if (!this.meter || this.meter.stream !== s) {
        this.closeMeter()
        const ctx = new AudioContext()
        const an = ctx.createAnalyser()
        an.fftSize = 512
        ctx.createMediaStreamSource(s).connect(an)
        this.meter = { ctx, an, buf: new Uint8Array(new ArrayBuffer(an.fftSize)), stream: s }
      }
      const { an, buf } = this.meter
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128
        sum += x * x
      }
      // RMS de la voz al hablar ≈ 0,05–0,25: se amplía para que una voz normal llene las barras.
      return Math.min(1, Math.sqrt(sum / buf.length) * 5)
    } catch {
      return 0
    }
  }

  private closeMeter() {
    this.meter?.ctx.close().catch(() => {})
    this.meter = null
  }

  /** Suelta el stream y sale del registro, sin cancelar (lo usa una apertura que falla). */
  private release(): void {
    this.closeMeter()
    stopTracks(this.stream)
    this.stream = null
    this.recorder = null
    recorders.delete(this)
  }
}
