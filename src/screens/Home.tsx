import { useEffect, useState } from 'react'
import ScoreRing from '../components/ScoreRing'
import { SCENARIOS } from '../lib/scenarios'
import { loadDashboard, type Dashboard } from '../lib/stats'
import { TOPIC_CATEGORIES } from '../lib/topics'

interface Props {
  keysReady: boolean
  dailyGoalMinutes: number
  onStart: (scenarioId: string, categoryId?: string) => void
  onGoSettings: () => void
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

export default function Home({ keysReady, dailyGoalMinutes, onStart, onGoSettings }: Props) {
  const [dash, setDash] = useState<Dashboard | null>(null)

  useEffect(() => {
    loadDashboard().then(setDash)
  }, [])

  const minutes = dash?.minutesToday ?? 0
  const goalDone = minutes >= dailyGoalMinutes
  const lastScore = dash?.history.at(-1)?.metrics?.score

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Habla<span className="text-brand">.</span>
          </h1>
          <p className="text-sm text-slate-400">{greeting()} 👋 ¿De qué hablamos hoy?</p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${
            dash?.streak ? 'bg-orange-500/20 text-orange-200' : 'bg-white/5 text-slate-400'
          }`}
          title="Días seguidos practicando"
        >
          🔥 {dash?.streak ?? 0}
        </div>
      </div>

      {!keysReady && (
        <button
          onClick={onGoSettings}
          className="mb-4 w-full rounded-2xl bg-amber-500/15 p-4 text-left text-sm text-amber-100 ring-1 ring-amber-500/30"
        >
          🔑 Antes de empezar, pega tu clave de Gemini en <b>Ajustes</b>. Toca aquí.
        </button>
      )}

      {/* Meta diaria + botón principal */}
      <div className="mb-4 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 ring-1 ring-white/5">
        <ScoreRing
          value={minutes}
          max={dailyGoalMinutes}
          size={92}
          stroke={9}
          label={goalDone ? '✓' : `${Math.round((minutes / dailyGoalMinutes) * 100)}%`}
          sublabel="meta"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-300">
            {goalDone
              ? '¡Meta de hoy cumplida! 🎉'
              : `Hoy: ${minutes.toLocaleString('es')} de ${dailyGoalMinutes} min hablando`}
          </p>
          {lastScore !== undefined && (
            <p className="text-xs text-slate-400">Última nota de fluidez: {lastScore}/100</p>
          )}
          <button
            disabled={!keysReady}
            onClick={() => onStart('free')}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-40"
          >
            🎲 Sorpréndeme
          </button>
        </div>
      </div>

      {dash?.lastHomework && (
        <div className="mb-5 rounded-2xl bg-indigo-500/10 p-4 ring-1 ring-indigo-400/20">
          <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-200 uppercase">📅 Tu tarea</p>
          <p className="text-sm text-slate-200">{dash.lastHomework.text}</p>
        </div>
      )}

      <h2 className="mb-2 font-semibold text-slate-200">Elige un tema</h2>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {TOPIC_CATEGORIES.map((c) => (
          <button
            key={c.id}
            disabled={!keysReady}
            onClick={() => onStart('free', c.id)}
            className="relative flex flex-col items-center gap-1 rounded-2xl bg-slate-900 px-1 py-3 text-center ring-1 ring-white/5 active:bg-slate-800 disabled:opacity-40"
          >
            {c.live && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-400" title="Noticias reales y recientes" />
            )}
            <span className="text-2xl">{c.emoji}</span>
            <span className="text-[11px] leading-tight text-slate-300">{c.title}</span>
          </button>
        ))}
      </div>
      <p className="-mt-4 mb-6 text-[11px] text-slate-500">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400 align-middle" /> busca noticias reales
        y recientes en Google
      </p>

      <h2 className="mb-2 font-semibold text-slate-200">Prácticas guiadas</h2>
      <div className="grid gap-2">
        {SCENARIOS.filter((s) => s.id !== 'free').map((s) => (
          <button
            key={s.id}
            disabled={!keysReady}
            onClick={() => onStart(s.id)}
            className="flex items-center gap-4 rounded-2xl bg-slate-900 p-3.5 text-left ring-1 ring-white/5 active:bg-slate-800 disabled:opacity-40"
          >
            <span className="text-2xl">{s.emoji}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{s.title}</span>
              <span className="block text-sm text-slate-400">{s.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
