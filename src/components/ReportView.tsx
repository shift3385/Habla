import type { Correction, SessionMetrics, SessionReport, Topic } from '../lib/db'
import { speak } from '../lib/tts'
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
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 pt-2">
        <ScoreRing value={m.score} label={String(m.score)} sublabel="fluidez" size={140} stroke={12} />
        <div className="rounded-full bg-orange-500/15 px-3 py-1 text-sm font-semibold text-orange-200">
          Nivel al hablar hoy: {m.level}
        </div>
        {p.topic && <p className="text-center text-sm text-slate-400">{p.topic.titleEs || p.topic.title}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={m.wpm} label="palabras/min" hint="meta B2: 110+" />
        <Stat value={m.avgWords} label="palabras/respuesta" hint="meta: 30+" />
        <Stat value={m.pauses} label="pausas > 1 s" hint={`${m.pausesPerMin.toLocaleString('es')}/min`} />
        <Stat value={m.words} label="palabras" />
        <Stat value={formatSeconds(m.speechSeconds)} label="hablando" />
        <Stat value={m.longestWords} label="respuesta más larga" />
      </div>

      {p.reportLoading && (
        <div className="animate-pulse rounded-2xl bg-slate-900 p-4 text-center text-sm text-slate-300">
          🦉 El profe está preparando tu informe…
        </div>
      )}
      {p.reportError && (
        <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">
          {p.reportError}
          {p.onRetryReport && (
            <button onClick={p.onRetryReport} className="mt-2 block w-full rounded-lg bg-white/10 py-2">
              🔁 Reintentar informe
            </button>
          )}
        </div>
      )}

      {p.report && (
        <>
          <Card title="🦉 Cómo te fue">
            <p className="text-slate-200">{p.report.summaryEs}</p>
          </Card>
          <div className="grid gap-3">
            <Card title="💪 Lo que hiciste bien">
              <ul className="list-disc space-y-1 pl-5 text-slate-200">
                {p.report.strengthsEs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
            <Card title="🎯 Para mejorar">
              <ul className="list-disc space-y-1 pl-5 text-slate-200">
                {p.report.improveEs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-500/25 to-amber-500/10 p-4 ring-1 ring-orange-400/30">
            <h3 className="mb-1 font-semibold text-orange-100">📅 Tarea para mañana</h3>
            <p className="text-slate-100">{p.report.homeworkEs}</p>
          </div>
          {p.report.phrase.en && (
            <button
              onClick={() => speak(p.report!.phrase.en, p.ttsRate, p.voiceIndex)}
              className="w-full rounded-2xl bg-slate-900 p-4 text-left ring-1 ring-white/5"
            >
              <span className="mb-1 block text-xs text-slate-400">✨ Frase del día · toca para oírla</span>
              <span className="block text-lg font-semibold text-slate-50">"{p.report.phrase.en}"</span>
              <span className="block text-sm text-slate-400">{p.report.phrase.es}</span>
            </button>
          )}
        </>
      )}

      {p.corrections.length > 0 && (
        <Card title={`✍️ Correcciones (${p.corrections.length})`}>
          <div className="space-y-2">
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
    <div className="rounded-xl bg-slate-900 px-2 py-3 ring-1 ring-white/5">
      <div className="text-xl font-bold text-slate-50 tabular-nums">{value}</div>
      <div className="text-[11px] leading-tight text-slate-400">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-white/5">
      <h3 className="mb-2 font-semibold text-slate-100">{title}</h3>
      {children}
    </div>
  )
}
