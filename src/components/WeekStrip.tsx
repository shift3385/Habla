import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 5.13 (Fase 10, UX-11 de A5): la línea de la semana del Inicio, en el hueco de abajo: 7 puntos (lunes a domingo, con el
 * color del tema los días que hablaste; hoy, con aro) y el próximo logro («3 días para tu racha de 7»).
 * El Inicio no desplaza nunca (CLAUDE.md, Diseño): si la línea no cabe (pantalla pequeña, horizontal, letra grande o
 * mucho contenido arriba), no se pinta. Se vuelve a medir al girar o redimensionar y cuando cambia el contenido.
 */
export default function WeekStrip({ week, todayIdx, next }: { week: number[]; todayIdx: number; next: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(true)
  const [tick, setTick] = useState(0)

  // ¿Hace desplazar la pestaña? Entonces fuera.
  useLayoutEffect(() => {
    if (!fits) return
    const box = ref.current?.closest('.tab-content')
    if (box && box.scrollHeight > box.clientHeight + 1) setFits(false)
  }, [fits, tick, week, next])

  // Al girar o redimensionar se vuelve a intentar; si cambia el alto de lo de arriba, se vuelve a medir.
  useEffect(() => {
    const retry = () => {
      setFits(true)
      setTick((t) => t + 1)
    }
    window.addEventListener('resize', retry)
    const box = document.querySelector('.tab-content')
    const ro = typeof ResizeObserver === 'function' && box ? new ResizeObserver(() => setTick((t) => t + 1)) : null
    if (ro && box) for (const c of Array.from(box.children)) ro.observe(c)
    return () => {
      window.removeEventListener('resize', retry)
      ro?.disconnect()
    }
  }, [])

  if (!fits) return null
  const days = week.filter((m) => m > 0).length
  return (
    <div
      ref={ref}
      className="glass mt-3 flex items-center gap-3 rounded-[22px] px-3.5 py-2.5"
      role="img"
      aria-label={`Esta semana has hablado ${days} ${days === 1 ? 'día' : 'días'}${next ? `. ${next}` : ''}`}
      data-week-strip
    >
      <div className="flex flex-none items-end gap-[7px]">
        {week.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className="block h-3 w-3 rounded-full"
              style={{
                background: m > 0 ? 'var(--acc)' : 'var(--gb)',
                boxShadow: i === todayIdx ? '0 0 0 2px var(--bg), 0 0 0 3.5px var(--acc)' : undefined,
              }}
            />
            <span className="txt-sub fs-10 leading-none">{'LMXJVSD'[i]}</span>
          </div>
        ))}
      </div>
      <span className="min-w-0 flex-1 fs-12.5 leading-snug">
        <b>{days === 0 ? 'Esta semana aún no has hablado' : `${days} ${days === 1 ? 'día' : 'días'} hablando esta semana`}</b>
        {next && <span className="txt-sub line-clamp-2 block">{next}</span>}
      </span>
    </div>
  )
}
