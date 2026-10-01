import type { Correction, SessionMetrics, SessionReport, Topic } from '../lib/db'
import { speak } from '../lib/tts'
import { Icon } from '../ui/icons'
import CorrectionView from './CorrectionView'
import ScoreRing from './ScoreRing'

interface Props {
  metrics: SessionMetrics
  report?: SessionReport
  reportLoading?: boolean
  reportError?: string | null
  onRetryReport?: () => void
  corrections: Correction[]
  topic?: Topic
  ttsRate: number
  voiceIndex: number | null
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

export default function ReportView(p: Props) {
  const m = p.metrics
  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex flex-col items-center gap-2 rounded-[28px] px-4 pt-5 pb-4">
        <ScoreRing value={m.score} label={String(m.score)} sublabel="fluidez" size={140} stroke={12} />
        <div className="btn-acc rounded-full px-3.5 py-1 text-sm">Nivel al hablar hoy: {m.level}</div>
        {p.topic && <p className="txt-sub text-center text-sm">{p.topic.titleEs || p.topic.title}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={m.wpm} label="palabras/min" hint="meta B2: 110+" />
        <Stat value={m.avgWords} label="palabras/resp." hint="meta: 30+" />
        <Stat value={m.pauses} label="pausas > 1 s" hint={`${m.pausesPerMin.toLocaleString('es')}/min`} />
        <Stat value={m.words} label="palabras" />
        <Stat value={formatSeconds(m.speechSeconds)} label="hablando" />
        <Stat value={m.longestWords} label="resp. más larga" />
      </div>

      {p.reportLoading && (
        <div className="glass txt-sub animate-pulse rounded-[24px] p-4 text-center text-sm">Tu profe está preparando el informe…</div>
      )}
      {p.reportError && (
        <div className="glass rounded-[24px] p-4 text-sm">
          <span style={{ color: '#f87171' }}>{p.reportError}</span>
          {p.onRetryReport && (
            <button onClick={p.onRetryReport} className="field mt-2.5 h-11 w-full rounded-[22px] font-medium">
              Reintentar informe
            </button>
          )}
        </div>
      )}

      {p.report && (
        <>
          <Card title="Cómo te fue" icon="spark">
            <p>{p.report.summaryEs}</p>
          </Card>
          <Card title="Lo que hiciste bien" icon="check">
            <ul className="list-disc space-y-1 pl-5">
              {p.report.strengthsEs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
          <Card title="Para mejorar" icon="target">
            <ul className="list-disc space-y-1 pl-5">
              {p.report.improveEs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
          <div className="rounded-[24px] p-4" style={{ background: 'var(--acc)', color: 'var(--ink)', boxShadow: '0 10px 30px var(--glow)' }}>
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <Icon name="flag" size={17} />
              Tarea para mañana
            </div>
            <p className="leading-snug">{p.report.homeworkEs}</p>
          </div>
          {p.report.phrase.en && (
            <button onClick={() => speak(p.report!.phrase.en, p.ttsRate, p.voiceIndex)} className="glass rounded-[24px] p-4 text-left">
              <span className="txt-sub mb-1 flex items-center gap-1.5 text-xs">
                <Icon name="speaker" size={13} /> Frase del día · toca para oírla
              </span>
              <span className="block text-lg font-semibold">"{p.report.phrase.en}"</span>
              <span className="txt-sub block text-sm">{p.report.phrase.es}</span>
            </button>
          )}
        </>
      )}

      {p.corrections.length > 0 && (
        <Card title={`Correcciones (${p.corrections.length})`} icon="check">
          <div className="flex flex-col gap-2">
            {p.corrections.map((c, i) => (
              <CorrectionView key={i} c={c} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="glass rounded-[20px] px-2 py-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="txt-sub text-[11px] leading-tight">{label}</div>
      {hint && <div className="txt-sub mt-0.5 text-[10px] opacity-80">{hint}</div>}
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: 'spark' | 'check' | 'target'; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[24px] p-4 text-[15px] leading-snug">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <span className="txt-acc2">
          <Icon name={icon} size={17} />
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}
