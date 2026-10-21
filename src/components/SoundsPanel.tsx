import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { loadSoundProgress, loadSounds, routeProgress, type SoundCatalog, type SoundProgress } from '../lib/sounds'
import { Icon } from '../ui/icons'
import { panelHeight } from '../lib/soundGame'
import PhonemeChart from './PhonemeChart'

/**
 * 5.11 (S-07): pestaña «Sonidos» del Inicio. Arriba, «Sigue la ruta» (la siguiente lección sin hacer), la ruta y el
 * abecedario; debajo, la tabla fonémica dentro de un panel con scroll propio (el Inicio nunca desplaza). Tocar un
 * sonido abre su ficha. Los datos se cargan aquí, en perezoso: no pesan en el arranque.
 */
export default function SoundsPanel({
  onOpenSound,
  onOpenLesson,
  onOpenRoute,
  onOpenAlphabet,
}: {
  onOpenSound: (id: string) => void
  onOpenLesson: (id: string) => void
  onOpenRoute: () => void
  onOpenAlphabet: () => void
}) {
  const [data, setData] = useState<SoundCatalog | null>(null)
  const [progress, setProgress] = useState<Record<string, SoundProgress>>({})
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    loadSounds()
      .then(setData)
      .catch(() => setFailed(true))
    loadSoundProgress()
      .then(setProgress)
      .catch(() => {})
  }, [])

  if (failed) {
    return <div className="glass txt-sub mt-3 rounded-[22px] p-5 text-center text-sm leading-snug">No pude cargar los sonidos. Cierra y vuelve a abrir la app.</div>
  }
  if (!data) return <div className="txt-sub mt-3 p-5 text-center text-sm">Cargando sonidos…</div>

  const route = data.lessons
  const { done: doneCount, next } = routeProgress(route, progress)
  const nextN = next ? route.indexOf(next) + 1 : 0

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="snd-top flex flex-col gap-2">
        <button
          onClick={() => (next ? onOpenLesson(next.id) : onOpenRoute())}
          className="glass flex h-[44px] w-full items-center gap-2.5 rounded-[22px] pr-2 pl-2 text-left"
        >
          <span className="btn-acc grid h-8 w-8 flex-none place-items-center rounded-full">
            <Icon name={next ? 'arrowR' : 'check'} size={15} />
          </span>
          <span className="min-w-0 flex-1 truncate fs-14">
            {next ? (
              <>
                <b className="font-semibold">Sigue la ruta:</b> {nextN}. {next.titleEs}
              </>
            ) : (
              <b className="font-semibold">¡Terminaste la ruta!</b>
            )}
          </span>
          <Icon name="chevR" size={16} color="var(--sub)" />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onOpenRoute} className="glass flex h-[44px] items-center gap-2 rounded-[22px] px-3 text-left">
            <Icon name="flag" size={16} color="var(--acc2)" />
            <span className="min-w-0 flex-1 truncate fs-13.5 font-semibold">Ruta</span>
            <span className="txt-sub fs-12 tabular-nums">
              {doneCount}/{route.length}
            </span>
          </button>
          <button onClick={onOpenAlphabet} className="glass flex h-[44px] items-center gap-2 rounded-[22px] px-3 text-left">
            <span className="fs-14 font-bold" style={{ color: 'var(--acc2)' }} aria-hidden>
              Aa
            </span>
            <span className="min-w-0 flex-1 truncate fs-13.5 font-semibold">Abecedario</span>
          </button>
        </div>
      </div>
      <FillPanel>
        <PhonemeChart phonemes={data.phonemes} progress={progress} onOpen={onOpenSound} />
      </FillPanel>
    </div>
  )
}

/**
 * 5.11 (REV-11-D4-04): panel con scroll propio que ocupa lo que queda hasta la barra de pestañas, como InfiniteList, pero
 * que además se vuelve a medir cuando cambia de alto lo que hay ENCIMA en el Inicio (la tarjeta del plan pasa de
 * «Creando tu plan…» a la lección o al error, aparece la clase guardada o el Repaso…). Con InfiniteList el panel se
 * quedaba con el alto viejo y el Inicio desplazaba 44 px. Se observa el bloque entero del Inicio: si crece, es que algo
 * de arriba creció (el panel tiene alto fijo).
 */
function FillPanel({ children }: { children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = panel.current
    if (!el) return
    const box = el.closest('.tab-content') as HTMLElement | null
    const page = box?.firstElementChild as HTMLElement | null
    const measure = () => {
      const bottom = box ? box.getBoundingClientRect().bottom - parseFloat(getComputedStyle(box).paddingBottom || '0') : window.innerHeight
      // Se mide con la página arriba del todo, para que el panel no cambie al desplazarla.
      const top = el.getBoundingClientRect().top + (box?.scrollTop ?? 0)
      const h = panelHeight(bottom, top)
      setHeight((prev) => (prev !== null && Math.abs(prev - h) < 2 ? prev : h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (box) ro.observe(box)
    if (page && page !== el) ro.observe(page)
    window.addEventListener('resize', measure)
    // La animación de entrada desplaza el panel unos píxeles: se vuelve a medir cuando termina.
    box?.addEventListener('animationend', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      box?.removeEventListener('animationend', measure)
    }
  }, [])
  return (
    <div
      ref={panel}
      className="no-scrollbar overflow-y-auto overscroll-contain rounded-[24px] p-1.5"
      style={{ border: '1px solid var(--gb)', height: height ?? undefined, maxHeight: height === null ? '60vh' : undefined }}
    >
      {children}
    </div>
  )
}
