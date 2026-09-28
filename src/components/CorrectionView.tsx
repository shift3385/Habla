import type { Correction } from '../lib/db'

export default function CorrectionView({ c }: { c: Correction }) {
  return (
    <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
      <p className="text-red-300/90 line-through decoration-red-400 decoration-2">{c.original}</p>
      <p className="mt-1">
        <mark className="rounded bg-emerald-400/20 px-1 font-medium text-emerald-200">{c.corrected}</mark>
      </p>
      {c.explanationEs && <p className="mt-1 text-xs text-slate-300">💡 {c.explanationEs}</p>}
    </div>
  )
}
