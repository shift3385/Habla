import { pronunciationLine, weakWords, type PronResult } from '../lib/pronunciation'
import { Icon } from '../ui/icons'

/** La pronunciación de tu respuesta (Azure): nota, cuatro medidas, una frase del coach y las palabras a cuidar. */
export default function PronunciationView({ r, onSay }: { r: PronResult; onSay: (word: string) => void }) {
  const weak = weakWords(r)
  const tone = (x: number) => (x >= 80 ? 'var(--acc)' : x >= 60 ? 'var(--acc2)' : '#f59e0b')
  const items: [string, number | undefined][] = [
    ['Precisión', r.accuracy],
    ['Fluidez', r.fluency],
    ['Completa', r.completeness],
    ['Entonación', r.prosody],
  ]
  return (
    <div className="field rounded-[14px] px-3 py-2 text-[13px]" style={{ border: 0 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name="ear" size={14} /> Pronunciación
        </span>
        <b className="tabular-nums" style={{ color: tone(r.pron) }}>
          {r.pron}/100
        </b>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
        {items.map(([label, v]) => (
          <div key={label} className="min-w-0">
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: v === undefined ? 'var(--sub)' : tone(v) }}>
              {v ?? '—'}
            </div>
            <div className="txt-sub truncate text-[10.5px]">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 leading-snug">{pronunciationLine(r)}</div>
      {weak.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {weak.map((w) => (
            <button
              key={w.word}
              onClick={() => onSay(w.word)}
              className="glass flex min-h-7 max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] break-words"
              title="Escúchala bien pronunciada"
            >
              <Icon name="speaker" size={12} />
              <b>{w.word}</b>
              {w.phoneme && <span className="txt-sub">/{w.phoneme}/</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
