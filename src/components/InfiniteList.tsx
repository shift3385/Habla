import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const STEP = 20
/** En pantallas muy bajas (horizontal) el panel no baja de aquí; la página hace el resto. */
const MIN_HEIGHT = 160

/**
 * Panel con scroll propio que ocupa lo que queda visible de la pantalla (hasta la barra de pestañas)
 * y va mostrando los elementos de 20 en 20 según te acercas al final (scroll infinito).
 */
export default function InfiniteList<T>({ items, render, gap = 8 }: { items: T[]; render: (item: T, i: number) => ReactNode; gap?: number }) {
  const panel = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(STEP)
  const [height, setHeight] = useState<number | null>(null)

  // Alto = desde el panel hasta el borde útil del contenedor de la pestaña (sin su relleno inferior de la barra).
  useLayoutEffect(() => {
    const el = panel.current
    if (!el) return
    const box = el.closest('.tab-content') as HTMLElement | null
    const measure = () => {
      const bottom = box ? box.getBoundingClientRect().bottom - parseFloat(getComputedStyle(box).paddingBottom || '0') : window.innerHeight
      // Se mide con la página arriba del todo, para que el panel no cambie al desplazarla.
      const top = el.getBoundingClientRect().top + (box?.scrollTop ?? 0)
      const h = Math.max(MIN_HEIGHT, Math.floor(bottom - top - 4))
      setHeight((prev) => (prev !== null && Math.abs(prev - h) < 2 ? prev : h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (box) ro.observe(box)
    if (el.parentElement) ro.observe(el.parentElement)
    window.addEventListener('resize', measure)
    // La animación de entrada desplaza el panel unos píxeles: se vuelve a medir cuando termina.
    box?.addEventListener('animationend', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      box?.removeEventListener('animationend', measure)
    }
  }, [])

  // Al acercarse al final del panel, 20 más.
  useEffect(() => {
    const s = sentinel.current
    if (!s || shown >= items.length) return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + STEP), {
      root: panel.current,
      rootMargin: '0px 0px 240px 0px',
    })
    io.observe(s)
    return () => io.disconnect()
  }, [shown, items.length])

  return (
    <div
      ref={panel}
      className="no-scrollbar overflow-y-auto overscroll-contain rounded-[24px] p-1.5"
      style={{
        border: '1px solid var(--gb)',
        height: height ?? undefined,
        maxHeight: height === null ? '60vh' : undefined,
      }}
    >
      <div className="flex flex-col" style={{ gap }}>
        {items.slice(0, shown).map((it, i) => render(it, i))}
      </div>
      {shown < items.length && (
        <div ref={sentinel} className="txt-sub py-3 text-center text-xs">
          Cargando más…
        </div>
      )}
    </div>
  )
}
