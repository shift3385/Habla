// 5.11 (S-11, D4): «🔊 Practicar el sonido /θ/ en Sonidos» desde cualquier pantalla (la nota de pronunciación de la
// clase, el Repaso, «Dilo tú» de Gramática). Mismo patrón que grammarLink.ts: App escucha y abre la hoja de Sonidos
// encima de lo que haya, sin cerrar la clase ni perder la grabación.

type Listener = (soundId: string) => void
const listeners = new Set<Listener>()

export function onOpenSound(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Abre la ficha del sonido `soundId` (id de la ficha: `th`, `ih`, `s-cluster`…) en la hoja de Sonidos. */
export function openSound(soundId: string) {
  for (const fn of listeners) fn(soundId)
}
