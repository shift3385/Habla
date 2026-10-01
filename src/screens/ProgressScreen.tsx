import { useEffect, useState } from 'react'
import ReportView from '../components/ReportView'
import TrendChart from '../components/TrendChart'
import { db, type Correction, type Session } from '../lib/db'
import { getScenario } from '../lib/scenarios'
import type { Settings } from '../lib/settings'
import { getCategory } from '../lib/topics'

function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function sessionTitle(s: Session) {
  if (s.topic) return `${getCategory(s.topic.category).emoji} ${s.topic.titleEs || s.topic.title}`
  const sc = getScenario(s.scenario)
  return `${sc.emoji} ${sc.title}`
}

export default function ProgressScreen({ settings }: { settings: Settings }) {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [open, setOpen] = useState<{ s: Session; corrections: Correction[] } | null>(null)

  useEffect(() => {
    db.sessions
      .orderBy('startedAt')
      .toArray()
      .then((all) => setSessions(all.filter((s) => s.metrics && s.metrics.turns > 0)))
  }, [])

  const openSession = async (s: Session) => {
    const turns = await db.turns.where('sessionId').equals(s.id!).toArray()
    setOpen({ s, corrections: turns.map((t) => t.correction).filter((c): c is Correction => !!c) })
  }

  if (open) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4">
        <button onClick={() => setOpen(null)} className="mb-3 text-sm text-slate-300">
          ← Volver
        </button>
        <p className="mb-1 text-xs text-slate-400">{new Date(open.s.startedAt).toLocaleString('es')}</p>
        <h2 className="mb-2 font-semibold">{sessionTitle(open.s)}</h2>
        <ReportView
          metrics={open.s.metrics!}
          report={open.s.report}
          corrections={open.corrections}
          topic={open.s.topic}
          ttsRate={settings.ttsRate}
          voiceIndex={settings.voiceIndex}
        />
      </div>
    )
  }

  if (!sessions) return null

  const recent = sessions.slice(-20)
  const totalSeconds = sessions.reduce((a, s) => a + (s.metrics?.speechSeconds ?? 0), 0)
  const totalWords = sessions.reduce((a, s) => a + (s.metrics?.words ?? 0), 0)
  const avg = (list: Session[], k: 'wpm' | 'avgWords' | 'score') =>
    list.length ? Math.round(list.reduce((a, s) => a + (s.metrics?.[k] ?? 0), 0) / list.length) : 0
  const first = sessions.slice(0, 3)
  const last = sessions.slice(-3)

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-6">
      <h1 className="mb-4 text-2xl font-bold">Progreso</h1>

      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 p-6 text-center text-slate-300 ring-1 ring-white/5">
          <div className="mb-2 text-4xl">📈</div>
          Termina tu primera conversación para ver aquí tu nota de fluidez y cómo evoluciona.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <Tile value={sessions.length} label="sesiones" />
            <Tile
              value={totalSeconds < 600 ? (Math.round(totalSeconds / 6) / 10).toLocaleString('es') : Math.round(totalSeconds / 60)}
              label="min hablando"
            />
            <Tile value={totalWords} label="palabras dichas" />
          </div>

          <div className="mb-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/5">
            <h2 className="font-semibold">Nota de fluidez</h2>
            <p className="mb-2 text-xs text-slate-400">Toca un punto para ver el detalle</p>
            <TrendChart
              points={recent.map((s) => ({
                label: shortDate(s.startedAt),
                value: s.metrics!.score,
                detail: `${s.metrics!.wpm} ppm · ${s.metrics!.avgWords} palabras/resp. · ${s.metrics!.level}`,
              }))}
              unit="/100"
            />
          </div>

          {sessions.length >= 4 && (
            <div className="mb-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/5">
              <h2 className="mb-2 font-semibold">Antes → ahora</h2>
              <p className="mb-3 text-xs text-slate-400">Media de tus 3 primeras sesiones frente a las 3 últimas</p>
              <Compare label="Nota" before={avg(first, 'score')} after={avg(last, 'score')} />
              <Compare label="Palabras por minuto" before={avg(first, 'wpm')} after={avg(last, 'wpm')} />
              <Compare label="Palabras por respuesta" before={avg(first, 'avgWords')} after={avg(last, 'avgWords')} />
            </div>
          )}

          <h2 className="mb-2 font-semibold">Sesiones</h2>
          <div className="space-y-2">
            {[...sessions].reverse().map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 p-3 text-left ring-1 ring-white/5 active:bg-slate-800"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-bold text-orange-200">
                  {s.metrics!.score}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{sessionTitle(s)}</p>
                  <p className="text-xs text-slate-400">
                    {shortDate(s.startedAt)} · {s.metrics!.wpm} ppm · {s.metrics!.turns}{' '}
                    {s.metrics!.turns === 1 ? 'respuesta' : 'respuestas'}
                  </p>
                </div>
                <span className="text-slate-500">›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-900 px-2 py-3 ring-1 ring-white/5">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  )
}

function Compare({ label, before, after }: { label: string; before: number; after: number }) {
  const diff = after - before
  return (
    <div className="flex items-center justify-between border-t border-white/5 py-2 text-sm first:border-0">
      <span className="text-slate-300">{label}</span>
      <span className="tabular-nums">
        <span className="text-slate-400">{before}</span> → <b>{after}</b>{' '}
        <span className={diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-red-300' : 'text-slate-400'}>
          {diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : '='}
        </span>
      </span>
    </div>
  )
}
