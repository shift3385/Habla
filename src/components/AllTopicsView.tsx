import { useState } from 'react'
import { db } from '../lib/db'
import { FAV_COUNT, TOPIC_CATEGORIES } from '../lib/topics'
import { Icon } from '../ui/icons'
import FavoritesPicker from './FavoritesPicker'

interface Props {
  favs: string[]
  onPick: (categoryId: string) => void
  onFree: () => void
  onFavsChange: (ids: string[]) => void
  onBack: () => void
}

/** "Más temas": todos los temas para hablar hoy de cualquiera, Tema libre y cambiar tus 3 temas del Inicio. */
export default function AllTopicsView({ favs, onPick, onFree, onFavsChange, onBack }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(favs)

  const save = async () => {
    if (draft.length !== FAV_COUNT) return
    await db.profile.update('me', { interests: draft })
    onFavsChange(draft)
    setEditing(false)
  }

  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={editing ? () => setEditing(false) : onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="text-2xl font-semibold tracking-[-.4px]">{editing ? 'Tus 3 temas' : 'Todos los temas'}</div>
      </div>

      {editing ? (
        <>
          <div className="txt-sub text-sm">Elige los 3 que verás en el Inicio.</div>
          <FavoritesPicker value={draft} onChange={setDraft} />
          <button
            onClick={save}
            disabled={draft.length !== FAV_COUNT}
            className="btn-acc h-[54px] rounded-full text-[16px] transition-opacity"
            style={{ opacity: draft.length === FAV_COUNT ? 1 : 0.45 }}
          >
            Guardar mis temas
          </button>
        </>
      ) : (
        <>
          <button onClick={onFree} className="btn-acc flex h-[58px] items-center gap-3 rounded-[29px] px-4 text-left">
            <Icon name="pencil" size={19} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Tema libre</span>
              <span className="block text-[12.5px] opacity-85">Tú decides de qué hablar</span>
            </span>
            <Icon name="chevR" size={16} stroke={2} />
          </button>
          <div className="grid grid-cols-3 gap-2">
            {TOPIC_CATEGORIES.map((c) => {
              const fav = favs.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => onPick(c.id)}
                  className="glass relative flex h-[78px] flex-col items-center justify-between rounded-[20px] px-1.5 pt-2.5 pb-2"
                >
                  <span className="field txt-acc2 grid h-[34px] w-[34px] place-items-center rounded-full">
                    <Icon name={c.icon} size={18} stroke={1.6} />
                  </span>
                  <span className="text-center text-[11.5px] leading-[1.15] text-balance">{c.title}</span>
                  {fav && (
                    <span className="txt-acc absolute top-[7px] left-[8px]" title="Uno de tus 3 temas">
                      <Icon name="star" size={11} stroke={2} />
                    </span>
                  )}
                  {c.live && (
                    <span
                      className="absolute top-[9px] right-[9px] h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--dot)', boxShadow: '0 0 8px var(--dot)' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <div className="txt-sub flex items-center justify-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Icon name="star" size={11} stroke={2} color="var(--acc)" /> tus temas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--dot)' }} /> noticias reales
            </span>
          </div>
          <button
            onClick={() => {
              setDraft(favs)
              setEditing(true)
            }}
            className="txt-sub h-9 text-sm underline underline-offset-[3px]"
          >
            Cambiar mis 3 temas del Inicio
          </button>
        </>
      )}
    </div>
  )
}
