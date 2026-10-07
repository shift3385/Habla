// Reglas de los dedos del botón de hablar (TalkButton), separadas para poder probarlas sin navegador
// (tests/talkGesture.test.mjs). AUD-MIC-304 y REV-T2-1.

export interface Gesture {
  active: boolean // hay un dedo que manda (desde su pointerdown hasta su pointerup)
  id: number // pointerId de ese dedo
  done: boolean // ya bloqueó o canceló: soltar no envía
}

export type DownAction = 'ignore' | 'send' | 'press'

/** Qué hace un pointerdown: ignorarlo, enviar (grabación bloqueada) o empezar a grabar. */
export function pointerDownAction(g: Gesture, pointerId: number, s: { busy: boolean; locked: boolean; recording: boolean }): DownAction {
  if (s.busy) return 'ignore'
  // REV-T2-1: mientras un dedo manda (también durante la apertura del micro, antes de «grabando»), otro dedo se
  // ignora del todo; antes se quedaba con el gesto y al soltarlo cortaba la grabación a 0 s.
  if (g.active && g.id !== pointerId) return 'ignore'
  // Grabación bloqueada: este toque envía.
  if (s.locked) return 'send'
  // AUD-MIC-304: con una grabación en marcha (sin bloqueo), otro dedo o un toque justo tras soltar no empieza otra
  // grabación (antes el primer MediaRecorder quedaba grabando huérfano el resto de la clase).
  if (s.recording) return 'ignore'
  return 'press'
}

/** Mover, soltar o cancelar solo cuentan para el dedo que manda. */
export function isOwnPointer(g: Gesture, pointerId: number): boolean {
  return g.active && g.id === pointerId
}
