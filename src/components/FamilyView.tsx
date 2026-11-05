import { useEffect, useState, type ReactNode } from 'react'
import { db, type FamilyMember } from '../lib/db'
import type { Settings } from '../lib/settings'
import { weekMessage, weekToCode, type WeekCode } from '../lib/shareCode'
import { shareMessage } from '../lib/shareText'
import { weekKey } from '../lib/stats'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'
import InfiniteList from './InfiniteList'

/** Tu semana, para tu fila y para el código que mandas. */
export interface MyWeek {
  name: string
  minutes: number
  streak: number
  days: number
  challenge?: WeekCode['challenge'] | null
}

const ago = (ts: number, now: number) => {
  const d = Math.floor((now - ts) / 864e5)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

/** «25 min · racha de 6 · reto 4 de 8» */
function summary(w: { minutes: number; streak: number; challenge?: WeekCode['challenge'] | null }) {
  const reto = w.challenge ? (w.challenge.done ? ' · reto cumplido 🏅' : ` · reto ${w.challenge.progress} de ${w.challenge.target}`) : ''
  return `${w.minutes} min · racha de ${w.streak}${reto}`
}

/**
 * 5.13 (Fase 7): «Mi familia» (Progreso). Tu fila y la de cada persona que te mandó su semana con un código (lo último
 * que te mandó; una semana anterior sale en gris). «Mandar mi semana» comparte tu código; cada fila se puede borrar.
 * Todo en este teléfono, sin servidor: solo ves lo que te mandan.
 */
export default function FamilyView({
  settings,
  me,
  onBack,
  onPaste,
  extra,
}: {
  settings: Settings
  me: MyWeek
  onBack: () => void
  onPaste: () => void
  /** Fase 8: lo de las prácticas compartidas, por persona y debajo de la lista. */
  extra?: { row?: (m: FamilyMember) => ReactNode; footer?: ReactNode; reloadKey?: number }
}) {
  const element = THEME_INFO[settings.theme]?.mascot ?? 'aqua'
  const [members, setMembers] = useState<FamilyMember[] | null>(null)
  const [asking, setAsking] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const [thisWeek] = useState(() => weekKey(new Date()))
  const reload = () =>
    db.family
      .toArray()
      .then(setMembers)
      .catch(() => setMembers([]))
  useEffect(() => {
    reload()
  }, [extra?.reloadKey])

  const current = (m: FamilyMember) => m.week?.id === thisWeek
  const sorted = [...(members ?? [])].sort((a, b) => Number(current(b)) - Number(current(a)) || (b.week?.minutes ?? 0) - (a.week?.minutes ?? 0) || b.at - a.at)

  const send = async () => {
    setNote(null)
    if (!me.name.trim()) return setNote('Pon tu nombre en Ajustes → Mi perfil y datos: así saben de quién es.')
    const code = weekToCode({ from: me.name, week: thisWeek, minutes: me.minutes, streak: me.streak, days: me.days, challenge: me.challenge })
    const r = await shareMessage(weekMessage(code), 'Mandar mi semana')
    if (r === 'copied') setNote('Mensaje copiado: pégalo en WhatsApp.')
    else if (r === 'failed') setNote('No he podido abrir Compartir.')
  }

  return (
    <div className="anim-in flex flex-col gap-3" data-family-view>
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-[-.4px]">Mi familia</div>
          <div className="txt-sub text-xs">Lo último que os habéis mandado</div>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <Mascot element={element} mood="speaking" size={44} interactive={false} />
        <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug">
          Aquí ves cómo va cada persona que te manda su semana. Para salir en su tablero, mándale la tuya. No hay servidor: solo
          ves lo que te mandan.
        </div>
      </div>

      <div className="glass flex items-center gap-3 rounded-[20px] px-4 py-3" data-family-me>
        <span className="btn-acc grid h-10 w-10 flex-none place-items-center rounded-full fs-15 font-semibold">{(me.name.trim()[0] ?? 'T').toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block fs-15 font-semibold">Tú{me.name ? ` (${me.name})` : ''}</span>
          <span className="txt-sub block fs-12.5">{summary(me)}</span>
        </span>
      </div>

      <div className="flex gap-2.5">
        <button onClick={send} className="btn-acc flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 fs-14.5" data-send-week>
          <Icon name="upload" size={16} />
          Mandar mi semana
        </button>
        <button onClick={onPaste} className="glass flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 fs-14.5 font-semibold" data-paste-open>
          Pegar un código
        </button>
      </div>
      {note && <div className="txt-sub text-center fs-13">{note}</div>}

      {members && members.length === 0 && (
        <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Aún no te ha mandado nadie su semana. Mándales la tuya y pídeles la suya.</div>
      )}
      {sorted.length > 0 && (
        <InfiniteList
          items={sorted}
          render={(m) => (
            <div key={m.id} className="glass flex flex-col gap-1.5 rounded-[20px] px-4 py-3" data-family-row={m.name} style={current(m) ? undefined : { opacity: 0.75 }}>
              <div className="flex items-center gap-3">
                <span className="field grid h-10 w-10 flex-none place-items-center rounded-full fs-15 font-semibold">{m.name[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block fs-15 font-semibold break-words">{m.name}</span>
                  <span className="txt-sub block fs-12.5">
                    {m.week ? (current(m) ? summary(m.week) : `Semana anterior · ${summary(m.week)}`) : 'Aún no te ha mandado su semana'}
                  </span>
                  <span className="txt-sub block fs-11.5">Lo mandó {ago(m.at, now)}</span>
                </span>
                {asking === m.id ? (
                  <span className="flex flex-none gap-1.5">
                    <button
                      onClick={async () => {
                        await db.family.delete(m.id)
                        setAsking(null)
                        reload()
                      }}
                      className="h-9 rounded-full px-3 fs-13 font-semibold"
                      style={{ background: 'color-mix(in srgb, #e5484d 22%, transparent)' }}
                    >
                      Borrar
                    </button>
                    <button onClick={() => setAsking(null)} className="field h-9 rounded-full px-3 fs-13">
                      No
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setAsking(m.id)} className="txt-sub grid h-9 w-9 flex-none place-items-center rounded-full" aria-label={`Quitar a ${m.name}`}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              {extra?.row?.(m)}
            </div>
          )}
        />
      )}
      {extra?.footer}
    </div>
  )
}
