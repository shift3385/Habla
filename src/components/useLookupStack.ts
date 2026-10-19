import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lookup } from '../lib/db'
import { friendlyError } from '../lib/errors'
import type { Models } from '../lib/gemini'
import { lookupWord } from '../lib/lookup'
import { canPop, patchEntry, popEntry, pushRelated, rootEntry, type LookupRelation, type StackEntry } from '../lib/lookupStack'

interface Opts {
  apiKey: string
  models: Models
  level: string
}

/**
 * v5.10 (punto 3): pila de consultas de una hoja/vista (ver lookupStack.ts). Lanza la consulta del elemento de arriba
 * cuando aún no tiene resultado; la respuesta se guarda en el historial como cualquier otra (lo hace lookupWord).
 */
export function useLookupStack(root: Lookup | { query: string; context: string }, { apiKey, models, level }: Opts) {
  const [stack, setStack] = useState<StackEntry[]>(() => [rootEntry(root)])
  // Consultas en marcha por clave: en desarrollo (StrictMode) el efecto corre dos veces y no hay que pagar dos.
  const inFlight = useRef(new Set<number>())
  const top = stack[stack.length - 1]

  useEffect(() => {
    if (top.lookup || top.error || inFlight.current.has(top.key)) return
    const { key, query, context, relation } = top
    inFlight.current.add(key)
    const patch = (p: Partial<StackEntry>) => setStack((s) => patchEntry(s, key, p))
    lookupWord(apiKey, models, query, context, level, ({ attempt, total }) => patch({ hint: `Gemini está saturado, reintentando (${attempt}/${total})…` }), relation)
      .then((lookup) => patch({ lookup, hint: null }))
      .catch((e) => patch({ error: friendlyError(e), hint: null }))
      .finally(() => inFlight.current.delete(key))
    // Solo cuando cambia el de arriba (o se pide reintentar, que borra su error).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.key, top.error])

  const push = useCallback((word: string, kind: LookupRelation['kind']) => setStack((s) => pushRelated(s, word, kind)), [])
  const pop = useCallback(() => setStack(popEntry), [])
  const retry = useCallback(() => setStack((s) => patchEntry(s, s[s.length - 1].key, { error: null })), [])
  // «Guardar» en una consulta de la pila: al volver a ella (o al reabrirla) debe seguir marcada.
  const markSaved = useCallback((key: number, saved: boolean) => {
    setStack((s) => s.map((e) => (e.key === key && e.lookup ? { ...e, lookup: { ...e.lookup, saved } } : e)))
  }, [])

  return { stack, top, canPop: canPop(stack), push, pop, retry, markSaved }
}

export type LookupStackState = ReturnType<typeof useLookupStack>
