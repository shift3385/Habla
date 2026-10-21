import { FAV_COUNT, TOPIC_CATEGORIES } from '../lib/topics'
import { Icon } from '../ui/icons'

/**
 * Elegir exactamente 3 temas favoritos (los del Inicio). Con 3 elegidos, los demás se atenúan: para cambiar uno,
 * primero se quita otro.
 */
export default function FavoritesPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const full = value.length >= FAV_COUNT
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else if (!full) onChange([...value, id])
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {TOPIC_CATEGORIES.map((c) => {
          const on = value.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`relative flex h-[74px] flex-col items-center justify-center gap-1 rounded-[20px] px-1.5 transition-opacity ${on ? 'btn-acc' : 'glass'}`}
              style={!on && full ? { opacity: 0.45 } : undefined}
              aria-pressed={on}
            >
              <Icon name={c.icon} size={18} stroke={1.7} />
              <span className="text-center fs-11.5 leading-[1.15] text-balance">{c.title}</span>
              {on && (
                <span className="absolute top-1.5 right-1.5">
                  <Icon name="check" size={12} stroke={2.6} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="txt-sub mt-2.5 text-center fs-13">
        {value.length} de {FAV_COUNT} elegidos{full ? ' · toca uno para cambiarlo' : ''}
      </div>
    </div>
  )
}
