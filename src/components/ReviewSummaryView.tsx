import type { ReviewOutcome, ReviewSummary } from '../lib/reviewSummary'
import { toggleSpeak } from '../lib/tts'
import type { MascotElement } from '../ui/Mascot'
import MascotPage from './MascotPage'
import { Card, Stat } from './ReportView'
import ScoreRing from './ScoreRing'
import SpeakIcon from './SpeakIcon'

/** Mismos nombres y colores que el veredicto de cada tarjeta del Repaso. */
const OUTCOME: Record<ReviewOutcome, { label: string; color: string }> = {
  correct: { label: 'Correcto', color: '#5fe3a1' },
  almost: { label: 'Casi', color: 'var(--acc)' },
  wrong: { label: 'Aún no', color: 'var(--bad)' },
  unknown: { label: 'No lo sé', color: 'var(--acc2)' },
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

/**
 * v5.10 (punto 4 del dueño): evaluación al terminar el Repaso, con el mismo lenguaje visual que el informe de la clase
 * (ScoreRing, Stat, Card de ReportView). La mascota del tema da el feedback, calculado en el teléfono (reviewSummary.ts).
 */
export default function ReviewSummaryView({
  s,
  element,
  partial,
  ttsRate,
  voiceIndex,
  onBack,
}: {
  s: ReviewSummary
  element: MascotElement
  /** Saliste a mitad del repaso. */
  partial: boolean
  ttsRate: number
  voiceIndex: number | null
  onBack: () => void
}) {
  return (
    <MascotPage
      element={element}
      mood={s.mood}
      title={s.title}
      subtitle={`${partial ? 'Terminado antes · ' : ''}${s.total} ${s.total === 1 ? 'frase repasada' : 'frases repasadas'}`}
      primary={{ label: 'Volver', onClick: onBack }}
    >
      <div className="flex flex-col gap-3">
        <div className="tip-bubble rounded-[20px] px-4 py-3 fs-14.5 leading-snug">{s.feedback.join(' ')}</div>

        <div className="glass flex flex-col items-center gap-2 rounded-[28px] px-4 pt-5 pb-4">
          <ScoreRing value={s.score} label={String(s.score)} sublabel="precisión" size={128} stroke={11} />
          <div className="txt-sub text-center fs-12 leading-snug">Correcto = 1 punto · Casi = ½ · Aún no y No lo sé = 0</div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {(['correct', 'almost', 'wrong', 'unknown'] as const).map((o) => (
            <Stat key={o} value={s[o]} label={OUTCOME[o].label} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={s.total} label={s.total === 1 ? 'frase' : 'frases'} />
          <Stat value={formatSeconds(s.spokenSeconds)} label="hablando" />
          <Stat
            value={s.pronAvg ?? '—'}
            label="pronunciación"
            hint={s.pronAvg === null ? 'sin fonética' : `media de ${s.pronCount}`}
          />
        </div>

        {s.hardest.length > 0 && (
          <Card title="Las que más te costaron" icon="target">
            <div className="flex flex-col gap-2">
              {s.hardest.map((c) => (
                <button
                  key={c.cardId}
                  onClick={() => toggleSpeak(c.answerEn, ttsRate, voiceIndex)}
                  className="field flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left"
                >
                  <span className="btn-acc grid h-9 w-9 flex-none place-items-center rounded-full">
                    <SpeakIcon speakKey={c.answerEn} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block fs-15 leading-snug font-semibold">{c.answerEn}</span>
                    <span className="txt-sub block fs-12.5 leading-snug">{c.promptEs}</span>
                  </span>
                  <span className="flex-none fs-11.5 font-semibold" style={{ color: OUTCOME[c.worst].color }}>
                    {OUTCOME[c.worst].label}
                    {c.misses > 1 ? ` ×${c.misses}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MascotPage>
  )
}
