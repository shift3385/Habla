import { useEffect, useState } from 'react'
import { db, type Correction, type SessionMetrics, type SessionReport, type Topic } from '../lib/db'
import { baselineFrom, reportTrends, soundedLike, speakingGoal, type MetricBaseline, type Trend } from '../lib/fluency'
import { topicsOfCorrections } from '../lib/grammar'
import { openGrammarTopic } from '../lib/grammarLink'
import { getProfile } from '../lib/profile'
import { toggleSpeak } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import CorrectionView from './CorrectionView'
import ScoreRing from './ScoreRing'
import SpeakIcon from './SpeakIcon'

interface Props {
  metrics: SessionMetrics
  report?: SessionReport
  reportLoading?: boolean
  reportError?: string | null
  onRetryReport?: () => void
  corrections: Correction[]
  topic?: Topic
  /** Nivel al hablar del alumno (MCER) para las metas; si no se pasa, se lee del perfil. */
  speakingLevel?: string
  /** 5.11 (M-07): la clase del informe, para compararla con tu media de las 5 anteriores. Sin ella, sin flechas. */
  session?: { id?: number; startedAt: number }
  ttsRate: number
  voiceIndex: number | null
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

export default function ReportView(p: Props) {
  const grammarTopics = topicsOfCorrections(p.corrections)
  const m = p.metrics
  // 5.10.1 (UX-03/04): metas de TU nivel al hablar (antes, «meta B2: 110+» para todos).
  const [profileLevel, setProfileLevel] = useState<string | undefined>()
  useEffect(() => {
    if (p.speakingLevel) return
    let alive = true
    getProfile()
      .then((pr) => alive && setProfileLevel(pr.levels.speaking))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [p.speakingLevel])
  const level = p.speakingLevel ?? profileLevel
  const goal = speakingGoal(level)
  // 5.11 (M-07): tu media de las últimas 5 clases terminadas antes de esta (undefined = cargando, null = sin media).
  const [base, setBase] = useState<MetricBaseline | null | undefined>()
  const sid = p.session?.id
  const started = p.session?.startedAt
  useEffect(() => {
    if (started == null) return
    let alive = true
    db.sessions
      .where('startedAt')
      .below(started)
      .toArray()
      .then((all) => alive && setBase(baselineFrom(all, { id: sid, startedAt: started })))
      .catch(() => alive && setBase(null))
    return () => {
      alive = false
    }
  }, [sid, started])
  const trends = reportTrends(m, base ?? null)
  const sounded = soundedLike(m.level, level)
  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex flex-col items-center gap-2 rounded-[28px] px-4 pt-5 pb-4">
        <ScoreRing value={m.score} label={String(m.score)} sublabel="fluidez" size={140} stroke={12} />
        <TrendLine t={trends.score} />
        {/* 5.11 (M-07, UX-09): sale de la nota de fluidez, no es tu nivel (solo el re-test lo cambia). Oculto en A1–A2. */}
        {sounded && (
          <div className="flex flex-col items-center">
            <div className="btn-acc rounded-full px-3.5 py-1 text-sm">{sounded}</div>
            <div className="txt-sub mt-0.5 fs-11">(tu nivel lo fija el test)</div>
          </div>
        )}
        {p.topic && <p className="txt-sub text-center text-sm">{p.topic.titleEs || p.topic.title}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={m.spokenTurns === 0 ? '—' : m.wpm} label="palabras/min" hint={level ? `meta ${goal.level}: ${goal.wpm}+` : undefined} trend={trends.wpm} />
        <Stat value={m.avgWords} label="palabras/resp." hint={level ? `meta ${goal.level}: ${goal.words}+` : undefined} trend={trends.avgWords} />
        <Stat value={m.pauses} label="pausas > 1 s" hint={`${m.pausesPerMin.toLocaleString('es')}/min`} trend={trends.pausesPerMin} />
        <Stat value={m.words} label="palabras" />
        <Stat value={formatSeconds(m.speechSeconds)} label="hablando" />
        <Stat value={m.longestWords} label="resp. más larga" />
      </div>
      {p.session && base === null && (
        <p className="txt-sub text-center fs-12.5">Esta es tu primera referencia: en las próximas clases verás tus flechas frente a tu media.</p>
      )}
      {base && (
        <p className="txt-sub text-center fs-12">
          Flechas frente a tu media de las últimas {base.classes} clases.
        </p>
      )}

      {p.reportLoading && (
        <div className="glass txt-sub animate-pulse rounded-[24px] p-4 text-center text-sm">Tu profe está preparando el informe…</div>
      )}
      {p.reportError && (
        <div className="glass rounded-[24px] p-4 text-sm">
          <span style={{ color: 'var(--bad)' }}>{p.reportError}</span>
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
            <button onClick={() => toggleSpeak(p.report!.phrase.en, p.ttsRate, p.voiceIndex)} className="glass rounded-[24px] p-4 text-left">
              <span className="txt-sub mb-1 flex items-center gap-1.5 text-xs">
                <SpeakIcon speakKey={p.report.phrase.en} size={13} /> Frase del día · toca para oírla
              </span>
              <span className="block text-lg font-semibold">"{p.report.phrase.en}"</span>
              <span className="txt-sub block text-sm">{p.report.phrase.es}</span>
            </button>
          )}
        </>
      )}

      {grammarTopics.length > 0 && (
        <Card title="Para repasar en Gramática" icon="target">
          {/* v5.10 (D3): los temas de las correcciones de esta clase, para repasarlos con explicación y ejercicios. */}
          <div className="flex flex-wrap gap-2">
            {grammarTopics.map((t) => (
              <button key={t.id} onClick={() => openGrammarTopic(t.id)} className="field flex items-center gap-1.5 rounded-full px-3 py-1.5 fs-13">
                <span aria-hidden>📘</span> {t.nameEs}
              </button>
            ))}
          </div>
        </Card>
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

/** Tarjeta de una cifra (también la usa el resumen del Repaso, v5.10). */
export function Stat({ value, label, hint, trend }: { value: string | number; label: string; hint?: string; trend?: Trend | null }) {
  return (
    <div className="glass rounded-[20px] px-2 py-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="txt-sub fs-11 leading-tight">{label}</div>
      {hint && <div className="txt-sub mt-0.5 fs-10 opacity-80">{hint}</div>}
      {trend && <TrendLine t={trend} small />}
    </div>
  )
}

/**
 * 5.11 (M-07): «▲ +8 frente a tu media». Mejor que tu media, en el color de «bien»; peor o igual, en gris (sin rojo:
 * es una comparación contigo, no un suspenso).
 */
function TrendLine({ t, small }: { t: Trend | null; small?: boolean }) {
  if (!t) return null
  return (
    <div className={`${small ? 'mt-0.5 fs-10' : 'fs-13'} font-medium leading-tight`} style={{ color: t.better ? 'var(--ok)' : 'var(--sub)' }}>
      <span aria-hidden>{t.arrow}</span> {t.text}
    </div>
  )
}

/** Tarjeta con título e icono (también la usa el resumen del Repaso, v5.10). */
export function Card({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[24px] p-4 fs-15 leading-snug">
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
