import { useState } from 'react'
import type { Topic } from '../lib/db'
import { getCategory } from '../lib/topics'
import { speak } from '../lib/tts'

/** Tarjeta del tema de la sesión: título, resumen plegable, vocabulario que se puede escuchar. */
export default function TopicCard({ topic, ttsRate, voiceIndex }: { topic: Topic; ttsRate: number; voiceIndex: number | null }) {
  const [open, setOpen] = useState(false)
  const cat = getCategory(topic.category)
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 p-3 ring-1 ring-indigo-400/20">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 text-left">
        <span className="text-xl">{cat.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] tracking-wide text-indigo-200/80 uppercase">{cat.title}</span>
          <span className="block leading-snug font-semibold text-slate-50">{topic.title}</span>
          {topic.titleEs && <span className="block text-xs text-slate-400">{topic.titleEs}</span>}
        </span>
        <span className="text-slate-400">{open ? '▴' : '▾'}</span>
      </button>
      {open && <p className="mt-2 text-sm text-slate-200">{topic.summary}</p>}
      {topic.vocab.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topic.vocab.map((v) => (
            <button
              key={v.en}
              onClick={() => speak(v.en, ttsRate, voiceIndex)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-100 active:bg-white/20"
            >
              🔊 {v.en} <span className="text-slate-400">· {v.es}</span>
            </button>
          ))}
        </div>
      )}
      {open && topic.sources && topic.sources.length > 0 && (
        <p className="mt-2 truncate text-[11px] text-slate-500">Fuente: {topic.sources.map((s) => s.title).join(' · ')}</p>
      )}
    </div>
  )
}
