import type { ReactNode } from 'react'

/**
 * Fórmula como en una hoja (NC-09): el numerador arriba, la raya de fracción y el denominador abajo; a los lados,
 * lo que va antes y después del "=", centrados verticalmente en la raya. La raya mide lo que el elemento más ancho
 * (el numerador). Si no cabe en una línea, el resultado baja debajo sin romper la fracción.
 */
export default function Fraction({ left, num, den, right }: { left?: ReactNode; num: ReactNode; den: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[clamp(15px,4.4vw,19px)] font-semibold tabular-nums">
      {left && <span className="whitespace-nowrap">{left}</span>}
      <span className="inline-flex flex-col items-center" role="math" aria-label="fracción">
        <span className="px-1 whitespace-nowrap">{num}</span>
        <span className="my-1 h-[2px] self-stretch rounded" style={{ background: 'currentColor' }} />
        <span className="px-1 whitespace-nowrap">{den}</span>
      </span>
      {right && <span className="whitespace-nowrap">{right}</span>}
    </div>
  )
}
