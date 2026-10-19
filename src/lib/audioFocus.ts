import { Capacitor, registerPlugin } from '@capacitor/core'

// v5.10 (P2, uso real): foco de audio de Android (AudioRoutePlugin.java). Mientras habla el profe (o una idea, un
// ejemplo…), la música de otras apps baja de volumen; mientras grabas, se pausa para que no entre en el micro.
// Un solo dueño a la vez: soltar el foco de la voz no lo suelta si ya lo tiene el micro (y al revés).

type Kind = 'duck' | 'pause'
interface FocusPlugin {
  requestFocus(o: { kind: Kind }): Promise<{ granted: boolean }>
  abandonFocus(): Promise<void>
}
const Native = registerPlugin<FocusPlugin>('AudioRoute')
const native = () => Capacitor.getPlatform() === 'android'

let owner: 'tts' | 'mic' | null = null

/** Pide el foco: `tts` baja la música (duck); `mic` la pausa. Nunca falla: sin foco, todo sigue igual. */
export function takeAudioFocus(who: 'tts' | 'mic') {
  owner = who
  if (!native()) return
  Native.requestFocus({ kind: who === 'mic' ? 'pause' : 'duck' }).catch(() => {})
}

/** Devuelve el foco si lo tiene `who` (la música vuelve a su volumen o sigue sonando). */
export function releaseAudioFocus(who: 'tts' | 'mic') {
  if (owner !== who) return
  owner = null
  if (!native()) return
  Native.abandonFocus().catch(() => {})
}
