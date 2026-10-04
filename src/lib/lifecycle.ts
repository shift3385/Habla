import { App as CapApp } from '@capacitor/app'
import { releaseAllMics } from './recorder'
import { stopSpeaking } from './tts'

// Ciclo de vida de la app (NC-14 batería, NC-16 guardar la clase).
// Al pasar a segundo plano (minimizar, cambiar de app, apagar la pantalla o cerrar) la app queda inactiva:
// se cierran los micrófonos, se calla la voz y se avisa a las pantallas para que guarden lo que tengan abierto.
// La parte nativa (MainActivity + AudioRoutePlugin) pausa los temporizadores del WebView y suelta el
// "modo llamada"/Bluetooth aunque el JavaScript no llegara a ejecutarse.

type Listener = () => void
const onBackground = new Set<Listener>()
const onForeground = new Set<Listener>()
let installed = false
let inBackground = false

/** Suscribirse a "la app pasa a segundo plano" (se llama una vez por cada paso a segundo plano). */
export function whenBackground(fn: Listener): () => void {
  onBackground.add(fn)
  return () => onBackground.delete(fn)
}

export function whenForeground(fn: Listener): () => void {
  onForeground.add(fn)
  return () => onForeground.delete(fn)
}

function goBackground() {
  if (inBackground) return
  inBackground = true
  releaseAllMics()
  stopSpeaking().catch(() => {})
  onBackground.forEach((fn) => {
    try {
      fn()
    } catch {
      // una pantalla que falle no impide al resto guardar
    }
  })
}

function goForeground() {
  if (!inBackground) return
  inBackground = false
  onForeground.forEach((fn) => fn())
}

export function installLifecycle() {
  if (installed) return
  installed = true
  CapApp.addListener('appStateChange', ({ isActive }) => (isActive ? goForeground() : goBackground())).catch(() => {})
  CapApp.addListener('pause', goBackground).catch(() => {})
  document.addEventListener('visibilitychange', () => (document.hidden ? goBackground() : goForeground()))
  window.addEventListener('pagehide', goBackground)
}
