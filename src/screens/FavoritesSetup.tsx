import { useEffect, useState } from 'react'
import FavoritesPicker from '../components/FavoritesPicker'
import { db } from '../lib/db'
import { getProfile } from '../lib/profile'
import { FAV_COUNT, TOPIC_CATEGORIES } from '../lib/topics'

/**
 * Para quien ya tenía la app (5.3 o anterior) con más o menos de 3 temas favoritos: se le piden sus 3 temas antes
 * de seguir, para que el Inicio sea igual en todas las versiones (3 temas, sin scroll).
 */
export default function FavoritesSetup({ onDone }: { onDone: () => void }) {
  const [ids, setIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Se parte de los que ya tenía (como mucho 3), para que solo tenga que completar o recortar.
    getProfile().then((p) => setIds((p.interests ?? []).filter((id) => TOPIC_CATEGORIES.some((c) => c.id === id)).slice(0, FAV_COUNT)))
  }, [])

  const save = async () => {
    if (ids.length !== FAV_COUNT) return
    setSaving(true)
    await db.profile.update('me', { interests: ids })
    onDone()
  }

  return (
    <div className="anim-up relative z-[2] flex h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="text-center text-[28px] font-semibold tracking-[-.6px]">Elige tus 3 temas</div>
      <div className="txt-sub mt-1.5 text-center text-[15px] leading-snug">
        Serán los que veas en tu Inicio para hablar con un toque. Los demás siguen en «Más temas».
      </div>
      <div className="mt-6 min-h-0 flex-1">
        <FavoritesPicker value={ids} onChange={setIds} />
      </div>
      <button
        onClick={save}
        disabled={ids.length !== FAV_COUNT || saving}
        className="btn-acc h-[58px] rounded-full text-[17px] transition-opacity"
        style={{ opacity: ids.length === FAV_COUNT ? 1 : 0.45 }}
      >
        Guardar mis temas
      </button>
    </div>
  )
}
