// v5.10 (D3): «📘 Ver en Gramática» desde cualquier pantalla (corrección de la clase, informe). App escucha y abre la
// hoja de Gramática encima de lo que haya, sin cerrar la clase.

type Listener = (topicId: string) => void
const listeners = new Set<Listener>()

export function onOpenGrammarTopic(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function openGrammarTopic(topicId: string) {
  for (const fn of listeners) fn(topicId)
}
