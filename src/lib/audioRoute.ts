import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

// Por dónde se escucha al profe y por dónde se habla, cuando hay auriculares conectados.
// Plugin nativo propio (android/.../AudioRoutePlugin.java): permiso de Bluetooth, lista de dispositivos y
// "dispositivo de comunicación" de Android (micro de voz + salida de voz).

export type AudioMode = 'headset' | 'split' | 'phone'

export const AUDIO_MODES: { key: AudioMode; title: string; desc: string }[] = [
  { key: 'headset', title: 'Todo por los auriculares', desc: 'Escuchas al profe y hablas por los auriculares' },
  { key: 'split', title: 'Escucho por los auriculares, hablo al teléfono', desc: 'La voz del profe suena mejor; habla cerca del teléfono' },
  { key: 'phone', title: 'Todo por el teléfono', desc: 'Altavoz y micrófono del teléfono' },
]

export interface AudioDevice {
  id: number
  type: number
  kind: 'bluetooth' | 'wired' | 'usb' | 'phone' | 'other'
  name: string
  headset: boolean
}

export interface AudioState {
  inputs: AudioDevice[]
  outputs: AudioDevice[]
  headset: boolean // hay auriculares conectados
  headsetName: string
  headsetMic: boolean // con micrófono (o Bluetooth que puede darlo)
  btPermission: boolean
  mode: number
  current?: AudioDevice | null
}

interface AudioRoutePlugin {
  getDevices(): Promise<AudioState>
  requestBluetooth(): Promise<{ granted: boolean }>
  setRoute(o: { route: 'headset' | 'phone' }): Promise<{ ok: boolean; ms?: number; device?: AudioDevice; state: AudioState }>
  checkMic(o: { device: 'bt' | 'phone'; ms?: number }): Promise<{ alive: boolean; frames: number; expected: number; peak: number; routed: string }>
  addListener(event: 'devicesChanged', cb: (s: AudioState) => void): Promise<PluginListenerHandle>
}

const Native = registerPlugin<AudioRoutePlugin>('AudioRoute')
const native = () => Capacitor.getPlatform() === 'android'

const NONE: AudioState = { inputs: [], outputs: [], headset: false, headsetName: '', headsetMic: false, btPermission: true, mode: 0 }

export async function audioState(): Promise<AudioState> {
  if (!native()) return NONE
  try {
    return await Native.getDevices()
  } catch {
    return NONE
  }
}

export function onAudioDevicesChanged(cb: (s: AudioState) => void): () => void {
  if (!native()) return () => {}
  const h = Native.addListener('devicesChanged', cb)
  return () => {
    h.then((x) => x.remove())
  }
}

/** Aplica el modo elegido en Android. Devuelve false si no se pudo (p. ej. sin permiso de Bluetooth). */
export async function applyAudioMode(mode: AudioMode | 'none'): Promise<boolean> {
  if (!native()) return true
  try {
    if (mode === 'headset') {
      const { granted } = await Native.requestBluetooth()
      if (!granted) return false
      const r = await Native.setRoute({ route: 'headset' })
      console.info('[HABLA-MIC] ruta auriculares', JSON.stringify(r.state?.current ?? null))
      return r.ok
    }
    await Native.setRoute({ route: 'phone' })
    return true
  } catch (e) {
    console.warn('[HABLA-MIC] no se pudo cambiar la ruta de audio', String(e))
    return false
  }
}

// MOV-4 · ¿el micro de los auriculares entrega audio? Se comprueba una vez y se recuerda hasta que cambian los
// auriculares o la app vuelve del segundo plano (el selector llama a forgetHeadsetCheck()).
export type HeadsetCheck = 'ok' | 'dead' | 'unknown'
let headsetCheck: Promise<HeadsetCheck> | null = null

export function forgetHeadsetCheck() {
  headsetCheck = null
}

/**
 * Comprobación al entrar en clase con «Todo por los auriculares» (MOV-4). Como las apps de llamadas (Twilio
 * AudioSwitch, el WebRTC de Google): se pide la ruta y se ESPERA a que sea efectiva (≤ 4 s); luego se lee ~1,2 s
 * del micro Bluetooth en nativo y se cuentan las muestras. Un micro vivo entrega audio aunque sea silencio; uno
 * muerto no entrega nada. Así no se confunde «no hablas» con «micro mudo». Con cable o USB no hace falta.
 */
export function verifyHeadsetMic(): Promise<HeadsetCheck> {
  if (!native()) return Promise.resolve('ok')
  headsetCheck ??= (async (): Promise<HeadsetCheck> => {
    try {
      const t0 = Date.now()
      const r = await Native.setRoute({ route: 'headset' })
      if (r.device && r.device.kind !== 'bluetooth') return 'ok'
      if (!r.ok) {
        console.warn(`[HABLA-MIC] la ruta a los auriculares no se hizo efectiva en ${r.ms} ms`)
        return 'dead'
      }
      const m = await Native.checkMic({ device: 'bt', ms: 1200 })
      console.info(`[HABLA-MIC] auriculares: ${m.alive ? 'entregan audio' : 'NO entregan audio'} (${m.frames}/${m.expected} muestras, ${Date.now() - t0} ms)`)
      return m.alive ? 'ok' : 'dead'
    } catch (e) {
      console.warn('[HABLA-MIC] no se pudo comprobar el micro de los auriculares', String(e))
      return 'unknown' // sin permiso u otro fallo: se sigue como antes (detección por señal al grabar)
    }
  })()
  const p = headsetCheck
  p.then((v) => {
    if (v === 'unknown' && headsetCheck === p) headsetCheck = null // se reintenta en la próxima clase
  })
  return p
}

/** Abre el selector de audio desde cualquier pantalla (p. ej. Ajustes → Profe y voz). */
export function openAudioPicker() {
  window.dispatchEvent(new Event('habla:audio-picker'))
}
