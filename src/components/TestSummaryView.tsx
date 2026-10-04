import { useState } from 'react'
import type { CalibrationRecord, Skill } from '../lib/db'
import { overallBreakdown } from '../lib/levels'
import { saveSummaryFile, type SummarySection } from '../lib/testSummary'
import { Icon } from '../ui/icons'
import Fraction from './Fraction'

const CRIT_ES: Record<string, string> = { fluency: 'Fluidez y coherencia', vocabulary: 'Vocabulario', grammar: 'Precisión gramatical', pronunciation: 'Pronunciación' }
const SKILLS = ['grammar', 'reading', 'listening', 'speaking'] as const

/** Resumen final de un test: cómo se calculó, cómo fue cada parte, el habla y cada pregunta. Se puede guardar. */
export default function TestSummaryView({ record, onBack }: { record: CalibrationRecord; onBack: () => void }) {
  const [saved, setSaved] = useState<string | null>(null)
  const s = record.summary
  const b = overallBreakdown(record.levels as Record<Skill, string>)
  const date = new Date(record.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="txt-acc2 flex items-center gap-1 self-start text-sm">
        <Icon name="back" size={15} stroke={2} /> Volver a Mi nivel
      </button>
      <div className="glass rounded-[24px] p-4 text-center">
        <div className="txt-sub text-sm">Test del {date}</div>
        <div className="text-[44px] leading-none font-semibold tracking-[-1.5px]" style={{ color: 'var(--acc)' }}>
          {record.levels.overall}
        </div>
        <div className="mt-3 rounded-[16px] px-1 py-2.5" style={{ background: 'var(--field)' }}>
          <Fraction left="Nivel =" num={SKILLS.map((k) => b.values[k]).join(' + ')} den="4" right={`= ${b.mean.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} → ${b.final}`} />
        </div>
      </div>
      {s ? (
        <>
          <div className="glass rounded-[24px] p-4 text-[14px]">
            <div className="mb-1 font-semibold">Cómo te fue</div>
            {s.sections.map((x) => (
              <div key={x.title} className="flex items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate">{x.title}</span>
                <b className="txt-acc2 flex-none tabular-nums">
                  {x.ok}/{x.total}
                </b>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 py-1">
              <span>Habla (mediana de 4 criterios)</span>
              <b className="txt-acc2">{s.speaking.level}</b>
            </div>
          </div>
          {s.speaking.criteria && (
            <div className="glass rounded-[24px] p-4 text-[14px]">
              <div className="mb-1 font-semibold">Tu habla</div>
              {Object.entries(s.speaking.criteria).map(([k, v]) => (
                <div key={k} className="py-1">
                  <div className="flex justify-between">
                    <span>{CRIT_ES[k] ?? k}</span>
                    <b className="txt-acc2">{v}</b>
                  </div>
                  {s.speaking.reasons?.[k] && <div className="txt-sub text-[12.5px] leading-snug">{s.speaking.reasons[k]}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass txt-sub rounded-[24px] p-4 text-[13.5px] leading-snug">
          Este test es de antes de la versión 5.7: solo se guardaron los niveles y lo que se dijo de tu habla. Los próximos tests guardan el resumen completo.
        </div>
      )}
      {(record.strengthsEs?.length ?? 0) > 0 && (
        <div className="glass rounded-[24px] p-4 text-[14px]">
          <div className="mb-1 font-semibold">Lo que haces bien</div>
          <ul className="list-disc space-y-1 pl-5">
            {record.strengthsEs.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {(record.weaknessesEs?.length ?? 0) > 0 && (
        <div className="glass rounded-[24px] p-4 text-[14px]">
          <div className="mb-1 font-semibold">Qué trabajar</div>
          <ul className="list-disc space-y-1 pl-5">
            {record.weaknessesEs.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {s?.sections.map((x) => <Section key={x.title} sec={x} />)}
      <button
        onClick={async () => setSaved((await saveSummaryFile(record)) ?? 'Compartido')}
        className="btn-acc flex h-[52px] items-center justify-center gap-2 rounded-full text-[15px]"
      >
        <Icon name="download" size={18} /> Guardar el resumen
      </button>
      {saved && <div className="txt-sub text-center text-[13px]">Guardado: {saved}</div>}
    </div>
  )
}

/** Las preguntas de una parte, plegadas hasta tocarlas. */
function Section({ sec }: { sec: SummarySection }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass rounded-[24px] px-4 py-3 text-[14px]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="min-w-0 font-semibold">{sec.title}</span>
        <span className="txt-sub flex flex-none items-center gap-1 tabular-nums">
          {sec.ok}/{sec.total} <Icon name="chevD" size={14} stroke={2} />
        </span>
      </button>
      {open && (
        <ol className="mt-2 flex flex-col gap-2">
          {sec.rows.map((r, i) => (
            <li key={i} className="leading-snug">
              <div className="font-medium">
                {i + 1}. {r.prompt}
              </div>
              <div className={r.ok ? 'txt-acc' : 'txt-sub'}>
                {r.ok ? '✓' : '✕'} {r.late ? 'No sé (respondida tras cerrar la nota)' : `Tu respuesta: ${r.given}`}
              </div>
              {!r.ok && (
                <div>
                  Correcta: <b>{r.correct}</b>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
