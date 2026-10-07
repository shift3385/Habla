// Reglas de los toques del botón de hablar (TalkButton), separadas para poder probarlas sin navegador
// (tests/talkGesture.test.mjs).
// v5.9 (AUD-MIC-305, decisión del dueño): «toca para hablar, toca para enviar», máximo 60 s. Ya no hay que mantener
// pulsado. Se conservan las protecciones de la 5.8.1: un doble toque no abre dos grabaciones (AUD-MIC-302/304) y
// un segundo toque demasiado seguido no envía una grabación vacía.

/** Un toque que llega antes de este tiempo de grabación es el rebote de un doble toque, no «enviar». */
export const MIN_SEND_MS = 600

export type TapAction = 'ignore' | 'send' | 'press'

/** Qué hace un toque: ignorarlo, enviar la grabación en marcha o empezar a grabar. */
export function tapAction(s: { busy: boolean; recording: boolean; recordingMs: number }): TapAction {
  if (s.busy) return 'ignore'
  if (s.recording) return s.recordingMs < MIN_SEND_MS ? 'ignore' : 'send'
  // Durante la apertura del micro (aún no «grabando») otro toque vuelve a pedir lo mismo: Recorder.begin() comparte
  // la apertura en curso, así que no se abre un segundo micrófono (AUD-MIC-302).
  return 'press'
}
