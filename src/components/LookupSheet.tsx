import { useEffect, useState } from 'react'
import type { Lookup } from '../lib/db'
import type { Models } from '../lib/gemini'
import { lookupWord } from '../lib/lookup'
import { Icon } from '../ui/icons'
import LookupCard from './LookupCard'

interface Props {
  query: string
  context: string
  apiKey: string
  models: Models
  level: string
  ttsRate: number
  voiceIndex: number | null
  onClose: () => void
}

/** Hoja inferior que se abre al tocar una palabra: consulta en contexto sin salir de la clase. */
export default function LookupSheet({ query, context, apiKey, models, level, ttsRate, voiceIndex, onClose }: Props) {
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    lookupWord(apiKey, models, query, context, level)
      .then((l) => alive && setLookup(l))
      .catch((e) => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
    // Una consulta por apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        {!lookup && !error && (
          <div className="glass txt-sub animate-pulse rounded-[24px] p-5 text-center">
            Buscando qué significa <b>"{query}"</b> aquí…
          </div>
        )}
        {error && <div className="glass rounded-[24px] p-4 text-sm" style={{ color: '#f87171' }}>{error}</div>}
        {lookup && <LookupCard lookup={lookup} ttsRate={ttsRate} voiceIndex={voiceIndex} />}
      </div>
    </div>
  )
}
