import type { ReactNode } from 'react'
import type { Skill } from '../lib/db'
import { levelIdx } from '../lib/levels'

const SKILLS: { key: Skill; label: string }[] = [
  { key: 'grammar', label: 'Gramática' },
  { key: 'reading', label: 'Lectura' },
  { key: 'listening', label: 'Audición' },
  { key: 'speaking', label: 'Habla' },
]

interface Props {
  levels: Record<Skill, string>
  title?: string
  /** Algo pequeño junto al nivel de cada fila (p. ej. la confianza del test o "B1↗"). */
  extra?: Partial<Record<Skill, ReactNode>>
  /** Sin tarjeta propia, para meterla dentro de otra (p. ej. en la burbuja de la mascota). */
  bare?: boolean
}

/**
 * "Por habilidad" (NC-10): una fila por destreza con el nombre, una barra del mismo ancho en todas las filas y
 * el nivel. El relleno representa el nivel A1–C2 (A1 = 1/6 … C2 = 6/6). La misma pieza en Mi nivel, en los
 * mensajes de la mascota y en el resultado del test.
 */
export default function SkillProgressCard({ levels, title = 'Por habilidad', extra, bare }: Props) {
  const body = (
    <>
      {title && <div className="txt-sub text-sm">{title}</div>}
      <div className={`${title ? 'mt-2.5' : ''} flex flex-col gap-2.5`}>
        {SKILLS.map(({ key, label }) => {
          const l = levels[key]
          return (
            <div key={key} className="skill-row grid items-center gap-2.5" style={{ gridTemplateColumns: 'minmax(64px, 84px) minmax(40px, 1fr) auto' }}>
              <span className="truncate text-sm">{label}</span>
              <div className="h-2 overflow-hidden rounded" style={{ background: 'var(--gb)' }}>
                <div className="h-full rounded" style={{ width: `${((levelIdx(l) + 1) / 6) * 100}%`, background: 'var(--acc)' }} />
              </div>
              <span className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                {extra?.[key]}
                <span className="txt-acc2 min-w-[1.75rem] text-right font-semibold">{l}</span>
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
  if (bare) return body
  return <div className="glass rounded-[24px] p-4">{body}</div>
}
