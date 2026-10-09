import { useSyncExternalStore } from 'react'

// v5.9 (▶/⏸ en toda la app): estado observable de «qué está sonando». Una sola fuente para todos los botones de
// reproducir: cada botón se identifica por una clave (por defecto, la frase que lee) y muestra ⏸ si es la que suena.
// Está separado de tts.ts (sin el plugin nativo) para poder probarlo con node:test.

let current: string | null = null
let turn = 0
const listeners = new Set<() => void>()

function set(key: string | null) {
  if (current === key) return
  current = key
  for (const fn of listeners) fn()
}

/** Clave de lo que suena ahora (null si no suena nada). */
export function speakingKey(): string | null {
  return current
}

export function subscribeSpeaking(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Empieza a sonar `key` y devuelve cómo darlo por terminado. Solo borra el estado si nadie ha empezado
 * otra frase entretanto: al interrumpir A con B, el final (tardío) de A no debe devolver B a ▶.
 */
export function beginSpeaking(key: string | null): { end: () => void; active: () => boolean } {
  const mine = ++turn
  set(key)
  return {
    end: () => {
      if (turn === mine) set(null)
    },
    // false si otra frase o un stopSpeaking() llegó mientras se preparaba la voz: entonces ya no debe sonar.
    active: () => turn === mine,
  }
}

/** Se paró la voz (stopSpeaking): nada suena y los finales pendientes ya no cuentan. */
export function endSpeaking() {
  turn++
  set(null)
}

/** true mientras suena la frase con esa clave; el componente se vuelve a pintar solo al cambiar. */
export function useSpeaking(key: string): boolean {
  return useSyncExternalStore(subscribeSpeaking, () => current === key)
}
