import type { Correction } from '../lib/db'
import { Icon } from '../ui/icons'

/** Corrección como en el diseño: frase original tachada → frase correcta, con la explicación debajo. */
export default function CorrectionView({ c, compact = false }: { c: Correction; compact?: boolean }) {
  return (
    <div className="field rounded-[14px] px-3 py-2 text-[13px]" style={{ border: 0 }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="txt-sub line-through">{c.original}</span>
        <Icon name="arrowR" size={14} stroke={2} color="var(--acc)" />
        <b className="font-semibold">{c.corrected}</b>
      </div>
      {!compact && c.explanationEs && <div className="txt-sub mt-1 text-xs leading-snug">{c.explanationEs}</div>}
    </div>
  )
}
