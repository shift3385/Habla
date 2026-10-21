import { useEffect, useRef, useState } from 'react'
import AlphabetScreen from '../screens/AlphabetScreen'
import SoundLessonScreen from '../screens/SoundLessonScreen'
import SoundScreen from '../screens/SoundScreen'
import { lessonKey, loadSoundProgress, routeProgress, type SoundProgress } from '../lib/sounds'
import { useSoundData } from './useSoundData'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'

/** 5.11 (S-07…S-10): pantallas de Sonidos apiladas (Atrás vuelve a la anterior). Las usan el Inicio y la hoja de la clase. */
export type SoundRoute = { kind: 'sound'; id: string } | { kind: 'lesson'; id: string } | { kind: 'route' } | { kind: 'alphabet' }

// Altura a la que estabas en cada pantalla al apilar otra encima (como GrammarRoutes, REG-A4-09).
const scrollOf = new WeakMap<SoundRoute, number>()

export default function SoundRoutes({
  route,
  settings,
  update,
  push,
  pop,
  inClass,
}: {
  route: SoundRoute
  settings: Settings
  update: (p: Partial<Settings>) => void
  push: (r: SoundRoute) => void
  pop: () => void
  /** Encima de una clase (hoja): sin micro propio ni lecciones (el micro es el de la clase). */
  inClass?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const scroller = () => box.current?.closest('.tab-content') ?? null
  const go = (r: SoundRoute) => {
    const el = scroller()
    if (el) scrollOf.set(route, el.scrollTop)
    push(r)
  }
  useEffect(() => {
    const y = scrollOf.get(route)
    const t = setTimeout(() => scroller()?.scrollTo({ top: y ?? 0 }), 0)
    return () => clearTimeout(t)
  }, [route])

  const openSound = (id: string) => go({ kind: 'sound', id })
  const openLesson = inClass ? undefined : (id: string) => go({ kind: 'lesson', id })
  let screen
  if (route.kind === 'sound')
    screen = <SoundScreen key={route.id} id={route.id} settings={settings} onBack={pop} onOpenSound={openSound} onOpenLesson={openLesson} inClass={inClass} />
  else if (route.kind === 'lesson') screen = <SoundLessonScreen key={route.id} id={route.id} settings={settings} update={update} onBack={pop} onOpenSound={openSound} />
  else if (route.kind === 'alphabet') screen = <AlphabetScreen settings={settings} onBack={pop} onOpenLesson={openLesson} />
  else screen = <RouteScreen onBack={pop} onOpenLesson={openLesson} />
  return (
    <div ref={box} className="contents">
      {screen}
    </div>
  )
}

/** «Ruta»: las lecciones en orden, con las hechas marcadas. */
function RouteScreen({ onBack, onOpenLesson }: { onBack: () => void; onOpenLesson?: (id: string) => void }) {
  const data = useSoundData()
  const [progress, setProgress] = useState<Record<string, SoundProgress>>({})
  useEffect(() => {
    loadSoundProgress()
      .then(setProgress)
      .catch(() => {})
  }, [])
  const route = data?.lessons ?? []
  const { next, done: doneCount } = routeProgress(route, progress)
  const isDone = (id: string) => !!progress[lessonKey(id)]?.completedAt
  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="fs-22 leading-tight font-semibold tracking-[-.4px]">La ruta de los sonidos</div>
          <div className="txt-sub fs-13 leading-tight">
            {doneCount} de {route.length} lecciones · sugiere, no obliga
          </div>
        </div>
      </div>
      {route.map((l, i) => {
        const done = isDone(l.id)
        return (
          <button
            key={l.id}
            onClick={() => onOpenLesson?.(l.id)}
            disabled={!onOpenLesson}
            className="glass flex min-h-[56px] items-center gap-3 rounded-[20px] py-2 pr-2.5 pl-2.5 text-left"
            style={l === next ? { borderColor: 'var(--acc)' } : undefined}
          >
            <span
              className={`grid h-9 w-9 flex-none place-items-center rounded-full fs-14 font-semibold ${l === next ? 'btn-acc' : 'field'}`}
              style={done ? { color: 'var(--ok)' } : undefined}
            >
              {done ? <Icon name="check" size={16} stroke={2.4} /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block fs-15 leading-tight font-semibold break-words">{l.titleEs}</span>
              <span className="txt-sub mt-0.5 block fs-12 leading-tight">
                {l.level ? `${l.level} · ` : ''}
                {l.minutes} min{done ? ' · hecha' : l === next ? ' · la siguiente' : ''}
              </span>
            </span>
            <Icon name="chevR" size={16} color="var(--sub)" />
          </button>
        )
      })}
    </div>
  )
}
