import { releaseAudioFocus, takeAudioFocus } from './audioFocus'
import { beginSpeaking, speakingKey, subscribeSpeaking } from './speaking'
import { speakUS, stopSpeaking } from './tts'

// Para los tests (la misma instancia de los módulos que usa este).
export { audioFocusState } from './audioFocus'
export { speakingKey } from './speaking'

// 5.11 (S-08): «▶ sonido suelto» de Sonidos: grabaciones de Wikimedia Commons en public/sounds/ (las copia Vite al APK).
// Comparte el estado ▶/⏸ de toda la app (speaking.ts): tocar otro ▶ lo corta, y este corta la voz que sonara. Mientras
// suena, la música de otras apps baja (foco de audio «tts», como un ▶ corto). Si el archivo falta o no se puede
// reproducir, cae a la palabra clave lenta con la voz americana: nunca se queda en silencio.
// También reproduce tu propia grabación en «Escúchate» (S-10), con el mismo foco y la misma clave ▶/⏸.

let current: { el: HTMLAudioElement; stop: () => void } | null = null

/** Para lo que suene con este módulo (sin tocar la voz). */
export function stopSoundAudio() {
  current?.stop()
  current = null
}

/**
 * Reproduce `src` (URL de un archivo o de un blob) como una lectura con clave `key`. Resuelve al acabar o al cortarse;
 * rechaza solo si el audio no arranca (archivo que falta, formato que el WebView no sabe leer).
 */
export async function playAudio(src: string, key: string): Promise<void> {
  stopSoundAudio()
  await stopSpeaking()
  const turn = beginSpeaking(key)
  const el = new Audio(src)
  el.preload = 'auto'
  return new Promise<void>((resolve, reject) => {
    let done = false
    let unsub = () => {}
    const finish = (err?: unknown) => {
      if (done) return
      done = true
      unsub()
      el.onended = el.onerror = null
      el.pause()
      releaseAudioFocus('tts')
      turn.end()
      if (current?.el === el) current = null
      if (err) reject(err instanceof Error ? err : new Error('audio'))
      else resolve()
    }
    // Otro ▶ (o «parar») ha empezado: este se calla.
    unsub = subscribeSpeaking(() => {
      if (!turn.active()) finish()
    })
    current = { el, stop: () => finish() }
    el.onended = () => finish()
    el.onerror = () => finish(new Error('audio'))
    takeAudioFocus('tts')
    el.play().catch((e) => finish(e))
  })
}

/**
 * ▶ del sonido suelto (`url`: sounds.ts › audioUrl): si ya suena, lo para; si no, lo reproduce. Sin archivo (o si falla), dice `fallbackWord` despacio
 * con la voz americana. Nunca rechaza.
 */
export function toggleSound(url: string | undefined, fallbackWord: string, key = `sound:${url ?? fallbackWord}`): Promise<void> {
  if (speakingKey() === key) {
    stopSoundAudio()
    return stopSpeaking()
  }
  if (!url) return speakUS(fallbackWord, { key, slow: true })
  return playAudio(url, key).catch(() => speakUS(fallbackWord, { key, slow: true }))
}

/** «Escúchate»: tu grabación (blob) con ▶/⏸. Nunca rechaza. */
export function playRecording(blob: Blob, key: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  return playAudio(url, key)
    .catch(() => {})
    .finally(() => URL.revokeObjectURL(url))
}

// Si la app pasa a segundo plano, nada sigue sonando (batería y privacidad, como la voz en lifecycle.ts).
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => document.hidden && stopSoundAudio())
