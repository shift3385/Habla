import { Capacitor, registerPlugin } from '@capacitor/core'

// v5.10 (P2, uso real): foco de audio de Android (AudioRoutePlugin.java). Mientras habla el profe (o una idea, un
// ejemplo…), la música de otras apps baja de volumen; mientras grabas, se pausa para que no entre en el micro.
//
// 5.10.1 (REG-A1-02): varios dueños a la vez y se pide siempre el más fuerte: micro > lectura larga > ▶ corto. Antes
// había uno solo: un ▶ mientras grababas cambiaba «pausa» por «bajar» y al acabar soltaba el foco con el micro abierto
// (la música volvía entera y entraba en la grabación).
// 5.10.1 (REG-M-06 / REG-A1-03): las lecturas largas (la explicación de Gramática, un texto de > ~12 s) PAUSAN la música
// (GAIN_TRANSIENT): con MAY_DUCK Android la bajaba muy poco. Y la voz suelta el foco con 600 ms de retraso: entre dos
// tramos o dos frases seguidas la música ya no sube y baja (se medían 15 peticiones en 45 s de explicación).

type Kind = 'duck' | 'pause'
/** `tts`: un ▶ corto (baja la música) · `read`: una lectura larga (la pausa) · `mic`: grabando (la pausa). */
export type FocusOwner = 'tts' | 'read' | 'mic'
interface FocusPlugin {
  requestFocus(o: { kind: Kind }): Promise<{ granted: boolean }>
  abandonFocus(): Promise<void>
}
const Native = registerPlugin<FocusPlugin>('AudioRoute')
const native = () => Capacitor.getPlatform() === 'android'

/** Cuánto espera la voz antes de devolver el foco: lo justo para encadenar tramos y frases sin rebotes. */
export const RELEASE_DELAY_MS = 600
/** Una frase que dura más que esto es una lectura larga: la música se pausa en vez de bajar. */
export const LONG_READ_S = 12

const holders = new Set<FocusOwner>()
const timers = new Map<FocusOwner, ReturnType<typeof setTimeout>>()
let current: Kind | null = null
// Lo que se ha pedido al sistema, para los tests (en el PC no hay nativo) y para depurar.
const trace: (Kind | 'abandon')[] = []

function apply() {
  const want: Kind | null = holders.has('mic') || holders.has('read') ? 'pause' : holders.has('tts') ? 'duck' : null
  if (want === current) return
  current = want
  trace.push(want ?? 'abandon')
  if (trace.length > 200) trace.shift()
  if (!native()) return
  // El nativo suelta el foco anterior antes de pedir el nuevo: pasar de «bajar» a «pausar» es una sola petición.
  if (want) Native.requestFocus({ kind: want }).catch(() => {})
  else Native.abandonFocus().catch(() => {})
}

function clearTimer(who: FocusOwner) {
  const t = timers.get(who)
  if (t === undefined) return
  clearTimeout(t)
  timers.delete(who)
}

const hidden = () => typeof document !== 'undefined' && document.hidden

/** Pide el foco para `who` (o lo conserva si lo estaba soltando). Nunca falla: sin foco, todo sigue igual. */
export function takeAudioFocus(who: FocusOwner) {
  clearTimer(who)
  holders.add(who)
  apply()
}

/**
 * Suelta el foco de `who`; la música vuelve cuando ya no lo tiene nadie. El micro lo suelta al instante; la voz, tras
 * RELEASE_DELAY_MS (si en ese rato vuelve a hablar, no se nota nada), salvo `now` o con la app en segundo plano: ahí
 * MainActivity congela los temporizadores y el foco se quedaría cogido (la música del usuario en pausa).
 */
export function releaseAudioFocus(who: FocusOwner, now = false) {
  if (!holders.has(who)) return
  clearTimer(who)
  if (now || who === 'mic' || hidden()) {
    holders.delete(who)
    apply()
    return
  }
  timers.set(
    who,
    setTimeout(() => {
      timers.delete(who)
      holders.delete(who)
      apply()
    }, RELEASE_DELAY_MS),
  )
}

/** Suelta ya lo que estuviera esperando su retraso (al pasar a segundo plano). */
export function flushAudioFocus() {
  for (const who of [...timers.keys()]) releaseAudioFocus(who, true)
}

/** Lo suelta todo al instante (segundo plano, prueba de sonido). */
export function releaseAllAudioFocus() {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  holders.clear()
  apply()
}

// Red de seguridad propia: al ocultarse la app (lifecycle.ts también escucha este aviso), no se espera a ningún
// temporizador, que MainActivity.onStop congela con pauseTimers().
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => hidden() && flushAudioFocus())

/** Segundos aproximados que tarda la voz en leer `text` (~15 caracteres por segundo a velocidad 1). */
export function estimateSpeechSeconds(text: string, rate = 1): number {
  return text.length / (15 * Math.max(rate, 0.1))
}

/** ¿Pausa (lectura larga) o baja la música (▶ corto)? */
export function focusOwnerFor(text: string, rate = 1): 'tts' | 'read' {
  return estimateSpeechSeconds(text, rate) > LONG_READ_S ? 'read' : 'tts'
}

/** Para los tests: qué se tiene ahora y qué se ha pedido. */
export function audioFocusState(): { kind: Kind | null; holders: FocusOwner[]; trace: (Kind | 'abandon')[] } {
  return { kind: current, holders: [...holders], trace: [...trace] }
}
