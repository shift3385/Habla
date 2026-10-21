// Reglas de los toques del botón de hablar (TalkButton) y de los descartes de grabaciones (REG-M-02), separadas para poder probarlas sin navegador
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

// ------------------------------------------------------------------------------------------------
// 5.10.1 (REG-M-02): grabaciones descartadas. En la regresión se perdieron 4 grabaciones sin que el dueño viera nada:
// el aviso era una línea gris pequeña que además se borraba con cualquier toque. Ahora cada descarte tiene un motivo,
// un aviso propio que se queda a la vista hasta el siguiente toque del micro, y una línea en la consola
// («[HABLA-MIC] descartada: motivo …») para poder reconstruir lo que pasó con el registro del teléfono.

export type DiscardReason =
  | 'corta' // menos de MIN_TALK_SECONDS o sin bytes
  | 'vacia' // solo la cabecera WebM: micro muerto (p. ej. auriculares desconectados)
  | 'sin-voz' // el análisis local no encontró voz
  | 'gemini-sin-voz' // Gemini respondió que no oyó habla (heard_speech false o transcripción vacía)
  | 'idea-leida' // la transcripción es justo una idea de «¿Qué digo?»
  | 'cancelada' // la papelera
  | 'segundo-plano' // la app pasó a segundo plano grabando o abriendo el micro
  | 'no-abrio' // el micro no llegó a grabar (apertura cancelada o fallida)

/** Grabaciones más cortas que esto se descartan (antes MIN_SECONDS en la clase). */
export const MIN_TALK_SECONDS = 0.7

/** A partir de esta duración, una grabación «sin voz» se puede enviar igualmente (puede ser voz muy baja). */
export const SEND_ANYWAY_SECONDS = 2

/** Texto del aviso que ve el usuario para cada motivo (en español, tono cercano). */
export const DISCARD_HINTS: Record<DiscardReason, string> = {
  corta: 'La grabación fue demasiado corta y no la he enviado. Toca el micro, habla y vuelve a tocarlo para enviar.',
  vacia: 'La grabación llegó vacía (el micro no dio sonido) y no la he enviado. Toca el micro y repite: buscaré un micro que funcione.',
  'sin-voz': 'No te he oído en la grabación y no la he enviado. Habla un poco más fuerte o más cerca del micrófono.',
  'gemini-sin-voz': 'Tu profe no entendió la grabación: no oyó voz clara. Toca el micro y repite, un poco más cerca.',
  'idea-leida':
    'Te entendí justo la idea de «¿Qué digo?», sin nada más, y no la he corregido. Si no la dijiste tú (a veces el micro capta la voz del teléfono), vuelve a grabar tu respuesta.',
  cancelada: 'Grabación descartada. Toca el micro para volver a grabar.',
  'segundo-plano': 'Se cortó la grabación al salir de Habla y no se envió nada. Toca el micro y vuelve a grabar.',
  'no-abrio': 'El micro no llegó a abrirse y no se grabó nada. Toca otra vez para hablar.',
}

/**
 * ¿Hay que descartar una grabación recién terminada sin enviarla? Devuelve el motivo o `null` si se puede enviar.
 * `empty` = isEmptyRecording(blob, analysis); `hasSpeech` = analysis?.hasSpeech (undefined si no se pudo analizar).
 */
export function localDiscard(r: { seconds: number; bytes: number; empty: boolean; hasSpeech?: boolean }): DiscardReason | null {
  if (r.seconds < MIN_TALK_SECONDS || r.bytes === 0) return 'corta'
  if (r.empty) return 'vacia'
  if (r.hasSpeech === false) return 'sin-voz'
  return null
}

/** Registra el descarte en la consola (logcat del APK debug). Sin texto del usuario: solo el motivo y medidas. */
export function logDiscard(reason: DiscardReason, where: string, extra: Record<string, number | string | boolean | undefined> = {}) {
  const detail = Object.entries(extra)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`)
    .join(' ')
  console.info(`[HABLA-MIC] descartada: motivo ${reason} · ${where}${detail ? ` · ${detail}` : ''}`)
}
