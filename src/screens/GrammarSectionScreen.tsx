import { useEffect, useMemo, useState } from 'react'
import GrammarTopicRow from '../components/GrammarTopicRow'
import InfiniteList from '../components/InfiniteList'
import type { GrammarProgress } from '../lib/db'
import { findSection, forYouTopics, masteredIn, sectionIcon, type ForYouSignals } from '../lib/grammar'
import { loadForYouSignals, loadGrammarProgress } from '../lib/grammarProgress'
import { Icon } from '../ui/icons'

/** v5.10: una sección de Gramática (p. ej. Tiempos verbales): sus temas, con nivel, estado, ⭐ y ▶/⏸ de un ejemplo. */
export default function GrammarSectionScreen({
  id,
  level,
  onBack,
  onOpenTopic,
}: {
  id: string
  level: string
  onBack: () => void
  onOpenTopic: (id: string) => void
}) {
  const section = findSection(id)
  const [progress, setProgress] = useState<Record<string, GrammarProgress>>({})
  const [signals, setSignals] = useState<ForYouSignals>({})
  useEffect(() => {
    loadGrammarProgress()
      .then(setProgress)
      .catch(() => {})
    // D3: «Para ti» tiene en cuenta tus errores de clase y la lección del plan de hoy.
    loadForYouSignals()
      .then(setSignals)
      .catch(() => {})
  }, [])
  const forYouIds = useMemo(() => new Set(forYouTopics(level, progress, 6, signals).map((t) => t.id)), [level, progress, signals])

  if (!section) {
    return (
      <div className="anim-in flex flex-col gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Esta sección ya no existe.</div>
      </div>
    )
  }
  const done = masteredIn(section, progress)

  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <span className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full">
          <Icon name={sectionIcon(section.icon)} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="fs-22 leading-tight font-semibold tracking-[-.4px] break-words">{section.titleEs}</div>
          <div className="txt-sub fs-12.5 leading-tight">
            {section.titleEn} · {section.topics.length} {section.topics.length === 1 ? 'tema' : 'temas'}
            {done > 0 ? ` · ${done} ${done === 1 ? 'dominado' : 'dominados'}` : ''}
          </div>
        </div>
      </div>
      <div className="txt-sub fs-13.5 leading-snug">{section.descriptionEs}</div>
      <InfiniteList
        items={section.topics}
        render={(t) => (
          <GrammarTopicRow key={t.id} topic={t} progress={progress[t.id]} forYou={forYouIds.has(t.id)} onOpen={() => onOpenTopic(t.id)} />
        )}
      />
    </div>
  )
}
