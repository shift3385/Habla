import { useEffect, useRef } from 'react'
import { backLabel, entryLabel } from '../lib/lookupStack'
import { Icon } from '../ui/icons'
import LookupCard from './LookupCard'
import type { LookupStackState } from './useLookupStack'

/**
 * v5.10 (punto 3): lo que se ve de la pila de consultas. Arriba, «‹ palabra anterior» si se llegó desde un sinónimo
 * o un antónimo; debajo, la consulta de arriba de la pila (cargando, error con reintentar, o la tarjeta).
 * La usan la hoja de la clase (LookupSheet) y Palabras: nunca se abre una hoja encima de otra.
 */
export default function LookupStack({ s, ttsRate, voiceIndex }: { s: LookupStackState; ttsRate: number; voiceIndex: number | null }) {
  const { top } = s
  const back = backLabel(s.stack)
  const kind = top.relation?.kind === 'antonym' ? 'Antónimo' : 'Sinónimo'
  // Al apilar o volver, la vista sube al principio: los chips están abajo y la consulta nueva (y «‹ atrás») arriba.
  const box = useRef<HTMLDivElement>(null)
  const shownKey = useRef(top.key)
  useEffect(() => {
    if (top.key === shownKey.current) return // al abrir, no
    shownKey.current = top.key
    box.current?.scrollIntoView({ block: 'start' })
  }, [top.key])

  return (
    <div ref={box} className="flex scroll-mt-3 flex-col gap-2.5">
      {back && (
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={s.pop}
            className="field flex h-9 max-w-[70%] min-w-0 flex-none items-center gap-1 rounded-[18px] pr-3 pl-2 text-[13.5px]"
            aria-label={`Volver a ${back}`}
          >
            <Icon name="back" size={16} stroke={1.8} />
            <span className="truncate">{back}</span>
          </button>
          {top.relation && (
            <span className="txt-sub min-w-0 truncate text-[12.5px]">
              {kind} de <b className="font-semibold">{top.relation.of}</b>
            </span>
          )}
        </div>
      )}

      {!top.lookup && !top.error && (
        <div className="glass txt-sub animate-pulse rounded-[24px] p-5 text-center">
          Buscando qué significa <b>"{entryLabel(top)}"</b> aquí…
          {top.hint && <div className="mt-1.5 text-[13px]">{top.hint}</div>}
        </div>
      )}
      {top.error && (
        <div className="glass rounded-[24px] p-4 text-sm">
          <div style={{ color: '#f87171' }}>{top.error}</div>
          <button onClick={s.retry} className="btn-acc mt-3 h-10 rounded-[20px] px-4 text-[14px]">
            Reintentar
          </button>
        </div>
      )}
      {top.lookup && (
        <LookupCard
          key={top.key}
          lookup={top.lookup}
          ttsRate={ttsRate}
          voiceIndex={voiceIndex}
          onRelated={s.push}
          onSavedChange={(saved) => s.markSaved(top.key, saved)}
        />
      )}
    </div>
  )
}
