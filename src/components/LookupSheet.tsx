import { useEffect, type MutableRefObject } from 'react'
import type { Models } from '../lib/gemini'
import { Icon } from '../ui/icons'
import LookupStack from './LookupStack'
import { useLookupStack } from './useLookupStack'

interface Props {
  query: string
  context: string
  apiKey: string
  models: Models
  level: string
  ttsRate: number
  voiceIndex: number | null
  onClose: () => void
  /**
   * v5.10 (punto 3): Atrás de Android. La pantalla que abre la hoja llama a `backRef.current()`: si había un sinónimo
   * o un antónimo abierto vuelve un paso y devuelve true; con la pila en la palabra original devuelve false y la
   * pantalla cierra la hoja.
   */
  backRef?: MutableRefObject<(() => boolean) | null>
}

/** Hoja inferior que se abre al tocar una palabra: consulta en contexto sin salir de la clase. */
export default function LookupSheet({ query, context, apiKey, models, level, ttsRate, voiceIndex, onClose, backRef }: Props) {
  // Una consulta por apertura; los sinónimos/antónimos se apilan dentro de la misma hoja.
  const s = useLookupStack({ query, context }, { apiKey, models, level })
  const { canPop, pop } = s

  useEffect(() => {
    if (!backRef) return
    backRef.current = () => (canPop ? (pop(), true) : false)
    return () => {
      backRef.current = null
    }
  }, [backRef, canPop, pop])

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-up no-scrollbar relative mx-auto max-h-[82%] w-full max-w-xl overflow-y-auto rounded-t-[30px] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--gb)' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ background: 'var(--gb)' }} />
        <div className="mb-3 flex items-center justify-between">
          <div className="txt-sub text-sm">Consulta en contexto</div>
          <button onClick={onClose} className="glass grid h-9 w-9 place-items-center rounded-full" aria-label="Cerrar">
            <Icon name="back" size={16} className="rotate-[-90deg]" />
          </button>
        </div>
        <LookupStack s={s} ttsRate={ttsRate} voiceIndex={voiceIndex} />
      </div>
    </div>
  )
}
