// Micrófono simulado para probar src/lib/recorder.ts en Node: getUserMedia, enumerateDevices, MediaStream,
// MediaRecorder y AudioContext falsos. Cuenta aperturas, pistas vivas y grabadores para detectar huérfanos.

/**
 * Instala los simulacros en globalThis y devuelve el estado para inspeccionarlo.
 * @param {object} [opts]
 * @param {boolean} [opts.hold] getUserMedia no responde hasta `mic.resolveAll()` (para cortar a mitad de apertura)
 * @param {(constraints: object, n: number) => boolean} [opts.signal] ¿da señal la apertura n.º n? (por defecto sí)
 * @param {{ deviceId: string, label: string }[]} [opts.devices] micrófonos que lista enumerateDevices
 * @param {(constraints: object, n: number) => Error | null} [opts.fail] error que lanza la apertura n.º n
 */
export function installMic(opts = {}) {
  const mic = {
    hold: !!opts.hold,
    signal: opts.signal ?? (() => true),
    fail: opts.fail ?? (() => null),
    devices: opts.devices ?? [{ deviceId: 'default', label: 'Default' }],
    gum: [], // constraints de cada getUserMedia
    tracks: [],
    recorders: [],
    pending: [],
    measuring: 0, // análisis de señal en curso
    get liveTracks() {
      return this.tracks.filter((t) => t.readyState === 'live').length
    },
    get activeRecorders() {
      return this.recorders.filter((r) => r.state !== 'inactive').length
    },
    resolveAll() {
      const p = this.pending.splice(0)
      p.forEach((fn) => fn())
    },
  }

  class FakeTrack {
    constructor(label, hasSignal) {
      this.kind = 'audio'
      this.label = label
      this.readyState = 'live'
      this.muted = false
      this.hasSignal = hasSignal
    }
    stop() {
      this.readyState = 'ended'
    }
  }

  class FakeStream {
    constructor(track) {
      this.tracks = [track]
    }
    get active() {
      return this.tracks.some((t) => t.readyState === 'live')
    }
    getTracks() {
      return [...this.tracks]
    }
    getAudioTracks() {
      return [...this.tracks]
    }
  }

  const getUserMedia = (constraints) => {
    const n = mic.gum.length
    mic.gum.push(constraints.audio)
    const make = () => {
      const err = mic.fail(constraints.audio, n)
      if (err) throw err
      const track = new FakeTrack(`mic #${n}`, mic.signal(constraints.audio, n))
      mic.tracks.push(track)
      return new FakeStream(track)
    }
    return new Promise((resolve, reject) => {
      const go = () => {
        try {
          resolve(make())
        } catch (e) {
          reject(e)
        }
      }
      if (mic.hold) mic.pending.push(go)
      else setTimeout(go, 5)
    })
  }

  class FakeMediaRecorder {
    static isTypeSupported(m) {
      return m === 'audio/webm;codecs=opus'
    }
    constructor(stream, options) {
      this.stream = stream
      this.mimeType = options?.mimeType ?? ''
      this.state = 'inactive'
      this.ondataavailable = null
      this.onstop = null
      this.onerror = null
      mic.recorders.push(this)
    }
    start() {
      this.state = 'recording'
    }
    stop() {
      if (this.state === 'inactive') return
      this.state = 'inactive'
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(['x']) })
        this.onstop?.()
      })
    }
  }

  class FakeAudioContext {
    async resume() {}
    createAnalyser() {
      const an = {
        fftSize: 2048,
        stream: null,
        getFloatTimeDomainData(buf) {
          const track = an.stream?.getAudioTracks()[0]
          buf.fill(track && track.readyState === 'live' && track.hasSignal ? 0.01 : 0)
        },
      }
      return an
    }
    createMediaStreamSource(stream) {
      mic.measuring++
      return {
        connect(an) {
          an.stream = stream
        },
      }
    }
    async close() {
      mic.measuring--
    }
  }

  // El reloj avanza 400 ms en cada lectura: los 2 s de medición de silencio pasan en ~5 vueltas de 30 ms.
  let now = 0
  const fakePerformance = { now: () => (now += 400) }

  const define = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  define('navigator', {
    mediaDevices: {
      getUserMedia,
      enumerateDevices: async () => mic.devices.map((d) => ({ ...d, kind: 'audioinput', groupId: '' })),
      addEventListener: () => {},
    },
  })
  define('MediaRecorder', FakeMediaRecorder)
  define('AudioContext', FakeAudioContext)
  define('performance', fakePerformance)
  return mic
}

/** Espera a que se cumpla una condición (máx. 3 s). */
export async function until(cond, label = 'condición') {
  const t0 = Date.now()
  while (!cond()) {
    if (Date.now() - t0 > 3000) throw new Error(`Tiempo agotado esperando: ${label}`)
    await new Promise((r) => setTimeout(r, 5))
  }
}
