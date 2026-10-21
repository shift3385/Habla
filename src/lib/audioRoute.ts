import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { speakingKey, subscribeSpeaking } from './speaking'

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
  addListener(event: 'devicesChanged', cb: (s: AudioState) => void): Promise<PluginListenerHandle>
}

let Native = registerPlugin<AudioRoutePlugin>('AudioRoute')
let native = () => Capacitor.getPlatform() === 'android'

/** Solo para las pruebas (tests/d1-*.test.mjs): sustituye el plugin nativo por uno simulado. */
export function __setNativeForTests(fake: Pick<AudioRoutePlugin, 'getDevices' | 'requestBluetooth' | 'setRoute'>) {
  Native = fake as AudioRoutePlugin
  native = () => true
}

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

// REG-M-01: un permiso de Bluetooth ya concedido no se vuelve a pedir en cada toque (si se retira desde Ajustes,
// Android reinicia la app y este valor se pierde).
let btGranted = false
export async function bluetoothGranted(): Promise<boolean> {
  if (btGranted || !native()) return true
  btGranted = (await Native.requestBluetooth()).granted
  return btGranted
}

/** Aplica el modo elegido en Android. Devuelve false si no se pudo (p. ej. sin permiso de Bluetooth). */
export async function applyAudioMode(mode: AudioMode | 'none'): Promise<boolean> {
  if (!native()) return true
  try {
    if (mode === 'headset') {
      if (!(await bluetoothGranted())) return false
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

// ------------------------------------------------------------------------------------------------
// 5.10.1 (REG-M-01) · «Preparar al acabar el profe»: la ruta de los auriculares se pide justo cuando te toca hablar.
//
// Medido en el POCO con unos soundcore: toque → grabando 2,7–3,6 s. Tras abrir el micro, `afterOpen` pedía otra vez
// el permiso de Bluetooth y `setRoute('headset')`, que espera a que Android active el canal de voz del Bluetooth
// (1,2–2,0 s en cada toque). Cuando la ruta ya estaba puesta bajaba a 1,5–1,7 s.
//
// Decisión del dueño (ronda 2): NO dejar el «modo llamada» (HFP/SCO) toda la clase, porque la voz del profe sonaría
// con calidad de llamada. Por eso, en una pantalla que graba (clase, repaso, «Dilo tú», tareas de habla del test):
//   - mientras suena una voz (el profe, una idea, la tarea…), la ruta está SUELTA: la voz sale por A2DP, bien;
//   - cuando la voz acaba (o al entrar, si no habla nadie) se pide la ruta (`arm`), sin abrir el micro;
//   - se mantiene hasta que envías o descartas la grabación (al soltar el micro) o hasta IDLE_MS sin tocar el micro;
//   - si tocas antes de que esté lista, se aplica en el toque como antes (`ensureHeadsetRoute`).
// Fijar el «dispositivo de comunicación» NO abre el micrófono ni enciende el indicador verde de Android: eso solo lo
// hace una captura real (getUserMedia), que sigue abriéndose al tocar y cerrándose al enviar.
//
// Privacidad (requisito del dueño): la ruta se suelta (`setRoute('phone')` = clearCommunicationDevice + modo normal) al
// salir de la pantalla que la retiene y siempre que la app deja de estar en uso (minimizar, bloquear, pagehide,
// appStateChange inactiva, __hablaBackground: lifecycle.ts → `suspendRoute`). El plugin nativo además la suelta en
// onStop aunque el JavaScript no llegue a ejecutarse.

/** Modo de comunicación de Android (AudioManager.MODE_IN_COMMUNICATION). */
const MODE_IN_COMMUNICATION = 3
/** Sin tocar el micro durante este tiempo, la ruta preparada se suelta (decisión del dueño: ~20 s). */
let IDLE_MS = 20_000
/** Espera tras acabar una voz antes de pedir la ruta: entre dos tramos o dos frases seguidas no se pide. */
let ARM_DELAY_MS = 350

// El selector de audio eligió «Todo por los auriculares» y hay permiso de Bluetooth.
let headsetWanted = false
// Pantallas que graban y están abiertas ahora mismo.
const holds = new Set<symbol>()
let foreground = true
// Pedimos (o encontramos puesta) la ruta de los auriculares y aún no la hemos soltado.
let routed = false
// El micro está abierto (desde que el Recorder pide la ruta al abrirlo hasta que lo suelta).
let micActive = false
let warming: Promise<boolean> | null = null
// REV-D1-01: sube con cada drop(). Una petición de ruta que vuelve y ve otro número sabe que entretanto se soltó (salir,
// segundo plano, enviar) y la suelta de nuevo a la fuerza: si no, el setRoute('headset') tardío dejaba el modo llamada.
let routeGen = 0
let armTimer: ReturnType<typeof setTimeout> | undefined
let idleTimer: ReturnType<typeof setTimeout> | undefined
let speechWatch: (() => void) | null = null
// REG-M-03: la prueba de sonido manda ella sobre la ruta (la fija para que la instrucción y el micro vayan por los
// auriculares); mientras dura, la clase de debajo no la prepara ni la suelta por sus voces.
let soundTesting = false

const shouldHold = () => headsetWanted && foreground && holds.size > 0

function clearTimers() {
  clearTimeout(armTimer)
  clearTimeout(idleTimer)
}

/** ¿El estado del plugin dice que los auriculares ya son el dispositivo de comunicación? */
export function headsetRouteActive(s: AudioState | null | undefined): boolean {
  return !!s?.current?.headset && s.mode === MODE_IN_COMMUNICATION
}

/** Fija la ruta de los auriculares si hace falta (una sola petición a la vez). No abre el micrófono. */
function warm(): Promise<boolean> {
  if (!native() || !shouldHold()) return Promise.resolve(false)
  warming ??= (async () => {
    try {
      const gen = routeGen
      const active = headsetRouteActive(await audioState())
      const stale = () => gen !== routeGen || !shouldHold() || (!micActive && speakingKey() !== null)
      if (stale()) return false // salió, minimizó, se soltó o empezó una voz mientras se consultaba
      routed = true
      if (active) return true
      const ok = await applyAudioMode('headset')
      // REV-D1-01: en la espera se salió, se minimizó, se soltó o empezó una voz: se suelta a la fuerza.
      if (stale()) await drop(true)
      return ok
    } finally {
      warming = null
    }
  })()
  return warming
}

/** Suelta la ruta. Con `force`, aunque no la pusiéramos nosotros (p. ej. la puso la prueba de sonido). */
function drop(force = false): Promise<void> {
  clearTimers()
  routeGen++
  if ((!routed && !force) || !native()) return Promise.resolve()
  routed = false
  return applyAudioMode('none').then(
    () => {},
    () => {},
  )
}

/** Te toca hablar: se prepara la ruta en un momento y se suelta sola si no tocas el micro en IDLE_MS. */
function arm(delay = ARM_DELAY_MS) {
  clearTimeout(armTimer)
  if (!shouldHold() || micActive || soundTesting) return
  armTimer = setTimeout(() => {
    if (!shouldHold() || micActive || speakingKey() !== null) return
    warm().then(() => {
      if (micActive || !routed) return
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        if (!micActive) drop()
      }, IDLE_MS)
    })
  }, delay)
}

/**
 * Empieza o acaba una voz (speaking.ts). Empieza: la ruta se suelta para que suene por A2DP (salvo que estés grabando).
 * Acaba: se prepara para tu respuesta. Exportada para las pruebas.
 */
export function routeOnSpeech(speaking: boolean) {
  if (!shouldHold() || soundTesting) return
  if (speaking) {
    clearTimers()
    if (!micActive) drop()
  } else arm()
}

/** Te vuelve a tocar sin que hable nadie (p. ej. una grabación descartada): se prepara otra vez. */
export function armRoute() {
  arm()
}

/**
 * REG-M-03: empieza o acaba la prueba de sonido. Al empezar, en modo auriculares se fija la ruta (la instrucción suena por
 * el canal de voz y el micro de los auriculares se activa antes de escuchar). Al acabar, la ruta vuelve a lo que toque
 * (preparada si hay una pantalla que graba y te toca hablar; si no, al teléfono).
 */
export async function soundTestRoute(on: boolean, headset: boolean): Promise<boolean> {
  soundTesting = on
  clearTimers()
  if (on) {
    if (!headset || !native()) return true
    // REV-D1-02 (privacidad): con la app oculta nunca se fija el modo llamada.
    if (!foreground) return false
    const gen = routeGen
    routed = true
    const ok = await applyAudioMode('headset')
    // Si mientras tanto se minimizó o se soltó la ruta (drop), no se deja puesta (como REV-D1-01).
    if (gen !== routeGen || !foreground) {
      await drop(true)
      return false
    }
    return ok
  }
  settleRoute()
  return true
}

/** El profe va a hablar: suelta la ruta YA (antes de la primera sílaba), salvo que el micro esté abierto. */
export function disarmRoute(): Promise<void> {
  clearTimers()
  return micActive ? Promise.resolve() : drop()
}

/** El selector de audio: ¿se quiere hablar por los auriculares? Con `false` se suelta la ruta. */
export function setHeadsetWanted(on: boolean) {
  headsetWanted = on
  if (!on) drop(true)
  else arm()
}

/**
 * Una pantalla que graba se apunta mientras está abierta. Devuelve la función que la desapunta (para el `return` de un
 * `useEffect`). Al salir la última pantalla, la ruta vuelve al teléfono.
 */
export function holdRoute(): () => void {
  const key = Symbol('route')
  holds.add(key)
  speechWatch ??= subscribeSpeaking(() => routeOnSpeech(speakingKey() !== null))
  arm()
  return () => {
    if (!holds.delete(key) || holds.size) return
    speechWatch?.()
    speechWatch = null
    drop()
  }
}

/** Prepara o suelta la ruta según haya o no pantallas que graben (p. ej. al acabar la prueba de sonido en el Inicio). */
export function settleRoute() {
  if (shouldHold()) arm()
  else drop(true)
}

/** REV-D1-02: ¿la app está a la vista? (lo mantiene lifecycle.ts con suspendRoute/resumeRoute). */
export const isForeground = () => foreground

/** Segundo plano (lifecycle.ts): se suelta la ruta aunque la clase siga abierta. */
export function suspendRoute() {
  foreground = false
  drop(true) // aunque la pusiera otro (la prueba de sonido): en segundo plano nunca queda el «modo llamada»
}

/** Vuelta a primer plano (lifecycle.ts): si la pantalla que graba sigue abierta, se vuelve a preparar. */
export function resumeRoute() {
  foreground = true
  arm()
}

/**
 * Se soltó el micro (Recorder → onMicClosed): enviaste o descartaste. La ruta se suelta para que el profe responda con
 * calidad normal; se volverá a preparar cuando acabe de hablar.
 */
export function releaseAfterMic() {
  micActive = false
  drop()
}

/**
 * Justo después de abrir el micro en modo auriculares (Recorder → onMicOpened). Si la ruta ya está preparada solo se
 * consulta el estado del plugin; si no (tocaste antes de que estuviera lista, o el WebView la cambió), se aplica.
 */
export async function ensureHeadsetRoute(): Promise<boolean> {
  if (!native()) return true
  micActive = true
  clearTimers()
  const t0 = performance.now()
  if (warming) await warming.catch(() => false) // una preparación en curso: se aprovecha
  const gen = routeGen
  routed = true
  if (headsetRouteActive(await audioState())) {
    console.info(`[HABLA-MIC] ruta auriculares ya puesta (${Math.round(performance.now() - t0)} ms)`)
    return true
  }
  const ok = await applyAudioMode('headset')
  // REV-D1-01: si mientras tanto se soltó el micro o se salió (drop), no se deja puesta.
  if (gen !== routeGen) await drop(true)
  console.info(`[HABLA-MIC] ruta auriculares aplicada al tocar en ${Math.round(performance.now() - t0)} ms`)
  return ok
}

/** Solo para las pruebas: tiempos cortos. */
export function __setRouteTimingsForTests(armDelay: number, idle: number) {
  ARM_DELAY_MS = armDelay
  IDLE_MS = idle
}

/** Abre la prueba de audio y sonido (Ajustes → Profe y voz → Prueba de sonido). */
export function openSoundTest() {
  window.dispatchEvent(new Event('habla:sound-test'))
}

/** Abre el selector de audio desde cualquier pantalla (p. ej. Ajustes → Profe y voz). */
export function openAudioPicker() {
  window.dispatchEvent(new Event('habla:audio-picker'))
}
