import { SCENARIOS } from '../lib/scenarios'

interface Props {
  keysReady: boolean
  onStart: (scenarioId: string) => void
  onGoSettings: () => void
}

export default function Home({ keysReady, onStart, onGoSettings }: Props) {
  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <h1 className="text-3xl font-bold">
        Habla<span className="text-brand">.</span>
      </h1>
      <p className="mb-5 text-slate-400">Elige de qué quieres hablar hoy.</p>

      {!keysReady && (
        <button
          onClick={onGoSettings}
          className="mb-5 w-full rounded-2xl bg-amber-500/15 p-4 text-left text-sm text-amber-100 ring-1 ring-amber-500/30"
        >
          🔑 Antes de empezar, pega tus claves de Anthropic y OpenAI en <b>Ajustes</b>. Toca aquí.
        </button>
      )}

      <div className="grid gap-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            disabled={!keysReady}
            onClick={() => onStart(s.id)}
            className="flex items-center gap-4 rounded-2xl bg-slate-900 p-4 text-left ring-1 ring-white/5 active:bg-slate-800 disabled:opacity-40"
          >
            <span className="text-3xl">{s.emoji}</span>
            <span>
              <span className="block font-semibold">{s.title}</span>
              <span className="block text-sm text-slate-400">{s.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
