import type { Correction } from '../lib/db'
import { toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import SpeakIcon from './SpeakIcon'

/** Corrección como en el diseño: frase original tachada → frase correcta, con la explicación debajo. */
export default function CorrectionView({ c, compact = false }: { c: Correction; compact?: boolean }) {
  return (
    <div className="field rounded-[14px] px-3 py-2 text-[13px]" style={{ border: 0 }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="txt-sub line-through">{c.original}</span>
        <Icon name="arrowR" size={14} stroke={2} color="var(--acc)" />
        {/* v5.9: el botón va pegado a la frase (inline-flex) para que el flex-wrap no lo deje solo en otra línea. */}
        <span className="inline-flex max-w-full items-center gap-1">
          <b className="min-w-0 font-semibold break-words">{c.corrected}</b>
          <button
            type="button"
            onClick={(e) => {
              // No dispara los clics del contenedor (p. ej. el mensaje que muestra/oculta la traducción).
              e.stopPropagation()
              toggleSpeak(c.corrected)
            }}
            className="txt-acc2 -my-1.5 grid h-8 w-8 flex-none place-items-center rounded-full"
            aria-label="Escuchar la frase corregida"
            title="Escúchala con la voz del profe"
          >
            <SpeakIcon speakKey={c.corrected} size={15} stroke={1.8} />
          </button>
        </span>
      </div>
      {!compact && c.explanationEs && <div className="txt-sub mt-1 text-xs leading-snug">{c.explanationEs}</div>}
    </div>
  )
}
