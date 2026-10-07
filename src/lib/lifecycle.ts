import { App as CapApp } from '@capacitor/app'
import { releaseAllMics } from './recorder'
import { stopSpeaking } from './tts'

// Ciclo de vida de la app (NC-14 batería, NC-16 guardar la clase).
// Al pasar a segundo plano (minimizar, cambiar de app, apagar la pantalla o cerrar) la app queda inactiva:
// se cierran los micrófonos, se calla la voz y se avisa a las pantallas para que guarden lo que tengan abierto.
// La parte nativa (MainActivity + AudioRoutePlugin) pausa los temporizadores del WebView y suelta el
// "modo llamada"/Bluetooth aunque el JavaScript no llegara a ejecutarse.
//
// v5.8.1 (AUD-MIC-301/308): el aviso «pause» de Capacitor (Activity.onPause) YA NO cuenta como segundo plano.
// onPause también llega con el diálogo de permiso del micrófono de Android y al perder el foco en pantalla
// dividida, con la app a la vista; ahora que cerrar cancela la apertura en curso, cerrar ahí abortaría la misma
// apertura que pidió el permiso. El segundo plano real llega con onStop: `appStateChange` (isActive=false),
// `visibilitychange` (WebView.onPause en MainActivity.onStop) y además MainActivity.onStop llama directamente a
// `window.__hablaBackground()`, sin pasar por los avisos de los plugins.

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
  // Puerta directa para la red de seguridad nativa (MainActivity.onStop, AUD-MIC-308).
  ;(window as unknown as { __hablaBackground?: () => void }).__hablaBackground = goBackground
  document.addEventListener('visibilitychange', () => (document.hidden ? goBackground() : goForeground()))
  window.addEventListener('pagehide', goBackground)
}
